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
  specialist: [0xff6b00, 0x00e5ff, 0xffffff], // Palette dédiée pour specialist
  contact: [0xffffff, 0x00e5ff, 0xff6b00], // Palette dédiée pour contact (blanc, cyan, orange)
};

export default function SpheresPacking({
  count = 200,
  minSize = 0.5,
  maxSize = 1.0,
  className,
  currentPage = "home",
  onCanvasReady,
  visible = true,
}: {
  count?: number;
  minSize?: number;
  maxSize?: number;
  className?: string;
  currentPage?: string;
  onCanvasReady?: (c: HTMLCanvasElement) => void;
  visible?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<ReturnType<Spheres2Ctor> | null>(null);
  const currentColorsRef = useRef<number[]>(PAGE_COLORS.home);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (typeof window === "undefined") return;

      try {
        const mod: any = await import(
          /* webpackIgnore: true */ /* @vite-ignore */ CDN_ESM
        );
        const ctor: Spheres2Ctor = (mod?.default || mod) as Spheres2Ctor;

        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        onCanvasReady?.(canvas);
        const resize = () => {
          if (typeof window !== 'undefined') {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
          }
        };
        resize();
        if (typeof window !== 'undefined') {
          window.addEventListener("resize", resize);
        }

        const inst = ctor(canvas, { 
          count, 
          colors: currentColorsRef.current, 
          minSize, 
          maxSize 
        });
        instanceRef.current = inst;

        return () => {
          if (typeof window !== 'undefined') {
            window.removeEventListener("resize", resize);
          }
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
  }, [count, minSize, maxSize, onCanvasReady]);

  useEffect(() => {
    if (!instanceRef.current) return;

    const targetColors = PAGE_COLORS[currentPage as keyof typeof PAGE_COLORS];
    
    if (targetColors.every(c => c === 0)) {
      return;
    }

    const fadeDuration = 1000;
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
        if (instanceRef.current?.spheres) {
          instanceRef.current.spheres.setColors(newColors);
          // Changer aussi la lumière principale avec protection
          instanceRef.current.spheres.light1?.color?.set?.(newColors[0]);
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
  const isVisible = currentPage === "home" || currentPage === "projects" || currentPage === "specialist" || currentPage === "contact";

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
        opacity: visible ? 1 : 0,   // <<< cache le canvas sans le tuer
        transition: "opacity 0.5s ease-in-out",
        visibility: isVisible ? "visible" : "hidden",
      }}
    />
  );
}
