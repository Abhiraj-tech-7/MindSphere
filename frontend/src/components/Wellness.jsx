import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowRight, Sparkles } from "lucide-react";
import { http } from "../lib/api";

const HABIT_EMOJI = { journal: "📓", mood: "😊", meditation: "🧘", hydration: "💧", gratitude: "🙏" };
const HABIT_LABEL = { journal: "Journal", mood: "Mood", meditation: "Meditate", hydration: "Hydrate", gratitude: "Gratitude" };

const scoreColor = (s) => (s <= 40 ? "#EF4444" : s <= 65 ? "#F59E0B" : "#10B981");

export const WellnessRing = () => {
  const [data, setData] = useState(null);
  useEffect(() => {
    http.get("/wellness/score").then(({ data }) => setData(data)).catch(() => setData(null));
  }, []);
  if (!data) {
    return <div className="glass p-6 h-[260px] animate-pulse" data-testid="wellness-ring-loading" />;
  }
  const r = 90, c = 2 * Math.PI * r;
  const off = c - (data.score / 100) * c;
  const color = scoreColor(data.score);
  const diff = data.score - data.yesterday_score;
  const trendIcon = data.trend === "up" ? <TrendingUp size={14} className="text-emerald-300" /> : data.trend === "down" ? <TrendingDown size={14} className="text-red-300" /> : <ArrowRight size={14} className="text-white/40" />;
  return (
    <div className="glass p-6 relative overflow-hidden" data-testid="wellness-ring">
      <div className="flex items-start gap-6">
        <div className="relative" style={{ width: 200, height: 200 }}>
          <svg width="200" height="200" className="-rotate-90">
            <circle cx="100" cy="100" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="none" />
            <motion.circle
              cx="100" cy="100" r={r} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: off }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-display text-5xl text-white" style={{ color }} data-testid="wellness-score">{data.score}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/40">wellness · today</div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 text-xs text-white/55">
            {trendIcon}
            <span>{diff >= 0 ? "+" : ""}{diff} vs yesterday ({data.yesterday_score})</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-white/80 italic mb-4">
            <Sparkles size={14} className="text-purple-300 mt-0.5 shrink-0" />
            <span>{data.insight}</span>
          </div>
          <div className="space-y-1.5">
            {[
              { k: "mood", max: 30 },
              { k: "sleep", max: 25 },
              { k: "journal", max: 20 },
              { k: "breathing", max: 15 },
              { k: "hydration", max: 10 },
            ].map(({ k, max }) => {
              const v = data.breakdown?.[k] ?? 0;
              const pct = max ? (v / max) * 100 : 0;
              return (
                <div key={k} className="text-[11px]">
                  <div className="flex justify-between text-white/50 mb-0.5">
                    <span className="capitalize">{k}</span>
                    <span>{v}/{max}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: "easeOut" }}
                      className="h-full rounded-full" style={{ background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const StreakRow = ({ onMilestone }) => {
  const [streaks, setStreaks] = useState([]);
  useEffect(() => {
    http.post("/streaks/check").then(({ data }) => {
      setStreaks(data.streaks || []);
      if (data.milestones?.length && onMilestone) onMilestone(data.milestones[0]);
    }).catch(() => {});
  }, []);
  if (!streaks.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5" data-testid="streak-row">
      {streaks.map((s) => {
        const active = s.current_streak > 0;
        return (
          <div
            key={s.habit}
            data-testid={`streak-${s.habit}`}
            className="glass p-3 text-center relative overflow-hidden"
            style={{ boxShadow: active ? "0 0 24px -8px rgba(192,132,252,0.45)" : "none" }}
          >
            <div className="text-2xl mb-1">{HABIT_EMOJI[s.habit]}</div>
            <div className="font-display text-xl text-white">{s.current_streak}</div>
            <div className="text-[9px] uppercase tracking-widest text-white/40">{HABIT_LABEL[s.habit]}</div>
            {s.longest_streak > 0 && s.longest_streak > s.current_streak && (
              <div className="text-[8px] text-white/30 mt-0.5">best {s.longest_streak}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const MilestoneModal = ({ milestone, onClose }) => {
  return (
    <AnimatePresence>
      {milestone && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md"
          data-testid="milestone-modal"
        >
          {/* Confetti */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => {
              const colors = ["#a78bfa", "#ec4899", "#fbbf24", "#10b981", "#60a5fa"];
              const left = Math.random() * 100;
              const delay = Math.random() * 1.2;
              const duration = 2.5 + Math.random() * 2;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute", top: "-10px", left: `${left}%`,
                    width: 8, height: 14, background: colors[i % colors.length],
                    animation: `ms-confetti ${duration}s linear ${delay}s infinite`,
                    borderRadius: "2px",
                  }}
                />
              );
            })}
          </div>
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            className="relative rounded-3xl p-8 max-w-md text-center bg-[#0b0b15] border border-white/10 shadow-2xl"
          >
            <div className="text-7xl mb-3">{HABIT_EMOJI[milestone.habit] || "🔥"}</div>
            <div className="font-display text-3xl text-white mb-2">{milestone.milestone} Day Streak!</div>
            <p className="text-sm text-white/65 mb-6">
              You've {HABIT_LABEL[milestone.habit]?.toLowerCase()}ed every day for {milestone.milestone} days. That's real consistency.
            </p>
            <button
              onClick={onClose}
              data-testid="milestone-close"
              className="px-6 py-2.5 rounded-full bg-purple-400 text-black font-medium hover:scale-[1.02] transition"
            >
              Keep Going 💜
            </button>
          </motion.div>
          <style>{`
            @keyframes ms-confetti {
              0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
