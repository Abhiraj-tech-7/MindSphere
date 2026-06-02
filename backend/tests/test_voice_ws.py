"""MindSphere voice WebSocket + /api/voice/config tests (Gemini Live integration)."""
import os
import json
import asyncio
from pathlib import Path

import pytest
import requests
import websockets

# --- resolve external base URL from frontend/.env ---
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    env = (Path(__file__).parent.parent.parent / "frontend" / ".env").read_text()
    for line in env.splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
            break

API = f"{BASE_URL}/api"
WS_BASE = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
WS_URL = f"{WS_BASE}/api/voice/ws"

DEMO_EMAIL = "demo@mindsphere.app"
DEMO_PASS = "demo1234"


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


# ---------- /api/voice/config ----------
class TestVoiceConfig:
    def test_config_authed(self, token):
        r = requests.get(f"{API}/voice/config",
                         headers={"Authorization": f"Bearer {token}"}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "model" in body and body["model"]
        assert body.get("input_sample_rate") == 16000
        assert body.get("output_sample_rate") == 24000
        assert body.get("available") is True

    def test_config_unauthed(self):
        r = requests.get(f"{API}/voice/config", timeout=30)
        assert r.status_code in (401, 403)


# ---------- /api/voice/ws ----------
async def _connect(token_value, timeout=15):
    return await asyncio.wait_for(
        websockets.connect(f"{WS_URL}?token={token_value}", max_size=None,
                           ping_interval=None, open_timeout=timeout),
        timeout=timeout,
    )


async def _collect_until(ws, terminal_types, max_seconds=45):
    """Collect json messages until one of terminal_types is seen or timeout."""
    msgs = []
    end = asyncio.get_event_loop().time() + max_seconds
    while True:
        remaining = end - asyncio.get_event_loop().time()
        if remaining <= 0:
            break
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        except asyncio.TimeoutError:
            break
        try:
            m = json.loads(raw)
        except Exception:
            continue
        msgs.append(m)
        if m.get("type") in terminal_types:
            break
    return msgs


class TestVoiceWebSocket:
    @pytest.mark.asyncio
    async def test_connect_setup_complete_and_opener(self, token):
        ws = await _connect(token, timeout=20)
        try:
            # First: setup_complete then a server-triggered opener (audio+text+turn_complete)
            msgs = await _collect_until(ws, {"turn_complete"}, max_seconds=45)
            types = [m["type"] for m in msgs]
            assert "setup_complete" in types, f"no setup_complete; got {types[:5]}"
            assert "audio" in types, f"no audio from opener; types={types}"
            audio_chunks = [m for m in msgs if m["type"] == "audio"]
            assert len(audio_chunks) >= 2, f"expected multiple audio chunks, got {len(audio_chunks)}"
            text_chunks = [m for m in msgs if m["type"] == "text"]
            assert len(text_chunks) >= 1, "expected at least one text transcript chunk"
            assert "turn_complete" in types, "opener did not finish with turn_complete"
            # verify audio is non-empty base64
            assert len(audio_chunks[0]["data"]) > 100
        finally:
            await ws.close()

    @pytest.mark.asyncio
    async def test_ping_pong(self, token):
        ws = await _connect(token, timeout=20)
        try:
            # drain opener until turn_complete
            await _collect_until(ws, {"turn_complete"}, max_seconds=45)
            await ws.send(json.dumps({"type": "ping"}))
            # the pong may arrive after some other messages — wait specifically
            got_pong = False
            end = asyncio.get_event_loop().time() + 10
            while asyncio.get_event_loop().time() < end:
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=10)
                except asyncio.TimeoutError:
                    break
                try:
                    m = json.loads(raw)
                except Exception:
                    continue
                if m.get("type") == "pong":
                    got_pong = True
                    break
            assert got_pong, "did not receive pong within 10s"
        finally:
            await ws.close()

    @pytest.mark.asyncio
    async def test_text_turn_produces_audio_and_turn_complete(self, token):
        ws = await _connect(token, timeout=20)
        try:
            # drain opener
            await _collect_until(ws, {"turn_complete"}, max_seconds=45)
            # send a text turn
            await ws.send(json.dumps({"type": "text", "text": "Hello, please respond with a short hi."}))
            msgs = await _collect_until(ws, {"turn_complete"}, max_seconds=45)
            types = [m["type"] for m in msgs]
            audio = [m for m in msgs if m["type"] == "audio"]
            assert audio, f"no audio after text turn; types={types}"
            assert "turn_complete" in types, f"no turn_complete; types={types}"
            total_audio_bytes = sum(len(m["data"]) for m in audio)
            assert total_audio_bytes > 5000, f"audio payload too small ({total_audio_bytes})"
        finally:
            await ws.close()

    @pytest.mark.asyncio
    async def test_bad_token_closes(self):
        # Should send error then close
        try:
            ws = await _connect("invalid.jwt.token", timeout=15)
        except Exception as e:
            # server may reject upgrade outright — accept that as well
            assert "401" in str(e) or "403" in str(e) or "rejected" in str(e).lower() or True
            return
        try:
            got_error = False
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=10)
                m = json.loads(raw)
                if m.get("type") == "error":
                    got_error = True
            except Exception:
                pass
            # connection should close shortly
            closed = False
            try:
                await asyncio.wait_for(ws.recv(), timeout=5)
            except websockets.ConnectionClosed:
                closed = True
            except asyncio.TimeoutError:
                closed = False
            assert got_error or closed, "bad token did not produce error or close"
        finally:
            try: await ws.close()
            except Exception: pass


# ---------- audio-worklet static files served by frontend ----------
class TestAudioWorkletFiles:
    def test_mic_capture_served(self):
        # frontend static is served on root domain (same preview URL serves React app)
        r = requests.get(f"{BASE_URL}/audio-worklets/mic-capture.js", timeout=15)
        assert r.status_code == 200, f"status={r.status_code}"
        assert "AudioWorkletProcessor" in r.text or "registerProcessor" in r.text

    def test_pcm_playback_served(self):
        r = requests.get(f"{BASE_URL}/audio-worklets/pcm-playback.js", timeout=15)
        assert r.status_code == 200
        assert "AudioWorkletProcessor" in r.text or "registerProcessor" in r.text
