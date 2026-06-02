import React from "react";
import { AuroraBackground } from "./AuroraBackground";
import { Sidebar } from "./Sidebar";
import { motion } from "framer-motion";

export const AppShell = ({ children }) => {
  return (
    <div className="relative min-h-screen text-white">
      <AuroraBackground />
      <Sidebar />
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 ml-72 mr-4 py-6 pl-2 pr-2 min-h-screen"
      >
        {children}
      </motion.main>
    </div>
  );
};

export default AppShell;
