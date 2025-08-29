"use client";
import { useEffect, useRef } from "react";

/**
 * Typage minimal du module ESM exposé par le CDN.
 */
type Spheres2Ctor = (
  canvas: HTMLCanvasElement,
  opts?: {
    count?: number;
    colors?: number[];
    minSize?: number;
    maxSize?: number;
  }
) => {
  dispose: () => void;
  togglePause: () => void;
  spheres: {
    setColors: (colors: number[]) => void;
    light1: { color: { set: (hex: number) => void } };
  };
};

const CDN_ESM =
  "https://cdn.jsdelivr.net/npm/threejs-components@0.0.8/build/backgrounds/spheres2.cdn.min.js";

// Couleurs par page
const PAGE_COLORS = {
  home: [0xff0000, 0x0, 0xffffff], // Rouge, noir, blanc (couleurs actuelles)
  projects: [0x00e5ff, 0xff00aa, 0x00ff88], // Cyan, magenta, vert cyberpunk
  skills: [0xff6b00, 0x00e5ff, 0xffffff], // Palette dédiée pour specialist/skills
  contact: [0x0, 0x0, 0x0], // Pas de spheres sur contact
};

export default function SpheresPacking({
  count = 200,
  minSize = 0.5,
  maxSize = 1.0,
  className,
  currentPage = "home",
}: {
  count?: number;
  minSize?: number;
  maxSize?: number;
  className?: string;
  currentPage?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<ReturnType<Spheres2Ctor> | null>(null);
  const currentColorsRef = useRef<number[]>(PAGE_COLORS.home);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (typeof window === "undefined") return;

      try {
        // ⚠️ Très important : on demande au bundler d'ignorer cet import runtime.
        // - webpack: /* webpackIgnore: true */
        // - vite:     /* @vite-ignore */
        const mod: any = await import(
          /* webpackIgnore: true */ /* @vite-ignore */ CDN_ESM
        );
        const ctor: Spheres2Ctor = (mod?.default || mod) as Spheres2Ctor;

        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        // plein écran fixe derrière le contenu
        const resize = () => {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const inst = ctor(canvas, { 
          count, 
          colors: currentColorsRef.current, 
          minSize, 
          maxSize 
        });
        instanceRef.current = inst;

        return () => {
          window.removeEventListener("resize", resize);
          try {
            inst.dispose();
          } catch {}
        };
      } catch (e) {
        console.error("SpheresPacking: échec de chargement ESM", e);
      }
    };

    const cleanupPromise = init();

    return () => {
      cancelled = true;
      if (instanceRef.current) {
        try {
          instanceRef.current.dispose();
        } catch {}
        instanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, minSize, maxSize]);

  // Effet pour changer les couleurs quand la page change
  useEffect(() => {
    if (!instanceRef.current) return;

    const targetColors = PAGE_COLORS[currentPage as keyof typeof PAGE_COLORS];
    
    // Si c'est skills ou contact, pas de spheres
    if (targetColors.every(c => c === 0)) {
      return;
    }

    // Changement de couleurs en fade
    const fadeDuration = 1000; // 1 seconde
    const startColors = [...currentColorsRef.current];
    const startTime = performance.now();

    const fadeColors = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / fadeDuration, 1);
      
      // Interpolation linéaire des couleurs
      const newColors = startColors.map((startColor, i) => {
        const targetColor = targetColors[i];
        const r = Math.round(startColor >> 16);
        const g = Math.round((startColor >> 8) & 0xff);
        const b = Math.round(startColor & 0xff);
        
        const targetR = Math.round(targetColor >> 16);
        const targetG = Math.round((targetColor >> 8) & 0xff);
        const targetB = Math.round(targetColor & 0xff);
        
        const newR = Math.round(r + (targetR - r) * progress);
        const newG = Math.round(g + (targetG - g) * progress);
        const newB = Math.round(b + (targetB - b) * progress);
        
        return (newR << 16) | (newG << 8) | newB;
      });

      // Appliquer les nouvelles couleurs
      try {
        if (instanceRef.current) {
          instanceRef.current.spheres.setColors(newColors);
          // Changer aussi la lumière principale
          instanceRef.current.spheres.light1.color.set(newColors[0]);
        }
      } catch (e) {
        console.warn("SpheresPacking: erreur lors du changement de couleurs", e);
      }

      if (progress < 1) {
        requestAnimationFrame(fadeColors);
      } else {
        currentColorsRef.current = targetColors;
      }
    };

    fadeColors();
  }, [currentPage]);

  // Déterminer si les spheres doivent être visibles
  const isVisible = currentPage === "home" || currentPage === "projects" || currentPage === "skills";

  return (
    <canvas
      ref={canvasRef}
      id="webgl-canvas"
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,           // au-dessus du fond, en-dessous du contenu
        pointerEvents: "none",
        display: "block",
        width: "100vw",
        height: "100vh",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.5s ease-in-out",
        visibility: isVisible ? "visible" : "hidden",
      }}
    />
  );
}
