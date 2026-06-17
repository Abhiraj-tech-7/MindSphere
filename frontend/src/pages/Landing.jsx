import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { AuroraBackground } from "../components/AuroraBackground";
import { InteractiveBackground } from "../components/InteractiveBackground";
import { RobotMascot } from "../components/RobotMascot";
import { SpotlightCard } from "../components/SpotlightCard";
import {
  BookOpen, Smile, Mic, Salad, ClipboardList, Activity, Calendar, Search,
  ArrowRight, Sparkles, Moon, HeartPulse, Brain, ShieldCheck, Star, Quote,
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

const pillars = [
  { icon: Brain, label: "Understands context" },
  { icon: HeartPulse, label: "Tracks how you feel" },
  { icon: Moon, label: "Protects your sleep" },
  { icon: ShieldCheck, label: "Private by design" },
];

const testimonials = [
  { name: "Maya R.", role: "Designer", quote: "It's the first app that feels like it actually gets me. Lyra remembers what I said last week.", color: "#c084fc" },
  { name: "Daniel K.", role: "Student", quote: "The mood orbs made me realize my Sundays were quietly wrecking me. Small change, huge difference.", color: "#14b8a6" },
  { name: "Priya S.", role: "Nurse", quote: "After night shifts, the sleep + diet guidance is the only thing keeping me human.", color: "#ec4899" },
  { name: "Leo M.", role: "Founder", quote: "I journal by voice on my commute now. Seeing the patterns surface is genuinely eye-opening.", color: "#f59e0b" },
];

const Counter = ({ to, suffix = "", duration = 1.6 }) => {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  useEffect(() => {
    if (!inView) return;
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <InteractiveBackground />
      <AuroraBackground />

      {/* nav */}
      <motion.nav
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 inset-x-0 z-30 flex items-center justify-between px-6 sm:px-8 py-4 transition-all duration-300 ${
          scrolled ? "backdrop-blur-xl bg-black/40 border-b border-white/5" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="mood-bubble" style={{ "--bb": "#c084fc", width: 32, height: 32 }} />
          <div className="font-display text-xl">MindSphere</div>
        </div>
        <div className="hidden md:flex items-center gap-7 text-sm text-white/60">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#how" className="hover:text-white transition">How it works</a>
          <a href="#voices" className="hover:text-white transition">Voices</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth" data-testid="nav-signin" className="text-sm text-white/70 hover:text-white px-4 py-2">Sign in</Link>
          <Link to="/auth?mode=signup" data-testid="nav-getstarted"
            className="text-sm px-5 py-2.5 rounded-full bg-white text-black hover:bg-white/90 transition font-medium">
            Get started
          </Link>
        </div>
      </motion.nav>

      {/* hero */}
      <section className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center gap-8 px-6 pt-28 pb-16 max-w-7xl mx-auto">
        {/* copy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex-1 text-center lg:text-left"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
            <Sparkles size={12} /> built with care, powered by AI
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl mt-6 text-glow leading-[0.95]">
            Your mind,<br />
            <span className="text-gradient">understood.</span>
          </h1>
          <p className="mt-6 text-lg text-white/55 max-w-xl mx-auto lg:mx-0">
            Meet your AI wellness companion. MindSphere listens, learns, and gently guides you —
            through journaling, moods, sleep, movement and real conversations.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center lg:justify-start gap-4">
            <Link to="/auth?mode=signup" data-testid="hero-cta" className="btn-pulse inline-flex items-center gap-2 px-7 py-4 rounded-full bg-white text-black font-medium hover:scale-[1.03] transition">
              Get Started Free <ArrowRight size={18} />
            </Link>
            <a href="#features" className="inline-flex items-center gap-2 px-6 py-4 rounded-full border border-white/15 text-white/80 hover:bg-white/5 transition">
              Explore features
            </a>
          </div>
          {/* trust pillars */}
          <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3">
            {pillars.map((p) => (
              <div key={p.label} className="flex items-center gap-2 text-xs text-white/45">
                <p.icon size={14} className="text-white/60" />
                {p.label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* interactive mascot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="flex-1 flex items-center justify-center"
        >
          <RobotMascot size={460} className="drop-shadow-2xl" />
        </motion.div>
      </section>

      {/* marquee strip */}
      <section aria-hidden className="relative z-10 border-y border-white/5 py-5 overflow-hidden">
        <div className="marquee-track gap-12 text-white/30 text-sm tracking-[0.25em] uppercase">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ["Journaling", "Mood Tracking", "AI Voice", "Sleep", "Nutrition", "Meditation", "Assessments", "Analytics"].map((w) => (
              <span key={`${k}-${w}`} className="flex items-center gap-12">{w}<Star size={10} className="text-white/20" /></span>
            ))
          )}
        </div>
      </section>

      {/* features */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-24 scroll-mt-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <div className="text-[11px] tracking-[0.3em] uppercase text-white/40 mb-3">eight ways to feel better</div>
          <h2 className="font-display text-4xl sm:text-5xl text-balance">Everything your mind needs, in one place.</h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              data-testid={`feature-${i}`}
            >
              <SpotlightCard className="p-6 group h-full" style={{ borderColor: `${f.color}33` }}>
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
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="relative z-10 max-w-5xl mx-auto px-6 py-24 scroll-mt-24">
        <div className="text-center mb-16">
          <div className="text-[11px] tracking-[0.3em] uppercase text-white/40 mb-3">how it works</div>
          <h2 className="font-display text-4xl sm:text-5xl text-balance">Three steps to a clearer mind.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 relative">
          <div className="absolute top-1/2 left-[15%] right-[15%] h-px hidden md:block" style={{ background: "linear-gradient(90deg, transparent, #c084fc55, transparent)" }} />
          {[
            { n: "01", t: "Tell us your story", d: "A short, gentle onboarding to learn what matters to you." },
            { n: "02", t: "Live your day", d: "Journal, track moods, and chat with Lyra in plain language." },
            { n: "03", t: "See the patterns", d: "We surface the threads — so you can choose a better one." },
          ].map((s, i) => (
            <motion.div key={s.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <SpotlightCard className="p-7 text-center" tilt={false}>
                <div className="font-display text-5xl" style={{ color: ["#c084fc", "#ec4899", "#14b8a6"][i] }}>{s.n}</div>
                <div className="mt-4 text-xl">{s.t}</div>
                <div className="text-sm text-white/55 mt-2">{s.d}</div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* testimonials */}
      <section id="voices" className="relative z-10 max-w-6xl mx-auto px-6 py-24 scroll-mt-24">
        <div className="text-center mb-14">
          <div className="text-[11px] tracking-[0.3em] uppercase text-white/40 mb-3">voices</div>
          <h2 className="font-display text-4xl sm:text-5xl text-balance">People feel the difference.</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {testimonials.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <SpotlightCard className="p-6 h-full flex flex-col">
                <Quote size={22} style={{ color: t.color }} />
                <p className="text-sm text-white/70 mt-4 leading-relaxed flex-1">{t.quote}</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="mood-bubble" style={{ "--bb": t.color, width: 34, height: 34 }} />
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-white/40">{t.role}</div>
                  </div>
                </div>
              </SpotlightCard>
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
          <SpotlightCard key={st.l} className="p-8 text-center" tilt={false}>
            <Counter to={st.n} suffix={st.s} />
            <div className="text-white/50 text-sm mt-2">{st.l}</div>
          </SpotlightCard>
        ))}
      </section>

      {/* final CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-display text-4xl sm:text-6xl text-glow text-balance">
            Start the conversation <span className="text-gradient">with yourself.</span>
          </h2>
          <p className="mt-5 text-white/55 max-w-lg mx-auto">
            Free to begin. No card required. Your data stays yours.
          </p>
          <Link to="/auth?mode=signup" className="btn-pulse inline-flex items-center gap-2 mt-9 px-8 py-4 rounded-full bg-white text-black font-medium hover:scale-[1.03] transition">
            Get Started Free <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-white/5 px-6 py-10 text-center text-white/40 text-xs">
        © 2026 MindSphere · Not a substitute for clinical care. In crisis? Call or text 988 (US).
      </footer>
    </div>
  );
};

export default Landing;
