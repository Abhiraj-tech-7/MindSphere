import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User as UserIcon, CreditCard, Bell, Palette, Shield, AlertTriangle,
  Sparkles, ExternalLink, Download, LogOut, Check,
} from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/Shared";
import { useAuth } from "../lib/auth.jsx";
import { http, API } from "../lib/api";
import { toast } from "sonner";
import useDocTitle from "../hooks/useDocTitle";

const THEMES = [
  { key: "midnight", name: "Midnight", bg: "#050508", accent: "#8B5CF6", note: "default" },
  { key: "aurora", name: "Aurora", bg: "#071a12", accent: "#10B981", note: "green tint" },
  { key: "dusk", name: "Dusk", bg: "#120a05", accent: "#F59E0B", note: "warm tones" },
  { key: "void", name: "Void", bg: "#000000", accent: "#FFFFFF", note: "pure AMOLED" },
];

const NOTIF_KEYS = [
  { key: "daily_journal", label: "Daily journal reminder", default: true, withTime: "journal_time", defaultTime: "20:00" },
  { key: "mood_checkin", label: "Mood check-in reminder", default: false, withTime: "mood_time", defaultTime: "19:00" },
  { key: "weekly_digest", label: "Weekly wellness digest (Sunday)", default: false },
  { key: "appointment_reminders", label: "Appointment reminders (24h before)", default: true },
  { key: "trial_warnings", label: "Trial expiry warnings", default: true },
  { key: "promotional", label: "Promotional emails from MindSphere", default: false },
];

const applyTheme = (themeKey) => {
  const t = THEMES.find((x) => x.key === themeKey) || THEMES[0];
  const root = document.documentElement;
  root.style.setProperty("--theme-bg", t.bg);
  root.style.setProperty("--theme-accent", t.accent);
  document.body.style.backgroundColor = t.bg;
};

const TabBtn = ({ active, onClick, icon, label, testId }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${
      active ? "bg-white/10 text-white" : "text-white/55 hover:text-white/85"
    }`}
  >
    {icon} {label}
  </button>
);

const Settings = () => {
  useDocTitle("Settings");
  const { user, refresh, logout } = useAuth();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") || "profile");

  // Profile
  const [name, setName] = useState(user?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Subscription
  const [billing, setBilling] = useState(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [upgrading, setUpgrading] = useState(null);

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState(user?.notification_prefs || {});
  const [savingNotif, setSavingNotif] = useState(false);

  // Appearance
  const [theme, setTheme] = useState(user?.preferences?.theme || localStorage.getItem("ms_theme") || "midnight");

  // Danger zone
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { setTab(params.get("tab") || "profile"); }, [params]);

  useEffect(() => {
    // Load billing status
    http.get("/billing/status").then(({ data }) => setBilling(data)).catch(() => {});
    // Apply persisted theme
    applyTheme(theme);
  }, []);

  const goTab = (t) => { setTab(t); setParams({ tab: t }); };

  // Profile actions
  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await http.patch("/users/profile", { name });
      await refresh();
      toast.success("Profile saved");
    } catch {
      toast.error("Could not save");
    }
    setSavingProfile(false);
  };

  // Subscription actions
  const upgrade = async (plan) => {
    setUpgrading(plan);
    try {
      const { data } = await http.post("/billing/create-checkout-session", { plan });
      window.location.href = data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start checkout");
      setUpgrading(null);
    }
  };

  const openPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data } = await http.post("/billing/create-portal-session");
      window.location.href = data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not open portal");
      setOpeningPortal(false);
    }
  };

  // Notifications save
  const saveNotif = async (next) => {
    setSavingNotif(true);
    setNotifPrefs(next);
    try {
      await http.patch("/users/profile", { notification_prefs: next });
      await refresh();
    } catch {
      toast.error("Could not save preferences");
    }
    setSavingNotif(false);
  };

  // Theme
  const pickTheme = async (key) => {
    setTheme(key);
    applyTheme(key);
    localStorage.setItem("ms_theme", key);
    try {
      await http.patch("/users/preferences", { theme: key });
      await refresh();
    } catch { /* ignore */ }
  };

  // Privacy: export
  const exportData = async () => {
    try {
      const token = localStorage.getItem("ms_token");
      const res = await fetch(`${API}/users/export`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `mindsphere_data_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      toast.success("Download started");
    } catch {
      toast.error("Export failed");
    }
  };

  // Delete account
  const deleteAccount = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await http.delete("/users/me");
      localStorage.removeItem("ms_token");
      window.location.href = "/auth?deleted=true";
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not delete account");
      setDeleting(false);
    }
  };

  const planBadge = () => {
    if (!billing) return null;
    if (billing.plan === "trial") {
      const days = billing.trial_days_remaining ?? 0;
      return <Badge color="#f59e0b">Trial ({days} {days === 1 ? "day" : "days"} left)</Badge>;
    }
    if (billing.plan === "pro") {
      const cycle = billing.billing_cycle === "annual" ? "Annual" : "Monthly";
      return <Badge color="#10b981">Pro — {cycle}</Badge>;
    }
    return <Badge color="#6b7280">Free</Badge>;
  };

  return (
    <AppShell>
      <PageHeader eyebrow="settings" title="Your space, your rules." accent="#9ca3af" />

      {/* Tab bar */}
      <div className="mb-6 -mx-2 px-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          <TabBtn active={tab === "profile"} onClick={() => goTab("profile")} icon={<UserIcon size={14} />} label="Profile" testId="tab-profile" />
          <TabBtn active={tab === "subscription"} onClick={() => goTab("subscription")} icon={<CreditCard size={14} />} label="Subscription" testId="tab-subscription" />
          <TabBtn active={tab === "notifications"} onClick={() => goTab("notifications")} icon={<Bell size={14} />} label="Notifications" testId="tab-notifications" />
          <TabBtn active={tab === "appearance"} onClick={() => goTab("appearance")} icon={<Palette size={14} />} label="Appearance" testId="tab-appearance" />
          <TabBtn active={tab === "privacy"} onClick={() => goTab("privacy")} icon={<Shield size={14} />} label="Privacy" testId="tab-privacy" />
          <TabBtn active={tab === "danger"} onClick={() => goTab("danger")} icon={<AlertTriangle size={14} />} label="Danger Zone" testId="tab-danger" />
        </div>
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {tab === "profile" && (
          <Card className="max-w-2xl">
            <div className="text-xs uppercase tracking-widest text-white/40 mb-4">profile</div>
            <label className="text-xs text-white/60 mb-1 block">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} data-testid="profile-name"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none mb-4 text-white" />
            <label className="text-xs text-white/60 mb-1 block">Email</label>
            <div className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 text-white/60 text-sm mb-5">{user?.email}</div>
            <button onClick={saveProfile} disabled={savingProfile || name === user?.name} data-testid="profile-save"
              className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:scale-[1.02] transition disabled:opacity-40">
              {savingProfile ? "Saving…" : "Save Changes"}
            </button>
          </Card>
        )}

        {tab === "subscription" && (
          <div className="space-y-5 max-w-3xl">
            <Card>
              <div className="text-xs uppercase tracking-widest text-white/40 mb-3">your plan</div>
              <div className="flex flex-wrap items-center gap-3 mb-5">{planBadge()}</div>

              {billing?.plan === "trial" && (
                <>
                  <p className="text-sm text-white/70 mb-4">
                    You have <b>{billing.trial_days_remaining ?? 0} days</b> left in your free trial.
                    Full access to Lyra, meal plans, and assessments — no credit card required.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => upgrade("monthly")} disabled={upgrading === "monthly"} data-testid="sub-upgrade-monthly"
                      className="px-5 py-2.5 rounded-full bg-purple-400 text-black text-sm font-medium hover:scale-[1.02] transition disabled:opacity-40">
                      {upgrading === "monthly" ? "Opening…" : "Upgrade — $14.99/mo"}
                    </button>
                    <button onClick={() => upgrade("annual")} disabled={upgrading === "annual"} data-testid="sub-upgrade-annual"
                      className="px-5 py-2.5 rounded-full border border-emerald-400/40 text-emerald-300 text-sm hover:bg-emerald-500/10 transition disabled:opacity-40">
                      {upgrading === "annual" ? "Opening…" : "Annual — $149.99/yr (save $30)"}
                    </button>
                  </div>
                </>
              )}

              {billing?.plan === "pro" && (
                <>
                  <div className="grid sm:grid-cols-2 gap-3 mb-5 text-sm">
                    <Row label="Status" value={<span className="text-emerald-300">{billing.subscription_status}</span>} />
                    <Row label="Cycle" value={billing.billing_cycle} />
                    <Row label="Active since" value={billing.active_since ? new Date(billing.active_since).toLocaleDateString() : "—"} />
                    <Row label="Next billing" value={billing.next_billing_date ? new Date(billing.next_billing_date).toLocaleDateString() : "—"} />
                  </div>
                  <button onClick={openPortal} disabled={openingPortal} data-testid="sub-portal"
                    className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:scale-[1.02] transition flex items-center gap-2 disabled:opacity-40">
                    <ExternalLink size={14} /> {openingPortal ? "Opening…" : "Manage Subscription"}
                  </button>
                </>
              )}

              {billing?.plan === "free" && (
                <>
                  <p className="text-sm text-white/70 mb-4">
                    Your trial has ended. Upgrade to keep Lyra, AI meal plans, and assessments.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => upgrade("monthly")} disabled={upgrading === "monthly"} data-testid="sub-upgrade-monthly"
                      className="px-5 py-2.5 rounded-full bg-purple-400 text-black text-sm font-medium hover:scale-[1.02] transition disabled:opacity-40">
                      {upgrading === "monthly" ? "Opening…" : "Upgrade to Pro — $14.99/mo"}
                    </button>
                    <button onClick={() => upgrade("annual")} disabled={upgrading === "annual"} data-testid="sub-upgrade-annual"
                      className="px-5 py-2.5 rounded-full border border-emerald-400/40 text-emerald-300 text-sm hover:bg-emerald-500/10 transition disabled:opacity-40">
                      {upgrading === "annual" ? "Opening…" : "Annual — $149.99/yr"}
                    </button>
                  </div>
                </>
              )}
            </Card>

            <Card>
              <div className="text-xs uppercase tracking-widest text-white/40 mb-1">buy more credits</div>
              <div className="text-xs text-white/40 mb-4">Coming soon — top up extra voice sessions, chat messages, or AI credits.</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: "🎙", name: "Voice +5", desc: "5 extra voice sessions", price: "$2.99" },
                  { icon: "💬", name: "Chat +50", desc: "50 extra Lyra messages", price: "$0.99" },
                  { icon: "✨", name: "AI Basic", desc: "+$3 AI credit / month", price: "$3.49" },
                  { icon: "🚀", name: "AI Pro", desc: "+$10 AI credit / month", price: "$9.99" },
                ].map((p) => (
                  <div key={p.name} className="rounded-2xl p-4 border border-white/10 bg-white/[0.02]">
                    <div className="text-2xl mb-1">{p.icon}</div>
                    <div className="font-medium text-sm">{p.name}</div>
                    <div className="text-xs text-white/50 mb-3">{p.desc}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">{p.price}</span>
                      <button disabled className="text-xs px-3 py-1 rounded-full border border-white/10 opacity-40 cursor-not-allowed">soon</button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === "notifications" && (
          <Card className="max-w-2xl">
            <div className="text-xs uppercase tracking-widest text-white/40 mb-4">notifications</div>
            <div className="space-y-1">
              {NOTIF_KEYS.map((n) => {
                const on = notifPrefs[n.key] ?? n.default;
                return (
                  <div key={n.key} className="flex items-center justify-between py-3 border-b border-white/5">
                    <div className="text-sm text-white/85">{n.label}</div>
                    <div className="flex items-center gap-3">
                      {n.withTime && on && (
                        <input
                          type="time"
                          value={notifPrefs[n.withTime] || n.defaultTime}
                          onChange={(e) => saveNotif({ ...notifPrefs, [n.withTime]: e.target.value })}
                          className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white"
                          data-testid={`notif-time-${n.key}`}
                        />
                      )}
                      <Toggle on={on} onChange={(v) => saveNotif({ ...notifPrefs, [n.key]: v })} testId={`notif-toggle-${n.key}`} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-white/40 mt-4">Email delivery wires up to Resend in the next release.</div>
          </Card>
        )}

        {tab === "appearance" && (
          <Card className="max-w-3xl">
            <div className="text-xs uppercase tracking-widest text-white/40 mb-4">theme</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => pickTheme(t.key)}
                  data-testid={`theme-${t.key}`}
                  className="relative rounded-2xl border p-4 text-left transition hover:scale-[1.02]"
                  style={{
                    background: t.bg,
                    borderColor: theme === t.key ? t.accent : "rgba(255,255,255,0.08)",
                    boxShadow: theme === t.key ? `0 0 30px -8px ${t.accent}66` : "none",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-white text-sm">{t.name}</div>
                    {theme === t.key && <Check size={16} style={{ color: t.accent }} />}
                  </div>
                  <div className="flex gap-1.5 mb-3">
                    <div className="w-6 h-6 rounded-full" style={{ background: t.bg, border: "1px solid rgba(255,255,255,0.15)" }} />
                    <div className="w-6 h-6 rounded-full" style={{ background: t.accent }} />
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">{t.note}</div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {tab === "privacy" && (
          <Card className="max-w-2xl">
            <div className="text-xs uppercase tracking-widest text-white/40 mb-4">privacy & data</div>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="text-sm font-medium text-white mb-1">Export My Data</div>
                <p className="text-xs text-white/55 mb-3">Get a complete copy of all your MindSphere data in JSON format.</p>
                <button onClick={exportData} data-testid="privacy-export"
                  className="px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:scale-[1.02] transition flex items-center gap-2">
                  <Download size={14} /> Export My Data
                </button>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <a href="/privacy" className="text-purple-300 hover:underline" data-testid="privacy-policy-link">Privacy Policy →</a>
                <a href="/terms" className="text-purple-300 hover:underline" data-testid="privacy-terms-link">Terms of Service →</a>
              </div>
              <div className="pt-4 border-t border-white/5">
                <button onClick={logout} data-testid="privacy-logout"
                  className="px-4 py-2 rounded-full border border-white/15 hover:bg-white/5 text-sm flex items-center gap-2">
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </div>
          </Card>
        )}

        {tab === "danger" && (
          <Card className="max-w-2xl" style={{ borderColor: "rgba(239,68,68,0.35)" }}>
            <div className="text-xs uppercase tracking-widest text-red-300 mb-4">danger zone</div>
            <div className="text-sm text-white/85 mb-3">Delete your account and all associated data. This is permanent and cannot be undone.</div>
            <div className="text-xs text-white/55 mb-4">
              Type <code className="px-1.5 py-0.5 rounded bg-white/10 text-red-300">DELETE</code> below to enable the button.
            </div>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              data-testid="danger-confirm-input"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none mb-4 text-white placeholder:text-white/30"
            />
            <button
              onClick={deleteAccount}
              disabled={confirmText !== "DELETE" || deleting}
              data-testid="danger-delete-btn"
              className="px-5 py-2.5 rounded-full bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting…" : "Permanently Delete My Account"}
            </button>
            {user?.email === "demo@mindsphere.app" && (
              <div className="text-[11px] text-white/40 mt-3">Note: the demo account is protected and cannot be deleted.</div>
            )}
          </Card>
        )}
      </motion.div>
    </AppShell>
  );
};

const Badge = ({ children, color }) => (
  <span
    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
    style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}
  >
    <Sparkles size={11} /> {children}
  </span>
);

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
    <span className="text-xs uppercase tracking-widest text-white/40">{label}</span>
    <span className="text-sm text-white/85">{value || "—"}</span>
  </div>
);

const Toggle = ({ on, onChange, testId }) => (
  <button
    onClick={() => onChange(!on)}
    data-testid={testId}
    role="switch"
    aria-checked={on}
    className="relative w-10 h-6 rounded-full transition"
    style={{ background: on ? "#c084fc" : "rgba(255,255,255,0.1)" }}
  >
    <span
      className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition"
      style={{ left: on ? "calc(100% - 22px)" : "2px" }}
    />
  </button>
);

export default Settings;
