import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Self-contained Three.js robot mascot built from primitives.
 * - Head follows cursor with lag (desktop)
 * - Body bobs, arms swing, LEDs pulse, visor glows
 * - Transparent renderer background
 * - Disposes all resources on unmount; renders null if WebGL unavailable.
 */
const RobotMascot = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let renderer, animFrameId, handleMouseMove;
    let webglFailed = false;

    try {
      const isMobile = window.innerWidth < 768;
      const W = isMobile ? 280 : 400;
      const H = isMobile ? 420 : 600;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
      camera.position.set(0, 0.4, 3.6);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W, H);
      el.appendChild(renderer.domElement);

      // Lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.4));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
      keyLight.position.set(-2, 3, 2);
      scene.add(keyLight);
      const rimLight = new THREE.DirectionalLight(0x8ab4f8, 0.6);
      rimLight.position.set(2, 2, -3);
      scene.add(rimLight);

      // Materials
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0f, roughness: 0.28, metalness: 0.72 });
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0x001a1a, emissive: new THREE.Color(0x00eeff), emissiveIntensity: 0.5,
        roughness: 0.1, metalness: 0.9,
      });
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x00eeff, emissive: new THREE.Color(0x00eeff), emissiveIntensity: 0.8,
        roughness: 0.0, metalness: 1.0,
      });

      // ROBOT
      const robotGroup = new THREE.Group();

      // Head
      const headGroup = new THREE.Group();
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 32), bodyMat);
      skull.scale.y = 0.92;
      headGroup.add(skull);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.09, 0.07), visorMat);
      visor.position.set(0, 0.02, 0.31);
      headGroup.add(visor);
      [-0.14, 0, 0.14].forEach((x) => {
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), ledMat);
        led.position.set(x, 0.02, 0.35);
        headGroup.add(led);
      });
      headGroup.position.set(0, 0.95, 0);
      robotGroup.add(headGroup);

      // Neck
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.18, 16), bodyMat);
      neck.position.set(0, 0.66, 0);
      robotGroup.add(neck);

      // Torso
      const torsoGroup = new THREE.Group();
      const chest = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.88, 0.44), bodyMat);
      torsoGroup.add(chest);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x05050a, roughness: 0.15, metalness: 0.8 }));
      panel.position.set(0, 0, 0.23);
      torsoGroup.add(panel);
      torsoGroup.position.set(0, 0.13, 0);
      robotGroup.add(torsoGroup);

      // Shoulders
      [-1, 1].forEach((side) => {
        const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), bodyMat);
        shoulder.position.set(side * 0.42, 0.45, 0);
        robotGroup.add(shoulder);
      });

      // Arms (return upper arms for animation)
      const buildArm = (side) => {
        const grp = new THREE.Group();
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.42, 16), bodyMat);
        upper.position.set(0, -0.21, 0);
        grp.add(upper);
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 12), bodyMat);
        elbow.position.set(0, -0.42, 0);
        grp.add(elbow);
        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.38, 16), bodyMat);
        forearm.position.set(0, -0.62, 0);
        grp.add(forearm);
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.10), bodyMat);
        hand.position.set(0, -0.88, 0);
        grp.add(hand);
        grp.position.set(side * 0.42, 0.45, 0);
        return grp;
      };
      const leftArm = buildArm(-1);
      const rightArm = buildArm(1);
      robotGroup.add(leftArm, rightArm);

      // Hip
      const hip = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.22, 0.38), bodyMat);
      hip.position.set(0, -0.42, 0);
      robotGroup.add(hip);

      // Legs (simple)
      [-0.18, 0.18].forEach((x) => {
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.10, 0.44, 16), bodyMat);
        thigh.position.set(x, -0.78, 0);
        robotGroup.add(thigh);
        const knee = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), bodyMat);
        knee.position.set(x, -1.02, 0);
        robotGroup.add(knee);
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.40, 16), bodyMat);
        shin.position.set(x, -1.26, 0);
        robotGroup.add(shin);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.28), bodyMat);
        foot.position.set(x, -1.51, 0.05);
        robotGroup.add(foot);
      });

      const baseY = -0.15;
      robotGroup.position.y = baseY;
      scene.add(robotGroup);

      // Interaction
      let targetHeadRotY = 0, targetHeadRotX = 0;
      let isHovered = false;
      handleMouseMove = (e) => {
        if (window.innerWidth < 768) return;
        targetHeadRotY = ((e.clientX / window.innerWidth) - 0.5) * (Math.PI / 7.2);
        targetHeadRotX = ((e.clientY / window.innerHeight) - 0.5) * (Math.PI / 12);
      };
      window.addEventListener("mousemove", handleMouseMove);
      if (isMobile) { targetHeadRotY = -0.15; targetHeadRotX = 0.08; }

      const onEnter = () => { isHovered = true; };
      const onLeave = () => { isHovered = false; };
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);

      const animate = () => {
        animFrameId = requestAnimationFrame(animate);
        const t = Date.now();
        robotGroup.position.y = baseY + Math.sin(t * 0.00085) * 0.022;
        const amp = isHovered ? 0.26 : 0.14;
        const swing = Math.sin(t * 0.0011) * amp;
        leftArm.rotation.x = swing;
        rightArm.rotation.x = -swing;
        const pulse = 0.3 + Math.sin(t * 0.0018) * 0.4;
        ledMat.emissiveIntensity = isHovered ? 0.9 : pulse;
        headGroup.rotation.y += (targetHeadRotY - headGroup.rotation.y) * 0.06;
        headGroup.rotation.x += (targetHeadRotX - headGroup.rotation.x) * 0.06;
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(animFrameId);
        window.removeEventListener("mousemove", handleMouseMove);
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
        renderer.dispose();
        if (el && renderer.domElement.parentNode === el) {
          el.removeChild(renderer.domElement);
        }
      };
    } catch (err) {
      webglFailed = true;
      // eslint-disable-next-line no-console
      console.warn("RobotMascot: WebGL init failed", err);
      return () => {};
    }
  }, []);

  return (
    <div className="relative" data-testid="robot-mascot" style={{ width: window.innerWidth < 768 ? 280 : 400, height: window.innerWidth < 768 ? 420 : 600 }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      <div style={{
        position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
        width: 180, height: 40,
        background: "radial-gradient(ellipse, rgba(0,238,255,0.12) 0%, transparent 70%)",
        filter: "blur(8px)", pointerEvents: "none",
      }} />
    </div>
  );
};

export default RobotMascot;
