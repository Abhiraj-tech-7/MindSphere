import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/Shared";
import GuidanceCard from "../components/GuidanceCard";
import { http } from "../lib/api";

const sentimentColor = { happy: "#ec4899", calm: "#14b8a6", grateful: "#a78bfa", sad: "#60a5fa", anxious: "#f59e0b", angry: "#ef4444", reflective: "#c084fc", tired: "#7c8db5" };

const Heatmap = ({ data }) => {
  const cells = [];
  const now = new Date();
  for (let i = 0; i < 84; i++) {
    const d = new Date(now); d.setDate(now.getDate() - (83 - i));
    const ds = d.toISOString().slice(0, 10);
    const v = data.find(x => x.created_at?.startsWith(ds));
    cells.push({ date: ds, intensity: v?.intensity || 0, color: v?.color });
  }
  return (
    <div className="grid grid-cols-12 gap-1">
      {cells.map((c, i) => (
        <div key={i} title={`${c.date}: ${c.intensity}`} className="aspect-square rounded-sm"
          style={{ background: c.intensity ? `${c.color}${Math.floor(40 + c.intensity * 18).toString(16)}` : "rgba(255,255,255,0.05)" }} />
      ))}
    </div>
  );
};

const Scatter = ({ data, xKey, yKey, color }) => {
  if (!data || data.length === 0) return <div className="text-xs text-white/40">Not enough data yet.</div>;
  const xs = data.map(d => d[xKey]); const ys = data.map(d => d[yKey]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs); const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const w = 280, h = 140;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%">
      {data.map((d, i) => {
        const x = ((d[xKey] - xMin) / (xMax - xMin || 1)) * (w - 20) + 10;
        const y = h - ((d[yKey] - yMin) / (yMax - yMin || 1)) * (h - 20) - 10;
        return <circle key={i} cx={x} cy={y} r="4" fill={color} opacity="0.7" />;
      })}
    </svg>
  );
};

const Analytics = () => {
  const [s, setS] = useState(null);
  const [narrative, setNarrative] = useState("");
  const [loadingN, setLoadingN] = useState(false);

  useEffect(() => { (async () => { setS((await http.get("/analytics/summary")).data); })(); }, []);

  const genNarrative = async () => {
    setLoadingN(true);
    try { setNarrative((await http.get("/analytics/narrative")).data.narrative); } catch {}
    setLoadingN(false);
  };

  if (!s) return <AppShell><div className="p-10 text-white/40">Reading the threads…</div></AppShell>;

  // simple correlations
  const sleepMood = (s.sleeps || []).slice(0, 30).map(sl => ({ x: sl.quality, y: sl.morning_mood || 5 }));

  const wordMax = Math.max(1, ...(s.word_cloud || []).map(w => w.value));

  return (
    <AppShell>
      <PageHeader eyebrow="analytics & insights" title="See the patterns." subtitle="The data behind how you've been." accent="#a78bfa" />

      <div className="grid md:grid-cols-3 gap-5 mb-5">
        <Card accent="#a78bfa"><div className="text-xs uppercase tracking-widest text-purple-300">avg mood</div><div className="font-display text-5xl mt-1">{s.avg_mood}<span className="text-lg text-white/40">/10</span></div></Card>
        <Card accent="#ec4899"><div className="text-xs uppercase tracking-widest text-pink-300">wellness score</div><div className="font-display text-5xl mt-1">{s.wellness_score}</div></Card>
        <Card accent="#14b8a6"><div className="text-xs uppercase tracking-widest text-teal-300">entries</div><div className="font-display text-5xl mt-1">{s.total_journals}<span className="text-lg text-white/40"> / {s.total_moods} moods</span></div></Card>
      </div>

      <Card accent="#ec4899" className="mb-5">
        <div className="text-xs uppercase tracking-widest text-pink-300 mb-3">mood heatmap · 12 weeks</div>
        <Heatmap data={s.moods} />
      </Card>

      <div className="mb-5"><GuidanceCard feature="analytics" accent="#a78bfa" title="3 patterns to notice" /></div>

      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <Card accent="#60a5fa">
          <div className="text-xs uppercase tracking-widest text-blue-300 mb-3">sleep quality vs morning mood</div>
          <Scatter data={sleepMood} xKey="x" yKey="y" color="#60a5fa" />
        </Card>
        <Card accent="#c084fc">
          <div className="text-xs uppercase tracking-widest text-purple-300 mb-3">word cloud · what you write about</div>
          <div className="flex flex-wrap gap-2 items-end">
            {(s.word_cloud || []).slice(0, 30).map(w => (
              <span key={w.text} style={{ fontSize: `${12 + (w.value / wordMax) * 28}px`, color: sentimentColor[w.text] || "#c084fc", opacity: 0.5 + (w.value / wordMax) * 0.5 }}
                className="font-display">{w.text}</span>
            ))}
            {(s.word_cloud || []).length === 0 && <div className="text-xs text-white/40">Write a few journals to populate.</div>}
          </div>
        </Card>
      </div>

      <Card accent="#a78bfa">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-widest text-purple-300">AI narrative · monthly</div>
          <button onClick={genNarrative} data-testid="narrative-gen" disabled={loadingN}
            className="text-xs px-3 py-1.5 rounded-full border border-purple-400/40 hover:bg-purple-500/10 flex items-center gap-1 disabled:opacity-50">
            <Sparkles size={11} /> {loadingN ? "writing…" : "generate"}
          </button>
        </div>
        <div className="text-sm text-white/85 whitespace-pre-wrap leading-relaxed">{narrative || "Tap generate for a warm narrative of your last month."}</div>
      </Card>
    </AppShell>
  );
};

export default Analytics;
