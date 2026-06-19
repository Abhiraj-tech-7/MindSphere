import React, { createContext, useContext, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { http } from "../lib/api";
import { useAuth } from "../lib/auth.jsx";
import { toast } from "sonner";

const MoodCtx = createContext(null);
export const useMoodWidget = () => useContext(MoodCtx) || { open: () => {} };

const HIDE_PATHS = ["/auth", "/onboarding", "/pricing", "/welcome", "/privacy", "/terms"];

const MOODS = [
  { emoji: "😢", name: "sad", color: "#60a5fa" },
  { emoji: "😔", name: "tired", color: "#7c8db5" },
  { emoji: "😐", name: "neutral", color: "#94a3b8" },
  { emoji: "🙂", name: "reflective", color: "#c084fc" },
  { emoji: "😊", name: "calm", color: "#5eead4" },
  { emoji: "😄", name: "happy", color: "#ff7eb3" },
  { emoji: "🤩", name: "excited", color: "#fb7185" },
];

export const MoodWidgetProvider = ({ children }) => {
  const { user } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [intensity, setIntensity] = useState(6);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [pulse, setPulse] = useState(false);

  // Subtle pulse every 4 hours
  useEffect(() => {
    const last = parseInt(localStorage.getItem("ms_mood_widget_pulse") || "0", 10);
    const now = Date.now();
    if (now - last > 4 * 60 * 60 * 1000) {
      setPulse(true);
      localStorage.setItem("ms_mood_widget_pulse", String(now));
      setTimeout(() => setPulse(false), 6000);
    }
  }, []);

  const close = () => { setOpen(false); setSelected(null); setNote(""); setIntensity(6); };

  const submit = async () => {
    if (!selected) { toast.error("Pick a mood first"); return; }
    setSaving(true);
    try {
      await http.post("/mood", { emotion: selected.name, intensity, note });
      toast.success("Mood logged 💜");
      close();
    } catch (e) {
      toast.error(e?.response?.data?.detail?.message || "Could not log mood");
    }
    setSaving(false);
  };

  const visible = user && !HIDE_PATHS.some((p) => loc.pathname.startsWith(p));

  return (
    <MoodCtx.Provider value={{ open: () => setOpen(true), close }}>
      {children}
      {visible && (
        <button
          onClick={() => setOpen(true)}
          data-testid="mood-widget-fab"
          aria-label="Quick mood check-in"
          className="fixed z-[55] bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-white transition hover:scale-110"
          style={{
            background: "linear-gradient(135deg, #a78bfa, #ec4899)",
            boxShadow: pulse
              ? "0 0 0 0 rgba(192,132,252,0.6)"
              : "0 8px 24px -6px rgba(192,132,252,0.5)",
            animation: pulse ? "ms-pulse 2s ease-out 3" : "none",
          }}
        >
          <Plus size={22} />
        </button>
      )}
      <AnimatePresence>
        {open && visible && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur"
            onClick={close}
            data-testid="mood-widget-backdrop"
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 bg-[#0b0b15] border border-white/10 shadow-2xl mb-0 sm:mb-0 sm:mr-6"
              data-testid="mood-widget-modal"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-purple-300">quick check-in</div>
                  <div className="font-display text-lg text-white">How are you feeling?</div>
                </div>
                <button onClick={close} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10">
                  <X size={14} />
                </button>
              </div>

              <div className="flex justify-between mb-5">
                {MOODS.map((m) => (
                  <button
                    key={m.name}
                    onClick={() => setSelected(m)}
                    data-testid={`mood-emoji-${m.name}`}
                    className="text-2xl w-9 h-9 rounded-full flex items-center justify-center transition"
                    style={{
                      background: selected?.name === m.name ? `${m.color}33` : "transparent",
                      boxShadow: selected?.name === m.name ? `0 0 20px -4px ${m.color}` : "none",
                      transform: selected?.name === m.name ? "scale(1.15)" : "scale(1)",
                    }}
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-[10px] text-white/40 mb-1.5">
                  <span>intensity</span>
                  <span>{intensity}/10</span>
                </div>
                <input
                  type="range" min="1" max="10" value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value))}
                  data-testid="mood-intensity"
                  className="w-full accent-purple-400"
                />
              </div>

              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (optional)"
                data-testid="mood-note"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none mb-4 text-white placeholder:text-white/30"
              />

              <button
                onClick={submit}
                disabled={!selected || saving}
                data-testid="mood-log-btn"
                className="w-full py-2.5 rounded-full bg-purple-400 text-black font-medium text-sm disabled:opacity-40 hover:scale-[1.02] transition"
              >
                {saving ? "Logging…" : "Log Mood"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        @keyframes ms-pulse {
          0% { box-shadow: 0 0 0 0 rgba(192,132,252,0.7); }
          70% { box-shadow: 0 0 0 22px rgba(192,132,252,0); }
          100% { box-shadow: 0 0 0 0 rgba(192,132,252,0); }
        }
      `}</style>
    </MoodCtx.Provider>
  );
};
