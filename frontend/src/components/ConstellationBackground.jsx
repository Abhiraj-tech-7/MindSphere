import React, { useEffect, useRef } from "react";

const ConstellationBackground = () => {
  const canvasRef = useRef(null);
  const starsRef = useRef([]);
  const mouseRef = useRef({ x: -999, y: -999 });
  const animIdRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const isMobile = window.innerWidth < 768;

    const generateStars = (w, h) => {
      const count = window.innerWidth < 768 ? 80 : 180;
      return Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: 0.5 + Math.random() * 1.3,
        baseOpacity: 0.15 + Math.random() * 0.4,
        twinkleOffset: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      starsRef.current = generateStars(canvas.width, canvas.height);
    };
    resize();

    let frameCount = 0;
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      frameCount++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Cursor glow halo
      if (mx > -100) {
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 120);
        grad.addColorStop(0, "rgba(139,92,246,0.06)");
        grad.addColorStop(1, "rgba(139,92,246,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Stars
      const stars = starsRef.current;
      for (const s of stars) {
        const tw = Math.sin(now * 0.0008 + s.twinkleOffset) * 0.12;
        const dx = s.x - mx, dy = s.y - my;
        const d = Math.sqrt(dx * dx + dy * dy);
        const opBoost = d < 180 ? (1 - d / 180) * 0.4 : 0;
        const rBoost = d < 180 ? (1 - d / 180) * 1.2 : 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius + rBoost, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, s.baseOpacity + tw + opBoost)})`;
        ctx.fill();
      }

      // Constellation lines (every 2nd frame, near cursor only)
      if (!isMobile && frameCount % 2 === 0 && mx > -100) {
        for (let i = 0; i < stars.length; i++) {
          const si = stars[i];
          const di = Math.sqrt((si.x - mx) ** 2 + (si.y - my) ** 2);
          if (di > 220) continue;
          for (let j = i + 1; j < stars.length; j++) {
            const sj = stars[j];
            const dj = Math.sqrt((sj.x - mx) ** 2 + (sj.y - my) ** 2);
            if (dj > 220) continue;
            const dx = si.x - sj.x, dy = si.y - sj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 160) continue;
            ctx.beginPath();
            ctx.moveTo(si.x, si.y);
            ctx.lineTo(sj.x, sj.y);
            ctx.strokeStyle = `rgba(139,92,246,${(1 - dist / 160) * 0.25})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
    };
    animate();

    const onMove = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    if (!isMobile) window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="constellation-bg"
      style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}
    />
  );
};

export default ConstellationBackground;
