import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/Shared";
import { useAuth } from "../lib/auth.jsx";
import { http } from "../lib/api";
import { toast } from "sonner";

const Settings = () => {
  const { user, refresh, logout } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [prefs, setPrefs] = useState(user?.preferences || {});
  const [notif, setNotif] = useState({ morning: true, assess: true, appt: true, water: false });

  const startReplay = async () => {
    try { await http.post("/users/tutorial-reset"); } catch {}
    await refresh();
    toast.success("Replaying the tour…");
    nav("/app/dashboard");
  };

  const savePrefs = async (p) => {
    setPrefs(p);
    await http.patch("/users/preferences", p);
    refresh();
    toast.success("Saved");
  };

  const saveProfile = async () => {
    await http.patch("/users/profile", { name });
    refresh();
    toast.success("Profile saved");
  };

  const exportData = async () => {
    const all = {};
    for (const path of ["/auth/me", "/journal", "/mood?days=365", "/assessments", "/appointments", "/sleep"]) {
      try { const r = await http.get(path); all[path] = r.data; } catch {}
    }
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mindsphere-data.json"; a.click();
  };

  const accents = [
    { key: "purple", c: "#a78bfa" },
    { key: "teal", c: "#14b8a6" },
    { key: "pink", c: "#ec4899" },
    { key: "orange", c: "#f59e0b" },
  ];

  return (
    <AppShell>
      <PageHeader eyebrow="settings" title="Your space, your rules." accent="#9ca3af" />

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">profile</div>
          <input value={name} onChange={(e) => setName(e.target.value)} data-testid="set-name"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none mb-3" />
          <div className="text-xs text-white/40 mb-3">{user?.email}</div>
          <button onClick={saveProfile} className="px-5 py-2 rounded-full bg-white text-black hover:scale-[1.02] transition">Save</button>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Lyra preferences</div>
          <div className="text-xs text-white/60 mb-1">Name</div>
          <input value={prefs.lyra_name || ""} onChange={(e) => setPrefs({ ...prefs, lyra_name: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none mb-3" />
          <div className="text-xs text-white/60 mb-1">Style</div>
          <select value={prefs.style || "warm"} onChange={(e) => setPrefs({ ...prefs, style: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none mb-3">
            {["warm", "clinical", "motivational"].map(o => <option key={o}>{o}</option>)}
          </select>
          <button onClick={() => savePrefs(prefs)} data-testid="set-prefs-save" className="px-5 py-2 rounded-full bg-white text-black hover:scale-[1.02] transition">Save</button>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">notifications</div>
          {Object.entries({ morning: "Morning check-in", assess: "Assessment reminders", appt: "Appointment alerts", water: "Hydration pings" }).map(([k, l]) => (
            <label key={k} className="flex items-center justify-between py-2.5 border-b border-white/5">
              <span className="text-sm">{l}</span>
              <input type="checkbox" checked={notif[k]} onChange={(e) => setNotif({ ...notif, [k]: e.target.checked })} className="accent-purple-400 w-4 h-4" />
            </label>
          ))}
          <div className="text-[11px] text-white/40 mt-2">Local-only toggles in this MVP. Push wiring lives in Settings → Integrations.</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">appearance</div>
          <div className="text-xs text-white/60 mb-2">Accent color</div>
          <div className="flex gap-2">
            {accents.map(a => (
              <button key={a.key} onClick={() => savePrefs({ ...prefs, accent: a.key })}
                className={`w-9 h-9 rounded-full border-2 transition ${prefs.accent === a.key ? "border-white" : "border-white/10"}`}
                style={{ background: a.c }} title={a.key} />
            ))}
          </div>
          <div className="text-[11px] text-white/40 mt-3">Themes: <span className="text-white/70">Deep Space (active)</span> · AMOLED · Soft Dark — coming soon</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">privacy & data</div>
          <button onClick={exportData} data-testid="set-export" className="px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/5 text-sm mr-3">Export all data (JSON)</button>
          <button onClick={logout} className="px-5 py-2.5 rounded-full border border-red-400/30 hover:bg-red-500/10 text-sm text-red-300">Sign out</button>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">guided tour</div>
          <div className="text-sm text-white/70 mb-3">Forgot what's where? Replay the interactive walkthrough of MindSphere's key features.</div>
          <button onClick={startReplay} data-testid="set-replay-tutorial"
            className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium flex items-center gap-2 hover:scale-[1.02] transition">
            <Sparkles size={14}/> Replay the tour
          </button>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">integrations</div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            {["Apple Health", "Google Fit", "Spotify"].map(s => (
              <div key={s} className="p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
                <div className="text-base">{s}</div>
                <div className="text-[10px] text-white/40 mt-1">Coming soon</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
};

export default Settings;
