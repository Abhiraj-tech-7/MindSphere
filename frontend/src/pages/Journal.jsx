import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Send, Sparkles } from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader } from "../components/Shared";
import { MindOrb } from "../components/MindOrb";
import GuidanceCard from "../components/GuidanceCard";
import { http } from "../lib/api";
import { toast } from "sonner";

const Journal = () => {
  const [entries, setEntries] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [text, setText] = useState("");
  const [emoTag, setEmoTag] = useState(null);
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const tagTimer = useRef(null);

  const load = async () => {
    const { data } = await http.get("/journal");
    setEntries(data);
  };
  useEffect(() => { load(); }, []);

  // live emotion detection (debounced)
  useEffect(() => {
    if (!open) return;
    clearTimeout(tagTimer.current);
    if (text.length < 30) { setEmoTag(null); return; }
    tagTimer.current = setTimeout(async () => {
      try {
        // re-use a lightweight detection by posting a temp call? we don't have a public endpoint — call the assistant
        const { data } = await http.post("/chat", {
          message: `Reply ONLY with a single JSON like {"emotion":"happy","intensity":7}. Detect emotion from: """${text.slice(0, 600)}"""`,
          session_id: "emo-detect-temp",
        });
        const m = (data.reply || "").match(/\{.*\}/s);
        if (m) {
          const j = JSON.parse(m[0]);
          setEmoTag(j);
        }
      } catch {}
    }, 900);
    return () => clearTimeout(tagTimer.current);
  }, [text, open]);

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast.error("Voice not supported in this browser");
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      let s = "";
      for (let i = e.resultIndex; i < e.results.length; i++) s += e.results[i][0].transcript + " ";
      setText((t) => (t.replace(/\s*\[live\].*$/, "") + s));
    };
    r.onend = () => setListening(false);
    r.start();
    recRef.current = r;
    setListening(true);
  };
  const stopVoice = () => { recRef.current?.stop(); setListening(false); };

  const save = async () => {
    if (text.trim().length < 5) return toast.error("Write a little more first.");
    setSaving(true);
    try {
      const { data } = await http.post("/journal", { content: text, voice: listening });
      setEntries((e) => [data, ...e]);
      toast.success(data.summary || "Saved.");
      setText(""); setEmoTag(null); setOpen(false);
    } catch { toast.error("Could not save"); }
    setSaving(false);
  };

  const del = async (id) => {
    await http.delete(`/journal/${id}`);
    setEntries((e) => e.filter((x) => x.id !== id));
    setActive(null);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="mind journal"
        title="A constellation of you."
        subtitle="Every entry becomes a bubble. Hover to remember. Click to revisit."
        accent="#c084fc"
        right={
          <button onClick={() => setOpen(true)} data-testid="journal-new"
            className="btn-pulse px-6 py-3 rounded-full bg-white text-black font-medium hover:scale-[1.03] transition">
            + new entry
          </button>
        }
      />

      <div className="relative h-[60vh] glass overflow-hidden" data-testid="journal-canvas">
        {/* center big orb */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <MindOrb size={300} />
        </div>

        {/* floating mood bubbles */}
        {entries.slice(0, 28).map((e, i) => {
          const angle = (i / Math.max(8, entries.length)) * Math.PI * 2;
          const radius = 180 + (i % 4) * 28;
          const x = `calc(50% + ${Math.cos(angle) * radius}px - 28px)`;
          const y = `calc(50% + ${Math.sin(angle) * radius}px - 28px)`;
          const size = 36 + (e.intensity || 5) * 3;
          return (
            <motion.button
              key={e.id}
              onClick={() => setActive(e)}
              data-testid={`bubble-${e.id}`}
              className="absolute mood-bubble cursor-pointer group"
              style={{ "--bb": e.color, width: size, height: size, left: x, top: y, border: "none" }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1, opacity: 1,
                y: ["0px", "-10px", "0px"],
              }}
              transition={{ delay: i * 0.04, y: { repeat: Infinity, duration: 4 + (i % 3), ease: "easeInOut" } }}
              whileHover={{ scale: 1.25, zIndex: 10 }}
            >
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition bg-black/80 px-2 py-0.5 rounded">
                {(e.content || "").slice(0, 30)}…
              </span>
            </motion.button>
          );
        })}
        {entries.length === 0 && (
          <div className="absolute bottom-6 left-0 right-0 text-center text-white/40 text-sm">Your first thought will become a star.</div>
        )}
      </div>

      {/* recent list */}
      <div className="mt-8 grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <GuidanceCard feature="journal" accent="#c084fc" title="3 prompts for you" />
        </div>
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
          {entries.slice(0, 6).map((e) => (
            <motion.div key={e.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="glass glass-hover p-5 cursor-pointer" onClick={() => setActive(e)}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full" style={{ background: e.color }} />
                <span className="text-xs uppercase tracking-wider text-white/50">{e.emotion}</span>
                <span className="ml-auto text-[11px] text-white/30">{new Date(e.created_at).toLocaleDateString()}</span>
              </div>
              <div className="text-sm text-white/80 line-clamp-3">{e.content}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* New entry modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl p-6 flex items-center justify-center"
          >
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="glass w-full max-w-2xl p-7" data-testid="journal-editor">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-300 text-xs uppercase tracking-widest"><Sparkles size={14}/> new entry</div>
                <button onClick={() => { setOpen(false); setText(""); setEmoTag(null); }} className="text-white/40 hover:text-white"><X size={18}/></button>
              </div>
              <textarea
                data-testid="journal-textarea"
                autoFocus value={text} onChange={(e) => setText(e.target.value)}
                placeholder="What's alive in you right now?"
                rows={10}
                className="mt-5 w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-purple-400/60 placeholder-white/30 resize-none"
              />
              <div className="flex items-center gap-3 mt-3 text-xs">
                <div className="text-white/40">{text.trim().split(/\s+/).filter(Boolean).length} words</div>
                {emoTag && <div className="px-2.5 py-1 rounded-full text-white" style={{ background: `${["#a78bfa", "#ec4899", "#60a5fa", "#f59e0b", "#10b981"][text.length % 5]}55` }}>
                  detected: {emoTag.emotion} · {emoTag.intensity}/10
                </div>}
                <div className="ml-auto flex gap-2">
                  <button onClick={listening ? stopVoice : startVoice} data-testid="journal-mic"
                    className={`p-2 rounded-full border ${listening ? "border-pink-400/60 bg-pink-500/20" : "border-white/10"} hover:bg-white/5`}>
                    {listening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  <button onClick={save} disabled={saving} data-testid="journal-save"
                    className="flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black text-sm font-medium hover:scale-[1.03] transition disabled:opacity-50">
                    <Send size={14} /> {saving ? "Saving…" : "Save entry"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active reading card */}
      <AnimatePresence>
        {active && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl p-6 flex items-center justify-center" onClick={() => setActive(null)}>
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              className="glass w-full max-w-xl p-7" data-testid="journal-reader">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: active.color }} />
                  <span className="text-xs uppercase tracking-widest text-white/50">{active.emotion} · {new Date(active.created_at).toLocaleString()}</span>
                </div>
                <button onClick={() => setActive(null)} className="text-white/40 hover:text-white"><X size={18}/></button>
              </div>
              <div className="text-base text-white/90 mt-4 whitespace-pre-wrap leading-relaxed">{active.content}</div>
              {active.summary && (
                <div className="mt-5 p-4 rounded-2xl border border-purple-400/20 bg-purple-500/5">
                  <div className="text-[11px] text-purple-300 uppercase tracking-widest mb-1">Lyra's reflection</div>
                  <div className="text-sm text-white/80">{active.summary}</div>
                </div>
              )}
              <div className="mt-5 flex justify-end">
                <button onClick={() => del(active.id)} className="text-xs text-red-400 hover:underline">delete entry</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
};

export default Journal;
