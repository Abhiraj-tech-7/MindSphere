import React from "react";
import { motion } from "framer-motion";

export const PageHeader = ({ eyebrow, title, subtitle, accent = "#c084fc", right }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-wrap items-end justify-between gap-4 mb-8"
  >
    <div>
      {eyebrow && <div className="text-[11px] tracking-[0.25em] uppercase mb-2" style={{ color: accent }}>{eyebrow}</div>}
      <h1 className="font-display text-4xl sm:text-5xl text-white text-glow">{title}</h1>
      {subtitle && <p className="text-white/55 mt-2 max-w-xl">{subtitle}</p>}
    </div>
    {right}
  </motion.div>
);

export const Card = ({ children, className = "", hover = true, accent, ...rest }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className={`glass ${hover ? "glass-hover" : ""} p-6 ${className}`}
    style={accent ? { borderColor: `${accent}55` } : undefined}
    {...rest}
  >
    {children}
  </motion.div>
);

export const Stat = ({ label, value, suffix, accent = "#c084fc" }) => (
  <Card>
    <div className="text-[11px] uppercase tracking-widest text-white/40">{label}</div>
    <div className="font-display text-4xl mt-1" style={{ color: accent }}>{value}<span className="text-lg text-white/40 ml-1">{suffix}</span></div>
  </Card>
);

export default Card;
