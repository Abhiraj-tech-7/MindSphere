import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Timer } from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/Shared";
import GuidanceCard from "../components/GuidanceCard";
import { http } from "../lib/api";
import { toast } from "sonner";

const COLOR = { yoga: "#a78bfa", walking: "#10b981", cardio: "#f59e0b", strength: "#ef4444", breathing: "#14b8a6", rest: "#6b7280" };

const Exercise = () => {
  const [lib, setLib] = useState([]);
  const [today, setToday] = useState(null);
  const [filter, setFilter] = useState("all");
  const [logs, setLogs] = useState([]);

  const load = async () => {
    const [l, t, lg] = await Promise.all([http.get("/exercise/library"), http.get("/exercise/today"), http.get("/exercise/log")]);
    setLib(l.data); setToday(t.data); setLogs(lg.data);
  };
  useEffect(() => { load(); }, []);

  const complete = async (id) => {
    await http.post("/exercise/complete", { exercise_id: id });
    toast.success("Logged ✨");
    load();
  };

  const filtered = lib.filter(e => filter === "all" || e.type === filter);

  // weekly streak
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today_dow = new Date().getDay(); // 0=Sun
  const week = days.map((d, i) => {
    const date = new Date(); date.setDate(date.getDate() - ((today_dow + 6 - i) % 7));
    const has = logs.some(l => l.created_at?.slice(0, 10) === date.toISOString().slice(0, 10));
    return { d, has };
  });

  return (
    <AppShell>
      <PageHeader eyebrow="exercise plans" title="Move on your terms." subtitle="Right movement, right mood." accent="#f59e0b" />

      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <Card accent={COLOR[today?.type] || "#f59e0b"} className="lg:col-span-2">
          <div className="text-xs uppercase tracking-widest text-amber-300 mb-2">today, suggested for you</div>
          {today && (
            <>
              <div className="font-display text-4xl">{today.name}</div>
              <div className="text-sm text-amber-300/90 mt-1">{today.benefit}</div>
              <div className="flex gap-3 mt-3 text-xs text-white/60">
                <span className="px-2 py-1 rounded-full bg-white/5"><Timer size={11} className="inline mr-1" />{today.duration} min</span>
                <span className="px-2 py-1 rounded-full bg-white/5 capitalize">{today.difficulty}</span>
                <span className="px-2 py-1 rounded-full" style={{ background: `${COLOR[today.type]}22`, color: COLOR[today.type] }}>{today.type}</span>
              </div>
              <ol className="mt-5 space-y-1.5 text-sm text-white/75 list-decimal list-inside">
                {today.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
              <button onClick={() => complete(today.id)} data-testid="exercise-done"
                className="mt-5 px-5 py-2.5 rounded-full bg-white text-black flex items-center gap-2 hover:scale-[1.03] transition">
                <Check size={14} /> mark done
              </button>
            </>
          )}
        </Card>

        <Card accent="#10b981">
          <div className="text-xs uppercase tracking-widest text-emerald-300 mb-3">this week</div>
          <div className="grid grid-cols-7 gap-2">
            {week.map((w, i) => (
              <div key={i} className="text-center">
                <div className="text-[10px] text-white/40">{w.d}</div>
                <div className={`w-9 h-9 mx-auto mt-1 rounded-xl border ${w.has ? "border-emerald-400/60 bg-emerald-500/20" : "border-white/10"}`}>
                  {w.has && <Check size={16} className="text-emerald-400 m-auto mt-2" />}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-white/60">{logs.length} sessions total</div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <GuidanceCard feature="exercise" accent="#f59e0b" title="3 movement tips · personalized" className="lg:col-span-3" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {["all", "yoga", "walking", "cardio", "strength", "breathing"].map((t) => (
          <button key={t} onClick={() => setFilter(t)} data-testid={`filter-${t}`}
            className={`px-4 py-2 rounded-full text-xs capitalize border transition ${filter === t ? "border-amber-400/60 bg-amber-500/15" : "border-white/10 hover:bg-white/5"}`}>{t}</button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((e, i) => (
          <motion.div key={e.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="glass glass-hover p-5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest" style={{ color: COLOR[e.type] }}>
              {e.type} · {e.duration}min · {e.difficulty}
            </div>
            <div className="font-display text-xl mt-2">{e.name}</div>
            <div className="text-xs text-white/55 mt-1">{e.benefit}</div>
            <button onClick={() => complete(e.id)} className="mt-4 text-xs text-white/70 hover:text-white">log session →</button>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
};

export default Exercise;
