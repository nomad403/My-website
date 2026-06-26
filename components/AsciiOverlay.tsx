"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Mode = "plain" | "dither" | "sobel";

// Helper pour mesurer la largeur réelle d'un caractère
function measureCharWidth(px: number, family = 'Consolas, Monaco, "Liberation Mono", monospace') {
  if (typeof document === 'undefined') return px * 0.6;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  ctx.font = `${px}px ${family}`;
  const w1 = ctx.measureText("M").width;
  const w2 = ctx.measureText("W").width;
  const measured = (w1 + w2) / 2;
  // Marge conservative : évite un débordement si la police n'est pas encore chargée
  return Math.max(measured, px * 0.6);
}

function getViewportSize() {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  return {
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  };
}

export default function AsciiOverlay({
  source,
  fps = 50,
  invert = false,
  mode = "plain",
  visible = true,
  color = "#0ff",
  opacity = 0.35,
  fontPx = 7,
  cover = true,
  cols: fixedCols,
  domUpdateEvery = 2,
  pageKey = "home",
}: {
  source: HTMLCanvasElement | null;
  fps?: number;
  invert?: boolean;
  mode?: Mode;
  visible?: boolean;
  color?: string;
  opacity?: number;
  fontPx?: number;
  cover?: boolean;
  cols?: number;
  domUpdateEvery?: number;
  pageKey?: string;
}) {
  const preRef = useRef<HTMLPreElement | null>(null);
  const runningRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [grid, setGrid] = useState({ cols: fixedCols ?? 150, rows: 0 });

  const gradient = useMemo(
    () => " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwpqbdkhao*#MW&8%B@$",
    []
  );

  // Gestion du montage côté client pour éviter l'erreur d'hydratation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calcul dynamique de la grille selon la taille de la fenêtre
  useEffect(() => {
    if (!cover) {
      if (typeof window !== 'undefined') {
        setGrid(g => ({ cols: fixedCols ?? g.cols, rows: Math.max(1, Math.floor(window.innerHeight / fontPx)) }));
      }
      return;
    }
    
    const family = 'Consolas, Monaco, "Liberation Mono", monospace';
    const calc = () => {
      if (typeof window === 'undefined') return;
      const { width: vw, height: vh } = getViewportSize();
      if (vw <= 0 || vh <= 0) return;
      const charW = measureCharWidth(fontPx, family);
      const cols = fixedCols ?? Math.max(1, Math.floor(vw / charW));
      const rows = Math.max(1, Math.floor(vh / fontPx));
      setGrid({ cols, rows });
    };
    calc();
    if (typeof window !== 'undefined') {
      window.addEventListener("resize", calc);
      window.visualViewport?.addEventListener("resize", calc);

      if (document.fonts?.ready) {
        document.fonts.ready.then(calc);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener("resize", calc);
        window.visualViewport?.removeEventListener("resize", calc);
      }
    };
  }, [cover, fontPx, fixedCols, pageKey]);

  useEffect(() => {
    if (!visible || grid.cols <= 0 || grid.rows <= 0) {
      runningRef.current = false;
      if (preRef.current) preRef.current.textContent = "";
      return;
    }

    if (!source || !preRef.current) {
      runningRef.current = false;
      return;
    }

    runningRef.current = true;

    const w = grid.cols;
    const h = grid.rows;
    if (typeof document === 'undefined') return;
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d", { willReadFrequently: true })!;
    const levels = gradient.length - 1;

    // Buffers réutilisables pour éviter les allocations
    const out = new Uint8Array(w * h);
    const g = mode === "sobel" ? new Float32Array(w * h) : null;
    const lines = new Array(h);
    const rowBuffers = new Array(h);
    for (let i = 0; i < h; i++) {
      rowBuffers[i] = new Array(w);
    }

    let raf = 0;
    let last = 0;
    let frameCount = 0;
    const frameDelay = 1000 / fps;

    const draw = (t: number) => {
      if (!runningRef.current) return;
      if (t - last < frameDelay) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last = t;

      // Nettoie la frame précédente et remplit un fond
      octx.globalCompositeOperation = "source-over"; // par sécurité
      octx.clearRect(0, 0, w, h);                    // efface la frame précédente
      // remplis un fond pour remplacer la transparence du canvas WebGL
      octx.fillStyle = invert ? "#000" : "#fff";     // ou choisis explicitement ton fond
      octx.fillRect(0, 0, w, h);
      
      // Échantillonne la source *directement* à la taille w×h
      octx.drawImage(source, 0, 0, w, h);
      const { data } = octx.getImageData(0, 0, w, h);

      // Réutiliser les buffers au lieu de les recréer
      if (mode === "sobel" && g) {
        // Calcul de luminance optimisé (une seule passe)
        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
          g[p] = invert 
            ? 255 - (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
            : (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
        // Sobel optimisé : précalculer les indices
        const kx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const ky = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        for (let y = 1; y < h - 1; y++) {
          const yw = y * w;
          for (let x = 1; x < w - 1; x++) {
            const idx = yw + x;
            let gx = 0, gy = 0;
            let p = 0;
            // Boucle optimisée avec indices précalculés
            for (let j = -1; j <= 1; j++) {
              const jw = (y + j) * w;
              for (let i = -1; i <= 1; i++) {
                const v = g[jw + x + i];
                gx += v * kx[p];
                gy += v * ky[p];
                p++;
              }
            }
            // Math.hypot peut être remplacé par une approximation plus rapide
            out[idx] = Math.min(255, Math.sqrt(gx * gx + gy * gy));
          }
        }
      } else {
        const noise = mode === "dither";
        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
          let lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (invert) lum = 255 - lum;
          if (noise) lum = Math.max(0, Math.min(255, lum + (Math.random() - 0.5) * 18));
          out[p] = lum;
        }
      }

      // Construire les lignes en réutilisant les buffers
      for (let y = 0; y < h; y++) {
        const row = rowBuffers[y];
        const yw = y * w;
        for (let x = 0; x < w; x++) {
          const v = out[yw + x];
          row[x] = gradient[Math.round((v / 255) * levels)];
        }
        lines[y] = row.join("");
      }
      
      // Update du DOM une frame sur deux pour réduire les reflows
      // Utiliser innerHTML peut être plus rapide que textContent pour de gros contenus
      frameCount++;
      if (frameCount % domUpdateEvery === 0 && preRef.current) {
        preRef.current.textContent = lines.join("\n");
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(raf);
    };
  }, [source, grid.cols, grid.rows, fps, invert, mode, gradient, visible, domUpdateEvery, color, opacity]);

  // Ne rien rendre côté serveur
  if (!mounted) return null;

  const pre = (
    <pre
      ref={preRef}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        width: "100vw",
        height: "100vh",
        maxWidth: "100vw",
        maxHeight: "100vh",
        margin: 0,
        overflow: "hidden",
        boxSizing: "border-box",
        zIndex: 2,
        pointerEvents: "none",
        opacity: visible ? opacity : 0,
        transition: "opacity .35s",
        background: "transparent",
        color: color,
        fontFamily: 'Consolas, Monaco, "Liberation Mono", monospace',
        fontSize: `${fontPx}px`,     // <<< important
        lineHeight: `${fontPx}px`,   // <<< important
        whiteSpace: "pre",
        willChange: "contents", // Optimisation CSS pour les animations fréquentes
      }}
    />
  );

  // Monte l'overlay au niveau du <body> seulement côté client
  if (typeof document === 'undefined') return null;
  return createPortal(pre, document.body);
} 