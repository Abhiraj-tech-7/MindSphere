import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Square, Radio, Wifi, WifiOff, RotateCcw,
  Volume2, VolumeX, Activity, AlertCircle,
} from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader } from "../components/Shared";
import { toast } from "sonner";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const WS_URL = `${BACKEND.replace(/^http/, "ws")}/api/voice/ws`;

const QUICK_PROMPTS = ["Next step", "Repeat that", "I'm stuck", "Slower", "Done", "Show again"];

/** Convert Int16 PCM to playable Float32. */
function int16ToFloat32(int16) {
  const f = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) f[i] = int16[i] / 0x8000;
  return f;
}

const StatusPill = ({ ok, label, icon: Icon }) => (
  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border ${
    ok ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" : "border-white/10 text-white/40"
  }`}>
    <Icon size={11}/>{label}
  </div>
);

const WaveformBars = ({ analyser, speaking, idle }) => {
  // 24 bars driven by the live AnalyserNode (real frequency data) + assistant pulse
  const N = 24;
  const ref = useRef(null);
  const rafRef = useRef(0);
  useEffect(() => {
    let mounted = true;
    const buf = new Uint8Array(N);
    const draw = () => {
      if (!mounted) return;
      const el = ref.current;
      if (el) {
        if (analyser) {
          try { analyser.getByteFrequencyData(new Uint8Array(analyser.frequencyBinCount).subarray(0, 0)); } catch {}
          try {
            const data = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(data);
            for (let i = 0; i < N; i++) {
              const idx = Math.floor((i / N) * data.length);
              buf[i] = data[idx] || 0;
            }
          } catch {}
        }
        const bars = el.children;
        for (let i = 0; i < N; i++) {
          const v = idle ? 0 : (buf[i] / 255);
          const phase = (performance.now() / 200 + i * 0.4) % (Math.PI * 2);
          const wave = speaking ? (0.5 + 0.5 * Math.sin(phase)) : 0;
          const h = Math.max(0.08, Math.min(1, v * 1.4 + wave * 0.6));
          if (bars[i]) bars[i].style.height = `${h * 100}%`;
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { mounted = false; cancelAnimationFrame(rafRef.current); };
  }, [analyser, speaking, idle]);
  return (
    <div ref={ref} className="flex items-end justify-center gap-1 h-16">
      {Array.from({ length: N }).map((_, i) => (
        <span key={i} className="w-[6px] rounded-full" style={{
          height: "8%",
          background: speaking
            ? `linear-gradient(180deg, #10b981, #14b8a6)`
            : `linear-gradient(180deg, #ec4899, #a78bfa)`,
          boxShadow: speaking
            ? `0 0 8px rgba(16,185,129,0.5)`
            : `0 0 8px rgba(236,72,153,0.4)`,
          transition: "height 80ms linear",
        }} />
      ))}
    </div>
  );
};

const Voice = () => {
  const [active, setActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connState, setConnState] = useState("idle"); // idle|connecting|connected|reconnecting|error
  const [status, setStatus] = useState("idle"); // idle|listening|speaking
  const [muted, setMuted] = useState(false);
  const [latencyMs, setLatencyMs] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState("");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [analyser, setAnalyser] = useState(null);
  const [micLevel, setMicLevel] = useState(0);

  const wsRef = useRef(null);
  const ctxInRef = useRef(null);
  const ctxOutRef = useRef(null);
  const streamRef = useRef(null);
  const workletRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const playHeadRef = useRef(0);
  const playingSourcesRef = useRef([]);
  const lastChunkAtRef = useRef(0);
  const userStoppedRef = useRef(false);
  const reconnectTimerRef = useRef(null);
  const attemptRef = useRef(0);
  const mutedRef = useRef(false);
  const levelRafRef = useRef(0);

  /* ---------- token ---------- */
  const token = typeof window !== "undefined" ? localStorage.getItem("ms_token") : "";

  /* ---------- playback (24kHz scheduled buffer-source pattern) ---------- */
  const playPCM = useCallback((b64) => {
    if (mutedRef.current) return;
    try {
      if (!ctxOutRef.current) ctxOutRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      const ctx = ctxOutRef.current;
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const aligned = bytes.byteLength % 2 === 0 ? bytes : bytes.slice(0, bytes.byteLength - 1);
      const int16 = new Int16Array(aligned.buffer, aligned.byteOffset, Math.floor(aligned.byteLength / 2));
      const f32 = int16ToFloat32(int16);
      const buf = ctx.createBuffer(1, f32.length, 24000);
      buf.copyToChannel(f32, 0, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      const now = ctx.currentTime;
      const startAt = Math.max(now, playHeadRef.current);
      src.start(startAt);
      playHeadRef.current = startAt + buf.duration;
      playingSourcesRef.current.push(src);
      src.onended = () => {
        playingSourcesRef.current = playingSourcesRef.current.filter(s => s !== src);
        if (playingSourcesRef.current.length === 0) setStatus("listening");
      };
      setStatus("speaking");
      lastChunkAtRef.current = performance.now();
    } catch (e) { console.warn("playPCM err", e); }
  }, []);

  const flushPlayback = useCallback(() => {
    try { playingSourcesRef.current.forEach(s => { try { s.stop(); } catch {} }); } catch {}
    playingSourcesRef.current = [];
    playHeadRef.current = 0;
  }, []);

  /* ---------- cleanup ---------- */
  const cleanupMic = useCallback(() => {
    cancelAnimationFrame(levelRafRef.current);
    try { workletRef.current?.disconnect?.(); } catch {}
    try { sourceRef.current?.disconnect?.(); } catch {}
    try { analyserRef.current?.disconnect?.(); } catch {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (ctxInRef.current) {
      try { ctxInRef.current.close(); } catch {}
      ctxInRef.current = null;
    }
    if (ctxOutRef.current) {
      try { ctxOutRef.current.close(); } catch {}
      ctxOutRef.current = null;
    }
    playHeadRef.current = 0;
    playingSourcesRef.current = [];
    analyserRef.current = null;
    setAnalyser(null);
    setMicLevel(0);
  }, []);

  /* ---------- socket ---------- */
  const start = useCallback(async (isReconnect = false) => {
    if (active) return;
    setConnecting(true);
    setConnState(isReconnect ? "reconnecting" : "connecting");
    setError("");
    userStoppedRef.current = false;
    try {
      // Mic stream (fresh each start)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const ctxIn = new (window.AudioContext || window.webkitAudioContext)();
      ctxInRef.current = ctxIn;
      try {
        await ctxIn.audioWorklet.addModule("/pcm-processor.js");
      } catch (e) {
        // Add module may fail if previously loaded; safe to ignore
      }
      const source = ctxIn.createMediaStreamSource(stream);
      sourceRef.current = source;
      const node = new AudioWorkletNode(ctxIn, "pcm-processor", {
        processorOptions: { inputSampleRate: ctxIn.sampleRate },
      });
      workletRef.current = node;

      const an = ctxIn.createAnalyser();
      an.fftSize = 1024;
      source.connect(an);
      source.connect(node);
      analyserRef.current = an;
      setAnalyser(an);

      // rough mic level for header bar
      const tdata = new Uint8Array(an.frequencyBinCount);
      const loop = () => {
        if (!analyserRef.current) return;
        try {
          analyserRef.current.getByteTimeDomainData(tdata);
          let sum = 0;
          for (let i = 0; i < tdata.length; i++) { const v = (tdata[i] - 128) / 128; sum += v * v; }
          const rms = Math.sqrt(sum / tdata.length);
          setMicLevel(rms);
        } catch {}
        levelRafRef.current = requestAnimationFrame(loop);
      };
      levelRafRef.current = requestAnimationFrame(loop);

      // open WS
      await new Promise((resolve, reject) => {
        if (!token) { reject(new Error("Sign in required")); return; }
        const url = `${WS_URL}?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(url);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;
        const tmo = setTimeout(() => { try { ws.close(); } catch {} ; reject(new Error("WS timeout")); }, 12000);
        ws.onopen = () => {
          clearTimeout(tmo);
          setConnState("connected");
          setActive(true);
          setConnecting(false);
          setReconnectAttempt(0);
          attemptRef.current = 0;
          setStatus("listening");
          // periodic ping for latency
          const pingTimer = setInterval(() => {
            if (ws.readyState !== WebSocket.OPEN) { clearInterval(pingTimer); return; }
            const t0 = performance.now();
            ws._pingAt = t0;
            try { ws.send(JSON.stringify({ type: "ping" })); } catch {}
          }, 4000);
          ws._pingTimer = pingTimer;
          resolve(ws);
        };
        ws.onerror = (e) => { clearTimeout(tmo); console.warn("ws error", e); };
        ws.onmessage = (e) => {
          try {
            const m = JSON.parse(e.data);
            if (m.type === "status") {
              // 'connecting' | 'connected'
              return;
            }
            if (m.type === "pong") {
              if (ws._pingAt) setLatencyMs(Math.round(performance.now() - ws._pingAt));
              return;
            }
            if (m.type === "audio_out") {
              playPCM(m.chunk);
              if (lastChunkAtRef.current) setLatencyMs(Math.round(performance.now() - lastChunkAtRef.current));
              return;
            }
            if (m.type === "transcript") {
              setTranscript((p) => [...p.slice(-40), { role: m.role || "model", text: m.text, at: Date.now() }]);
              return;
            }
            if (m.type === "interrupted") {
              flushPlayback();
              setStatus("listening");
              return;
            }
            if (m.type === "turn_complete") {
              if (playingSourcesRef.current.length === 0) setStatus("listening");
              return;
            }
            if (m.type === "error") {
              setError(m.text || m.error || "stream error");
              setConnState("error");
            }
          } catch {}
        };
        ws.onclose = () => {
          clearInterval(ws._pingTimer);
          setActive(false);
          setStatus("idle");
          if (userStoppedRef.current) { setConnState("idle"); return; }
          // auto-reconnect with exponential backoff
          attemptRef.current += 1;
          setReconnectAttempt(attemptRef.current);
          if (attemptRef.current <= 5) {
            setConnState("reconnecting");
            const delay = Math.min(5000, 400 * Math.pow(2, attemptRef.current - 1));
            reconnectTimerRef.current = setTimeout(() => {
              cleanupMic();
              start(true);
            }, delay);
          } else {
            setConnState("error");
            setError("Voice connection lost. Click Begin to retry.");
          }
        };
      });

      // pipe mic PCM to backend as audio_in
      node.port.onmessage = (ev) => {
        const buf = ev.data;
        if (!buf || !wsRef.current || wsRef.current.readyState !== 1) return;
        if (mutedRef.current) return;
        const bytes = new Uint8Array(buf);
        let bin = "";
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        try { wsRef.current.send(JSON.stringify({ type: "audio_in", chunk: btoa(bin) })); } catch {}
        lastChunkAtRef.current = performance.now();
      };

      if (isReconnect) {
        setTimeout(() => {
          if (wsRef.current?.readyState === 1) {
            try { wsRef.current.send(JSON.stringify({ type: "text", text: "Continue where we left off." })); } catch {}
          }
        }, 400);
      }
    } catch (e) {
      setConnecting(false);
      setConnState("error");
      cleanupMic();
      const msg = e?.name === "NotAllowedError" ? "Microphone permission denied"
        : e?.message || "Failed to start voice";
      setError(msg);
      toast.error(msg);
    }
  }, [active, token, playPCM, flushPlayback, cleanupMic]);

  const stop = useCallback(() => {
    userStoppedRef.current = true;
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    try { wsRef.current?.send(JSON.stringify({ type: "stop" })); } catch {}
    try { wsRef.current?.close(); } catch {}
    wsRef.current = null;
    cleanupMic();
    setActive(false);
    setStatus("idle");
    setConnState("idle");
    setReconnectAttempt(0);
    setTranscript([]);
  }, [cleanupMic]);

  const sendText = useCallback((text) => {
    if (!text || wsRef.current?.readyState !== 1) return;
    try { wsRef.current.send(JSON.stringify({ type: "text", text })); } catch {}
    setTranscript((p) => [...p, { role: "user", text, at: Date.now() }]);
  }, []);

  /* ---------- effects ---------- */
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => () => stop(), []); // eslint-disable-line

  const isSecure = typeof window !== "undefined" && window.isSecureContext;
  const hasMediaDevices = typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia;

  const connected = active && connState === "connected";
  const speaking = status === "speaking";
  const listening = active && !speaking;

  return (
    <AppShell>
      <PageHeader
        eyebrow="real-time voice · gemini live"
        title="Just talk."
        subtitle="Hands-free mental wellness conversation with Lyra. Interrupt anytime. Live captions."
        accent="#10b981"
        right={
          <div className="flex gap-2 items-center">
            <StatusPill ok={connected} label={
              connState === "connected" ? `live · ${latencyMs ?? "—"}ms` :
              connState === "connecting" ? "connecting" :
              connState === "reconnecting" ? `reconnecting #${reconnectAttempt}` :
              connState === "error" ? "error" : "idle"
            } icon={connected ? Wifi : WifiOff} />
            <button onClick={() => setMuted(m => !m)} data-testid="voice-mute-toggle" className="px-3 py-2 rounded-full border border-white/10 hover:bg-white/5 flex items-center gap-2 text-xs">
              {muted ? <VolumeX size={12}/> : <Volume2 size={12}/>} {muted ? "muted" : "sound"}
            </button>
          </div>
        }
      />

      {!isSecure && (
        <div className="glass p-4 mb-4 text-sm text-amber-300 border border-amber-400/40">
          Voice requires HTTPS. This preview uses HTTPS — if you ever self-host on plain HTTP, mic access will be blocked.
        </div>
      )}
      {!hasMediaDevices && (
        <div className="glass p-4 mb-4 text-sm text-rose-300 border border-rose-400/40">
          This browser doesn't support the Web Audio APIs needed. Try Chrome, Edge, or Safari.
        </div>
      )}
      {error && (
        <div className="glass p-4 mb-4 text-sm text-red-300 border border-red-400/40 flex items-center gap-2" data-testid="voice-error">
          <AlertCircle size={14}/> {error}
        </div>
      )}

      {/* Mode / mic level row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="glass px-3 py-1.5 flex gap-1 items-center" style={{ borderRadius: 999 }}>
          <span className="px-3 py-1 rounded-full text-xs flex items-center gap-1 bg-emerald-500/20 text-emerald-300">
            <Radio size={11}/> hands-free · gemini live
          </span>
        </div>
        <div className="glass px-3 py-1.5 flex items-center gap-2 text-xs text-white/60" style={{ borderRadius: 999 }}>
          <Activity size={11} className="text-pink-400"/>
          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full" style={{ width: `${Math.min(100, micLevel * 600)}%`, background: "linear-gradient(90deg,#ec4899,#a78bfa)" }} />
          </div>
          <span>mic</span>
        </div>
      </div>

      {/* Stage */}
      <div className="glass relative overflow-hidden flex flex-col" style={{ minHeight: "56vh" }} data-testid="voice-stage">
        <div className="flex-1 flex flex-col items-center justify-center gap-6 py-10">
          <motion.div
            animate={{
              scale: speaking ? [1, 1.08, 1] : 1 + Math.min(0.18, micLevel * 4),
              boxShadow: speaking
                ? "0 0 160px 50px rgba(16,185,129,0.55)"
                : listening
                ? `0 0 ${80 + micLevel * 800}px ${20 + micLevel * 200}px rgba(236,72,153,${0.4 + micLevel * 2})`
                : "0 0 60px 15px rgba(167,139,250,0.35)",
            }}
            transition={{ duration: speaking ? 0.9 : 0.06, ease: "easeInOut", repeat: speaking ? Infinity : 0 }}
            className="mind-orb"
            style={{ width: 240, height: 240 }}
          />
          <WaveformBars analyser={analyser} speaking={speaking} idle={!active} />
          <div className="text-[11px] uppercase tracking-[0.3em]" style={{ color: speaking ? "#10b981" : listening ? "#ec4899" : "#a78bfa" }}>
            {speaking ? "lyra speaking…" : listening ? "listening" : connState === "reconnecting" ? "reconnecting…" : connState === "connecting" ? "connecting…" : "ready"}
          </div>
          <div className="flex gap-3">
            {!active ? (
              <button onClick={() => start(false)} disabled={connecting} data-testid="voice-start"
                className="btn-pulse flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-black font-medium hover:scale-[1.03] transition disabled:opacity-50">
                <Mic size={16}/> {connecting ? "Connecting…" : "Begin conversation"}
              </button>
            ) : (
              <>
                <button onClick={stop} data-testid="voice-stop"
                  className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 hover:bg-white/5">
                  <Square size={14}/> end
                </button>
                <button onClick={() => { flushPlayback(); setStatus("listening"); }}
                  data-testid="voice-interrupt"
                  className="flex items-center gap-2 px-5 py-3 rounded-full border border-white/10 hover:bg-white/5 text-sm" title="Interrupt assistant">
                  <RotateCcw size={13}/> interrupt
                </button>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-center text-[10px] text-white/50 max-w-xl text-center">
            <span className="text-white/40 mr-2 uppercase tracking-widest">quick prompts:</span>
            {QUICK_PROMPTS.map((c) => (
              <button key={c} onClick={() => sendText(c)} disabled={!active} data-testid={`voice-quick-${c.toLowerCase().replace(/\s+/g, "-").replace("'", "")}`}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-300 border border-white/10 text-white/70 disabled:opacity-40 transition">
                "{c}"
              </button>
            ))}
          </div>
        </div>

        {/* live captions */}
        <div className="border-t border-white/5 px-5 py-4 max-h-56 overflow-y-auto bg-black/30" data-testid="voice-captions">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-2">live captions</div>
          {transcript.length === 0 ? (
            <div className="text-sm text-white/40">Captions appear as you and Lyra speak.</div>
          ) : (
            <AnimatePresence initial={false}>
              {transcript.slice(-10).map((c, i) => (
                <motion.div key={`${c.at}-${i}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`text-sm mb-1 ${c.role === "user" ? "text-white" : "text-emerald-300"}`}>
                  <span className="text-[10px] uppercase tracking-widest mr-2 opacity-50">{c.role === "user" ? "you" : "lyra"}</span>{c.text}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Voice;
