import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home, BookOpen, Smile, Brain, Mic, Salad, Activity, ClipboardList,
  Calendar, BarChart3, Search, Wind, Moon, Library, Settings, LogOut, HeartPulse
} from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { motion } from "framer-motion";

const items = [
  { to: "/app/dashboard", icon: Home, label: "Dashboard", accent: "#a78bfa" },
  { to: "/app/journal", icon: BookOpen, label: "Mind Journal", accent: "#c084fc" },
  { to: "/app/mood", icon: Smile, label: "Mood Tracker", accent: "#ec4899" },
  { to: "/app/lyra", icon: Brain, label: "AI Health Assistant", accent: "#a78bfa" },
  { to: "/app/mental-health", icon: HeartPulse, label: "Mental Health", accent: "#fb7185" },
  { to: "/app/voice", icon: Mic, label: "Real-Time Voice", accent: "#10b981" },
  { to: "/app/diet", icon: Salad, label: "Diet & Nutrition", accent: "#14b8a6" },
  { to: "/app/exercise", icon: Activity, label: "Exercise Plans", accent: "#f59e0b" },
  { to: "/app/assessments", icon: ClipboardList, label: "Assessments", accent: "#60a5fa" },
  { to: "/app/appointments", icon: Calendar, label: "Appointments", accent: "#22d3ee" },
  { to: "/app/analytics", icon: BarChart3, label: "Analytics & Insights", accent: "#a78bfa" },
  { to: "/app/disturbance", icon: Search, label: "Disturbance Detector", accent: "#ef4444" },
  { to: "/app/meditation", icon: Wind, label: "Meditation & Breathing", accent: "#14b8a6" },
  { to: "/app/sleep", icon: Moon, label: "Sleep Tracker", accent: "#60a5fa" },
  { to: "/app/resources", icon: Library, label: "Resource Library", accent: "#f59e0b" },
  { to: "/app/settings", icon: Settings, label: "Settings", accent: "#9ca3af" },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <aside data-testid="app-sidebar" className="glass fixed left-4 top-4 bottom-4 w-64 flex flex-col z-20" style={{ borderRadius: 28 }}>
      <div className="px-6 pt-6 pb-4">
        <div onClick={() => navigate("/app/dashboard")} className="flex items-center gap-3 cursor-pointer" data-testid="sidebar-logo">
          <div className="mood-bubble" style={{ "--bb": "#c084fc", width: 36, height: 36 }} />
          <div>
            <div className="font-display text-xl text-white">MindSphere</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">your mind, understood</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
        {items.map((it, i) => (
          <NavLink
            key={it.to}
            to={it.to}
            data-testid={`nav-${it.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${
                isActive ? "bg-white/[0.06] text-white" : "text-white/60 hover:text-white hover:bg-white/[0.03]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="sb-active"
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                    style={{ background: it.accent, boxShadow: `0 0 10px ${it.accent}` }}
                  />
                )}
                <it.icon size={17} style={{ color: isActive ? it.accent : undefined }} />
                <span>{it.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/5 p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full mood-bubble flex items-center justify-center text-xs font-medium" style={{ "--bb": "#a78bfa" }}>
          {(user?.name || "U").slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white truncate">{user?.name}</div>
          <div className="text-[11px] text-white/40 truncate">{user?.email}</div>
        </div>
        <button onClick={logout} title="Sign out" data-testid="sidebar-logout"
          className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
