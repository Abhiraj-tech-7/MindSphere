import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, Volume2, Music2, Youtube, ExternalLink, RefreshCcw } from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/Shared";
import { http } from "../lib/api";
import { toast } from "sonner";

const TECHNIQUES = [
  { id: "478", name: "4-7-8", inhale: 4, hold: 7, exhale: 8, color: "#14b8a6" },
  { id: "box", name: "Box Breathing", inhale: 4, hold: 4, exhale: 4, holdAfter: 4, color: "#a78bfa" },
  { id: "coh", name: "Coherent (5-5)", inhale: 5, exhale: 5, color: "#ec4899" },
];

/* ---------------- Body Scan with per-part protocols ---------------- */
const BodyScan = () => {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null); // body part key
  const [pain, setPain] = useState(5);
  const [duration, setDuration] = useState("today");
  const [notes, setNotes] = useState("");
  const [protocol, setProtocol] = useState(null);
  const [loading, setLoading] = useState(false);

  const PARTS = [
    { id: "head",    cx: 100, cy: 30,  r: 22 },
    { id: "neck",    cx: 100, cy: 62,  r: 11 },
    { id: "chest",   cx: 100, cy: 96,  r: 26 },
    { id: "stomach", cx: 100, cy: 138, r: 22 },
    { id: "arms",    cx: 52,  cy: 110, r: 13 },
    { id: "arms",    cx: 148, cy: 110, r: 13, dup: true },
    { id: "legs",    cx: 82,  cy: 210, r: 15 },
    { id: "legs",    cx: 118, cy: 210, r: 15, dup: true },
  ];

  const submit = async (part) => {
    setSelected(part); setProtocol(null); setLoading(true);
    try {
      const { data } = await http.post("/bodyscan/recommend", { part, pain, duration, notes });
      setProtocol(data);
    } catch { toast.error("Could not load protocol"); }
    setLoading(false);
  };

  return (
    <div className="grid lg:grid-cols-5 gap-5">
      <div className="lg:col-span-2 flex flex-col items-center">
        <svg viewBox="0 0 200 240" width="260" className="mx-auto">
          {/* outline silhouette for reference */}
          <ellipse cx="100" cy="30" rx="22" ry="22" fill="none" stroke="rgba(255,255,255,0.1)" />
          <rect x="74" y="50" width="52" height="120" rx="22" fill="none" stroke="rgba(255,255,255,0.1)" />
          <rect x="74" y="170" width="22" height="60" rx="11" fill="none" stroke="rgba(255,255,255,0.1)" />
          <rect x="104" y="170" width="22" height="60" rx="11" fill="none" stroke="rgba(255,255,255,0.1)" />
          {PARTS.map((p, i) => {
            const sel = selected === p.id;
            const hov = hovered === (p.dup ? `${p.id}-${i}` : p.id);
            return (
              <circle key={i} cx={p.cx} cy={p.cy} r={p.r}
                onMouseEnter={() => setHovered(p.dup ? `${p.id}-${i}` : p.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => submit(p.id)}
                fill={sel ? "rgba(236,72,153,0.5)" : hov ? "rgba(167,139,250,0.35)" : "rgba(255,255,255,0.08)"}
                stroke={sel ? "#ec4899" : hov ? "#a78bfa" : "rgba(255,255,255,0.15)"} strokeWidth="1.5"
                style={{ cursor: "pointer", transition: "all 0.2s" }} />
            );
          })}
        </svg>
        <div className="text-[11px] text-white/40 mt-2">tap a region to receive a tailored protocol</div>
      </div>

      <div className="lg:col-span-3">
        <div className="space-y-3 mb-4">
          <div>
            <div className="flex justify-between text-xs text-white/40"><span>pain / tension</span><span>{pain}/10</span></div>
            <input type="range" min={1} max={10} value={pain} onChange={(e) => setPain(+e.target.value)} className="w-full accent-rose-400" />
          </div>
          <div>
            <div className="text-xs text-white/40 mb-1">how long has it been there?</div>
            <div className="flex gap-2 flex-wrap">
              {["today", "few days", "weeks", "months"].map(d => (
                <button key={d} onClick={() => setDuration(d)} className={`px-3 py-1.5 rounded-full text-xs border ${duration === d ? "border-rose-400/60 bg-rose-500/15" : "border-white/10"}`}>{d}</button>
              ))}
            </div>
          </div>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="anything else? (optional)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none text-sm placeholder-white/30" />
        </div>

        {loading && <div className="text-white/40 text-sm">Designing your protocol…</div>}
        {protocol && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3" data-testid="body-protocol">
            <div className="font-display text-2xl text-rose-300">{protocol.name}</div>
            <div className="text-sm text-white/85 italic">{protocol.ai_note}</div>
            <div className="p-4 rounded-2xl border border-teal-400/30 bg-teal-500/5">
              <div className="text-[11px] uppercase tracking-widest text-teal-300 mb-1">breathing · {protocol.breath}</div>
              <ol className="text-sm list-decimal list-inside space-y-1">
                {protocol.breath_steps?.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
            <div className="p-4 rounded-2xl border border-purple-400/30 bg-purple-500/5">
              <div className="text-[11px] uppercase tracking-widest text-purple-300 mb-2">yoga / movement</div>
              <div className="grid sm:grid-cols-3 gap-2">
                {protocol.yoga?.map((y, i) => (
                  <div key={i} className="p-2 rounded-xl border border-white/5 bg-white/[0.03]">
                    <div className="text-sm font-medium">{y.pose}</div>
                    <div className="text-[10px] text-white/40">{y.duration}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-xs text-white/50 italic">{protocol.why}</div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

/* ---------------- Mood-based Music ---------------- */
const MoodMusic = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData((await http.get("/music/recommendations")).data); }
    catch { toast.error("Could not load music"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading || !data) return <div className="text-white/40 text-sm">Tuning…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest text-pink-300 flex items-center gap-2"><Music2 size={14}/> matched to your mood: <span className="text-white capitalize">{data.current_mood}</span></div>
        <button onClick={load} className="text-xs text-white/50 hover:text-white flex items-center gap-1"><RefreshCcw size={11}/> refresh</button>
      </div>
      {data.top_disturbance && (
        <div className="text-[11px] text-white/50 mb-3">also addressing your recent disturbance: <span className="text-rose-300 capitalize">{data.top_disturbance}</span></div>
      )}
      <div className="grid sm:grid-cols-3 gap-3">
        {data.tracks.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="p-4 rounded-2xl border border-white/5 bg-white/[0.03] hover:border-pink-400/40 transition">
            <div className="font-medium">{t.title}</div>
            <div className="text-xs text-white/50">{t.artist}</div>
            <div className="text-xs text-white/65 mt-2 italic">{t.why}</div>
            <div className="flex gap-2 mt-3">
              <a href={t.youtube} target="_blank" rel="noreferrer" data-testid={`music-yt-${i}`}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-red-400/30 hover:bg-red-500/10 text-red-300">
                <Youtube size={12}/> YouTube
              </a>
              <a href={t.spotify} target="_blank" rel="noreferrer" data-testid={`music-sp-${i}`}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-green-400/30 hover:bg-green-500/10 text-green-300">
                <ExternalLink size={11}/> Spotify
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Meditation = () => {
  const [meds, setMeds] = useState([]);
  const [active, setActive] = useState(null);
  const [tech, setTech] = useState(TECHNIQUES[0]);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("Inhale");
  const timer = useRef(null);

  useEffect(() => { (async () => setMeds((await http.get("/meditations")).data))(); }, []);

  useEffect(() => {
    if (!running) return;
    const phases = [
      { name: "Inhale", sec: tech.inhale },
      ...(tech.hold ? [{ name: "Hold", sec: tech.hold }] : []),
      { name: "Exhale", sec: tech.exhale },
      ...(tech.holdAfter ? [{ name: "Hold", sec: tech.holdAfter }] : []),
    ];
    let i = 0;
    const tick = () => {
      setPhase(phases[i].name);
      const u = new SpeechSynthesisUtterance(phases[i].name);
      u.rate = 0.85; u.pitch = 0.9; window.speechSynthesis?.speak(u);
      timer.current = setTimeout(() => { i = (i + 1) % phases.length; tick(); }, phases[i].sec * 1000);
    };
    tick();
    return () => clearTimeout(timer.current);
  }, [running, tech]);

  const stop = () => { setRunning(false); clearTimeout(timer.current); window.speechSynthesis?.cancel(); };

  return (
    <AppShell>
      <PageHeader eyebrow="meditation & breathing" title="A pause, on demand." subtitle="Guided breath. Body-aware yoga. Mood-matched music." accent="#14b8a6" />

      <Card accent="#14b8a6" className="mb-5">
        <div className="text-xs uppercase tracking-widest text-teal-300 mb-3">breathing</div>
        <div className="flex gap-2 mb-5 flex-wrap">
          {TECHNIQUES.map(t => (
            <button key={t.id} onClick={() => setTech(t)} className={`px-4 py-2 rounded-full border text-sm transition ${tech.id === t.id ? "border-teal-400/60 bg-teal-500/15" : "border-white/10 hover:bg-white/5"}`}>{t.name}</button>
          ))}
        </div>
        <div className="flex flex-col items-center gap-5 py-4">
          <motion.div
            animate={{ scale: phase === "Inhale" ? 1.35 : phase === "Exhale" ? 0.7 : 1 }}
            transition={{ duration: phase === "Inhale" ? tech.inhale : phase === "Exhale" ? tech.exhale : tech.hold || 1, ease: "easeInOut" }}
            className="w-44 h-44 rounded-full"
            style={{ background: `radial-gradient(circle, ${tech.color}, transparent 70%)`, boxShadow: `0 0 80px ${tech.color}` }}
          />
          <div className="font-display text-3xl">{running ? phase : "Ready"}</div>
          {!running ? (
            <button onClick={() => setRunning(true)} data-testid="breath-start"
              className="px-6 py-3 rounded-full bg-white text-black flex items-center gap-2 hover:scale-[1.03] transition">
              <Play size={14}/> begin {tech.name}
            </button>
          ) : (
            <button onClick={stop} data-testid="breath-stop"
              className="px-6 py-3 rounded-full border border-white/10 flex items-center gap-2 hover:bg-white/5">
              <Square size={14}/> stop
            </button>
          )}
        </div>
      </Card>

      <Card accent="#fb7185" className="mb-5">
        <div className="text-xs uppercase tracking-widest text-rose-300 mb-3">body scan</div>
        <BodyScan />
      </Card>

      <Card accent="#ec4899" className="mb-5">
        <div className="text-xs uppercase tracking-widest text-pink-300 mb-3 flex items-center gap-2"><Music2 size={14}/> music for your mood</div>
        <MoodMusic />
      </Card>

      <Card accent="#22d3ee" className="mb-5">
        <div className="text-xs uppercase tracking-widest text-cyan-300 mb-3 flex items-center gap-2"><Volume2 size={14}/> ambient sound mixer</div>
        <div className="text-sm text-white/65">Open Settings → Integrations to connect Spotify for live ambient mixing.</div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {meds.map((m, i) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="glass glass-hover p-5 cursor-pointer" onClick={() => setActive(m)}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: m.color === "purple" ? "#a78bfa" : m.color === "teal" ? "#14b8a6" : m.color === "pink" ? "#ec4899" : "#f59e0b" }}>{m.category} · {m.duration} min</div>
            <div className="font-display text-xl mt-1">{m.title}</div>
            <div className="text-xs text-white/55 mt-1">{m.body.slice(0, 80)}…</div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setActive(null)}>
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass p-8 max-w-xl">
              <div className="font-display text-3xl">{active.title}</div>
              <div className="text-xs text-white/40 mt-1">{active.category} · {active.duration} minutes</div>
              <div className="mt-4 text-base text-white/85 leading-relaxed">{active.body}</div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => { const u = new SpeechSynthesisUtterance(active.body); u.rate = 0.85; window.speechSynthesis.speak(u); }}
                  className="px-5 py-2.5 rounded-full bg-white text-black hover:scale-[1.03] transition flex items-center gap-2">
                  <Play size={14}/> read to me
                </button>
                <button onClick={() => { window.speechSynthesis?.cancel(); setActive(null); }} className="px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/5">close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
};

export default Meditation;
