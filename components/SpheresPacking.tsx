"use client";
import { useEffect, useRef } from "react";
import { attachOrientationPermissionOnBackgroundGesture, notifyOrientationGranted } from "@/lib/interaction";
import { VIEWPORT_BLEED_PX, viewportBleedInsets } from "@/lib/viewport-bleed";

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
            const bleed = VIEWPORT_BLEED_PX * 2
            canvas.width = window.innerWidth + bleed
            canvas.height = window.innerHeight + bleed
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

      // Suivi plus réactif (surtout quand le thread main est chargé mid/low)
      const follow = 0.14;
      state.currentX += (state.targetX - state.currentX) * follow;
      state.currentY += (state.targetY - state.currentY) * follow;

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

      permissionCleanup = attachOrientationPermissionOnBackgroundGesture(handleFirstGesture);
    } else if (hasDeviceOrientation) {
      attachOrientation();
    }

    const updatePointerFromEvent = (event: PointerEvent) => {
      // Viewport fixe — pas getBoundingClientRect du canvas (déjà translate3d),
      // sinon le suivi dérive et empire quand le framerate chute.
      const width = window.innerWidth || 1
      const height = window.innerHeight || 1
      const xNorm = (event.clientX / width) * 2 - 1
      const yNorm = (event.clientY / height) * 2 - 1
      state.pointerTargetX = xNorm * MAX_OFFSET
      state.pointerTargetY = yNorm * MAX_OFFSET
      if (event.pointerType === "mouse" || event.pointerType === "pen") {
        state.pointerHover = true
      }
      startAnimation()
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
    if (typeof window === "undefined") return

    const prefersCoarsePointer =
      window.matchMedia?.("(pointer: coarse)")?.matches ?? false

    const clampToUnit = (value: number) => Math.max(-1, Math.min(1, value))
    const state = tiltRef.current
    const damping = prefersCoarsePointer ? 0.08 : 0.14
    const strength = prefersCoarsePointer ? 0.55 : 0.5

    const writePhysicsCenter = () => {
      state.x += (state.targetX - state.x) * damping
      state.y += (state.targetY - state.y) * damping

      const spheres = instanceRef.current?.spheres
      const center = spheres?.physics?.center
      if (center) {
        const maxX = spheres.config?.maxX ?? 15
        const maxY = spheres.config?.maxY ?? 15
        center.x = state.x * maxX * strength
        center.y = state.y * maxY * strength
      }
    }

    // Desktop : le suivi souris pilote physics.center (donc l’ASCII), pas l’idle.
    if (!prefersCoarsePointer) {
      let pointerTargetX = 0
      let pointerTargetY = 0
      let pointerHover = false
      const POINTER_DECAY = 0.95
      const POINTER_SMOOTH = 0.18

      const applyPointerTilt = () => {
        if (!pointerHover) {
          pointerTargetX *= POINTER_DECAY
          pointerTargetY *= POINTER_DECAY
        }
        state.targetX += (pointerTargetX - state.targetX) * POINTER_SMOOTH
        state.targetY += (pointerTargetY - state.targetY) * POINTER_SMOOTH
        writePhysicsCenter()
        state.raf = requestAnimationFrame(applyPointerTilt)
      }

      const updatePointer = (event: PointerEvent) => {
        const width = window.innerWidth || 1
        const height = window.innerHeight || 1
        pointerTargetX = clampToUnit((event.clientX / width) * 2 - 1)
        // Inverser Y : le viewport croît vers le bas, le centre physique vers le haut
        pointerTargetY = clampToUnit(-((event.clientY / height) * 2 - 1))
        if (event.pointerType === "mouse" || event.pointerType === "pen") {
          pointerHover = true
        }
      }

      const handlePointerMove = (event: PointerEvent) => {
        updatePointer(event)
      }

      const handlePointerLeave = (event: PointerEvent) => {
        if (event.pointerType === "mouse" || event.pointerType === "pen") {
          pointerHover = false
          pointerTargetX = 0
          pointerTargetY = 0
        }
      }

      window.addEventListener("pointermove", handlePointerMove, { passive: true })
      window.addEventListener("pointerleave", handlePointerLeave, { passive: true })
      state.raf = requestAnimationFrame(applyPointerTilt)

      return () => {
        window.removeEventListener("pointermove", handlePointerMove)
        window.removeEventListener("pointerleave", handlePointerLeave)
        if (state.raf) {
          cancelAnimationFrame(state.raf)
          state.raf = 0
        }
        state.x = 0
        state.y = 0
        state.targetX = 0
        state.targetY = 0
      }
    }

    // Mobile : gyro si autorisé, sinon trajectoire idle aléatoire fluide.
    const deviceOrientationCtor = (window as Record<string, any>)
      .DeviceOrientationEvent
    const hasDeviceOrientation = !!deviceOrientationCtor
    const needsPermission =
      typeof deviceOrientationCtor?.requestPermission === "function"

    const GYRO_STALE_MS = 1800

    let gyroLive = false
    let lastGyroAt = 0
    let orientationAttached = false
    let grantedNotified = false

    const notifyGrantedOnce = () => {
      if (grantedNotified) return
      grantedNotified = true
      notifyOrientationGranted()
    }

    let phaseX = Math.random() * Math.PI * 2
    let phaseY = Math.random() * Math.PI * 2
    let ampX = 0.42
    let ampY = 0.38
    let freqX = 0.21
    let freqY = 0.17
    let reseedAt = 0

    const reseedIdle = (now: number) => {
      phaseX += (Math.random() - 0.5) * 1.4
      phaseY += (Math.random() - 0.5) * 1.4
      ampX = 0.3 + Math.random() * 0.32
      ampY = 0.28 + Math.random() * 0.3
      freqX = 0.14 + Math.random() * 0.16
      freqY = 0.12 + Math.random() * 0.14
      reseedAt = now + 2600 + Math.random() * 4800
    }

    const sampleIdleTarget = (now: number) => {
      if (now >= reseedAt) reseedIdle(now)
      const t = now * 0.001
      return {
        x: clampToUnit(
          Math.sin(t * freqX + phaseX) * ampX +
            Math.sin(t * (freqX * 1.7) + phaseY) * ampX * 0.55 +
            Math.sin(t * 0.09 + phaseX * 0.4) * 0.14,
        ),
        y: clampToUnit(
          Math.cos(t * freqY + phaseY) * ampY +
            Math.sin(t * (freqY * 1.6) + phaseX) * ampY * 0.55 +
            Math.cos(t * 0.11 + phaseY * 0.4) * 0.14,
        ),
      }
    }

    const applyTilt = (now = performance.now()) => {
      const gyroActive = gyroLive && now - lastGyroAt < GYRO_STALE_MS
      if (!gyroActive) {
        const idle = sampleIdleTarget(now)
        state.targetX = idle.x
        state.targetY = idle.y
      }

      writePhysicsCenter()
      state.raf = requestAnimationFrame((t) => applyTilt(t))
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta ?? 0
      const gamma = event.gamma ?? 0

      if (state.baseBeta === null || state.baseGamma === null) {
        state.baseBeta = beta
        state.baseGamma = gamma
      }

      const betaOffset = (beta - state.baseBeta) / 45
      const gammaOffset = (gamma - state.baseGamma) / 45

      state.targetX = clampToUnit(gammaOffset)
      state.targetY = clampToUnit(-betaOffset)
      lastGyroAt = performance.now()
      gyroLive = true
      notifyGrantedOnce()
    }

    const attachOrientation = () => {
      if (orientationAttached || !hasDeviceOrientation) return
      window.addEventListener("deviceorientation", handleOrientation, true)
      orientationAttached = true
    }

    const detachOrientation = () => {
      if (!orientationAttached) return
      window.removeEventListener("deviceorientation", handleOrientation, true)
      orientationAttached = false
    }

    let permissionCleanup: (() => void) | null = null

    if (hasDeviceOrientation && needsPermission) {
      const requestPermission = async () => {
        try {
          const result = await deviceOrientationCtor.requestPermission()
          if (result === "granted") {
            attachOrientation()
            notifyGrantedOnce()
          } else {
            gyroLive = false
          }
        } catch (error) {
          console.warn("SpheresPacking: orientation permission refusée", error)
          gyroLive = false
        }
      }

      permissionCleanup = attachOrientationPermissionOnBackgroundGesture(
        requestPermission,
      )
    } else if (hasDeviceOrientation) {
      attachOrientation()
    }

    reseedIdle(performance.now())
    state.raf = requestAnimationFrame((t) => applyTilt(t))

    return () => {
      permissionCleanup?.()
      detachOrientation()
      if (state.raf) {
        cancelAnimationFrame(state.raf)
        state.raf = 0
      }
      state.x = 0
      state.y = 0
      state.targetX = 0
      state.targetY = 0
      state.baseBeta = null
      state.baseGamma = null
    }
  }, [])

  // Déterminer si les spheres doivent être visibles visuellement
  // Sur les pages avec ASCII, le canvas est actif mais caché visuellement pour l'ASCII
  const pagesWithAscii = ["home", "projects", "specialist", "contact"];
  const visuallyHidden = pagesWithAscii.includes(currentPage);
  const shouldShowVisually = visible && !visuallyHidden;

  const bleedStyle = viewportBleedInsets()

  return (
    <canvas
      ref={canvasRef}
      id="webgl-canvas"
      className={className}
      style={{
        position: "fixed",
        ...bleedStyle,
        zIndex: 1,
        pointerEvents: "none",
        display: "block",
        opacity: shouldShowVisually ? 1 : 0,   // Caché visuellement si ASCII actif, mais canvas reste actif
        transition: "opacity 0.5s ease-in-out",
        visibility: visible ? "visible" : "hidden", // Toujours visible si visible=true pour que le canvas soit rendu
      }}
    />
  );
}
