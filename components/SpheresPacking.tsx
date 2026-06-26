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
    physics?: {
      center: { x: number; y: number; z: number };
    };
    config?: {
      maxX?: number;
      maxY?: number;
    };
  };
};

const CDN_ESM =
  "https://cdn.jsdelivr.net/npm/threejs-components@0.0.8/build/backgrounds/spheres2.cdn.min.js";

// Couleurs par page
const PAGE_COLORS = {
  home: [0xff0000, 0x0, 0xffffff], // Rouge, noir, blanc (couleurs actuelles)
  projects: [0x00e5ff, 0xff00aa, 0x00ff88], // Cyan, magenta, vert cyberpunk
  specialist: [0xff6b00, 0x00e5ff, 0xffffff], // Palette dédiée pour specialist
  decision: [0x00e5ff, 0x0a0a0f, 0x1a1a2e], // Cyan foncé, noir profond, bleu nuit (interface décision)
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
  const tiltRef = useRef({
    raf: 0,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    baseBeta: null as number | null,
    baseGamma: null as number | null,
  });

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

  // Pause la simulation WebGL quand l'onglet est masqué
  useEffect(() => {
    if (typeof document === "undefined") return;

    let paused = false;

    const handleVisibility = () => {
      const inst = instanceRef.current;
      if (!inst) return;

      if (document.hidden && !paused) {
        try {
          inst.togglePause();
        } catch {}
        paused = true;
      } else if (!document.hidden && paused) {
        try {
          inst.togglePause();
        } catch {}
        paused = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersCoarsePointer =
      window.matchMedia?.("(pointer: coarse)")?.matches ?? false;

    if (prefersCoarsePointer) {
      canvas.style.transform = "scale(1.05)";
      return () => {
        canvas.style.transform = "";
      };
    }

    const allowHoverControl = true;

    const deviceOrientationCtor = (window as Record<string, any>)
      .DeviceOrientationEvent;
    const hasDeviceOrientation = !!deviceOrientationCtor;
    const needsPermission =
      typeof deviceOrientationCtor?.requestPermission === "function";

    const state = {
      currentX: 0,
      currentY: 0,
      targetX: 0,
      targetY: 0,
      gyroX: 0,
      gyroY: 0,
      pointerX: 0,
      pointerY: 0,
      pointerTargetX: 0,
      pointerTargetY: 0,
      pointerDown: false,
      pointerHover: allowHoverControl,
    };

    const MAX_OFFSET = prefersCoarsePointer ? 45 : 28;
    const POINTER_DECAY = prefersCoarsePointer ? 0.92 : 0.95;
    const POINTER_SMOOTHING = prefersCoarsePointer ? 0.25 : 0.16;
    const POINTER_WEIGHT = prefersCoarsePointer ? 1.2 : 0.85;

    let raf = 0;
    let animationActive = false;

    const startAnimation = () => {
      if (!animationActive) {
        animationActive = true;
        raf = window.requestAnimationFrame(updateTransform);
      }
    };

    const updateTransform = () => {
      if (!visible) {
        canvas.style.transform = "";
        animationActive = false;
        return;
      }

      const shouldDecayPointer =
        prefersCoarsePointer ? !state.pointerDown : !state.pointerHover;

      if (shouldDecayPointer) {
        state.pointerTargetX *= POINTER_DECAY;
        state.pointerTargetY *= POINTER_DECAY;
      }

      state.pointerX +=
        (state.pointerTargetX - state.pointerX) * POINTER_SMOOTHING;
      state.pointerY +=
        (state.pointerTargetY - state.pointerY) * POINTER_SMOOTHING;

      state.targetX = state.gyroX + state.pointerX * POINTER_WEIGHT;
      state.targetY = state.gyroY + state.pointerY * POINTER_WEIGHT;

      state.currentX += (state.targetX - state.currentX) * 0.08;
      state.currentY += (state.targetY - state.currentY) * 0.08;

      canvas.style.transform = `translate3d(${state.currentX}px, ${state.currentY}px, 0) scale(1.05)`;
      raf = window.requestAnimationFrame(updateTransform);
    };

    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value));

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = clamp(event.beta ?? 0, -45, 45);
      const gamma = clamp(event.gamma ?? 0, -45, 45);
      state.gyroX = (gamma / 45) * MAX_OFFSET;
      state.gyroY = (beta / 45) * MAX_OFFSET;
      startAnimation();
    };

    let orientationAttached = false;
    const attachOrientation = () => {
      if (orientationAttached || !hasDeviceOrientation) return;
      window.addEventListener("deviceorientation", handleOrientation, true);
      orientationAttached = true;
    };

    const detachOrientation = () => {
      if (!orientationAttached) return;
      window.removeEventListener("deviceorientation", handleOrientation, true);
      orientationAttached = false;
    };

    let permissionCleanup: (() => void) | null = null;

    if (hasDeviceOrientation && needsPermission) {
      const requestPermission = async () => {
        try {
          const result = await deviceOrientationCtor.requestPermission();
          if (result === "granted") {
            attachOrientation();
          }
        } catch (error) {
          console.warn("SpheresPacking: erreur permission device orientation", error);
        }
      };

      const handleFirstGesture = () => {
        requestPermission();
      };

      window.addEventListener("touchend", handleFirstGesture, { once: true });
      window.addEventListener("click", handleFirstGesture, { once: true });

      permissionCleanup = () => {
        window.removeEventListener("touchend", handleFirstGesture);
        window.removeEventListener("click", handleFirstGesture);
      };
    } else if (hasDeviceOrientation) {
      attachOrientation();
    }

    const updatePointerFromEvent = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const xNorm = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const yNorm = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      state.pointerTargetX = xNorm * MAX_OFFSET;
      state.pointerTargetY = yNorm * MAX_OFFSET;
      if (event.pointerType === "mouse" || event.pointerType === "pen") {
        state.pointerHover = true;
      }
      startAnimation();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!allowHoverControl && !state.pointerDown) return;
      updatePointerFromEvent(event);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        state.pointerDown = true;
        state.pointerHover = true;
      }
      updatePointerFromEvent(event);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        state.pointerDown = false;
        state.pointerHover = false;
        state.pointerTargetX = 0;
        state.pointerTargetY = 0;
      }
      startAnimation();
    };

    const handlePointerLeave = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || event.pointerType === "pen") {
        state.pointerHover = false;
      } else {
        state.pointerDown = false;
        state.pointerHover = false;
      }
      state.pointerTargetX = 0;
      state.pointerTargetY = 0;
      startAnimation();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    return () => {
      permissionCleanup?.();
      detachOrientation();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("pointerleave", handlePointerLeave);
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
      animationActive = false;
      canvas.style.transform = "";
    };
  }, [visible]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersCoarsePointer =
      window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    if (!prefersCoarsePointer) return;

    const deviceOrientationCtor = (window as Record<string, any>)
      .DeviceOrientationEvent;
    const hasDeviceOrientation = !!deviceOrientationCtor;
    if (!hasDeviceOrientation) return;

    const clampToUnit = (value: number) =>
      Math.max(-1, Math.min(1, value));

    const state = tiltRef.current;
    const damping = 0.12;
    const strength = 0.65;

    const applyTilt = () => {
      state.x += (state.targetX - state.x) * damping;
      state.y += (state.targetY - state.y) * damping;

      const spheres = instanceRef.current?.spheres;
      const center = spheres?.physics?.center;
      if (center) {
        const maxX = spheres.config?.maxX ?? 15;
        const maxY = spheres.config?.maxY ?? 15;
        center.x = state.x * maxX * strength;
        center.y = state.y * maxY * strength;
      }

      state.raf = requestAnimationFrame(applyTilt);
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0;

      if (state.baseBeta === null || state.baseGamma === null) {
        state.baseBeta = beta;
        state.baseGamma = gamma;
      }

      const betaOffset = (beta - state.baseBeta) / 45;
      const gammaOffset = (gamma - state.baseGamma) / 45;

      state.targetX = clampToUnit(gammaOffset);
      state.targetY = clampToUnit(-betaOffset);
    };

    let permissionCleanup: (() => void) | null = null;
    if (typeof deviceOrientationCtor.requestPermission === "function") {
      const requestPermission = async () => {
        try {
          const result = await deviceOrientationCtor.requestPermission();
          if (result === "granted") {
            window.addEventListener("deviceorientation", handleOrientation, true);
          }
        } catch (error) {
          console.warn("SpheresPacking: orientation permission refusée", error);
        }
      };

      const handleFirstGesture = () => {
        requestPermission();
      };

      window.addEventListener("touchend", handleFirstGesture, { once: true });
      window.addEventListener("click", handleFirstGesture, { once: true });

      permissionCleanup = () => {
        window.removeEventListener("touchend", handleFirstGesture);
        window.removeEventListener("click", handleFirstGesture);
      };
    } else {
      window.addEventListener("deviceorientation", handleOrientation, true);
    }

    state.raf = requestAnimationFrame(applyTilt);

    return () => {
      permissionCleanup?.();
      window.removeEventListener("deviceorientation", handleOrientation, true);
      if (state.raf) {
        cancelAnimationFrame(state.raf);
        state.raf = 0;
      }
      state.x = 0;
      state.y = 0;
      state.targetX = 0;
      state.targetY = 0;
      state.baseBeta = null;
      state.baseGamma = null;
    };
  }, []);

  // Déterminer si les spheres doivent être visibles visuellement
  // Sur les pages avec ASCII, le canvas est actif mais caché visuellement pour l'ASCII
  const pagesWithAscii = ["home", "projects", "specialist", "decision", "contact"];
  const visuallyHidden = pagesWithAscii.includes(currentPage);
  const shouldShowVisually = visible && !visuallyHidden;

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
        opacity: shouldShowVisually ? 1 : 0,   // Caché visuellement si ASCII actif, mais canvas reste actif
        transition: "opacity 0.5s ease-in-out",
        visibility: visible ? "visible" : "hidden", // Toujours visible si visible=true pour que le canvas soit rendu
      }}
    />
  );
}
