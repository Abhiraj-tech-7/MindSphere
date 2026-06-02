import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader } from "../components/Shared";
import GuidanceCard from "../components/GuidanceCard";
import { http } from "../lib/api";

const SUGGESTIONS = [
  "How am I doing this week?",
  "I'm feeling overwhelmed",
  "What should I focus on today?",
  "Analyze my mood patterns",
];

const Lyra = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId] = useState(() => `lyra-${Date.now()}`);
  const endRef = useRef(null);

  useEffect(() => { (async () => {
    try {
      const { data } = await http.get(`/chat/history?session_id=${sessionId}`);
      setMessages(data);
    } catch {}
  })(); }, [sessionId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  const send = async (text) => {
    const msg = text || input;
    if (!msg.trim()) return;
    setInput("");
    const userMsg = { id: Math.random(), role: "user", content: msg, created_at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setSending(true);
    try {
      const { data } = await http.post("/chat", { message: msg, session_id: sessionId });
      setMessages((m) => [...m, { id: Math.random(), role: "assistant", content: data.reply, created_at: new Date().toISOString() }]);
    } catch {
      setMessages((m) => [...m, { id: Math.random(), role: "assistant", content: "Lyra is taking a breath. Try again in a moment." }]);
    }
    setSending(false);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="ai health assistant"
        title="Meet Lyra."
        subtitle="She has read your journals, watched your moods, and is rooting for you."
        accent="#a78bfa"
      />

      <div className="mb-5"><GuidanceCard feature="lyra" accent="#a78bfa" title="3 things to ask Lyra today" /></div>

      <div className="glass flex flex-col" style={{ height: "70vh" }} data-testid="lyra-chat">
        <div className="flex items-center gap-3 p-5 border-b border-white/5">
          <div className="mood-bubble" style={{ "--bb": "#a78bfa", width: 40, height: 40 }} />
          <div>
            <div className="font-display text-lg">Lyra</div>
            <div className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> online · context-aware
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center mt-10">
              <div className="font-display text-2xl mb-3">Hi. What's on your mind?</div>
              <div className="grid sm:grid-cols-2 gap-2 max-w-lg mx-auto mt-6">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => send(s)} data-testid={`lyra-suggest-${i}`}
                    className="text-left text-sm px-4 py-3 rounded-2xl border border-white/10 hover:border-purple-400/60 hover:bg-purple-500/10 transition">
                    <Sparkles size={12} className="inline mr-2 text-purple-300" />{s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] px-4 py-3 rounded-3xl ${m.role === "user"
                ? "bg-white text-black"
                : "glass border border-white/10 text-white/90"}`} style={{ borderRadius: m.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px" }}>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
              </div>
            </motion.div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="glass px-4 py-3 rounded-3xl text-sm text-white/60 flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="p-4 border-t border-white/5 flex gap-2">
          <input
            data-testid="lyra-input"
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Tell Lyra anything…"
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 outline-none focus:border-purple-400/50 placeholder-white/30"
          />
          <button onClick={() => send()} disabled={sending} data-testid="lyra-send"
            className="px-5 rounded-full bg-white text-black font-medium hover:scale-[1.03] transition disabled:opacity-50">
            <Send size={16} />
          </button>
        </div>
      </div>
    </AppShell>
  );
};

export default Lyra;
