import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, Crown, ArrowLeft } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { http } from "../lib/api";
import { toast } from "sonner";
import useDocTitle from "../hooks/useDocTitle";

const FEATURES = [
  "Unlimited AI journaling & emotion detection",
  "Lyra voice AI — real-time conversations",
  "Full AI companion chat (CBT support)",
  "7-day personalized meal plans + recipes",
  "Mood-adaptive exercise programs",
  "PHQ-9, GAD-7 & all mental health assessments",
  "AI disturbance pattern detection",
  "Sleep tracking & bedtime AI coaching",
  "Appointment scheduling",
  "Meditation & breathing tools",
  "Full analytics dashboard",
  "Priority support",
];

const Pricing = () => {
  useDocTitle("Pricing");
  const { user } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    if (params.get("billing") === "canceled") {
      toast("Checkout canceled — you can try again any time.", { icon: "↩️" });
    }
  }, [params]);

  const startCheckout = async (pkg) => {
    if (!user) {
      nav("/auth?return=/pricing");
      return;
    }
    setLoading(pkg);
    try {
      const { data } = await http.post("/billing/checkout", {
        package_id: pkg,
        origin_url: window.location.origin,
      });
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      toast.error("Could not start checkout — please try again.");
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const startTrial = () => {
    if (!user) {
      nav("/auth?return=/app/dashboard");
    } else {
      nav("/app/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* atmospheric background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[10%] w-[60vw] h-[60vw] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(199,110,255,0.35), transparent 60%)", filter: "blur(60px)" }} />
        <div className="absolute bottom-[-20%] right-[5%] w-[55vw] h-[55vw] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, rgba(20,184,166,0.3), transparent 60%)", filter: "blur(60px)" }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-12">
        <button
          onClick={() => nav(user ? "/app/dashboard" : "/")}
          data-testid="pricing-back"
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white mb-10 transition"
        >
          <ArrowLeft size={14} /> back
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.3em] text-purple-300 mb-3">membership</div>
          <h1 className="font-display text-5xl sm:text-6xl mb-4 text-glow">Become your calmest self.</h1>
          <p className="text-white/60 max-w-xl mx-auto">
            Start free for 7 days — no card required. Then continue with MindSphere Pro for the full experience.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {/* Free trial */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass p-7 flex flex-col"
            data-testid="plan-trial"
          >
            <div className="text-[11px] uppercase tracking-widest text-white/40">free trial</div>
            <div className="font-display text-3xl mt-2">7 days free</div>
            <div className="text-white/50 text-sm mt-1">then $15/month — cancel anytime</div>
            <ul className="mt-6 space-y-2.5 text-sm text-white/80 flex-1">
              {FEATURES.slice(0, 6).map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check size={14} className="text-purple-300 mt-0.5 shrink-0" /> {f}
                </li>
              ))}
              <li className="text-white/40 text-xs pt-1">+ all Pro features for 7 days</li>
            </ul>
            <button
              onClick={startTrial}
              data-testid="cta-start-trial"
              className="mt-6 px-5 py-3 rounded-full border border-white/20 hover:bg-white/5 transition text-sm"
            >
              Start free trial
            </button>
          </motion.div>

          {/* Monthly */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass p-7 flex flex-col relative"
            style={{ borderColor: "rgba(199,110,255,0.5)", boxShadow: "0 30px 80px -20px rgba(180,80,255,0.35)" }}
            data-testid="plan-monthly"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] uppercase tracking-widest"
              style={{ background: "linear-gradient(90deg,#a78bfa,#ec4899)", color: "white" }}>most popular</div>
            <div className="flex items-center gap-2">
              <Crown size={14} className="text-purple-300" />
              <div className="text-[11px] uppercase tracking-widest text-purple-300">MindSphere pro</div>
            </div>
            <div className="font-display text-4xl mt-2">$15<span className="text-base text-white/40">/month</span></div>
            <div className="text-white/50 text-sm mt-1">Everything. Always.</div>
            <ul className="mt-6 space-y-2.5 text-sm text-white/85 flex-1">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check size={14} className="text-purple-300 mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => startCheckout("monthly")}
              disabled={loading === "monthly"}
              data-testid="cta-monthly"
              className="mt-6 px-5 py-3 rounded-full text-sm font-medium hover:scale-[1.02] transition"
              style={{ background: "linear-gradient(90deg,#a78bfa,#ec4899)", color: "white" }}
            >
              {loading === "monthly" ? "Loading…" : "Get Pro — $15/mo"}
            </button>
          </motion.div>

          {/* Annual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass p-7 flex flex-col relative"
            data-testid="plan-annual"
          >
            <div className="absolute -top-3 right-5 px-3 py-0.5 rounded-full text-[10px] uppercase tracking-widest"
              style={{ background: "rgba(20,184,166,0.25)", border: "1px solid rgba(20,184,166,0.6)", color: "#5eead4" }}>best value</div>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-teal-300" />
              <div className="text-[11px] uppercase tracking-widest text-teal-300">annual</div>
            </div>
            <div className="font-display text-4xl mt-2">$120<span className="text-base text-white/40">/year</span></div>
            <div className="text-teal-300 text-sm mt-1">save $60 vs monthly</div>
            <ul className="mt-6 space-y-2.5 text-sm text-white/80 flex-1">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check size={14} className="text-teal-300 mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => startCheckout("annual")}
              disabled={loading === "annual"}
              data-testid="cta-annual"
              className="mt-6 px-5 py-3 rounded-full text-sm font-medium hover:scale-[1.02] transition border"
              style={{ borderColor: "rgba(20,184,166,0.5)", color: "#5eead4" }}
            >
              {loading === "annual" ? "Loading…" : "Get Annual — $120/yr"}
            </button>
          </motion.div>
        </div>

        <div className="text-center text-[11px] text-white/40 mt-10">
          Secure payment via Stripe · cancel anytime · 30-day money-back
        </div>
      </div>
    </div>
  );
};

export default Pricing;
