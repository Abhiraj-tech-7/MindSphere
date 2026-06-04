import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { toast } from "sonner";

/**
 * Slim top banner shown in the last 3 days of trial OR when subscription expired.
 * Dismissable per session via sessionStorage.
 * Also listens for global 'ms:pro_required' events from axios interceptor.
 */
const TrialBanner = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [dismissed, setDismissed] = React.useState(() => sessionStorage.getItem("ms_trial_dismissed") === "1");

  React.useEffect(() => {
    const onProRequired = () => {
      toast("This feature is part of MindSphere Pro.", {
        icon: "✨",
        action: { label: "Upgrade", onClick: () => nav("/pricing") },
      });
    };
    window.addEventListener("ms:pro_required", onProRequired);
    return () => window.removeEventListener("ms:pro_required", onProRequired);
  }, [nav]);

  const sub = user?.subscription_state;
  if (!sub) return null;

  let show = false;
  let message = "";
  let cta = "Upgrade to Pro";
  let tone = "warning";

  if (sub.status === "trial" && sub.trial_days_left <= 3 && sub.trial_days_left > 0) {
    show = true;
    message = `${sub.trial_days_left} ${sub.trial_days_left === 1 ? "day" : "days"} left in your free trial`;
    cta = "Upgrade now";
  } else if (sub.status === "expired") {
    show = true;
    message = "Your free trial has ended — upgrade to keep your MindSphere flowing.";
    cta = "See plans";
    tone = "expired";
  }

  if (!show || dismissed) return null;

  const close = () => {
    sessionStorage.setItem("ms_trial_dismissed", "1");
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[80] flex items-center justify-center px-3 py-2.5"
        style={{
          background: tone === "expired"
            ? "linear-gradient(90deg, rgba(239,68,68,0.18), rgba(199,110,255,0.18))"
            : "linear-gradient(90deg, rgba(199,110,255,0.18), rgba(236,72,153,0.18))",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
        }}
        data-testid="trial-banner"
      >
        <div className="flex items-center gap-3 text-sm">
          <Sparkles size={14} className="text-purple-300" />
          <span className="text-white/85">{message}</span>
          <button
            onClick={() => nav("/pricing")}
            data-testid="trial-banner-cta"
            className="ml-2 px-3 py-1 rounded-full text-xs font-medium hover:scale-[1.03] transition"
            style={{ background: "linear-gradient(90deg,#a78bfa,#ec4899)", color: "white" }}
          >
            {cta}
          </button>
          <button onClick={close} aria-label="dismiss" className="text-white/40 hover:text-white ml-1">
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TrialBanner;
