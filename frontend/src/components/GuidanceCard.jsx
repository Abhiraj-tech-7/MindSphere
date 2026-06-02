import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCcw } from "lucide-react";
import { http } from "../lib/api";

/** Reusable AI guidance card. Shows 3 personalized tips for the current feature. */
const GuidanceCard = ({ feature, accent = "#c084fc", title = "what to do now", className = "" }) => {
  const [tips, setTips] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setTips((await http.get(`/guidance/${feature}`)).data.tips); } catch { setTips([]); }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [feature]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={`glass p-5 relative overflow-hidden ${className}`} style={{ borderColor: `${accent}40` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest flex items-center gap-2" style={{ color: accent }}>
          <Sparkles size={13}/> {title}
        </div>
        <button onClick={load} className="text-xs text-white/40 hover:text-white" disabled={loading}>
          <RefreshCcw size={12} className={loading ? "animate-spin" : ""}/>
        </button>
      </div>
      {loading && !tips && <div className="text-sm text-white/40">Reading your data…</div>}
      {tips && (
        <ul className="space-y-2">
          {tips.map((t, i) => (
            <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              className="flex gap-2 text-sm">
              <span className="font-display" style={{ color: accent }}>{i + 1}.</span>
              <span className="text-white/85">{t}</span>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
};

export default GuidanceCard;
