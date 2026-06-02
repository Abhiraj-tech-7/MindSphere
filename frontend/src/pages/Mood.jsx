import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/Shared";
import { MoodBubble } from "../components/MindOrb";
import GuidanceCard from "../components/GuidanceCard";
import { http } from "../lib/api";
import { toast } from "sonner";

const EMOTIONS = [
  { key: "happy", label: "Happy", emoji: "😊", color: "#ff7eb3" },
  { key: "calm", label: "Calm", emoji: "🌿", color: "#5eead4" },
  { key: "sad", label: "Sad", emoji: "💧", color: "#60a5fa" },
  { key: "anxious", label: "Anxious", emoji: "🌀", color: "#f59e0b" },
  { key: "angry", label: "Angry", emoji: "🔥", color: "#ef4444" },
  { key: "grateful", label: "Grateful", emoji: "🌸", color: "#a78bfa" },
  { key: "tired", label: "Tired", emoji: "🌙", color: "#7c8db5" },
];

const Mood = () => {
  const [logs, setLogs] = useState([]);
  const [picked, setPicked] = useState(null);
  const [intensity, setIntensity] = useState(6);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [pattern, setPattern] = useState("");

  const load = async () => {
    const r = await http.get("/mood?days=90");
    setLogs(r.data);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (logs.length < 3) return;
    // simple client-side pattern: most common emotion, and which weekday is roughest
    const counts = {}; const dayCounts = {};
    logs.forEach((m) => {
      counts[m.emotion] = (counts[m.emotion] || 0) + 1;
      const d = new Date(m.created_at).toLocaleDateString("en-US", { weekday: "long" });
      if (m.intensity >= 7 && ["anxious", "sad", "angry"].includes(m.emotion))
        dayCounts[d] = (dayCounts[d] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const tough = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    setPattern(tough
      ? `Your ${tough}s tend to spike toward ${top}. Consider a 10-minute morning walk that day.`
      : `Your most felt emotion is "${top}". Keep tuning in — patterns become visible around 30 entries.`);
  }, [logs]);

  const log = async () => {
    if (!picked) return toast.error("Pick an emotion first");
    setSaving(true);
    try {
      await http.post("/mood", { emotion: picked, intensity, note });
      setPicked(null); setNote(""); setIntensity(6);
      await load();
      toast.success("Mood logged.");
    } catch { toast.error("Could not save mood"); }
    setSaving(false);
  };

  // emotion distribution wheel (SVG sectors)
  const counts = EMOTIONS.map((e) => ({ ...e, count: logs.filter((l) => l.emotion === e.key).length }));
  const total = counts.reduce((s, c) => s + c.count, 0) || 1;
  let acc = 0;
  const sectors = counts.map((c) => {
    const start = (acc / total) * Math.PI * 2;
    acc += c.count;
    const end = (acc / total) * Math.PI * 2;
    const big = end - start > Math.PI ? 1 : 0;
    const r = 90;
    const x1 = 100 + r * Math.cos(start - Math.PI / 2);
    const y1 = 100 + r * Math.sin(start - Math.PI / 2);
    const x2 = 100 + r * Math.cos(end - Math.PI / 2);
    const y2 = 100 + r * Math.sin(end - Math.PI / 2);
    return c.count === 0 ? null : (
      <path key={c.key} d={`M100,100 L${x1},${y1} A${r},${r} 0 ${big} 1 ${x2},${y2} Z`}
        fill={c.color} opacity="0.85" stroke="#000" strokeWidth="1.5" />
    );
  });

  return (
    <AppShell>
      <PageHeader eyebrow="mood tracker" title="How are you, really?" subtitle="One tap. One truth. One day at a time." accent="#ec4899" />

      <Card accent="#ec4899" className="mb-5">
        <div className="text-xs uppercase tracking-widest text-pink-300 mb-4">check in</div>
        <div className="flex flex-wrap gap-4">
          {EMOTIONS.map((e) => (
            <motion.button key={e.key} onClick={() => setPicked(e.key)} data-testid={`mood-${e.key}`}
              whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center gap-2 transition ${picked === e.key ? "" : "opacity-70"}`}>
              <MoodBubble color={e.color} size={picked === e.key ? 64 : 52} decorative />
              <span className="text-xs text-white/60">{e.emoji} {e.label}</span>
            </motion.button>
          ))}
        </div>
        {picked && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
            <div>
              <div className="flex justify-between text-xs text-white/40 mb-2"><span>intensity</span><span>{intensity}/10</span></div>
              <input data-testid="mood-intensity" type="range" min={1} max={10} value={intensity} onChange={(e) => setIntensity(+e.target.value)} className="w-full accent-pink-400" />
            </div>
            <input data-testid="mood-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="A word or two about why…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-pink-400/50 placeholder-white/30" />
            <button onClick={log} disabled={saving} data-testid="mood-save"
              className="px-6 py-3 rounded-full bg-white text-black font-medium hover:scale-[1.03] transition disabled:opacity-50">{saving ? "…" : "Log mood"}</button>
          </motion.div>
        )}
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2" accent="#a78bfa">
          <div className="text-xs uppercase tracking-widest text-purple-300 mb-3">mood timeline · 30 days</div>
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {logs.slice(0, 60).reverse().map((m) => (
              <div key={m.id} title={`${m.emotion} ${m.intensity}/10`}
                className="shrink-0 mood-bubble"
                style={{ "--bb": m.color, width: 18 + m.intensity * 2, height: 18 + m.intensity * 2 }} />
            ))}
            {logs.length === 0 && <div className="text-sm text-white/40">No logs yet.</div>}
          </div>
        </Card>

        <Card accent="#ec4899">
          <div className="text-xs uppercase tracking-widest text-pink-300 mb-3">emotion wheel</div>
          <svg viewBox="0 0 200 200" width="100%" height="200">
            {sectors}
            <circle cx="100" cy="100" r="38" fill="#000" opacity="0.6" />
            <text x="100" y="105" textAnchor="middle" fill="white" fontSize="14" fontFamily="Clash Display">{total}</text>
          </svg>
          <div className="flex flex-wrap gap-1.5 text-[10px] text-white/60 justify-center">
            {counts.filter(c => c.count > 0).map(c => (
              <span key={c.key} className="px-2 py-0.5 rounded-full" style={{ background: `${c.color}33` }}>{c.label} {c.count}</span>
            ))}
          </div>
        </Card>
      </div>

      {pattern && (
        <Card accent="#c084fc" className="mt-5">
          <div className="text-xs uppercase tracking-widest text-purple-300 mb-2">pattern noticed</div>
          <div className="text-lg">{pattern}</div>
        </Card>
      )}

      <div className="mt-5">
        <GuidanceCard feature="mood" accent="#ec4899" title="what to try today" />
      </div>
    </AppShell>
  );
};

export default Mood;
