import React, { useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { AuroraBackground } from "../components/AuroraBackground";
import { MindOrb } from "../components/MindOrb";
import {
  BookOpen, Smile, Mic, Salad, ClipboardList, Activity, Calendar, Search, ArrowRight, Sparkles,
} from "lucide-react";

const features = [
  { icon: BookOpen, title: "AI Mind Journal", desc: "Floating thought-bubbles that learn your emotional weather.", color: "#c084fc" },
  { icon: Smile, title: "Mood Bubble Tracker", desc: "Pretty orbs that map your inner sky day by day.", color: "#ec4899" },
  { icon: Mic, title: "Real-Time AI Voice", desc: "Talk to Lyra like a friend — she actually listens.", color: "#10b981" },
  { icon: Salad, title: "Personalized Diet", desc: "Meal plans tuned to your mood, not just your macros.", color: "#14b8a6" },
  { icon: ClipboardList, title: "Mental Health Assessments", desc: "PHQ-9, GAD-7, PSS and more — beautifully gentle.", color: "#60a5fa" },
  { icon: Activity, title: "Exercise & Movement", desc: "Workouts that match your energy, not punish it.", color: "#f59e0b" },
  { icon: Calendar, title: "Appointment Scheduler", desc: "Therapist-ready, with talking points generated for you.", color: "#22d3ee" },
  { icon: Search, title: "Disturbance Detector", desc: "AI quietly notices your patterns before you do.", color: "#ef4444" },
];

const Counter = ({ to, suffix = "", duration = 1.6 }) => {
  const [n, setN] = useState(0);
  const ref = React.useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = (t0, t) => {
      const p = Math.min(1, (t - t0) / (duration * 1000));
      setN(Math.floor(p * to));
      if (p < 1) requestAnimationFrame((tt) => step(t0, tt));
    };
    requestAnimationFrame((t) => step(t, t));
  }, [inView, to, duration]);
  return <span ref={ref} className="font-display text-5xl text-white">{n.toLocaleString()}{suffix}</span>;
};

const Landing = () => {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <AuroraBackground />
      {/* nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="mood-bubble" style={{ "--bb": "#c084fc", width: 32, height: 32 }} />
          <div className="font-display text-xl">MindSphere</div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth" data-testid="nav-signin" className="text-sm text-white/70 hover:text-white px-4 py-2">Sign in</Link>
          <Link to="/auth?mode=signup" data-testid="nav-getstarted"
            className="text-sm px-5 py-2.5 rounded-full bg-white text-black hover:bg-white/90 transition font-medium">
            Get started
          </Link>
        </div>
      </nav>

      {/* hero */}
      <section className="relative z-10 min-h-[88vh] flex flex-col items-center justify-center text-center px-6">
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }}>
          <MindOrb size={400} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }}>
          <div className="mt-12 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
            <Sparkles size={12} /> built with care, powered by AI
          </div>
          <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl mt-6 text-glow leading-[0.95]">
            Your mind,<br /><span style={{ background: "linear-gradient(90deg, #c084fc, #ec4899, #f59e0b)", WebkitBackgroundClip: "text", color: "transparent" }}>understood.</span>
          </h1>
          <p className="mt-6 text-lg text-white/55 max-w-xl mx-auto">
            The AI-powered mental wellness platform that listens, learns, and guides you — every single day.
          </p>
          <Link to="/auth?mode=signup" data-testid="hero-cta" className="btn-pulse inline-flex items-center gap-2 mt-10 px-7 py-4 rounded-full bg-white text-black font-medium hover:scale-[1.03] transition">
            Get Started Free <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <div className="text-[11px] tracking-[0.3em] uppercase text-white/40 mb-3">eight ways to feel better</div>
          <h2 className="font-display text-4xl sm:text-5xl">Everything your mind needs, in one place.</h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="glass p-6 group cursor-default relative overflow-hidden"
              style={{ borderColor: `${f.color}33` }}
              data-testid={`feature-${i}`}
            >
              <div className="absolute -inset-1 opacity-0 group-hover:opacity-100 transition pointer-events-none" style={{
                background: `radial-gradient(circle at 50% 0%, ${f.color}33, transparent 60%)`,
              }} />
              <div className="relative">
                <motion.div whileHover={{ rotate: 15, scale: 1.1 }} className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: `${f.color}22`, boxShadow: `0 0 30px ${f.color}33` }}>
                  <f.icon size={20} style={{ color: f.color }} />
                </motion.div>
                <div className="text-lg font-medium">{f.title}</div>
                <div className="text-sm text-white/55 mt-1.5">{f.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="text-[11px] tracking-[0.3em] uppercase text-white/40 mb-3">how it works</div>
          <h2 className="font-display text-4xl sm:text-5xl">Three steps to a clearer mind.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 relative">
          <div className="absolute top-1/2 left-[15%] right-[15%] h-px hidden md:block" style={{ background: "linear-gradient(90deg, transparent, #c084fc55, transparent)" }} />
          {[
            { n: "01", t: "Tell us your story", d: "A short, gentle onboarding to learn what matters to you." },
            { n: "02", t: "Live your day", d: "Journal, track moods, and chat with Lyra in plain language." },
            { n: "03", t: "See the patterns", d: "We surface the threads — so you can choose a better one." },
          ].map((s, i) => (
            <motion.div key={s.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass glass-hover p-7 text-center relative">
              <div className="font-display text-5xl" style={{ color: ["#c084fc", "#ec4899", "#14b8a6"][i] }}>{s.n}</div>
              <div className="mt-4 text-xl">{s.t}</div>
              <div className="text-sm text-white/55 mt-2">{s.d}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* stats */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-6">
        {[
          { n: 10000, s: "+", l: "journal entries analyzed" },
          { n: 94, s: "%", l: "mood improvement rate" },
          { n: 500, s: "+", l: "mental health exercises" },
        ].map((st) => (
          <div key={st.l} className="glass p-8 text-center">
            <Counter to={st.n} suffix={st.s} />
            <div className="text-white/50 text-sm mt-2">{st.l}</div>
          </div>
        ))}
      </section>

      <footer className="relative z-10 border-t border-white/5 px-6 py-10 text-center text-white/40 text-xs">
        © 2026 MindSphere · Not a substitute for clinical care. In crisis? Call or text 988 (US).
      </footer>
    </div>
  );
};

export default Landing;
