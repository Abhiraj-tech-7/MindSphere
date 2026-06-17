import React, { useRef } from "react";

/**
 * Card that tracks the cursor to drive a CSS spotlight (--mx/--my)
 * and applies a subtle 3D tilt toward the pointer.
 */
export const SpotlightCard = ({ children, className = "", style = {}, tilt = true, ...rest }) => {
  const ref = useRef(null);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    el.style.setProperty("--mx", `${mx}px`);
    el.style.setProperty("--my", `${my}px`);
    if (tilt) {
      const rx = ((my / r.height) - 0.5) * -8;
      const ry = ((mx / r.width) - 0.5) * 8;
      el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    if (tilt) el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`spotlight-card glass transition-transform duration-300 ease-out ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
};

export default SpotlightCard;
