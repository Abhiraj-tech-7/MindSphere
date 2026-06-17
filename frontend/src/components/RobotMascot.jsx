import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * Interactive robot mascot.
 * - The whole rig parallax-tilts toward the cursor (head leads, body follows subtly).
 * - Eyes (a glowing scan-line layer) shift to track the pointer.
 * - Hands gently bob on a loop and react to proximity.
 *
 * The provided render is a single PNG, so we fake 3D depth by layering
 * transforms + a pointer-tracked glow rather than rigging separate limbs.
 */
export const RobotMascot = ({ src = "/robot-mascot.png", className = "", size = 520 }) => {
  const wrapRef = useRef(null);
  const [hovering, setHovering] = useState(false);

  // pointer position normalized to [-1, 1] relative to the mascot center
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  // springy values for natural motion
  const sx = useSpring(px, { stiffness: 90, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 90, damping: 18, mass: 0.6 });

  // whole rig tilt (subtle)
  const rotateY = useTransform(sx, [-1, 1], [7, -7]);
  const rotateX = useTransform(sy, [-1, 1], [-6, 6]);

  // head leads the cursor more than the body
  const headX = useTransform(sx, [-1, 1], [-22, 22]);
  const headY = useTransform(sy, [-1, 1], [-16, 16]);
  const headRotZ = useTransform(sx, [-1, 1], [-6, 6]);

  // eye glow shifts opposite-ish for a "looking at you" feel
  const eyeX = useTransform(sx, [-1, 1], [-14, 14]);
  const eyeY = useTransform(sy, [-1, 1], [-8, 8]);

  // ambient light follows cursor
  const glowX = useTransform(sx, [-1, 1], [25, 75]);
  const glowY = useTransform(sy, [-1, 1], [25, 75]);

  useEffect(() => {
    const handle = (e) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width / 1.4)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height / 1.4)));
      px.set(nx);
      py.set(ny);
    };
    window.addEventListener("pointermove", handle, { passive: true });
    return () => window.removeEventListener("pointermove", handle);
  }, [px, py]);

  const background = useTransform(
    [glowX, glowY],
    ([gx, gy]) =>
      `radial-gradient(circle at ${gx}% ${gy}%, rgba(20,184,166,0.22), transparent 55%)`
  );

  return (
    <div
      ref={wrapRef}
      className={`relative select-none ${className}`}
      style={{ width: size, height: size, perspective: 1200 }}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => {
        setHovering(false);
        px.set(0);
        py.set(0);
      }}
    >
      {/* cursor-reactive ambient glow behind mascot */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full blur-3xl"
        style={{ background, opacity: hovering ? 0.9 : 0.5 }}
      />

      {/* pedestal shadow */}
      <div
        aria-hidden
        className="absolute left-1/2 bottom-2 -translate-x-1/2 rounded-[50%]"
        style={{
          width: size * 0.55,
          height: size * 0.08,
          background: "radial-gradient(ellipse, rgba(0,0,0,0.65), transparent 70%)",
          filter: "blur(8px)",
        }}
      />

      {/* the rig */}
      <motion.div
        className="relative h-full w-full"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
      >
        {/* body image — edges feathered so the dark plate melts into the page */}
        <img
          src={src || "/placeholder.svg"}
          alt="MindSphere AI companion robot"
          className="absolute inset-0 h-full w-full object-contain"
          style={{
            transform: "translateZ(0px)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 75% at 50% 48%, #000 58%, transparent 92%)",
            maskImage:
              "radial-gradient(ellipse 70% 75% at 50% 48%, #000 58%, transparent 92%)",
          }}
          draggable={false}
          crossOrigin="anonymous"
        />

        {/* head layer that leads the cursor — a masked copy of the top of the image */}
        <motion.img
          src={src || "/placeholder.svg"}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-contain pointer-events-none"
          draggable={false}
          crossOrigin="anonymous"
          style={{
            x: headX,
            y: headY,
            rotateZ: headRotZ,
            transformOrigin: "50% 38%",
            transform: "translateZ(40px)",
            WebkitMaskImage:
              "radial-gradient(ellipse 26% 22% at 50% 28%, #000 60%, transparent 72%)",
            maskImage:
              "radial-gradient(ellipse 26% 22% at 50% 28%, #000 60%, transparent 72%)",
          }}
        />

        {/* glowing eye scan line that tracks pointer */}
        <motion.div
          aria-hidden
          className="absolute left-1/2 pointer-events-none"
          style={{
            top: "26%",
            x: eyeX,
            y: eyeY,
            translateX: "-50%",
            transform: "translateZ(60px)",
          }}
        >
          <motion.div
            className="flex gap-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          >
            <span
              className="block rounded-full"
              style={{
                width: size * 0.05,
                height: size * 0.012,
                background: "linear-gradient(90deg, transparent, #5eead4, transparent)",
                boxShadow: "0 0 14px #2dd4bf, 0 0 28px #14b8a6",
              }}
            />
            <span
              className="block rounded-full"
              style={{
                width: size * 0.05,
                height: size * 0.012,
                background: "linear-gradient(90deg, transparent, #5eead4, transparent)",
                boxShadow: "0 0 14px #2dd4bf, 0 0 28px #14b8a6",
              }}
            />
          </motion.div>
        </motion.div>

        {/* left hand glow accent (bobs) */}
        <motion.div
          aria-hidden
          className="absolute pointer-events-none rounded-full blur-md"
          style={{
            left: "10%",
            top: "58%",
            width: size * 0.12,
            height: size * 0.12,
            background: "radial-gradient(circle, rgba(192,132,252,0.5), transparent 70%)",
            transform: "translateZ(30px)",
          }}
          animate={{ y: [0, -8, 0], opacity: [0.4, 0.7, 0.4] }}
          transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
        />
        {/* right hand glow accent (bobs, offset) */}
        <motion.div
          aria-hidden
          className="absolute pointer-events-none rounded-full blur-md"
          style={{
            right: "10%",
            top: "58%",
            width: size * 0.12,
            height: size * 0.12,
            background: "radial-gradient(circle, rgba(236,72,153,0.45), transparent 70%)",
            transform: "translateZ(30px)",
          }}
          animate={{ y: [0, -8, 0], opacity: [0.4, 0.7, 0.4] }}
          transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1.2 }}
        />
      </motion.div>
    </div>
  );
};

export default RobotMascot;
