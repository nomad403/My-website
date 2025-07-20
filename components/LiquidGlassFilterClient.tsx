"use client";
import LiquidGlassAnimation from "./LiquidGlassAnimation";

export default function LiquidGlassFilterClient() {
  return (
    <>
      <svg style={{ display: "none" }}>
        <filter id="lg-dist" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="92" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
          <feDisplacementMap in="SourceGraphic" in2="blurred" scale="10" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <LiquidGlassAnimation />
    </>
  );
} 