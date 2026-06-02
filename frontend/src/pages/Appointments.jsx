import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar as CalIcon, Plus, X, Clock } from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/Shared";
import GuidanceCard from "../components/GuidanceCard";
import { http } from "../lib/api";
import { toast } from "sonner";

const directory = [
  { name: "Dr. Maya Reyes", role: "Clinical Psychologist", tags: ["CBT", "Anxiety"], rate: "$120/hr" },
  { name: "Dr. Jordan Sato", role: "Psychiatrist", tags: ["Medication", "Sleep"], rate: "$180/hr" },
  { name: "Naomi Brooks, LCSW", role: "Counselor", tags: ["Trauma", "Family"], rate: "$95/hr" },
  { name: "Dr. Ethan Park", role: "GP", tags: ["Holistic", "Lifestyle"], rate: "$110/hr" },
];

const Appointments = () => {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ provider_type: "Therapist", format: "Video", date: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [notesId, setNotesId] = useState(null);
  const [notesTxt, setNotesTxt] = useState("");

  const load = async () => setList((await http.get("/appointments")).data);
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.date) return toast.error("Pick a date and time");
    setSaving(true);
    try { await http.post("/appointments", form); setOpen(false); setForm({ provider_type: "Therapist", format: "Video", date: "", notes: "" }); load(); toast.success("Booked."); }
    catch { toast.error("Could not book"); }
    setSaving(false);
  };

  const cancel = async (id) => { await http.delete(`/appointments/${id}`); load(); toast.success("Removed"); };

  const saveNotes = async () => {
    await http.patch(`/appointments/${notesId}`, { session_notes: notesTxt });
    setNotesId(null); setNotesTxt(""); toast.success("Saved");
    load();
  };

  const countdown = (iso) => {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms < 0) return "past";
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    return `in ${d}d ${h}h`;
  };

  return (
    <AppShell>
      <PageHeader eyebrow="appointments" title="Care, scheduled." subtitle="Book sessions with AI-prepared talking points." accent="#22d3ee"
        right={<button onClick={() => setOpen(true)} data-testid="appt-new" className="px-5 py-2.5 rounded-full bg-white text-black flex items-center gap-2 hover:scale-[1.03] transition"><Plus size={14}/> book</button>} />

      <div className="mb-5"><GuidanceCard feature="appointments" accent="#22d3ee" title="3 prep tips for your next session" /></div>

      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        {list.length === 0 && <div className="text-white/40 text-sm">No appointments yet.</div>}
        {list.map((a) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass glass-hover p-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs uppercase tracking-widest text-cyan-300">{a.format}</div>
                <div className="font-display text-2xl capitalize">{a.provider_type}</div>
                <div className="text-sm text-white/60 mt-1 flex items-center gap-2"><Clock size={12}/> {new Date(a.date).toLocaleString()}</div>
                <div className="text-xs text-cyan-300 mt-1">{countdown(a.date)}</div>
              </div>
              <button onClick={() => cancel(a.id)} className="text-xs text-white/40 hover:text-red-400">remove</button>
            </div>
            {a.talking_points && (
              <div className="mt-4 p-3 rounded-2xl bg-cyan-500/5 border border-cyan-400/20">
                <div className="text-[11px] uppercase tracking-widest text-cyan-300 mb-1">prep talking points</div>
                <div className="text-sm text-white/85 whitespace-pre-wrap">{a.talking_points}</div>
              </div>
            )}
            <button onClick={() => { setNotesId(a.id); setNotesTxt(a.session_notes || ""); }} className="mt-3 text-xs text-cyan-300 hover:underline">add session notes →</button>
            {a.session_notes && <div className="text-xs text-white/60 mt-2">"{a.session_notes}"</div>}
          </motion.div>
        ))}
      </div>

      <Card accent="#a78bfa" className="mb-5">
        <div className="text-xs uppercase tracking-widest text-purple-300 mb-3">find a professional</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {directory.map((d) => (
            <div key={d.name} className="p-4 rounded-2xl border border-white/5 bg-white/[0.03]">
              <div className="font-medium">{d.name}</div>
              <div className="text-xs text-white/50">{d.role}</div>
              <div className="flex gap-1 mt-2 flex-wrap">{d.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300">{t}</span>)}</div>
              <div className="text-xs text-white/60 mt-2">{d.rate}</div>
            </div>
          ))}
        </div>
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setOpen(false)}>
          <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass p-7 w-full max-w-md" data-testid="appt-modal">
            <div className="flex justify-between items-center"><div className="font-display text-2xl">Book a session</div><button onClick={() => setOpen(false)}><X size={18}/></button></div>
            <div className="space-y-3 mt-5">
              <select value={form.provider_type} onChange={(e) => setForm({ ...form, provider_type: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none">
                {["Therapist", "Psychiatrist", "Counselor", "GP"].map(o => <option key={o}>{o}</option>)}
              </select>
              <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none">
                {["Video", "Phone", "In-person"].map(o => <option key={o}>{o}</option>)}
              </select>
              <input data-testid="appt-date" type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: new Date(e.target.value).toISOString() })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" />
              <textarea data-testid="appt-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="What do you want to bring up?" rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none resize-none" />
            </div>
            <button onClick={create} disabled={saving} data-testid="appt-confirm" className="mt-5 w-full py-3 rounded-full bg-white text-black font-medium hover:scale-[1.02] transition disabled:opacity-50">{saving ? "…" : "Confirm"}</button>
          </motion.div>
        </div>
      )}

      {notesId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setNotesId(null)}>
          <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass p-7 w-full max-w-md">
            <div className="font-display text-xl">Session notes</div>
            <textarea value={notesTxt} onChange={(e) => setNotesTxt(e.target.value)} rows={6}
              className="mt-4 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none resize-none" />
            <button onClick={saveNotes} className="mt-4 w-full py-3 rounded-full bg-white text-black">Save</button>
          </motion.div>
        </div>
      )}
    </AppShell>
  );
};

export default Appointments;
