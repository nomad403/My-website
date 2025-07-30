"use client";
import { useEffect, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=<>?";

interface ShuffleTextProps {
  text: string;
  duration?: number;
  className?: string;
}

export default function ShuffleText({ text, duration = 700, className = "" }: ShuffleTextProps) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    let frame = 0;
    let interval = setInterval(() => {
      let revealedCount = Math.min(frame, text.length);
      let newDisplay = text.split("").map((char: string, i: number) => {
        if (i < revealedCount) return char;
        if (char === " ") return " ";
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join("");
      setDisplay(newDisplay);
      frame++;
      if (frame > text.length) clearInterval(interval);
    }, duration / text.length);
    return () => clearInterval(interval);
  }, [text, duration]);

  return <span className={className}>{display}</span>;
}