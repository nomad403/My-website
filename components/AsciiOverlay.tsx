"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Mode = "plain" | "dither" | "sobel";

// Helper pour mesurer la largeur réelle d'un caractère
function measureCharWidth(px: number, family = 'Consolas, Monaco, "Liberation Mono", monospace') {
  if (typeof document === 'undefined') return 8; // Fallback pour SSR
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  ctx.font = `${px}px ${family}`;
  // "M" et "W" sont sûrs en monospace; on peut moyenner
  const w1 = ctx.measureText("M").width;
  const w2 = ctx.measureText("W").width;
  return (w1 + w2) / 2;
}

export default function AsciiOverlay({
  source,
  fps = 25,
  invert = false,
  mode = "plain",
  visible = true,
  color = "#0ff",
  opacity = 0.35,
  fontPx = 7,           
  cover = true,         
  cols: fixedCols,   
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
  cols?: number;        // garder compat avec ton usage actuel
}) {
  const preRef = useRef<HTMLPreElement | null>(null);
  const [running, setRunning] = useState(false);
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
      // largeur réelle d'un caractère pour la police utilisée par le <pre>
      const charW = measureCharWidth(fontPx, family); 
      const cols = fixedCols ?? Math.max(1, Math.floor(window.innerWidth / charW));
      const rows = Math.max(1, Math.floor(window.innerHeight / fontPx));
      setGrid({ cols, rows });
    };
    calc();
    if (typeof window !== 'undefined') {
      window.addEventListener("resize", calc);

      // (optionnel) si les polices web se (re)chargent
      if ((document as any).fonts?.ready) (document as any).fonts.ready.then(calc);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener("resize", calc);
      }
    };
  }, [cover, fontPx, fixedCols]);

  useEffect(() => {
    if (!source || !preRef.current || !visible) {
      setRunning(false);
      if (preRef.current) preRef.current.textContent = "";
      return;
    }
    setRunning(true);

    const w = grid.cols;             // <<< plein écran en colonnes
    const h = grid.rows;             // <<< plein écran en lignes
    if (typeof document === 'undefined') return;
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d", { willReadFrequently: true })!;
    const levels = gradient.length - 1;

    let raf = 0;
    let last = 0;
    let frameCount = 0;
    const frameDelay = 1000 / fps;

    const draw = (t: number) => {
      if (!running) return;
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

      const out = new Uint8Array(w * h);
      if (mode === "sobel") {
        const g = new Float32Array(w * h);
        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          g[p] = invert ? 255 - lum : lum;
        }
        const kx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const ky = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            let gx = 0, gy = 0, idx = y * w + x, p = 0;
            for (let j = -1; j <= 1; j++) {
              for (let i = -1; i <= 1; i++) {
                const v = g[idx + j * w + i];
                gx += v * kx[p];
                gy += v * ky[p];
                p++;
              }
            }
            out[idx] = Math.min(255, Math.hypot(gx, gy));
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

      // Construire les lignes avec un buffer pour de meilleures performances
      const lines = new Array(h);
      for (let y = 0; y < h; y++) {
        const row = new Array(w);
        for (let x = 0; x < w; x++) {
          const v = out[y * w + x];
          row[x] = gradient[Math.round((v / 255) * levels)];
        }
        lines[y] = row.join("");
      }
      // Update du DOM une frame sur deux pour réduire les reflows
      frameCount++;
      if (frameCount % 2 === 0 && preRef.current) {
        preRef.current.textContent = lines.join("\n");
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      setRunning(false);
      cancelAnimationFrame(raf);
    };
  }, [source, grid.cols, grid.rows, fps, invert, mode, gradient, visible, running]);

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
        margin: 0,
        zIndex: 2,
        pointerEvents: "none",
        opacity: visible ? opacity : 0,
        transition: "opacity .35s",
        background: "transparent",
        color,
        fontFamily: 'Consolas, Monaco, "Liberation Mono", monospace',
        fontSize: `${fontPx}px`,     // <<< important
        lineHeight: `${fontPx}px`,   // <<< important
        whiteSpace: "pre",
      }}
    />
  );

  // Monte l'overlay au niveau du <body> seulement côté client
  if (typeof document === 'undefined') return null;
  return createPortal(pre, document.body);
} 