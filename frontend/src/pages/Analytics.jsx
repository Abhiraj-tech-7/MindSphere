import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, AlertTriangle, Star } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceDot } from "recharts";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/Shared";
import GuidanceCard from "../components/GuidanceCard";
import { http } from "../lib/api";
import useDocTitle from "../hooks/useDocTitle";
import Skeleton from "../components/Skeleton";

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
  useDocTitle("Analytics");
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

      <YearInPixels />

      <HighlightsCards />

      <MoodForecast />

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

// ============= Year-in-Pixels =============
const pixelColor = (v) => {
  if (v === null || v === undefined) return "#1a1a2e";
  if (v <= 3) return "#3B82F6";
  if (v <= 6) return "#8B5CF6";
  if (v <= 8) return "#10B981";
  return "#34D399";
};

const YearInPixels = () => {
  const [days, setDays] = useState(null);
  useEffect(() => {
    http.get("/analytics/year-pixels").then(({ data }) => setDays(data.days || [])).catch(() => setDays([]));
  }, []);
  return (
    <Card accent="#a78bfa" className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest text-purple-300">year in pixels · 365 days</div>
        <div className="flex gap-1.5 items-center text-[10px] text-white/40">
          <span>low</span>
          {["#3B82F6", "#8B5CF6", "#10B981", "#34D399"].map((c) => <span key={c} className="w-3 h-3 rounded-sm" style={{ background: c }} />)}
          <span>high</span>
        </div>
      </div>
      {!days ? (
        <Skeleton h={104} />
      ) : (
        <div className="grid grid-flow-col grid-rows-7 gap-[3px] overflow-x-auto pb-1" style={{ gridAutoColumns: "12px" }} data-testid="year-pixels">
          {days.map((d) => (
            <div
              key={d.date}
              title={`${d.date} — ${d.mood_avg !== null ? `${d.mood_avg}/10` : "No data"}`}
              style={{ width: 12, height: 12, borderRadius: 2, background: pixelColor(d.mood_avg) }}
            />
          ))}
        </div>
      )}
    </Card>
  );
};

// ============= Best / Toughest Day =============
const HighlightsCards = () => {
  const [h, setH] = useState(null);
  useEffect(() => {
    http.get("/analytics/highlights").then(({ data }) => setH(data)).catch(() => setH({}));
  }, []);
  if (!h) {
    return (
      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <Card><Skeleton h={70} /></Card><Card><Skeleton h={70} /></Card>
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 gap-4 mb-5">
      <Card accent="#10b981" data-testid="highlight-best">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-300 mb-2">
          <Star size={12} /> best day this month
        </div>
        {h.best ? (
          <>
            <div className="font-display text-xl text-white mb-1">{h.best.date}</div>
            <div className="text-xs text-emerald-300 mb-2">mood {h.best.score}/10</div>
            <p className="text-sm text-white/75 italic">{h.best.reason}</p>
          </>
        ) : <div className="text-sm text-white/40">Log some moods to see your best day.</div>}
      </Card>
      <Card accent="#60a5fa" data-testid="highlight-toughest">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-blue-300 mb-2">
          💙 toughest day this month
        </div>
        {h.toughest ? (
          <>
            <div className="font-display text-xl text-white mb-1">{h.toughest.date}</div>
            <div className="text-xs text-blue-300 mb-2">mood {h.toughest.score}/10</div>
            <p className="text-sm text-white/75 italic">{h.toughest.reason}</p>
          </>
        ) : <div className="text-sm text-white/40">No tough days logged yet.</div>}
      </Card>
    </div>
  );
};

// ============= Mood Forecast =============
const MoodForecast = () => {
  const [f, setF] = useState(null);
  useEffect(() => {
    http.get("/analytics/forecast").then(({ data }) => setF(data)).catch(() => setF({ error: "insufficient_data" }));
  }, []);
  if (!f) {
    return <Card className="mb-5"><Skeleton h={200} /></Card>;
  }
  if (f.error) {
    return (
      <Card accent="#f59e0b" className="mb-5">
        <div className="text-xs uppercase tracking-widest text-amber-300 mb-2">mood forecast · 7 days</div>
        <div className="text-sm text-white/65">{f.message || "Log mood for at least 7 days to enable forecasting."}</div>
      </Card>
    );
  }
  const chartData = f.predictions.map((p) => ({
    date: p.date.slice(5), score: p.score, low: Math.max(1, p.score - p.confidence * 2),
    high: Math.min(10, p.score + p.confidence * 2), risk: p.risk,
  }));
  const riskDays = chartData.filter((d) => d.risk);
  return (
    <Card accent="#a78bfa" className="mb-5" data-testid="mood-forecast">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-purple-300">
          <TrendingUp size={12} /> mood forecast · next 7 days
        </div>
        {riskDays.length > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-amber-300">
            <AlertTriangle size={11} /> {riskDays.length} risk day{riskDays.length === 1 ? "" : "s"}
          </div>
        )}
      </div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fcastFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
            <YAxis domain={[1, 10]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#0b0b15", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
            <Area type="monotone" dataKey="high" stroke="none" fill="url(#fcastFill)" />
            <Area type="monotone" dataKey="low" stroke="none" fill="#0b0b15" />
            <Area type="monotone" dataKey="score" stroke="#c084fc" strokeWidth={2} fill="transparent" />
            {chartData.map((d, i) => d.risk && <ReferenceDot key={i} x={d.date} y={d.score} r={5} fill="#f59e0b" stroke="#0b0b15" />)}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-white/55 italic mt-2">{f.insight}</p>
      <p className="text-[10px] text-white/30 mt-1">Based on your patterns from the past 30 days.</p>
    </Card>
  );
};
