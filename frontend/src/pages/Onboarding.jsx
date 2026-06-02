import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AuroraBackground } from "../components/AuroraBackground";
import { http } from "../lib/api";
import { useAuth } from "../lib/auth.jsx";
import { toast } from "sonner";

const QUESTIONS = [
  { key: "primary_goal", q: "What is your primary mental health goal?", type: "choice",
    options: ["Reduce anxiety", "Improve mood", "Better sleep", "Build resilience", "All of the above"] },
  { key: "religion", q: "What spiritual tradition resonates with you? (for daily verses on your dashboard)", type: "choice",
    options: ["Hindu", "Christian", "Muslim", "Buddhist", "Jewish", "Sikh", "Spiritual / Secular", "Prefer not to say"] },
  { key: "current_state", q: "How would you describe your current mental state this week?", type: "slider", min: 1, max: 10, labels: ["💔 low", "😌 calm", "✨ great"] },
  { key: "stressors", q: "What stresses you most?", type: "multi",
    options: ["Work", "Relationships", "Finances", "Health", "Loneliness", "Family", "School", "Other"] },
  { key: "sleep_hours", q: "How many hours of sleep do you get per night?", type: "slider", min: 3, max: 12, suffix: " hrs" },
  { key: "exercise_freq", q: "How often do you exercise?", type: "choice", options: ["Never", "1-2x week", "3-4x week", "Daily"] },
  { key: "diet_type", q: "Tell us about your diet.", type: "choice", options: ["Vegetarian", "Vegan", "Non-vegetarian", "Pescatarian", "Keto", "Other"] },
  { key: "allergies", q: "Any food allergies or intolerances?", type: "text", placeholder: "e.g. peanuts, lactose" },
  { key: "water_glasses", q: "How much water do you drink daily?", type: "slider", min: 0, max: 16, suffix: " glasses" },
  { key: "sees_therapist", q: "Do you currently see a therapist or counselor?", type: "choice", options: ["Yes", "No", "Would like to"] },
  { key: "journal_freq", q: "How often do you journal or reflect?", type: "choice", options: ["Never", "Sometimes", "Daily"] },
  { key: "wake_time", q: "What time do you wake up & sleep?", type: "times" },
  { key: "positive_triggers", q: "Top 3 mood triggers (positive)?", type: "chips",
    options: ["Music", "Friends", "Sunshine", "Exercise", "Nature", "Cooking", "Reading", "Pets", "Travel", "Solitude"] },
  { key: "negative_triggers", q: "Top 3 mood triggers (negative)?", type: "chips",
    options: ["Deadlines", "Conflict", "Noise", "Loneliness", "News", "Hunger", "Bad sleep", "Crowds", "Money"] },
  { key: "energy_level", q: "Rate your current energy on a typical day.", type: "slider", min: 1, max: 10 },
  { key: "perfect_day", q: "What would a perfect mental wellness day look like?", type: "textarea", placeholder: "Take your time…" },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [wakeTime, setWakeTime] = useState("07:00");
  const [sleepTime, setSleepTime] = useState("23:00");
  const [saving, setSaving] = useState(false);
  const { refresh } = useAuth();
  const nav = useNavigate();

  const cur = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;
  const progress = ((step + 1) / QUESTIONS.length) * 100;

  const set = (v) => setData({ ...data, [cur.key]: v });

  const next = async () => {
    if (cur.type === "times") {
      setData({ ...data, wake_time: wakeTime, sleep_time: sleepTime });
    }
    if (isLast) {
      setSaving(true);
      try {
        const final = { ...data };
        // normalize religion choice to backend key
        if (final.religion) {
          const map = { "Hindu": "hindu", "Christian": "christian", "Muslim": "muslim", "Buddhist": "buddhist",
            "Jewish": "jewish", "Sikh": "sikh", "Spiritual / Secular": "spiritual", "Prefer not to say": "none" };
          final.religion = map[final.religion] || "spiritual";
        }
        if (!final.wake_time) { final.wake_time = wakeTime; final.sleep_time = sleepTime; }
        await http.post("/users/onboarding", { answers: final });
        await refresh();
        toast.success("All set. Welcome to MindSphere.");
        nav("/app/dashboard");
      } catch (e) { toast.error("Could not save onboarding"); }
      setSaving(false);
    } else {
      setStep(step + 1);
    }
  };
  const prev = () => setStep(Math.max(0, step - 1));

  const canNext = (() => {
    if (cur.type === "times") return true;
    const v = data[cur.key];
    if (cur.type === "multi" || cur.type === "chips") return Array.isArray(v) && v.length > 0;
    if (cur.type === "text" || cur.type === "textarea") return (v ?? "").trim().length > 0;
    return v !== undefined && v !== null;
  })();

  const toggleArr = (val) => {
    const arr = data[cur.key] || [];
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  return (
    <div className="relative min-h-screen bg-black text-white">
      <AuroraBackground />
      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-14 pb-10">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">step {step + 1} of {QUESTIONS.length}</div>
          <div className="h-1 mt-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full" style={{ background: "linear-gradient(90deg, #a78bfa, #ec4899)" }}
              animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.35 }}
            className="glass p-8"
            data-testid={`onb-step-${step}`}
          >
            <h2 className="font-display text-3xl sm:text-4xl">{cur.q}</h2>

            <div className="mt-7 space-y-3">
              {cur.type === "choice" && cur.options.map((o) => (
                <button key={o} onClick={() => set(o)} data-testid={`opt-${o}`}
                  className={`w-full text-left px-5 py-4 rounded-2xl border transition ${data[cur.key] === o ? "border-purple-400/70 bg-purple-500/10" : "border-white/10 hover:bg-white/5"}`}>{o}</button>
              ))}
              {cur.type === "multi" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {cur.options.map((o) => (
                    <button key={o} onClick={() => toggleArr(o)} data-testid={`opt-${o}`}
                      className={`px-4 py-3 rounded-2xl border text-sm transition ${(data[cur.key] || []).includes(o) ? "border-pink-400/70 bg-pink-500/10" : "border-white/10 hover:bg-white/5"}`}>{o}</button>
                  ))}
                </div>
              )}
              {cur.type === "chips" && (
                <div className="flex flex-wrap gap-2">
                  {cur.options.map((o) => (
                    <button key={o} onClick={() => toggleArr(o)} data-testid={`opt-${o}`}
                      className={`px-4 py-2.5 rounded-full border text-sm transition ${(data[cur.key] || []).includes(o) ? "border-teal-400/70 bg-teal-500/10" : "border-white/10 hover:bg-white/5"}`}>{o}</button>
                  ))}
                </div>
              )}
              {cur.type === "slider" && (
                <div className="pt-6">
                  <div className="text-center font-display text-5xl text-white mb-4">{data[cur.key] ?? Math.round((cur.min + cur.max) / 2)}{cur.suffix || ""}</div>
                  <input data-testid="onb-slider" type="range" min={cur.min} max={cur.max} value={data[cur.key] ?? Math.round((cur.min + cur.max) / 2)}
                    onChange={(e) => set(Number(e.target.value))} className="w-full accent-purple-400" />
                  {cur.labels && <div className="flex justify-between text-xs text-white/40 mt-2">{cur.labels.map((l) => <span key={l}>{l}</span>)}</div>}
                </div>
              )}
              {cur.type === "text" && (
                <input data-testid="onb-text" value={data[cur.key] || ""} onChange={(e) => set(e.target.value)} placeholder={cur.placeholder}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 outline-none focus:border-purple-400/60 placeholder-white/30" />
              )}
              {cur.type === "textarea" && (
                <textarea data-testid="onb-textarea" value={data[cur.key] || ""} onChange={(e) => set(e.target.value)} placeholder={cur.placeholder} rows={5}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 outline-none focus:border-purple-400/60 placeholder-white/30 resize-none" />
              )}
              {cur.type === "times" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-white/40 mb-2">Wake up</div>
                    <input data-testid="onb-wake" type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 outline-none" />
                  </div>
                  <div>
                    <div className="text-xs text-white/40 mb-2">Go to sleep</div>
                    <input data-testid="onb-sleep" type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 outline-none" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-7">
          <button onClick={prev} disabled={step === 0} data-testid="onb-prev"
            className="flex items-center gap-2 px-5 py-3 rounded-full border border-white/10 hover:bg-white/5 disabled:opacity-30">
            <ChevronLeft size={16} /> Back
          </button>
          <button onClick={next} disabled={!canNext || saving} data-testid="onb-next"
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-medium hover:scale-[1.03] transition disabled:opacity-40 disabled:hover:scale-100">
            {isLast ? (saving ? "Saving…" : "Finish") : "Next"} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
