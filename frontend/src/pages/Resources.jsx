import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, BookOpen, Video, Dumbbell, Wand2, LifeBuoy, Phone, MessageSquare } from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/Shared";
import { http } from "../lib/api";

const ICON = { article: BookOpen, video: Video, exercise: Dumbbell, technique: Wand2, crisis: LifeBuoy };

const Resources = () => {
  const [list, setList] = useState([]);
  const [cat, setCat] = useState("all");
  const [saved, setSaved] = useState({});

  useEffect(() => { (async () => setList((await http.get("/resources")).data))(); }, []);

  const cats = ["all", ...Array.from(new Set(list.map(r => r.category)))];
  const filtered = list.filter(r => cat === "all" || r.category === cat);
  const crisis = list.filter(r => r.type === "crisis");

  return (
    <AppShell>
      <PageHeader eyebrow="resource library" title="Help is here. Curated." subtitle="Reading, listening, and lifelines." accent="#f59e0b" />

      <Card accent="#ef4444" className="mb-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-red-300 mb-3"><LifeBuoy size={14}/> if you need someone tonight</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {crisis.map(r => (
            <a key={r.id} href={r.url} className="p-4 rounded-2xl border border-red-400/30 hover:bg-red-500/10 transition flex items-center gap-3">
              {r.url?.startsWith("tel") ? <Phone size={18} className="text-red-300"/> : <MessageSquare size={18} className="text-red-300"/>}
              <div>
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-white/60">{r.summary}</div>
              </div>
            </a>
          ))}
        </div>
        <div className="text-[11px] text-white/40 mt-3">You matter. Reaching out is brave.</div>
      </Card>

      <div className="flex gap-2 flex-wrap mb-4">
        {cats.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-4 py-2 rounded-full text-xs capitalize border transition ${cat === c ? "border-amber-400/60 bg-amber-500/15" : "border-white/10 hover:bg-white/5"}`}>{c}</button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.filter(r => r.type !== "crisis").map((r, i) => {
          const Icon = ICON[r.type] || BookOpen;
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass glass-hover p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300">{r.type}</span>
                <button onClick={() => setSaved(s => ({ ...s, [r.id]: !s[r.id] }))} className={`${saved[r.id] ? "text-amber-300" : "text-white/30"} hover:text-amber-200`}>
                  <Bookmark size={14} fill={saved[r.id] ? "currentColor" : "none"} />
                </button>
              </div>
              <div className="flex items-start gap-2 mt-3">
                <Icon size={18} className="text-amber-300 mt-1" />
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-white/40">{r.time}</div>
                </div>
              </div>
              <div className="text-xs text-white/60 mt-3">{r.summary}</div>
            </motion.div>
          );
        })}
      </div>
    </AppShell>
  );
};

export default Resources;
