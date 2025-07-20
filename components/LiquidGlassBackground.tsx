"use client";
import { useEffect, useRef } from "react";

export default function LiquidGlassBackground() {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    let t = 0;
    let raf: number | undefined;
    function animate() {
      t += 0.02;
      // Génère une onde douce sur le haut du path
      let d = "M0,40 Q";
      for (let i = 1; i <= 6; i++) {
        const x = (i * 60);
        const y = 40 + Math.sin(t + i) * 8 + Math.cos(t * 0.7 + i) * 4;
        d += `${x},${y} `;
      }
      d += "360,40 L360,80 L0,80 Z";
      if (pathRef.current) {
        pathRef.current.setAttribute("d", d);
      }
      raf = requestAnimationFrame(animate);
    }
    animate();
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <svg
      width="100%"
      height="80"
      viewBox="0 0 360 80"
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="liquidGlassGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#a259ff" stopOpacity="0.10" />
        </linearGradient>
      </defs>
      <path
        ref={pathRef}
        d="M0,40 Q60,40 120,40 Q180,40 240,40 Q300,40 360,40 L360,80 L0,80 Z"
        fill="url(#liquidGlassGradient)"
        style={{ filter: "blur(8px)" }}
      />
    </svg>
  );
} 