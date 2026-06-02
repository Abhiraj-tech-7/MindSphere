import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Flame, Droplets, Moon, Sparkles, Activity, TrendingUp, CalendarClock, Search,
  Wind, ClipboardList, HeartPulse, Smile, BookHeart,
} from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/Shared";
import TutorialOverlay from "../components/TutorialOverlay";
import { http } from "../lib/api";
import { useAuth } from "../lib/auth.jsx";
import { toast } from "sonner";

const Ring = ({ value, size = 110, stroke = 10, color = "#a78bfa" }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: off }} transition={{ duration: 1.2 }}
      />
    </svg>
  );
};

const Sparkline = ({ data, color = "#ec4899" }) => {
  if (!data || data.length < 2) return <div className="text-xs text-white/30">Log a mood to see trend.</div>;
  const w = 200, h = 50;
  const max = 10, min = 0;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - ((d.intensity - min) / (max - min)) * h}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const Heatmap = ({ data }) => (
  <div className="grid grid-cols-15 gap-1" style={{ gridTemplateColumns: "repeat(15, 1fr)" }}>
    {(data || []).slice(-30).map((d, i) => {
      const v = d.value || 0;
      const op = Math.max(0.08, Math.min(1, v / 10));
      return <div key={i} title={`${d.date}: ${v}`} className="aspect-square rounded-sm" style={{ background: `rgba(236, 72, 153, ${op})` }} />;
    })}
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [verse, setVerse] = useState(null);
  const [hydrating, setHydrating] = useState(false);
  const [grat, setGrat] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);
  const nav = useNavigate();

  const load = async () => {
    try {
      const [d, v] = await Promise.all([http.get("/dashboard"), http.get("/verses/today")]);
      setData(d.data); setVerse(v.data);
    } catch (e) { toast.error("Could not load dashboard"); }
  };
  useEffect(() => { load(); }, []);

  // Auto-launch tutorial for newly-onboarded users on their very first dashboard visit.
  // We deliberately do NOT return a cleanup that cancels the timeout: React 18 StrictMode
  // double-invokes effects in dev, and a cleanup-based cancel would prevent the tour
  // from ever opening. The `tutorialKickedRef` guards against duplicate scheduling.
  const tutorialKickedRef = useRef(false);
  useEffect(() => {
    if (!user || tutorialKickedRef.current) return;
    if (user.onboarded && user.tutorial_completed === false) {
      tutorialKickedRef.current = true;
      setTimeout(() => setShowTutorial(true), 600);
    }
  }, [user]);

  const drinkWater = async () => {
    setHydrating(true);
    try { await http.post("/hydration", { glasses: 1 }); await load(); toast.success("+1 glass"); } catch {}
    setHydrating(false);
  };
  const logEnergy = async (level) => {
    await http.post("/checkin/energy", { level }); toast.success("Energy logged");
  };
  const submitGratitude = async () => {
    if (!grat.trim()) return;
    await http.post("/checkin/gratitude", { text: grat });
    setGrat(""); toast.success("Saved 🙏");
  };

  if (!data) return <AppShell><div className="text-white/40 p-10">Loading your space…</div></AppShell>;

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <AppShell>
      <PageHeader
        eyebrow={today}
        title={`${greet}, ${data.name}.`}
        subtitle={data.affirmation}
      />

      <div className="grid grid-cols-12 gap-4">
        {/* Mood orb widget */}
        <Card className="col-span-12 md:col-span-4 flex items-center gap-5" accent="#ec4899">
          <div className="mood-bubble" style={{ "--bb": data.latest_mood?.color || "#a78bfa", width: 78, height: 78 }} />
          <div>
            <div className="text-xs uppercase tracking-widest text-white/40">today's mood</div>
            <div className="font-display text-3xl capitalize">{data.latest_mood?.emotion || "Not logged"}</div>
            <button onClick={() => nav("/app/mood")} data-testid="dash-log-mood" className="text-xs text-pink-300 mt-1 hover:underline">log mood →</button>
          </div>
        </Card>

        {/* Wellness score ring */}
        <Card className="col-span-6 md:col-span-4 flex items-center gap-5" accent="#a78bfa">
          <div className="relative">
            <Ring value={data.wellness_score} color="#a78bfa" />
            <div className="absolute inset-0 flex items-center justify-center font-display text-2xl">{data.wellness_score}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-white/40">wellness score</div>
            <div className="text-sm text-white/70 max-w-[180px]">A blend of your mood, journaling and habits.</div>
          </div>
        </Card>

        {/* Streak */}
        <Card className="col-span-6 md:col-span-4 flex items-center gap-5" accent="#f59e0b">
          <Flame size={48} className="text-amber-400" />
          <div>
            <div className="text-xs uppercase tracking-widest text-white/40">streak</div>
            <div className="font-display text-4xl text-amber-300">{data.streak}<span className="text-base text-white/40 ml-1">days</span></div>
            <div className="text-xs text-white/50">keep journaling daily</div>
          </div>
        </Card>

        {/* AI insight */}
        <Card className="col-span-12 md:col-span-8 relative overflow-hidden" accent="#c084fc">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-purple-300">
            <Sparkles size={14} /> insight of the day
          </div>
          <div className="text-xl mt-3 leading-relaxed">{data.insight}</div>
        </Card>

        {/* Daily verse */}
        {verse && (
          <Card className="col-span-12 md:col-span-4 relative overflow-hidden" accent="#fb7185">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-rose-300">
              <BookHeart size={14} /> {verse.tradition} · today
            </div>
            <div className="text-base mt-3 leading-relaxed italic">"{verse.verse}"</div>
            <div className="text-xs text-white/40 mt-2">— {verse.reference}</div>
            <div className="text-xs text-white/70 mt-3">{verse.reflection}</div>
          </Card>
        )}

        {/* Mood trend */}
        <Card className="col-span-12 md:col-span-4" accent="#ec4899">
          <div className="text-xs uppercase tracking-widest text-white/40">7-day mood</div>
          <div className="mt-3"><Sparkline data={(data.week_moods || []).slice(-10)} /></div>
          <div className="text-xs text-white/40 mt-1">{(data.week_moods || []).length} entries</div>
        </Card>

        {/* Sleep */}
        <Card className="col-span-6 md:col-span-3" accent="#60a5fa">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-blue-300"><Moon size={14} /> last night</div>
          {data.last_sleep ? (
            <div className="mt-3">
              <div className="font-display text-3xl">{data.last_sleep.quality}<span className="text-sm text-white/40">/5</span></div>
              <div className="text-xs text-white/40">{data.last_sleep.bedtime} → {data.last_sleep.wake_time}</div>
            </div>
          ) : <button onClick={() => nav("/app/sleep")} className="text-xs text-blue-300 mt-3">log sleep →</button>}
        </Card>

        {/* Hydration */}
        <Card className="col-span-6 md:col-span-3" accent="#14b8a6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-teal-300"><Droplets size={14} /> water</div>
          <div className="font-display text-3xl mt-2">{data.hydration?.glasses || 0}<span className="text-sm text-white/40">/8</span></div>
          <button onClick={drinkWater} disabled={hydrating} data-testid="dash-water-btn"
            className="mt-2 text-xs px-3 py-1.5 rounded-full border border-teal-400/40 hover:bg-teal-500/10">+ 1 glass</button>
        </Card>

        {/* Today exercise */}
        <Card className="col-span-12 md:col-span-3" accent="#f59e0b">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-300"><Activity size={14} /> today move</div>
          <div className="text-base mt-2">Tap to load your AI-picked exercise</div>
          <button onClick={() => nav("/app/exercise")} className="text-xs text-amber-300 mt-2 hover:underline">open →</button>
        </Card>

        {/* Energy check */}
        <Card className="col-span-12 md:col-span-3" accent="#10b981">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-300"><HeartPulse size={14} /> energy</div>
          <div className="flex gap-1.5 mt-3">
            {["😴", "😕", "🙂", "😊", "⚡"].map((e, i) => (
              <button key={i} onClick={() => logEnergy(i + 1)} data-testid={`energy-${i + 1}`}
                className="text-2xl hover:scale-125 transition">{e}</button>
            ))}
          </div>
        </Card>

        {/* Heatmap */}
        <Card className="col-span-12 md:col-span-8" accent="#ec4899">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-widest text-pink-300">last 30 days · mood heatmap</div>
            <TrendingUp size={14} className="text-pink-300" />
          </div>
          <Heatmap data={data.heatmap} />
        </Card>

        {/* Top disturbance */}
        <Card className="col-span-12 md:col-span-4" accent="#ef4444">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-red-300"><Search size={14} /> top disturbance</div>
          {data.top_disturbance ? (
            <>
              <div className="font-display text-2xl mt-3 capitalize">{data.top_disturbance.topic}</div>
              <div className="text-xs text-white/50">mentioned {data.top_disturbance.count}×</div>
              <button onClick={() => nav("/app/disturbance")} className="text-xs text-red-300 mt-2 hover:underline">see all →</button>
            </>
          ) : <div className="text-sm text-white/40 mt-3">Nothing detected yet — keep journaling.</div>}
        </Card>

        {/* Gratitude */}
        <Card className="col-span-12 md:col-span-6" accent="#a78bfa">
          <div className="text-xs uppercase tracking-widest text-purple-300">gratitude prompt</div>
          <div className="text-lg mt-2">Name one thing you're grateful for today.</div>
          <div className="mt-3 flex gap-2">
            <input data-testid="dash-gratitude-input" value={grat} onChange={(e) => setGrat(e.target.value)} placeholder="A small thing counts…"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-purple-400/50" />
            <button onClick={submitGratitude} data-testid="dash-gratitude-save"
              className="px-4 rounded-xl bg-white text-black text-sm hover:scale-[1.03] transition">save</button>
          </div>
        </Card>

        {/* Next appointment */}
        <Card className="col-span-12 md:col-span-3" accent="#22d3ee">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-300"><CalendarClock size={14} /> upcoming</div>
          {data.next_appt ? (
            <>
              <div className="font-display text-lg mt-2 capitalize">{data.next_appt.provider_type}</div>
              <div className="text-xs text-white/50">{new Date(data.next_appt.date).toLocaleString()}</div>
            </>
          ) : <button onClick={() => nav("/app/appointments")} className="text-xs text-cyan-300 mt-3">book one →</button>}
        </Card>

        {/* Assessment due */}
        <Card className="col-span-12 md:col-span-3 cursor-pointer" onClick={() => nav("/app/assessments")} accent="#60a5fa">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-blue-300"><ClipboardList size={14} /> assessment ready</div>
          <div className="text-base mt-2">Take your weekly PHQ-9</div>
          <div className="text-xs text-white/40 mt-1">5 min · gentle questions</div>
        </Card>

        {/* Breathing shortcut */}
        <Card className="col-span-12 md:col-span-6 cursor-pointer" onClick={() => nav("/app/meditation")} accent="#14b8a6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-teal-300"><Wind size={14} /> breathing</div>
              <div className="font-display text-2xl mt-2">4-7-8 reset</div>
              <div className="text-xs text-white/50 mt-1">Calm down in under 2 minutes.</div>
            </div>
            <div className="w-20 h-20 rounded-full" style={{ background: "radial-gradient(circle, #14b8a6, transparent 70%)", animation: "breathe 4s ease-in-out infinite" }} />
          </div>
        </Card>
      </div>
      <TutorialOverlay
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </AppShell>
  );
};

export default Dashboard;
