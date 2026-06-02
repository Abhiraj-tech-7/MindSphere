import React from "react";
import { motion } from "framer-motion";

export const MindOrb = ({ size = 360, floating = true, className = "", style = {} }) => {
  return (
    <motion.div
      data-testid="mind-orb"
      className={`mind-orb ${className}`}
      style={{ width: size, height: size, ...style }}
      animate={floating ? { y: [0, -14, 0] } : false}
      transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
    />
  );
};

export const MoodBubble = ({ color = "#c084fc", size = 60, label, style = {}, onClick, decorative = false }) => {
  const props = {
    "data-testid": label ? `mood-bubble-${label}` : "mood-bubble",
    className: "mood-bubble",
    style: { "--bb": color, width: size, height: size, border: "none", cursor: onClick ? "pointer" : "default", ...style },
  };
  if (decorative) {
    return <motion.div {...props} aria-hidden />;
  }
  return (
    <motion.button
      onClick={onClick}
      {...props}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.95 }}
    />
  );
};

export default MindOrb;
