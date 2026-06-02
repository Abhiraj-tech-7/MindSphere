import React from "react";

export const AuroraBackground = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
    <div className="aurora-orb" style={{
      width: 620, height: 620, top: "-10%", left: "-10%",
      background: "radial-gradient(circle, #a855f7 0%, transparent 60%)",
      animation: "drift1 26s ease-in-out infinite",
    }} />
    <div className="aurora-orb" style={{
      width: 560, height: 560, top: "20%", right: "-15%",
      background: "radial-gradient(circle, #ec4899 0%, transparent 60%)",
      animation: "drift2 30s ease-in-out infinite",
    }} />
    <div className="aurora-orb" style={{
      width: 480, height: 480, bottom: "-10%", left: "30%",
      background: "radial-gradient(circle, #14b8a6 0%, transparent 60%)",
      animation: "drift3 34s ease-in-out infinite",
    }} />
    <div className="aurora-orb" style={{
      width: 400, height: 400, top: "40%", left: "10%",
      background: "radial-gradient(circle, #f59e0b 0%, transparent 65%)",
      opacity: 0.35,
      animation: "drift4 28s ease-in-out infinite",
    }} />
    {/* grain */}
    <div style={{
      position: "absolute", inset: 0, opacity: 0.04, mixBlendMode: "overlay",
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
    }} />
  </div>
);

export default AuroraBackground;
