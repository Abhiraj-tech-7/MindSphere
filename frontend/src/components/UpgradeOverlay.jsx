import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";

/**
 * Wraps a region of UI with a beautiful blur overlay when feature is locked.
 * Children render underneath (slightly visible) to convey "this is the feature".
 *
 * Props:
 *   locked: bool (if false → renders children as-is)
 *   title: string
 *   message: string
 *   cta: string ("Start free trial" | "Upgrade to Pro")
 *   children: ReactNode
 *   testId?: string
 */
const UpgradeOverlay = ({ locked, title = "Pro feature", message, cta = "Upgrade to Pro", children, testId }) => {
  const nav = useNavigate();
  if (!locked) return <>{children}</>;
  return (
    <div className="relative" data-testid={testId || "upgrade-overlay"}>
      <div aria-hidden className="pointer-events-none select-none opacity-40 blur-[2px]">
        {children}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute inset-0 flex items-center justify-center p-6 z-10"
      >
        <div className="glass p-7 max-w-md w-full text-center"
          style={{ borderColor: "rgba(199,110,255,0.4)", boxShadow: "0 30px 80px -20px rgba(180,80,255,0.4)" }}>
          <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3"
            style={{ background: "linear-gradient(135deg,#a78bfa33,#ec489933)" }}>
            <Lock size={18} className="text-purple-300" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-purple-300 mb-2">{title}</div>
          <div className="font-display text-2xl mb-2">Unlock the full experience</div>
          <div className="text-sm text-white/65 mb-5">
            {message || "This feature is part of MindSphere Pro. Continue your wellness journey with unlimited access."}
          </div>
          <button
            onClick={() => nav("/pricing")}
            data-testid="upgrade-cta"
            className="px-6 py-3 rounded-full text-sm font-medium hover:scale-[1.03] transition w-full flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(90deg,#a78bfa,#ec4899)", color: "white" }}
          >
            <Sparkles size={14} /> {cta} — $15/mo
          </button>
          <button
            onClick={() => nav("/pricing")}
            data-testid="upgrade-secondary"
            className="mt-2 text-xs text-white/50 hover:text-white/80 transition"
          >
            See all plans →
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default UpgradeOverlay;
