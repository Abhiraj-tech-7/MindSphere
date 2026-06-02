import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

/**
 * Multi-step wizard that asks the user a few questions then calls onSubmit(answers).
 * Parent handles the API call + then opens the RecipeModal with the result.
 */
const STEPS = [
  {
    key: "cuisine",
    title: "What cuisine are you craving?",
    sub: "Pick one or type your own.",
    options: ["Italian", "Indian", "Mexican", "Mediterranean", "Japanese", "Thai", "American", "Middle-Eastern"],
    placeholder: "e.g. Vietnamese street food",
    allowFree: true,
  },
  {
    key: "dietary",
    title: "Any dietary restrictions?",
    sub: "Choose all that apply, or write your own.",
    options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Keto", "Low-carb", "High-protein"],
    placeholder: "e.g. nut-free, low sodium",
    allowFree: true,
    multi: true,
  },
  {
    key: "available_ingredients",
    title: "What ingredients do you have on hand?",
    sub: "Comma-separated. We'll center the recipe around these.",
    options: [],
    placeholder: "chicken, spinach, garlic, lemon, olive oil…",
    allowFree: true,
    long: true,
  },
  {
    key: "prep_time",
    title: "How much time do you have?",
    sub: "We'll match the difficulty to your window.",
    options: ["Under 15 min", "15–30 min", "30–45 min", "45–60 min", "60+ min"],
    placeholder: "",
    allowFree: false,
  },
  {
    key: "calorie_target",
    title: "Any calorie / macro target?",
    sub: "Optional — leave blank for balanced.",
    options: ["Light (~300 cal)", "Moderate (~500 cal)", "Hearty (~700 cal)", "High-protein", "Low-carb", "Balanced"],
    placeholder: "e.g. ~450 cal, 30g protein",
    allowFree: true,
  },
  {
    key: "mood_goal",
    title: "What mood do you want this meal to support?",
    sub: "We'll tune ingredients for it.",
    options: ["Calm anxiety", "Boost energy", "Lift low mood", "Better sleep", "Focus", "Comfort"],
    placeholder: "",
    allowFree: true,
  },
];

const CustomRecipeWizard = ({ open, onClose, onSubmit, accent = "#14b8a6" }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const s = STEPS[step];
  const value = answers[s.key] || (s.multi ? [] : "");

  const setValue = (v) => setAnswers((a) => ({ ...a, [s.key]: v }));

  const toggleMulti = (opt) => {
    const arr = Array.isArray(value) ? value : [];
    setValue(arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt]);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else submit();
  };

  const prev = () => step > 0 && setStep(step - 1);

  const submit = async () => {
    setSubmitting(true);
    // Normalize multi-value
    const payload = {
      ...answers,
      dietary: Array.isArray(answers.dietary) ? answers.dietary.join(", ") : (answers.dietary || ""),
    };
    try {
      await onSubmit(payload);
      // parent will close & open recipe modal on success
      setStep(0);
      setAnswers({});
    } finally {
      setSubmitting(false);
    }
  };

  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md"
        onClick={onClose}
        data-testid="wizard-backdrop"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-xl rounded-3xl bg-[#0b0b15] border border-white/10 shadow-2xl"
          data-testid="custom-recipe-wizard"
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} style={{ color: accent }} />
              <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color: accent }}>
                build your recipe
              </div>
            </div>
            <button
              onClick={onClose}
              data-testid="wizard-close-btn"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Progress */}
          <div className="px-6">
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: accent }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35 }}
              />
            </div>
            <div className="text-[10px] text-white/40 mt-1">
              {step + 1} of {STEPS.length}
            </div>
          </div>

          <motion.div
            key={s.key}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="px-6 py-5"
          >
            <div className="font-display text-2xl text-white mb-1">{s.title}</div>
            <div className="text-sm text-white/55 mb-5">{s.sub}</div>

            {/* Options */}
            {s.options.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4" data-testid={`wizard-options-${s.key}`}>
                {s.options.map((opt) => {
                  const active = s.multi ? (Array.isArray(value) && value.includes(opt)) : value === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => (s.multi ? toggleMulti(opt) : setValue(opt))}
                      data-testid={`wizard-opt-${s.key}-${opt}`}
                      className="px-4 py-2 rounded-full text-sm transition border"
                      style={{
                        background: active ? `${accent}22` : "rgba(255,255,255,0.03)",
                        borderColor: active ? `${accent}` : "rgba(255,255,255,0.08)",
                        color: active ? accent : "rgba(255,255,255,0.85)",
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Free text */}
            {s.allowFree && (
              s.long ? (
                <textarea
                  value={s.multi ? "" : (typeof value === "string" ? value : "")}
                  onChange={(e) => setValue(e.target.value)}
                  rows={3}
                  placeholder={s.placeholder}
                  data-testid={`wizard-input-${s.key}`}
                  className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 outline-none focus:border-teal-400/40 text-sm text-white/90 placeholder:text-white/30 resize-none"
                />
              ) : (
                <input
                  value={s.multi ? "" : (typeof value === "string" ? value : "")}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={s.placeholder}
                  data-testid={`wizard-input-${s.key}`}
                  className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 outline-none focus:border-teal-400/40 text-sm text-white/90 placeholder:text-white/30"
                />
              )
            )}
          </motion.div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
            <button
              onClick={prev}
              disabled={step === 0}
              data-testid="wizard-back-btn"
              className="px-4 py-2 rounded-full text-sm flex items-center gap-1 text-white/70 hover:bg-white/5 transition disabled:opacity-30"
            >
              <ChevronLeft size={14} /> back
            </button>
            <button
              onClick={next}
              disabled={submitting}
              data-testid="wizard-next-btn"
              className="px-5 py-2.5 rounded-full text-sm flex items-center gap-2 text-black font-medium hover:scale-[1.03] transition disabled:opacity-50"
              style={{ background: accent }}
            >
              {submitting ? "cooking…" : isLast ? "build my recipe" : "next"}
              {!submitting && !isLast && <ChevronRight size={14} />}
              {!submitting && isLast && <Sparkles size={14} />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CustomRecipeWizard;
