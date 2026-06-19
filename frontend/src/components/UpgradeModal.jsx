import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Sparkles } from "lucide-react";
import { http } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const UpgradeCtx = createContext(null);

export const useUpgradeModal = () => {
  const ctx = useContext(UpgradeCtx);
  if (!ctx) return { open: () => window.location.assign("/pricing") };
  return ctx;
};

export const UpgradeProvider = ({ children }) => {
  const [feature, setFeature] = useState(null);
  const nav = useNavigate();

  const open = useCallback((featureName) => setFeature(featureName || "this feature"), []);
  const close = useCallback(() => setFeature(null), []);

  const checkout = async (plan) => {
    try {
      const { data } = await http.post("/billing/create-checkout-session", { plan });
      window.location.href = data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start checkout");
    }
  };

  return (
    <UpgradeCtx.Provider value={{ open, close }}>
      {children}
      <AnimatePresence>
        {feature && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70"
            style={{ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
            onClick={close}
            data-testid="upgrade-modal-backdrop"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[480px] rounded-3xl p-7 sm:p-9 text-center"
              style={{ background: "linear-gradient(180deg, rgba(192,132,252,0.10), rgba(20,20,30,0.95))", border: "1px solid rgba(192,132,252,0.25)" }}
              data-testid="upgrade-modal"
            >
              <button onClick={close} aria-label="Close" data-testid="upgrade-modal-close"
                className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10">
                <X size={16} />
              </button>

              <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4"
                style={{ background: "rgba(192,132,252,0.15)", border: "1px solid rgba(192,132,252,0.35)" }}>
                <Lock size={22} className="text-purple-300" />
              </div>

              <h2 className="font-display text-2xl mb-3 text-white">{feature} requires Pro</h2>
              <p className="text-sm text-white/70 leading-relaxed mb-5">
                Based on your journaling activity and progress in MindSphere, you're actively building healthy reflection habits.
                Consistency is one of the most powerful parts of a wellness journey — we'd love to help you keep going.
              </p>

              <div className="rounded-2xl p-4 mb-5 text-left" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.35)" }}>
                <div className="text-sm font-medium text-amber-300 mb-1">🎁 Special Offer</div>
                <div className="text-xs text-white/75 leading-relaxed">
                  Start another 7-day Pro trial today.<br/>
                  $0 charged today. Then only $14.99/month after your trial ends. Cancel anytime.
                </div>
              </div>

              <div className="space-y-2.5">
                <button onClick={() => checkout("monthly")} data-testid="upgrade-modal-monthly-cta"
                  className="w-full py-3 rounded-full bg-purple-400 text-black font-medium hover:scale-[1.02] transition flex items-center justify-center gap-2">
                  <Sparkles size={14} /> Start Extended Trial — $0 Today
                </button>
                <button onClick={() => checkout("annual")} data-testid="upgrade-modal-annual-cta"
                  className="w-full py-3 rounded-full border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10 transition">
                  Get Annual Plan — $149.99/year
                </button>
              </div>

              <p className="text-[11px] text-white/40 mt-4">No charge today. Subscription begins after your 7-day trial unless cancelled.</p>
              <p className="text-[10px] text-white/30 mt-1">Offer available for a limited time.</p>

              <button onClick={() => { close(); nav("/pricing"); }} className="text-[11px] text-white/50 hover:text-white/80 mt-3 underline" data-testid="upgrade-modal-see-plans">
                see all plans
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </UpgradeCtx.Provider>
  );
};
