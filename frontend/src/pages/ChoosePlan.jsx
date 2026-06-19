import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight } from "lucide-react";
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
    <div className="min-h-screen bg-[#050508] text-white px-4 sm:px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-[11px] tracking-[0.3em] uppercase text-purple-300 mb-3">one last step</div>
          <h1 className="font-display text-3xl sm:text-5xl">Pick how you want to begin.</h1>
          <p className="text-white/55 mt-3 max-w-xl mx-auto text-sm">Your account is created. Choose a plan to continue to the personalised setup. No surprise charges, ever.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Trial */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 flex flex-col" data-testid="choose-trial-card">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">try first</div>
            <div className="font-display text-2xl mb-1">7-day free trial</div>
            <div className="text-xs text-white/50 mb-5">$0 today · no card needed</div>
            <ul className="space-y-2 text-sm text-white/75 mb-6 flex-1">
              {TRIAL_BULLETS.map((b, i) => <li key={i} className="flex gap-2"><Check size={14} className="text-purple-300 mt-0.5 shrink-0" />{b}</li>)}
            </ul>
            <button onClick={startTrial} data-testid="choose-trial-cta"
              className="w-full py-3 rounded-full border border-white/15 hover:bg-white/5 transition text-sm flex items-center justify-center gap-2">
              Continue with Trial <ArrowRight size={14} />
            </button>
          </motion.div>

          {/* Pro Monthly */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="relative rounded-3xl p-6 flex flex-col" data-testid="choose-monthly-card"
            style={{ background: "linear-gradient(180deg, rgba(192,132,252,0.10), rgba(139,92,246,0.04))", border: "1px solid rgba(192,132,252,0.35)", boxShadow: "0 0 60px -10px rgba(192,132,252,0.30)" }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest bg-purple-400 text-black font-medium">Most Popular</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-purple-300 mb-2">MindSphere Pro</div>
            <div className="font-display text-3xl mb-1">$14.99<span className="text-sm text-white/50">/mo</span></div>
            <div className="text-xs text-white/50 mb-5">Cancel anytime</div>
            <ul className="space-y-2 text-sm text-white/85 mb-6 flex-1">
              {PRO_BULLETS.map((b, i) => <li key={i} className="flex gap-2"><Check size={14} className="text-purple-300 mt-0.5 shrink-0" />{b}</li>)}
            </ul>
            <button onClick={() => upgrade("monthly")} disabled={loading === "monthly"} data-testid="choose-monthly-cta"
              className="w-full py-3 rounded-full bg-purple-400 text-black hover:scale-[1.02] transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {loading === "monthly" ? "Opening checkout…" : <><Sparkles size={14} /> Go Pro Monthly</>}
            </button>
          </motion.div>

          {/* Pro Annual */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 flex flex-col relative" data-testid="choose-annual-card">
            <div className="absolute top-0 right-4 -translate-y-1/2 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest bg-emerald-400 text-black font-medium">Save $30</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 mb-2">MindSphere Pro</div>
            <div className="font-display text-3xl mb-1">$12.49<span className="text-sm text-white/50">/mo</span></div>
            <div className="text-xs text-white/50 mb-1">Billed $149.99/year</div>
            <div className="text-xs text-emerald-300 mb-5">2 months free vs monthly</div>
            <ul className="space-y-2 text-sm text-white/85 mb-6 flex-1">
              {PRO_BULLETS.map((b, i) => <li key={i} className="flex gap-2"><Check size={14} className="text-emerald-300 mt-0.5 shrink-0" />{b}</li>)}
            </ul>
            <button onClick={() => upgrade("annual")} disabled={loading === "annual"} data-testid="choose-annual-cta"
              className="w-full py-3 rounded-full bg-emerald-400 text-black hover:scale-[1.02] transition text-sm font-medium disabled:opacity-50">
              {loading === "annual" ? "Opening checkout…" : "Get Annual Plan"}
            </button>
          </motion.div>
        </div>

        <div className="text-center mt-8 text-[11px] text-white/40">
          You can change or cancel your plan anytime in Settings → Subscription.
        </div>
      </div>
    </div>
  );
};

export default ChoosePlan;
