import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, Star, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { http } from "../lib/api";
import { useAuth } from "../lib/auth.jsx";
import { toast } from "sonner";
import useDocTitle from "../hooks/useDocTitle";

const PRO_FEATURES = [
  "AI journaling & emotion detection (up to daily cap)",
  "Lyra Voice — real-time voice AI (5 sessions/day, 10 min each)",
  "Full Lyra AI companion chat (CBT-informed support)",
  "7-day personalised meal plans + recipe library",
  "Mood-adaptive exercise programs",
  "PHQ-9, GAD-7 & complete mental health assessments",
  "AI disturbance pattern detection",
  "Sleep tracking & bedtime AI coaching",
  "Appointment scheduling",
  "Meditation, breathing & mindfulness tools",
  "Full analytics dashboard + mood forecasting",
  "Gratitude journal & weekly AI reflections",
  "Priority support",
];

const FREE_FEATURES = [
  "2 journal entries (lifetime)",
  "Basic mood tracking",
  "Meditation & breathing",
  "Sleep tracking",
  "Community board",
];

const TESTIMONIALS = [
  { quote: "MindSphere helped me understand my anxiety patterns in a way no other app has. The disturbance detection spotted that my anxiety spikes every Sunday evening — now I have a ritual to counter it.", name: "Sarah K.", meta: "28 · Toronto" },
  { quote: "Lyra's voice mode is genuinely unlike anything I've tried. It felt like talking to someone who actually remembered everything about me. I cancelled my 3 other wellness apps.", name: "Marcus T.", meta: "34 · Vancouver" },
  { quote: "As someone who's been to therapy for years, I was sceptical. But MindSphere's journaling and emotion detection gave me insights I'd never surfaced with a human therapist. Wild.", name: "Priya M.", meta: "31 · London" },
  { quote: "The meal plans that connect to my mood state are surprisingly accurate. When I'm anxious, it suggests foods I genuinely find calming. The science behind it shows.", name: "James L.", meta: "41 · New York" },
  { quote: "I did the PHQ-9 and the AI interpretation was kinder and more useful than I expected. It didn't just give me a score — it gave me a path forward.", name: "Aisha R.", meta: "26 · Montreal" },
  { quote: "7 days felt too short for the free trial. I upgraded on day 3.", name: "Daniel H.", meta: "29 · Calgary" },
];

const FAQS = [
  { q: "Can I cancel anytime?", a: "Yes. Cancel from your settings at any time — no penalties, no questions asked." },
  { q: "What happens when my trial ends?", a: "Your account moves to the free tier automatically. Your data is always safe. Upgrade whenever you're ready." },
  { q: "Is my data private?", a: "Yes. We never sell your data. See our Privacy Policy." },
  { q: "Do you offer refunds?", a: "We don't offer partial-month refunds, but you can cancel before your next billing date to avoid future charges." },
  { q: "What is the AI cost cap?", a: "To keep the service sustainable, Pro accounts have a generous daily AI usage cap. If you hit it, core features like mood logging still work, and top-ups are available." },
];

const Pricing = () => {
  useDocTitle("Pricing");
  const { user } = useAuth();
  const nav = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const upgrade = async (plan) => {
    if (!user) {
      nav("/auth?mode=signup");
      return;
    }
    setLoadingPlan(plan);
    try {
      const { data } = await http.post("/billing/create-checkout-session", { plan });
      window.location.href = data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start checkout");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between">
        <button onClick={() => nav("/")} className="font-display text-xl tracking-tight" data-testid="pricing-logo">MindSphere</button>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <button onClick={() => nav("/app/dashboard")} className="text-white/70 hover:text-white" data-testid="pricing-dashboard">Dashboard</button>
          ) : (
            <button onClick={() => nav("/auth")} className="text-white/70 hover:text-white" data-testid="pricing-signin">Sign in</button>
          )}
        </nav>
      </header>

      <main className="px-4 sm:px-6 max-w-6xl mx-auto pb-32">
        <div className="relative pt-12 pb-16 text-center">
          <div className="absolute inset-x-0 -top-10 h-72 bg-[radial-gradient(ellipse_at_top,rgba(192,132,252,0.18),transparent_60%)] pointer-events-none" />
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="text-[11px] tracking-[0.3em] uppercase text-purple-300 mb-3">choose your space</div>
            <h1 className="font-display text-4xl sm:text-6xl leading-tight tracking-tight">Begin gently. Stay if it helps.</h1>
            <p className="text-white/55 mt-4 max-w-xl mx-auto">Every plan starts with a 7-day free trial — no credit card needed. Cancel any time, from inside the app.</p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 flex flex-col" data-testid="plan-trial-card">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">start free</div>
            <div className="font-display text-3xl mb-1">7 days free</div>
            <div className="text-sm text-white/50 mb-6">then $14.99/month</div>
            <ul className="space-y-2.5 text-sm text-white/75 mb-7 flex-1">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className="flex gap-2"><span className="text-purple-300 mt-0.5">✦</span>{f}</li>
              ))}
            </ul>
            <button onClick={() => nav("/auth?mode=signup")} data-testid="plan-trial-cta"
              className="w-full py-3 rounded-full border border-white/15 hover:bg-white/5 transition text-sm">Start Free Trial</button>
            <div className="text-[11px] text-white/40 mt-2 text-center">No credit card required</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="relative rounded-3xl p-7 flex flex-col" data-testid="plan-monthly-card"
            style={{ background: "linear-gradient(180deg, rgba(192,132,252,0.10), rgba(139,92,246,0.04))", border: "1px solid rgba(192,132,252,0.35)", boxShadow: "0 0 60px -10px rgba(192,132,252,0.30)" }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest bg-purple-400 text-black font-medium">Most Popular</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-purple-300 mb-2">MindSphere Pro</div>
            <div className="font-display text-4xl mb-1">$14.99<span className="text-base text-white/50">/month</span></div>
            <div className="text-sm text-white/50 mb-6">Billed monthly, cancel anytime</div>
            <ul className="space-y-2.5 text-sm text-white/85 mb-7 flex-1">
              {PRO_FEATURES.slice(0, 8).map((f, i) => (
                <li key={i} className="flex gap-2"><span className="text-purple-300 mt-0.5">✦</span>{f}</li>
              ))}
              <li className="text-xs text-white/40 pl-5">+ {PRO_FEATURES.length - 8} more Pro features</li>
            </ul>
            <button onClick={() => upgrade("monthly")} disabled={loadingPlan === "monthly"} data-testid="plan-monthly-cta"
              className="w-full py-3 rounded-full bg-purple-400 text-black hover:scale-[1.02] transition text-sm font-medium disabled:opacity-50">
              {loadingPlan === "monthly" ? "Opening checkout…" : "Upgrade to Pro"}
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 flex flex-col relative" data-testid="plan-annual-card">
            <div className="absolute top-0 right-5 -translate-y-1/2 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest bg-emerald-400 text-black font-medium">Best Value · Save $30</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 mb-2">MindSphere Pro</div>
            <div className="font-display text-4xl mb-1">$12.49<span className="text-base text-white/50">/month</span></div>
            <div className="text-sm text-white/50 mb-1">Billed $149.99/year</div>
            <div className="text-xs text-emerald-300 mb-6">That's 2 months free vs. monthly</div>
            <ul className="space-y-2.5 text-sm text-white/85 mb-7 flex-1">
              {PRO_FEATURES.slice(0, 8).map((f, i) => (
                <li key={i} className="flex gap-2"><span className="text-emerald-300 mt-0.5">✦</span>{f}</li>
              ))}
              <li className="text-xs text-white/40 pl-5">+ {PRO_FEATURES.length - 8} more Pro features</li>
            </ul>
            <button onClick={() => upgrade("annual")} disabled={loadingPlan === "annual"} data-testid="plan-annual-cta"
              className="w-full py-3 rounded-full bg-emerald-400 text-black hover:scale-[1.02] transition text-sm font-medium disabled:opacity-50">
              {loadingPlan === "annual" ? "Opening checkout…" : "Get Annual Plan"}
            </button>
          </motion.div>
        </div>

        <div className="mt-16">
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-3 text-center">everything in pro</div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 max-w-3xl mx-auto">
            {PRO_FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="flex gap-2 text-sm text-white/75 py-1.5">
                <Check size={16} className="text-purple-300 mt-0.5 shrink-0" /> {f}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-24">
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-3 text-center">from our community</div>
          <h2 className="font-display text-3xl text-center mb-8">People are using MindSphere differently</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4" data-testid="testimonials">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="min-w-[320px] sm:min-w-[380px] snap-start rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur p-6">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} size={14} fill="#fbbf24" className="text-amber-400" />)}
                </div>
                <p className="text-sm text-white/80 italic leading-relaxed mb-4">"{t.quote}"</p>
                <div className="text-xs text-white/60">— {t.name}, <span className="text-white/40">{t.meta}</span></div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-24 max-w-2xl mx-auto">
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-3 text-center">questions</div>
          <h2 className="font-display text-3xl text-center mb-8">Good things to know</h2>
          <div className="space-y-2">
            {FAQS.map((f, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02]" data-testid={`faq-${i}`}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left">
                  <span className="text-sm text-white/85">{f.q}</span>
                  {openFaq === i ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-white/60 leading-relaxed">{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-24 text-center">
          <h2 className="font-display text-3xl mb-2">Begin gently.</h2>
          <p className="text-white/55 mb-6">7 days free. No card. No fluff.</p>
          <button onClick={() => user ? upgrade("monthly") : nav("/auth?mode=signup")} data-testid="final-cta"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-purple-400 text-black font-medium hover:scale-[1.02] transition">
            <Sparkles size={16} /> Start your trial <ArrowRight size={16} />
          </button>
        </div>

        <footer className="mt-20 text-center text-xs text-white/40 space-x-3">
          <a href="/privacy" className="hover:text-white/70">Privacy</a>
          <span>·</span>
          <a href="/terms" className="hover:text-white/70">Terms</a>
          <span>·</span>
          <span>© 2026 MindSphere</span>
        </footer>
      </main>
    </div>
  );
};

export default Pricing;
