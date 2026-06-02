import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, ChevronLeft, X, Sparkles, CheckCircle2 } from "lucide-react";
import { http } from "../lib/api";
import { useAuth } from "../lib/auth.jsx";

/**
 * Interactive first-run tour. Spotlights real DOM elements via data-testid selectors
 * and walks the user through MindSphere's key surfaces. Once dismissed or completed,
 * the backend marks `tutorial_completed = true` so it never re-fires automatically.
 */

const STEPS = [
  {
    key: "welcome",
    route: "/app/dashboard",
    target: null, // centered, no anchor
    title: "Welcome to MindSphere",
    body: "You're all set. Let's take a 60-second tour so you can find your way around — your mind, understood.",
    badge: "1 / 9",
    accent: "#a78bfa",
  },
  {
    key: "dashboard",
    route: "/app/dashboard",
    target: '[data-testid="nav-dashboard"]',
    placement: "right",
    title: "Your Dashboard",
    body: "Your daily wellness snapshot — mood trends, journal streaks, today's intentions, and Lyra's nudges live here.",
    badge: "2 / 9",
    accent: "#a78bfa",
  },
  {
    key: "journal",
    route: "/app/dashboard",
    target: '[data-testid="nav-mind-journal"]',
    placement: "right",
    title: "Mind Journal",
    body: "Write or voice-dictate journal entries. Lyra reflects back patterns and helps you process what's on your mind.",
    badge: "3 / 9",
    accent: "#c084fc",
  },
  {
    key: "mood",
    route: "/app/dashboard",
    target: '[data-testid="nav-mood-tracker"]',
    placement: "right",
    title: "Mood Tracker",
    body: "Quick daily check-ins. Over time you'll spot triggers, cycles, and what genuinely lifts you.",
    badge: "4 / 9",
    accent: "#ec4899",
  },
  {
    key: "lyra",
    route: "/app/dashboard",
    target: '[data-testid="nav-ai-health-assistant"]',
    placement: "right",
    title: "Meet Lyra",
    body: "Your AI wellness companion. Ask anything, get personalized guidance, or just vent — she remembers your context.",
    badge: "5 / 9",
    accent: "#a78bfa",
  },
  {
    key: "voice",
    route: "/app/dashboard",
    target: '[data-testid="nav-real-time-voice"]',
    placement: "right",
    title: "Real-Time Voice",
    body: "Hands-free conversations with Lyra. Tap, talk, interrupt anytime — Gemini Live keeps it natural and instant.",
    badge: "6 / 9",
    accent: "#10b981",
  },
  {
    key: "mental",
    route: "/app/dashboard",
    target: '[data-testid="nav-mental-health"]',
    placement: "right",
    title: "Mental Health Tools",
    body: "Assessments, coping plans, crisis resources, and breathing exercises — all in one calm place.",
    badge: "7 / 9",
    accent: "#fb7185",
  },
  {
    key: "analytics",
    route: "/app/dashboard",
    target: '[data-testid="nav-analytics-insights"]',
    placement: "right",
    title: "Analytics & Insights",
    body: "See the bigger picture: mood graphs, sleep correlations, journal sentiment, and AI-spotted patterns.",
    badge: "8 / 9",
    accent: "#a78bfa",
  },
  {
    key: "finish",
    route: "/app/dashboard",
    target: null,
    title: "You're ready",
    body: "Start with a quick mood check-in or open Lyra. You can replay this tour anytime from Settings.",
    badge: "9 / 9",
    accent: "#10b981",
    final: true,
  },
];

const PADDING = 8;

const useAnchorRect = (selector, deps = []) => {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    if (!selector) { setRect(null); return; }
    let raf = 0;
    let alive = true;
    const update = () => {
      if (!alive) return;
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        setRect(null);
      }
    };
    // poll for a short while in case the target mounts after route change
    let tries = 0;
    const tick = () => {
      update();
      tries += 1;
      if (tries < 20) raf = requestAnimationFrame(tick);
    };
    tick();
    const ro = new ResizeObserver(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const target = document.querySelector(selector);
    if (target) ro.observe(target);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, ...deps]);
  return rect;
};

const Spotlight = ({ rect }) => {
  // 4-sided dimmer that leaves a transparent cut-out around `rect`.
  // Works without SVG mask — just four absolutely-positioned dark panels.
  if (!rect) {
    return <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" data-testid="tutorial-backdrop-full" />;
  }
  const top = Math.max(0, rect.top - PADDING);
  const left = Math.max(0, rect.left - PADDING);
  const w = rect.width + PADDING * 2;
  const h = rect.height + PADDING * 2;
  const right = left + w;
  const bottom = top + h;
  const panels = [
    { top: 0, left: 0, right: 0, height: top },                                // above
    { top: bottom, left: 0, right: 0, bottom: 0 },                             // below
    { top, left: 0, width: left, height: h },                                  // left
    { top, left: right, right: 0, height: h },                                 // right
  ];
  return (
    <>
      {panels.map((s, i) => (
        <div
          key={i}
          style={{ position: "fixed", background: "rgba(0,0,0,0.72)", backdropFilter: "blur(2px)", zIndex: 9998, ...s }}
        />
      ))}
      {/* glowing ring around target */}
      <motion.div
        layout
        initial={false}
        animate={{ top, left, width: w, height: h }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{
          position: "fixed",
          zIndex: 9999,
          borderRadius: 16,
          boxShadow: "0 0 0 2px rgba(255,255,255,0.85), 0 0 40px 8px rgba(167,139,250,0.45)",
          pointerEvents: "none",
        }}
        data-testid="tutorial-spotlight"
      />
    </>
  );
};

const Tooltip = ({ step, rect, totalSteps, idx, onNext, onBack, onSkip, onFinish }) => {
  const isFirst = idx === 0;
  const isFinal = !!step.final;
  // compute placement
  let style = { position: "fixed", zIndex: 10000, maxWidth: 380, width: "calc(100vw - 32px)" };
  if (!rect) {
    style = { ...style, top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else {
    const placement = step.placement || "right";
    if (placement === "right") {
      style = {
        ...style,
        top: Math.max(16, rect.top + rect.height / 2 - 110),
        left: Math.min(window.innerWidth - 400, rect.left + rect.width + 20),
      };
    } else if (placement === "left") {
      style = {
        ...style,
        top: Math.max(16, rect.top + rect.height / 2 - 110),
        left: Math.max(16, rect.left - 400),
      };
    } else if (placement === "bottom") {
      style = {
        ...style,
        top: rect.top + rect.height + 16,
        left: Math.max(16, Math.min(window.innerWidth - 400, rect.left)),
      };
    }
  }
  return (
    <motion.div
      key={step.key}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={style}
      className="glass p-5 border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
      data-testid="tutorial-tooltip"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em]" style={{ color: step.accent }}>
          <Sparkles size={11} /> guided tour · {step.badge}
        </div>
        <button
          onClick={onSkip}
          data-testid="tutorial-close"
          className="text-white/40 hover:text-white p-1 rounded-md hover:bg-white/5"
          aria-label="Close tutorial"
        >
          <X size={14} />
        </button>
      </div>
      <h3 className="font-display text-2xl text-white mb-1.5" data-testid="tutorial-title">{step.title}</h3>
      <p className="text-sm text-white/70 leading-relaxed mb-5" data-testid="tutorial-body">{step.body}</p>
      <div className="flex items-center justify-between">
        <button
          onClick={onSkip}
          data-testid="tutorial-skip"
          className="text-xs text-white/50 hover:text-white/80 underline-offset-2 hover:underline"
        >
          Skip tour
        </button>
        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              onClick={onBack}
              data-testid="tutorial-back"
              className="px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/5 text-xs text-white/80 flex items-center gap-1"
            >
              <ChevronLeft size={12} /> Back
            </button>
          )}
          {isFinal ? (
            <button
              onClick={onFinish}
              data-testid="tutorial-finish"
              className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-medium flex items-center gap-1 hover:scale-[1.03] transition"
            >
              <CheckCircle2 size={12} /> Start exploring
            </button>
          ) : (
            <button
              onClick={onNext}
              data-testid="tutorial-next"
              className="px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 hover:scale-[1.03] transition"
              style={{ background: step.accent, color: "#0a0a14" }}
            >
              Next <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className="h-1 rounded-full flex-1 transition-all"
            style={{ background: i <= idx ? step.accent : "rgba(255,255,255,0.08)" }}
          />
        ))}
      </div>
    </motion.div>
  );
};

const TutorialOverlay = ({ open, onClose, autoOpen = false }) => {
  const [idx, setIdx] = useState(0);
  const { refresh } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const startedAtRef = useRef(false);
  const step = STEPS[idx];

  // route guard — ensure we're on the step's route
  useEffect(() => {
    if (!open) return;
    if (step.route && loc.pathname !== step.route) {
      nav(step.route, { replace: false });
    }
  }, [open, step, loc.pathname, nav]);

  const rect = useAnchorRect(open ? step.target : null, [idx, open]);

  const completeOnServer = useCallback(async () => {
    try { await http.post("/users/tutorial-complete"); } catch {}
    try { await refresh(); } catch {}
  }, [refresh]);

  const handleClose = useCallback(async (finished) => {
    setIdx(0);
    startedAtRef.current = false;
    await completeOnServer();
    onClose?.(finished);
  }, [completeOnServer, onClose]);

  const next = useCallback(() => {
    if (idx < STEPS.length - 1) setIdx((v) => v + 1);
  }, [idx]);
  const back = useCallback(() => setIdx((v) => Math.max(0, v - 1)), []);
  const skip = useCallback(() => handleClose(false), [handleClose]);
  const finish = useCallback(() => handleClose(true), [handleClose]);

  // keyboard a11y
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") skip();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, back, skip]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      <motion.div
        key="tutorial-root"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        data-testid="tutorial-overlay"
      >
        <Spotlight rect={rect} />
        <Tooltip
          step={step}
          rect={rect}
          totalSteps={STEPS.length}
          idx={idx}
          onNext={next}
          onBack={back}
          onSkip={skip}
          onFinish={finish}
        />
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default TutorialOverlay;
