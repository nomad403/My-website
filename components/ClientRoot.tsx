"use client";
import dynamic from "next/dynamic";
import SmokeBackground from "@/components/smoke-background";

const LiquidGlassFilterClient = dynamic(() => import("@/components/LiquidGlassFilterClient"), { ssr: false });

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmokeBackground />
      <LiquidGlassFilterClient />
      {children}
    </>
  );
} 