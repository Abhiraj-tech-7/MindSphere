import React from "react";

/**
 * Dark "eclipse planet" orb — deep matte black core, thin iridescent rim glow,
 * pink/violet atmospheric haze, subtle breathing shimmer.
 *
 * Pure CSS via .eclipse-orb in index.css (no JS animation needed).
 */
export const EclipseOrb = ({ size = 320, className = "", style = {} }) => {
  return (
    <div
      data-testid="eclipse-orb"
      className={`eclipse-orb ${className}`}
      style={{ width: size, height: size, ...style }}
    />
  );
};

export default EclipseOrb;
