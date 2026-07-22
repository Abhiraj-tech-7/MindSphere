import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { http } from "../lib/api";
import { useAuth } from "../lib/auth.jsx";
import { toast } from "sonner";
import useDocTitle from "../hooks/useDocTitle";

const PRO_BULLETS = [
  "Unlimited AI journaling & emotion detection",
  "Lyra voice mode — full daily sessions",
  "AI meal plans + recipe library + custom recipes",
  "PHQ-9, GAD-7 & assessments",
  "Disturbance detection + mood forecast",
  "Priority support",
];

const TRIAL_BULLETS = [
  "1-minute voice mode (single sample)",
  "Try every Pro feature once",
  "Mood, sleep, meditation always free",
  "No credit card required",
];

const ChoosePlan = () => {
  useDocTitle("Choose your plan");
  useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(null);

  const startTrial = () => {
    // No charge — just continue to onboarding (user is already on plan='trial' from registration)
    nav("/onboarding");
  };

  const upgrade = async (plan) => {
    setLoading(plan);
    try {
      const { data } = await http.post("/billing/create-checkout-session", { plan });
      window.location.href = data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start checkout");
      setLoading(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black px-4 py-6 text-white font-body sm:px-6">
      <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.16),transparent_58%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.15),#000_78%)] pointer-events-none" />
      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <button onClick={() => nav("/")} className="liquid-glass inline-flex h-12 w-12 items-center justify-center rounded-full text-white" aria-label="Back home">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="liquid-glass rounded-full px-4 py-2 text-sm text-white/90">MindSphere</div>
          <button onClick={startTrial} className="liquid-glass inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-white">
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </header>

        <div className="mx-auto mb-12 mt-16 max-w-3xl text-center">
          <div className="liquid-glass inline-flex items-center gap-2 rounded-full px-1.5 py-1.5">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">Account ready</span>
            <span className="pr-3 text-sm text-white/90">one last step before your personal setup</span>
          </div>
          <h1 className="mt-6 font-heading italic text-5xl leading-[0.88] text-white sm:text-7xl">Pick how your MindSphere begins.</h1>
          <p className="mx-auto mt-5 max-w-xl text-sm font-light leading-tight text-white/80 sm:text-base">Choose a plan to continue to the personalised setup. No surprise charges, and your free wellness tools stay available.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="liquid-glass flex flex-col rounded-[1.25rem] p-6" data-testid="choose-trial-card">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-2">try first</div>
            <div className="font-heading italic text-4xl leading-none mb-1">7-day free trial</div>
            <div className="text-xs text-white/60 mb-5">$0 today · no card needed</div>
            <ul className="space-y-2 text-sm text-white/80 mb-6 flex-1">
              {TRIAL_BULLETS.map((b, i) => <li key={i} className="flex gap-2"><Check size={14} className="text-white mt-0.5 shrink-0" />{b}</li>)}
            </ul>
            <button onClick={startTrial} data-testid="choose-trial-cta"
              className="w-full rounded-full border border-white/20 py-3 text-sm font-medium text-white hover:bg-white/10 flex items-center justify-center gap-2">
              Continue with Trial <ArrowRight size={14} />
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="liquid-glass-strong relative flex flex-col rounded-[1.25rem] p-6" data-testid="choose-monthly-card">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-black">Most Popular</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/70 mb-2">MindSphere Pro</div>
            <div className="font-heading italic text-5xl leading-none mb-1">$14.99<span className="text-sm text-white/60">/mo</span></div>
            <div className="text-xs text-white/60 mb-5">Cancel anytime</div>
            <ul className="space-y-2 text-sm text-white/85 mb-6 flex-1">
              {PRO_BULLETS.map((b, i) => <li key={i} className="flex gap-2"><Check size={14} className="text-white mt-0.5 shrink-0" />{b}</li>)}
            </ul>
            <button onClick={() => upgrade("monthly")} disabled={loading === "monthly"} data-testid="choose-monthly-cta"
              className="w-full rounded-full bg-white py-3 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading === "monthly" ? "Opening checkout…" : <><Sparkles size={14} /> Go Pro Monthly</>}
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="liquid-glass flex flex-col rounded-[1.25rem] p-6 relative" data-testid="choose-annual-card">
            <div className="absolute right-4 top-0 -translate-y-1/2 rounded-full bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-black">Save $30</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-2">MindSphere Pro</div>
            <div className="font-heading italic text-5xl leading-none mb-1">$12.49<span className="text-sm text-white/60">/mo</span></div>
            <div className="text-xs text-white/60 mb-1">Billed $149.99/year</div>
            <div className="text-xs text-white/75 mb-5">2 months free vs monthly</div>
            <ul className="space-y-2 text-sm text-white/85 mb-6 flex-1">
              {PRO_BULLETS.map((b, i) => <li key={i} className="flex gap-2"><Check size={14} className="text-white mt-0.5 shrink-0" />{b}</li>)}
            </ul>
            <button onClick={() => upgrade("annual")} disabled={loading === "annual"} data-testid="choose-annual-cta"
              className="w-full rounded-full border border-white/20 py-3 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50">
              {loading === "annual" ? "Opening checkout…" : "Get Annual Plan"}
            </button>
          </motion.div>
        </div>

        <div className="mt-8 text-center text-[11px] text-white/50">
          You can change or cancel your plan anytime in Settings.
        </div>
      </div>
    </div>
  );
};

export default ChoosePlan;
