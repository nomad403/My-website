"use client";
import { useEffect } from "react";

export default function LiquidGlassAnimation() {
  useEffect(() => {
    let t = 0;
    let raf: number | undefined;
    let timeout = setTimeout(() => {
      function animateLiquidGlass() {
        t += 0.004;
        const turb = document.querySelector('#lg-dist feTurbulence');
        if (turb) {
          // Superposition de plusieurs sinusoïdes pour un effet organique
          const freqX = 0.008
            + Math.sin(t) * 0.0015
            + Math.sin(t * 1.7 + 1) * 0.0007
            + Math.sin(t * 2.3 + 2) * 0.0005;
          const freqY = 0.008
            + Math.cos(t) * 0.0015
            + Math.cos(t * 1.3 + 2) * 0.0007
            + Math.cos(t * 2.1 + 1) * 0.0005;
          const seed = 92 + Math.sin(t * 0.5) * 2;
          turb.setAttribute('baseFrequency', `${freqX} ${freqY}`);
          turb.setAttribute('seed', `${seed}`);
        }
        raf = requestAnimationFrame(animateLiquidGlass);
      }
      animateLiquidGlass();
    }, 400);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, []);
  return null;
} 