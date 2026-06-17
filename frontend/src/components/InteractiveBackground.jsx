import React, { useEffect, useRef } from "react";

/**
 * Cursor-reactive aurora field rendered on a canvas.
 * - Soft blurred orbs drift on their own.
 * - A pointer-following light bends the field toward the cursor.
 * - A faint particle constellation parallaxes against the mouse.
 *
 * Pure canvas so it stays smooth and doesn't thrash React state.
 */
export const InteractiveBackground = () => {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: 0.5, y: 0.4, tx: 0.5, ty: 0.4 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const orbs = [
      { x: 0.15, y: 0.2, r: 0.42, hue: [168, 85, 50], spd: 0.00018, phase: 0 },
      { x: 0.82, y: 0.28, r: 0.38, hue: [292, 84, 61], spd: 0.00022, phase: 2 },
      { x: 0.55, y: 0.85, r: 0.34, hue: [330, 81, 60], spd: 0.00016, phase: 4 },
      { x: 0.3, y: 0.6, r: 0.28, hue: [38, 92, 50], spd: 0.0002, phase: 1 },
    ];

    // floating particles
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random() * 0.8 + 0.2,
      r: Math.random() * 1.6 + 0.4,
    }));

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e) => {
      mouse.current.tx = e.clientX / window.innerWidth;
      mouse.current.ty = e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const draw = (t) => {
      // ease mouse
      mouse.current.x += (mouse.current.tx - mouse.current.x) * 0.05;
      mouse.current.y += (mouse.current.ty - mouse.current.y) * 0.05;
      const mx = mouse.current.x;
      const my = mouse.current.y;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // drifting aurora orbs, pulled slightly toward cursor
      orbs.forEach((o) => {
        const dx = Math.sin(t * o.spd + o.phase) * 0.06;
        const dy = Math.cos(t * o.spd * 1.3 + o.phase) * 0.06;
        const cx = (o.x + dx + (mx - 0.5) * 0.12) * w;
        const cy = (o.y + dy + (my - 0.5) * 0.12) * h;
        const rad = o.r * Math.min(w, h);
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        const [hue, s, l] = o.hue;
        grd.addColorStop(0, `hsla(${hue}, ${s}%, ${l}%, 0.42)`);
        grd.addColorStop(0.5, `hsla(${hue}, ${s}%, ${l}%, 0.12)`);
        grd.addColorStop(1, `hsla(${hue}, ${s}%, ${l}%, 0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      });

      // cursor spotlight
      const sx = mx * w;
      const sy = my * h;
      const sRad = Math.min(w, h) * 0.28;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sRad);
      sg.addColorStop(0, "hsla(190, 90%, 70%, 0.16)");
      sg.addColorStop(1, "hsla(190, 90%, 70%, 0)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sx, sy, sRad, 0, Math.PI * 2);
      ctx.fill();

      // particles parallax against the mouse
      ctx.globalCompositeOperation = "source-over";
      particles.forEach((p) => {
        const ox = (mx - 0.5) * 40 * p.z;
        const oy = (my - 0.5) * 40 * p.z;
        const x = p.x * w - ox;
        const y = p.y * h - oy;
        ctx.fillStyle = `rgba(255,255,255,${0.04 + p.z * 0.12})`;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 h-full w-full"
      style={{ zIndex: 0, filter: "blur(40px)" }}
    />
  );
};

export default InteractiveBackground;
