import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCcw, AlertTriangle, Sparkles, TrendingUp, TrendingDown, Minus, Salad, Activity, Sun, Eye, ShieldAlert } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis, RadialBarChart, RadialBar, BarChart, Bar, CartesianGrid, AreaChart, Area } from "recharts";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/Shared";
import { http } from "../lib/api";
import { toast } from "sonner";

const SEVERITY = {
  thriving:   { color: "#10b981", label: "Thriving",   icon: Sun },
  steady:     { color: "#a78bfa", label: "Steady",     icon: Minus },
  struggling: { color: "#f59e0b", label: "Struggling", icon: AlertTriangle },
  distressed: { color: "#ef4444", label: "Needs care", icon: ShieldAlert },
};
const TREND = {
  improving: { color: "#10b981", icon: TrendingUp, label: "Improving" },
  stable:    { color: "#a78bfa", icon: Minus,      label: "Stable" },
  declining: { color: "#ef4444", icon: TrendingDown, label: "Declining" },
};

const MentalHealth = () => {
  const [days, setDays] = useState(14);
  const [report, setReport] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([
        http.get(`/mental-health/report?days=${days}`),
        http.get("/analytics/summary"),
      ]);
      setReport(r.data); setAnalytics(a.data);
    } catch { toast.error("Could not generate report"); }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  if (loading || !report) {
    return <AppShell><div className="p-10 text-white/40 flex items-center gap-2"><Sparkles className="animate-pulse" size={18}/> Reading your last {days} days…</div></AppShell>;
  }

  const sev = SEVERITY[report.severity] || SEVERITY.steady;
  const trd = TREND[report.trend] || TREND.stable;
  const SevIcon = sev.icon, TrdIcon = trd.icon;

  // mood line chart
  const moodLine = (analytics?.moods || []).slice(0, 30).reverse().map((m, i) => ({
    i, intensity: m.intensity, emo: m.emotion, date: new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));
  // emotion distribution
  const emoCount = {};
  (analytics?.moods || []).forEach(m => { emoCount[m.emotion] = (emoCount[m.emotion] || 0) + 1; });
  const emoBars = Object.entries(emoCount).map(([emo, count]) => ({ emo, count }));

  return (
    <AppShell>
      <PageHeader
        eyebrow={`mental health · last ${days} days`}
        title="A clear-eyed look at your mind."
        subtitle="Honest. Warm. Backed by your own data."
        accent="#fb7185"
        right={
          <div className="flex gap-2">
            <select value={days} onChange={(e) => setDays(+e.target.value)} data-testid="mh-days"
              className="bg-white/5 border border-white/10 rounded-full px-4 py-2.5 outline-none text-sm">
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <button onClick={load} data-testid="mh-refresh"
              className="px-5 py-2.5 rounded-full border border-rose-400/40 hover:bg-rose-500/10 flex items-center gap-2">
              <RefreshCcw size={14}/> refresh
            </button>
          </div>
        }
      />

      {/* Hero status row */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <Card accent={sev.color} className="lg:col-span-2">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: `${sev.color}22`, boxShadow: `0 0 50px ${sev.color}55` }}>
              <SevIcon size={32} style={{ color: sev.color }} />
            </div>
            <div className="flex-1">
              <div className="text-[11px] uppercase tracking-widest text-white/40">current state</div>
              <div className="font-display text-3xl" style={{ color: sev.color }}>{sev.label}</div>
              <div className="text-sm text-white/70 mt-2 leading-relaxed">{report.current_state}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-widest text-white/40">trend</div>
              <div className="flex items-center gap-1 mt-1" style={{ color: trd.color }}>
                <TrdIcon size={16} /><span className="font-medium">{trd.label}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card accent="#a78bfa">
          <div className="text-[11px] uppercase tracking-widest text-white/40 mb-2">snapshot</div>
          <ResponsiveContainer width="100%" height={120}>
            <RadialBarChart innerRadius="55%" outerRadius="100%" data={[{ name: "mood", value: (report.snapshot?.avg_mood || 0) * 10, fill: sev.color }]} startAngle={90} endAngle={-270}>
              <RadialBar background={{ fill: "rgba(255,255,255,0.06)" }} dataKey="value" cornerRadius={20} />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="22" fontFamily="Clash Display">{report.snapshot?.avg_mood || 0}</text>
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 text-center text-xs text-white/60 -mt-2">
            <div><div className="text-white text-base">{report.snapshot?.journals}</div>journals</div>
            <div><div className="text-white text-base">{report.snapshot?.mood_logs}</div>moods</div>
            <div><div className="text-white text-base">{report.snapshot?.avg_sleep_quality}</div>sleep q</div>
          </div>
        </Card>
      </div>

      {/* Mood trend + emotion distribution */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Card accent="#ec4899">
          <div className="text-xs uppercase tracking-widest text-pink-300 mb-2">mood trajectory</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={moodLine}>
              <defs>
                <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity={0.5}/>
                  <stop offset="100%" stopColor="#ec4899" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
              <YAxis domain={[0, 10]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
              <RTooltip contentStyle={{ background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Area type="monotone" dataKey="intensity" stroke="#ec4899" strokeWidth={2} fill="url(#mg)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card accent="#a78bfa">
          <div className="text-xs uppercase tracking-widest text-purple-300 mb-2">emotion distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={emoBars}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="emo" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
              <RTooltip contentStyle={{ background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Bar dataKey="count" fill="#a78bfa" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Patterns / Triggers / Strengths */}
      <div className="grid md:grid-cols-3 gap-5 mb-5">
        <Card accent="#60a5fa">
          <div className="text-xs uppercase tracking-widest text-blue-300 mb-3 flex items-center gap-2"><Eye size={14}/> patterns</div>
          <ul className="space-y-2 text-sm">{(report.key_patterns || []).map((p, i) => <li key={i} className="flex gap-2"><span className="text-blue-400">→</span>{p}</li>)}</ul>
        </Card>
        <Card accent="#f59e0b">
          <div className="text-xs uppercase tracking-widest text-amber-300 mb-3 flex items-center gap-2"><AlertTriangle size={14}/> triggers</div>
          <ul className="space-y-2 text-sm">{(report.triggers || []).map((p, i) => <li key={i} className="flex gap-2"><span className="text-amber-400">⚠</span>{p}</li>)}</ul>
        </Card>
        <Card accent="#10b981">
          <div className="text-xs uppercase tracking-widest text-emerald-300 mb-3 flex items-center gap-2"><Sparkles size={14}/> your strengths</div>
          <ul className="space-y-2 text-sm">{(report.strengths || []).map((p, i) => <li key={i} className="flex gap-2"><span className="text-emerald-400">★</span>{p}</li>)}</ul>
        </Card>
      </div>

      {/* Today actions */}
      <Card accent="#fb7185" className="mb-5">
        <div className="text-xs uppercase tracking-widest text-rose-300 mb-3">do these today</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {(report.today_actions || []).map((a, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="p-3 rounded-2xl border border-white/5 bg-white/[0.03] flex items-center gap-3 hover:border-rose-400/40 transition">
              <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-300 font-display">{i + 1}</div>
              <div className="text-sm flex-1">{a}</div>
              <input type="checkbox" className="accent-rose-400 w-4 h-4" />
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Diet / Exercise */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Card accent="#14b8a6">
          <div className="text-xs uppercase tracking-widest text-teal-300 mb-3 flex items-center gap-2"><Salad size={14}/> eat this</div>
          <div className="space-y-2">{(report.diet_focus || []).map((d, i) => (
            <div key={i} className="p-3 rounded-2xl border border-white/5 bg-white/[0.02]">
              <div className="font-medium text-teal-200">{d.item || d}</div>
              <div className="text-xs text-white/55 mt-0.5">{d.why}</div>
            </div>
          ))}</div>
        </Card>
        <Card accent="#f59e0b">
          <div className="text-xs uppercase tracking-widest text-amber-300 mb-3 flex items-center gap-2"><Activity size={14}/> move like this</div>
          <div className="space-y-2">{(report.exercise_focus || []).map((d, i) => (
            <div key={i} className="p-3 rounded-2xl border border-white/5 bg-white/[0.02]">
              <div className="font-medium text-amber-200">{d.item || d}</div>
              <div className="text-xs text-white/55 mt-0.5">{d.why}</div>
            </div>
          ))}</div>
        </Card>
      </div>

      {/* Forecast / Warnings */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card accent="#a78bfa">
          <div className="text-xs uppercase tracking-widest text-purple-300 mb-2">7-day forecast</div>
          <div className="text-sm text-white/85 leading-relaxed">{report.weekly_forecast}</div>
        </Card>
        <Card accent="#ef4444">
          <div className="text-xs uppercase tracking-widest text-red-300 mb-3 flex items-center gap-2"><ShieldAlert size={14}/> watch for these</div>
          <ul className="space-y-2 text-sm">{(report.warning_signs || []).map((p, i) => <li key={i} className="flex gap-2"><span className="text-red-400">⚠</span>{p}</li>)}</ul>
          <div className="text-[11px] text-white/40 mt-3">If anything here resonates strongly, please consider reaching out to a professional. You're not alone — 988 (US) is available 24/7.</div>
        </Card>
      </div>

      <div className="text-[11px] text-white/30 mt-6 text-center">
        Report generated {new Date(report.generated_at).toLocaleString()} · This is supportive guidance, not clinical diagnosis.
      </div>
    </AppShell>
  );
};

export default MentalHealth;
