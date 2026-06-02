"""MindSphere backend regression tests covering all endpoints."""
import os
import uuid
import time
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fall back to frontend/.env
    from pathlib import Path
    env = (Path(__file__).parent.parent.parent / "frontend" / ".env").read_text()
    for line in env.splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
            break

API = f"{BASE_URL}/api"
DEMO_EMAIL = "demo@mindsphere.app"
DEMO_PASS = "demo1234"
LONG = 60  # seconds, AI calls can be slow

session = requests.Session()
session.headers.update({"Content-Type": "application/json"})
state = {}  # shared state between tests


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def demo_token():
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS}, timeout=LONG)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}


# ---------- AUTH ----------
class TestAuth:
    def test_login_demo(self):
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS}, timeout=LONG)
        assert r.status_code == 200
        body = r.json()
        assert "token" in body and isinstance(body["token"], str)
        assert body["user"]["email"] == DEMO_EMAIL
        state["demo_token"] = body["token"]

    def test_login_invalid(self):
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrongpass"}, timeout=LONG)
        assert r.status_code in (400, 401, 403)

    def test_register_new_user(self):
        email = f"test_{uuid.uuid4().hex[:8]}@mindsphere.app"
        r = session.post(f"{API}/auth/register", json={"name": "Test User", "email": email, "password": "TestPass123"}, timeout=LONG)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body
        assert body["user"]["email"] == email
        state["new_token"] = body["token"]
        state["new_email"] = email

    def test_me_with_new_token(self):
        r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {state['new_token']}"}, timeout=LONG)
        assert r.status_code == 200
        assert r.json()["email"] == state["new_email"]

    def test_me_unauthorized(self):
        r = session.get(f"{API}/auth/me", timeout=LONG)
        assert r.status_code == 401


# ---------- ONBOARDING & VERSE ----------
class TestOnboardingVerse:
    def test_onboarding_religion(self, auth_headers):
        r = session.post(f"{API}/users/onboarding", headers=auth_headers,
                         json={"answers": {"religion": "hindu", "name": "Aria Demo"}}, timeout=LONG)
        assert r.status_code == 200
        # verify reflected in /me
        me = session.get(f"{API}/auth/me", headers=auth_headers, timeout=LONG).json()
        assert (me.get("onboarding") or {}).get("religion") == "hindu" or me.get("religion") == "hindu"

    def test_verses_today(self, auth_headers):
        r = session.get(f"{API}/verses/today", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("verse", "reference", "reflection"):
            assert k in body and body[k]

    def test_religions_list(self):
        r = session.get(f"{API}/religions", timeout=LONG)
        assert r.status_code == 200
        items = r.json()
        if isinstance(items, dict):
            # could be {"items":[...]} or a map of religions
            inner = items.get("items") or items.get("religions")
            count = len(inner) if inner is not None else len(items)
        else:
            count = len(items)
        assert count >= 8


# ---------- MENTAL HEALTH REPORT ----------
class TestMentalHealth:
    def test_mh_report(self, auth_headers):
        r = session.get(f"{API}/mental-health/report?days=14", headers=auth_headers, timeout=120)
        assert r.status_code == 200, r.text
        body = r.json()
        required = ["current_state", "severity", "trend", "key_patterns", "triggers",
                   "strengths", "today_actions", "diet_focus", "exercise_focus",
                   "weekly_forecast", "warning_signs", "snapshot"]
        missing = [k for k in required if k not in body]
        assert not missing, f"Missing keys: {missing}"


# ---------- MUSIC ----------
class TestMusic:
    def test_music_recs(self, auth_headers):
        r = session.get(f"{API}/music/recommendations", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "current_mood" in body
        tracks = body.get("tracks") or body.get("recommendations") or []
        assert len(tracks) >= 3
        t0 = tracks[0]
        # urls present
        assert any("youtube" in str(v).lower() for v in t0.values())
        assert any("spotify" in str(v).lower() for v in t0.values())


# ---------- BODY SCAN ----------
class TestBodyScan:
    def test_bodyscan_chest(self, auth_headers):
        r = session.post(f"{API}/bodyscan/recommend", headers=auth_headers,
                         json={"part": "chest", "pain": 7, "duration": "days", "notes": "tight"}, timeout=LONG)
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("name", "breath", "breath_steps", "yoga", "ai_note"):
            assert k in body, f"missing {k}"
        assert isinstance(body["yoga"], list)


# ---------- GUIDANCE ----------
class TestGuidance:
    @pytest.mark.parametrize("feature", [
        "journal", "mood", "diet", "exercise", "sleep", "lyra",
        "disturbance", "analytics", "assessments", "appointments",
    ])
    def test_guidance(self, auth_headers, feature):
        r = session.get(f"{API}/guidance/{feature}", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200, f"{feature}: {r.text}"
        body = r.json()
        tips = body.get("tips") or []
        assert isinstance(tips, list) and len(tips) >= 3, f"{feature} tips: {tips}"


# ---------- DASHBOARD ----------
class TestDashboard:
    def test_dashboard(self, auth_headers):
        r = session.get(f"{API}/dashboard", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("name", "affirmation", "insight", "latest_mood", "wellness_score",
                 "streak", "week_moods", "hydration", "heatmap", "top_disturbance"):
            assert k in body, f"missing {k}"


# ---------- JOURNAL ----------
class TestJournal:
    def test_create_journal(self, auth_headers):
        r = session.post(f"{API}/journal", headers=auth_headers,
                         json={"content": "Today I feel quietly grateful for small wins."}, timeout=LONG)
        assert r.status_code == 200, r.text
        entry = r.json()
        for k in ("emotion", "color", "intensity", "summary", "topics"):
            assert k in entry
        state["journal_id"] = entry.get("id")

    def test_list_journal(self, auth_headers):
        r = session.get(f"{API}/journal", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- MOOD ----------
class TestMood:
    def test_log_mood(self, auth_headers):
        r = session.post(f"{API}/mood", headers=auth_headers,
                         json={"emotion": "calm", "intensity": 6, "note": "test"}, timeout=LONG)
        assert r.status_code == 200

    def test_list_mood(self, auth_headers):
        r = session.get(f"{API}/mood?days=60", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- CHAT / LYRA ----------
class TestChat:
    def test_chat_send(self, auth_headers):
        r = session.post(f"{API}/chat", headers=auth_headers,
                         json={"message": "Hi Lyra, just a one-line check."}, timeout=120)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "reply" in body and body["reply"]
        assert "session_id" in body
        state["chat_session"] = body["session_id"]

    def test_chat_history(self, auth_headers):
        sid = state.get("chat_session")
        if not sid:
            pytest.skip("no session")
        r = session.get(f"{API}/chat/history?session_id={sid}", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- DIET ----------
class TestDiet:
    def test_diet_plan(self, auth_headers):
        r = session.get(f"{API}/diet/plan", headers=auth_headers, timeout=120)
        assert r.status_code == 200, r.text
        body = r.json()
        days = body.get("days") or body
        assert isinstance(days, list) and len(days) >= 7
        meals = days[0].get("meals") or []
        assert len(meals) >= 4
        for k in ("time", "name", "ingredients", "benefit", "calories", "macros"):
            assert k in meals[0], f"missing {k}"

    def test_diet_regenerate(self, auth_headers):
        r = session.post(f"{API}/diet/regenerate", headers=auth_headers, json={"reason": "test refresh"}, timeout=120)
        assert r.status_code == 200


# ---------- EXERCISE ----------
class TestExercise:
    def test_library(self, auth_headers):
        r = session.get(f"{API}/exercise/library", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200
        items = r.json()
        items = items if isinstance(items, list) else items.get("items", [])
        assert len(items) >= 10

    def test_today(self, auth_headers):
        r = session.get(f"{API}/exercise/today", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200
        assert r.json()

    def test_complete(self, auth_headers):
        # get today's first
        today = session.get(f"{API}/exercise/today", headers=auth_headers, timeout=LONG).json()
        eid = today.get("id") or today.get("exercise", {}).get("id") or "demo"
        r = session.post(f"{API}/exercise/complete", headers=auth_headers, json={"exercise_id": eid}, timeout=LONG)
        assert r.status_code == 200


# ---------- ASSESSMENTS ----------
class TestAssessments:
    def test_defs(self, auth_headers):
        r = session.get(f"{API}/assessments/defs", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200
        defs = r.json()
        keys = list(defs.keys()) if isinstance(defs, dict) else [d.get("type") for d in defs]
        for k in ("phq9", "gad7", "pss", "psqi", "wellbeing"):
            assert k in keys, f"missing {k}"

    def test_submit_phq9(self, auth_headers):
        r = session.post(f"{API}/assessments", headers=auth_headers,
                         json={"type": "phq9", "answers": [1, 2, 1, 0, 1, 2, 1, 1, 0]}, timeout=120)
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("score", "band", "interpretation"):
            assert k in body


# ---------- APPOINTMENTS ----------
class TestAppointments:
    def test_create_list_delete(self, auth_headers):
        cr = session.post(f"{API}/appointments", headers=auth_headers, json={
            "provider_type": "therapist", "format": "video",
            "date": "2026-02-01T10:00:00Z", "notes": "first session"
        }, timeout=120)
        assert cr.status_code == 200, cr.text
        appt = cr.json()
        # talking_points should exist
        assert appt.get("talking_points") is not None
        aid = appt["id"]

        lr = session.get(f"{API}/appointments", headers=auth_headers, timeout=LONG)
        assert lr.status_code == 200
        assert any(a.get("id") == aid for a in lr.json())

        dr = session.delete(f"{API}/appointments/{aid}", headers=auth_headers, timeout=LONG)
        assert dr.status_code in (200, 204)


# ---------- SLEEP ----------
class TestSleep:
    def test_log_and_list(self, auth_headers):
        r = session.post(f"{API}/sleep", headers=auth_headers, json={
            "bedtime": "23:00", "wake_time": "07:00", "quality": 7, "dream": "calm", "morning_mood": 7
        }, timeout=LONG)
        assert r.status_code == 200
        lr = session.get(f"{API}/sleep", headers=auth_headers, timeout=LONG)
        assert lr.status_code == 200
        assert isinstance(lr.json(), list)

    def test_coach(self, auth_headers):
        r = session.get(f"{API}/sleep/coach", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200
        assert r.json()


# ---------- ANALYTICS ----------
class TestAnalytics:
    def test_summary(self, auth_headers):
        r = session.get(f"{API}/analytics/summary", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200
        body = r.json()
        for k in ("moods", "journals", "sleeps", "word_cloud", "avg_mood", "wellness_score"):
            assert k in body, f"missing {k}"


# ---------- DISTURBANCE ----------
class TestDisturbance:
    def test_scan(self, auth_headers):
        r = session.get(f"{API}/disturbance/scan", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200
        body = r.json()
        items = body if isinstance(body, list) else body.get("items") or body.get("topics") or []
        assert isinstance(items, list)

    def test_vision(self, auth_headers):
        # 1x1 png base64
        img = ("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==")
        r = session.post(f"{API}/disturbance/vision", headers=auth_headers,
                         json={"image_base64": f"data:image/png;base64,{img}", "kind": "environment"}, timeout=120)
        assert r.status_code == 200, r.text
        body = r.json()
        # accept either 'analysis' or 'result' or 'text'
        assert any(k in body for k in ("analysis", "result", "text"))


# ---------- MEDITATIONS / RESOURCES ----------
class TestContent:
    def test_meditations(self, auth_headers):
        r = session.get(f"{API}/meditations", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200
        items = r.json()
        items = items if isinstance(items, list) else items.get("items", [])
        assert len(items) >= 10

    def test_resources(self, auth_headers):
        r = session.get(f"{API}/resources", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200
        items = r.json()
        items = items if isinstance(items, list) else items.get("items", [])
        assert len(items) >= 10


# ---------- VOICE ----------
class TestVoice:
    def test_opener(self, auth_headers):
        r = session.get(f"{API}/voice/opener", headers=auth_headers, timeout=LONG)
        assert r.status_code == 200
        body = r.json()
        assert body.get("text") or body.get("opener") or body
