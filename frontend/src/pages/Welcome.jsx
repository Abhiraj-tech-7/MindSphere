import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Volume2 } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import useDocTitle from "../hooks/useDocTitle";

const personalityFromOnboarding = (onb = {}) => {
  const stress = (onb.stressors || []).map(String).map((s) => s.toLowerCase()).join(" ");
  const goal = (onb.primary_goal || "").toLowerCase();
  if (/work|career|finance|money/.test(stress)) {
    return { name: "Analytical Lyra", color: "#60a5fa", desc: "calm, structured, evidence-based" };
  }
  if (/relationship|social|connection|friends|family/.test(goal) || /relationship|social|connection/.test(stress)) {
    return { name: "Warm Lyra", color: "#ec4899", desc: "empathetic, gentle, relational" };
  }
  return { name: "Motivational Lyra", color: "#10b981", desc: "energetic, encouraging, solution-focused" };
};

const Welcome = () => {
  useDocTitle("Welcome");
  const { user } = useAuth();
  const nav = useNavigate();
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    // Redirect if user isn't ready
    if (!user) nav("/auth");
  }, [user, nav]);

  if (!user) return null;
  const onb = user.onboarding || {};
  const personality = personalityFromOnboarding(onb);
  const goals = [];
  if (onb.primary_goal) goals.push(onb.primary_goal);
  if (Array.isArray(onb.positive_triggers) && onb.positive_triggers.length) goals.push(`Lean into ${onb.positive_triggers.slice(0, 2).join(" & ")}`);
  while (goals.length < 2) goals.push("Build steadier daily rhythms");

  const meetLyra = () => {
    setPlayed(true);
    try {
      const u = new SpeechSynthesisUtterance(
        `Hi ${user.name}, I'm Lyra. I'm here to support your wellness journey. Let's take this one day at a time.`
      );
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center px-6 font-body">
      <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.16),transparent_58%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1),#000_82%)] pointer-events-none" />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative max-w-xl w-full text-center" data-testid="welcome-screen">
        <div className="liquid-glass inline-flex items-center gap-2 rounded-full px-1.5 py-1.5">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">Welcome</span>
          <span className="pr-3 text-sm text-white/90">your MindSphere is ready</span>
        </div>
        <h1 className="mt-6 font-heading italic text-6xl leading-[0.88] text-white sm:text-7xl">Welcome, {user.name}</h1>
        <p className="text-white/70 mt-5 mb-8">Your 7-day free trial has started. No credit card needed.</p>

        <div className="liquid-glass text-left rounded-[1.25rem] p-6 mb-5">
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/55 mb-3">your wellness focus</div>
          <ul className="space-y-2">
            {goals.slice(0, 2).map((g, i) => (
              <li key={i} className="text-sm text-white/90 flex gap-2">
                <Sparkles size={14} className="text-white mt-0.5" /> {g}
              </li>
            ))}
          </ul>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          className="liquid-glass-strong rounded-[1.25rem] p-6 mb-5"
          data-testid="welcome-personality">
          <div className="text-[10px] uppercase tracking-[0.25em] mb-2 text-white/55">your lyra</div>
          <div className="font-heading italic text-4xl leading-none text-white">{personality.name}</div>
          <div className="text-sm text-white/65 mt-2">{personality.desc}</div>
          <button onClick={meetLyra} data-testid="meet-lyra-btn"
            className="mt-5 px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium flex items-center gap-2 mx-auto hover:bg-white/90">
            <Volume2 size={14} /> Meet Lyra
          </button>
          {played && <div className="text-[11px] text-white/40 mt-2">If you can't hear it, your browser may need permission to play audio.</div>}
        </motion.div>

        <button onClick={() => nav("/app/dashboard")} data-testid="enter-dashboard-btn"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-black font-medium hover:bg-white/90">
          Enter MindSphere <ArrowRight size={16} />
        </button>
      </motion.div>
    </div>
  );
};

export default Welcome;
