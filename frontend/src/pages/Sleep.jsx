import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Plus, Sparkles } from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/Shared";
import GuidanceCard from "../components/GuidanceCard";
import { http } from "../lib/api";
import { toast } from "sonner";

const Sleep = () => {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ bedtime: "23:00", wake_time: "07:00", quality: 4, dream: "", morning_mood: 6 });
  const [coach, setCoach] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => setList((await http.get("/sleep")).data);
  useEffect(() => { load(); loadCoach(); }, []);

  const loadCoach = async () => { try { setCoach((await http.get("/sleep/coach")).data.tip); } catch {} };

  const submit = async () => {
    setSaving(true);
    try { await http.post("/sleep", form); load(); loadCoach(); toast.success("Sleep logged."); }
    catch { toast.error("Could not save"); }
    setSaving(false);
  };

  const hours = (b, w) => {
    const [bh, bm] = b.split(":").map(Number); const [wh, wm] = w.split(":").map(Number);
    let mins = wh * 60 + wm - (bh * 60 + bm); if (mins < 0) mins += 24 * 60;
    return (mins / 60).toFixed(1);
  };
  const totalDebt = list.slice(0, 7).reduce((s, x) => s + Math.max(0, 8 - parseFloat(hours(x.bedtime, x.wake_time))), 0);

  return (
    <AppShell>
      <PageHeader eyebrow="sleep tracker" title="The other half of wellness." subtitle="Sleep is the keel — keep it steady." accent="#60a5fa" />

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <Card accent="#60a5fa">
          <div className="text-xs uppercase tracking-widest text-blue-300 mb-3 flex items-center gap-2"><Plus size={14}/> log last night</div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-[10px] text-white/40 mb-1">Bedtime</div><input data-testid="sleep-bed" type="time" value={form.bedtime} onChange={(e) => setForm({ ...form, bedtime: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none" /></div>
              <div><div className="text-[10px] text-white/40 mb-1">Wake</div><input data-testid="sleep-wake" type="time" value={form.wake_time} onChange={(e) => setForm({ ...form, wake_time: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none" /></div>
            </div>
            <div>
              <div className="text-[10px] text-white/40 mb-1">Quality {form.quality}/5</div>
              <input data-testid="sleep-quality" type="range" min={1} max={5} value={form.quality} onChange={(e) => setForm({ ...form, quality: +e.target.value })} className="w-full accent-blue-400" />
            </div>
            <div>
              <div className="text-[10px] text-white/40 mb-1">Morning mood {form.morning_mood}/10</div>
              <input type="range" min={1} max={10} value={form.morning_mood} onChange={(e) => setForm({ ...form, morning_mood: +e.target.value })} className="w-full accent-blue-400" />
            </div>
            <input value={form.dream} onChange={(e) => setForm({ ...form, dream: e.target.value })} placeholder="Dream or thought (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none placeholder-white/30" />
            <button onClick={submit} disabled={saving} data-testid="sleep-save" className="w-full py-2.5 rounded-full bg-white text-black hover:scale-[1.02] transition disabled:opacity-50">{saving ? "…" : "save"}</button>
          </div>
        </Card>

        <Card accent="#a78bfa" className="lg:col-span-2">
          <div className="text-xs uppercase tracking-widest text-purple-300 mb-3 flex items-center gap-2"><Sparkles size={14}/> Lyra's bedtime routine</div>
          <div className="text-sm text-white/85 whitespace-pre-wrap">{coach || "Loading…"}</div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">avg hours (7d)</div>
              <div className="font-display text-3xl">{list.slice(0, 7).length ? (list.slice(0, 7).reduce((s, x) => s + parseFloat(hours(x.bedtime, x.wake_time)), 0) / list.slice(0, 7).length).toFixed(1) : "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">sleep debt</div>
              <div className="font-display text-3xl text-amber-300">{totalDebt.toFixed(1)}<span className="text-sm text-white/40">h</span></div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">entries</div>
              <div className="font-display text-3xl">{list.length}</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-5">
        <GuidanceCard feature="sleep" accent="#60a5fa" title="3 sleep hygiene tips for tonight" />
      </div>

      <Card accent="#60a5fa">
        <div className="text-xs uppercase tracking-widest text-blue-300 mb-3 flex items-center gap-2"><Moon size={14}/> recent nights</div>
        {list.length === 0 && <div className="text-sm text-white/40">No logs yet.</div>}
        <div className="space-y-2">
          {list.slice(0, 10).map((s) => (
            <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 p-3 rounded-2xl border border-white/5 bg-white/[0.02]">
              <div className="font-display text-2xl text-blue-300">{hours(s.bedtime, s.wake_time)}<span className="text-xs text-white/40">h</span></div>
              <div className="flex-1">
                <div className="text-sm">{s.bedtime} → {s.wake_time}</div>
                <div className="text-xs text-white/40">{new Date(s.created_at).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <span key={i} className={`w-2 h-2 rounded-full ${i < s.quality ? "bg-blue-400" : "bg-white/10"}`} />)}</div>
              {s.dream && <div className="text-xs text-white/50 italic max-w-[40%] truncate">"{s.dream}"</div>}
            </motion.div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
};

export default Sleep;
