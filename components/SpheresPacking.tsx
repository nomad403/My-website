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

export default function SpheresPacking({
  count = 200,
  colors = [0xff0000, 0x0, 0xffffff],
  minSize = 0.5,
  maxSize = 1.0,
  className,
}: {
  count?: number;
  colors?: number[];
  minSize?: number;
  maxSize?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<ReturnType<Spheres2Ctor> | null>(null);

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

        const inst = ctor(canvas, { count, colors, minSize, maxSize });
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
  }, [count, minSize, maxSize, JSON.stringify(colors)]);

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
      }}
    />
  );
}
