import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, X } from "lucide-react";
import { http } from "../lib/api";
import { toast } from "sonner";

const GratitudeTab = () => {
  const [items, setItems] = useState(["", "", ""]);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState([]);
  const [streak, setStreak] = useState(0);
  const [reflection, setReflection] = useState(null);
  const [showRef, setShowRef] = useState(false);
  const [refLoading, setRefLoading] = useState(false);
  const [heart, setHeart] = useState(false);

  const load = async () => {
    try {
      const [g, s] = await Promise.all([http.get("/gratitude"), http.get("/streaks")]);
      setEntries(g.data.items || []);
      const gratStreak = (s.data.streaks || []).find((x) => x.habit === "gratitude");
      setStreak(gratStreak?.current_streak || 0);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const trimmed = items.map((s) => s.trim());
    if (trimmed.some((s) => !s)) { toast.error("Fill all 3 to save"); return; }
    setSaving(true);
    try {
      const { data } = await http.post("/gratitude", { items: trimmed });
      setStreak(data.streak || 0);
      setItems(["", "", ""]);
      setHeart(true);
      setTimeout(() => setHeart(false), 1500);
      toast.success("Saved — thank you for noticing.");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not save");
    }
    setSaving(false);
  };

  const askReflection = async () => {
    setRefLoading(true);
    setShowRef(true);
    setReflection(null);
    try {
      const { data } = await http.get("/gratitude/weekly-reflection");
      if (data.error) setReflection({ error: data.message });
      else setReflection({ text: data.reflection });
    } catch {
      setReflection({ error: "Could not generate reflection right now." });
    }
    setRefLoading(false);
  };

  const allFilled = items.every((s) => s.trim().length > 0);

  return (
    <div className="space-y-5" data-testid="gratitude-tab">
      <div className="rounded-3xl p-7 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, rgba(245,158,11,0.06), rgba(20,15,5,0.6))", border: "1px solid rgba(245,158,11,0.25)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300">today's gratitude</div>
            <h2 className="font-display text-2xl text-white">What are 3 things you're grateful for?</h2>
          </div>
          {streak > 0 && (
            <div className="px-3 py-1.5 rounded-full text-xs text-amber-200 flex items-center gap-1.5"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)" }}
              data-testid="gratitude-streak-badge">
              🙏 {streak} day{streak === 1 ? "" : "s"}
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          {items.map((v, i) => (
            <input
              key={i}
              value={v}
              onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={`${i + 1}. Something small that mattered today…`}
              data-testid={`gratitude-input-${i}`}
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition text-white placeholder:text-amber-100/30"
              style={{ background: "rgba(255,253,245,0.04)", border: "1px solid rgba(245,158,11,0.18)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(245,158,11,0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(245,158,11,0.18)")}
            />
          ))}
        </div>

        <div className="flex gap-2 mt-4 relative">
          <button
            onClick={save}
            disabled={!allFilled || saving}
            data-testid="gratitude-save"
            className="px-5 py-2.5 rounded-full text-black font-medium text-sm disabled:opacity-40 hover:scale-[1.02] transition"
            style={{ background: "linear-gradient(90deg, #fbbf24, #f59e0b)" }}
          >
            {saving ? "Saving…" : "Save Gratitudes"}
          </button>
          <button
            onClick={askReflection}
            data-testid="gratitude-reflect"
            className="px-5 py-2.5 rounded-full border border-amber-400/40 text-amber-200 text-sm hover:bg-amber-500/10 transition flex items-center gap-2"
          >
            <Sparkles size={14} /> Weekly Reflection
          </button>
          <AnimatePresence>
            {heart && (
              <motion.div
                initial={{ opacity: 0, y: 0, scale: 0.6 }}
                animate={{ opacity: 1, y: -40, scale: 1.4 }}
                exit={{ opacity: 0, y: -80, scale: 0.8 }}
                transition={{ duration: 1.5 }}
                className="absolute left-12 top-0 pointer-events-none text-2xl"
              >
                💛
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* History */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300 mb-2">past entries</div>
        {entries.length === 0 && (
          <div className="text-sm text-white/40 italic">Your first gratitude will appear here.</div>
        )}
        <div className="space-y-3">
          {entries.map((e) => (
            <div key={e.id} className="rounded-2xl p-4 bg-white/[0.02] border border-white/5" data-testid={`gratitude-entry-${e.id}`}>
              <div className="text-[10px] uppercase tracking-widest text-amber-300/70 mb-2">{e.date}</div>
              <ul className="space-y-1 text-sm text-white/80">
                {(e.items || []).map((s, i) => (
                  <li key={i} className="flex gap-2"><Heart size={12} className="mt-1.5 text-amber-300 shrink-0" />{s}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Reflection modal */}
      <AnimatePresence>
        {showRef && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setShowRef(false)}
            data-testid="gratitude-reflection-modal"
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-md rounded-3xl p-7"
              style={{ background: "linear-gradient(180deg, rgba(245,158,11,0.10), rgba(20,15,5,0.95))", border: "1px solid rgba(245,158,11,0.35)" }}
            >
              <button onClick={() => setShowRef(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10">
                <X size={14} />
              </button>
              <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300 mb-2">weekly reflection</div>
              {refLoading && <div className="text-sm text-white/55 italic">Reading your week…</div>}
              {reflection?.error && <div className="text-sm text-white/65">{reflection.error}</div>}
              {reflection?.text && <p className="text-sm text-white/85 leading-relaxed italic">"{reflection.text}"</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GratitudeTab;
