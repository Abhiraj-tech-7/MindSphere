import React from "react";

/**
 * Tiny CSS-only shimmer skeleton.
 * Usage: <Skeleton w="60%" h={20} r={8} />
 */
const Skeleton = ({ w = "100%", h = 16, r = 8, className = "", style = {}, testId }) => (
  <div
    data-testid={testId}
    className={`ms-skel ${className}`}
    style={{ width: w, height: h, borderRadius: r, ...style }}
  />
);

export const SkeletonStack = ({ rows = 3, gap = 10 }) => (
  <div style={{ display: "flex", flexDirection: "column", gap }}>
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} h={14 + Math.random() * 8} w={`${60 + Math.random() * 40}%`} />
    ))}
  </div>
);

export default Skeleton;
