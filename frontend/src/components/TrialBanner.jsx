import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { http } from "../lib/api";
import { useAuth } from "../lib/auth.jsx";

/**
 * Trial countdown banner — shown when trial_days_remaining <= 3.
 * Hidden on /auth, /onboarding, /pricing, /welcome.
 * Dismissable per session via sessionStorage.
 */
const HIDE_PATHS = ["/auth", "/onboarding", "/pricing", "/welcome"];

const TrialBanner = () => {
  const { user } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("ms_trial_banner_dismissed") === "1") setDismissed(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) { setStatus(null); return; }
      try {
        const { data } = await http.get("/billing/status");
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setStatus(null);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  const dismiss = () => {
    sessionStorage.setItem("ms_trial_banner_dismissed", "1");
    setDismissed(true);
  };

  if (!user || dismissed || !status) return null;
  if (HIDE_PATHS.some((p) => loc.pathname.startsWith(p))) return null;

  const isTrial = status.plan === "trial";
  const isFree = status.plan === "free";
  const days = status.trial_days_remaining;

  let show = false;
  let message = "";
  if (isTrial && days !== null && days <= 3) {
    show = true;
    message = days <= 0
      ? "Your free trial has ended today — upgrade to continue using Lyra and all Pro features."
      : `⏳ ${days} day${days === 1 ? "" : "s"} left in your free trial — unlock everything for $14.99/month`;
  } else if (isFree) {
    show = true;
    message = "Your free trial has ended — upgrade to continue using Lyra and all Pro features.";
  }

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className="sticky top-0 z-[60] w-full text-sm flex items-center justify-center gap-3 px-4 py-2.5 text-black"
        style={{ background: "linear-gradient(90deg, #fbbf24, #f97316)" }}
        data-testid="trial-banner"
      >
        <span className="font-medium text-center text-xs sm:text-sm">{message}</span>
        <button
          onClick={() => nav("/pricing")}
          data-testid="trial-banner-cta"
          className="px-3 py-1 rounded-full bg-black/15 hover:bg-black/25 transition text-xs font-medium whitespace-nowrap"
        >
          Upgrade Now →
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          data-testid="trial-banner-dismiss"
          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/15"
        >
          <X size={12} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default TrialBanner;
