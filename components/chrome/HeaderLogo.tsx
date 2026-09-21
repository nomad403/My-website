"use client"

import ShuffleDualLines from "@/components/ascii/ShuffleDualLines"
import {
  HOME_HOVER_HOLD_MS,
  HOME_TITLE_SHUFFLE_MS,
  HOME_TITLE_STAGGER_MS,
} from "@/lib/home/home-title-style"

interface HeaderLogoProps {
  mode: "day" | "night"
  className?: string
  variant?: "header" | "loader"
}

const LOGO_DUAL_LINES = [
  { primary: "GLENN", alternate: "nomad403" },
  { primary: "RICHARD", alternate: "" },
] as const

export default function HeaderLogo({
  mode,
  className = "",
  variant = "header",
}: HeaderLogoProps) {
  const colorClass = mode === "night" ? "text-white" : "text-black"
  // Caps = plus d’emprise visuelle : taille un cran sous l’ancien 1.35rem,
  // mais toujours au-dessus de la nav (0.95rem).
  const sizeClass =
    variant === "loader"
      ? "text-[1.125rem] md:text-[1.25rem]"
      : "text-[1rem] md:text-[1.125rem]"

  const alignClass =
    variant === "loader" ? "inline-block text-center" : "block w-fit text-left cursor-default"

  const lines =
    variant === "loader"
      ? [{ primary: "NOMAD403", alternate: "NOMAD403" }]
      : LOGO_DUAL_LINES.map((line) => ({
          primary: line.primary,
          alternate: line.alternate,
        }))

  return (
    <ShuffleDualLines
      lines={lines}
      className={`${alignClass} font-kode font-normal leading-[1] tracking-[0.05em] ${sizeClass} ${colorClass} ${className}`}
      enableHover={variant === "header"}
      holdDurationMs={HOME_HOVER_HOLD_MS}
      shuffleDurationMs={HOME_TITLE_SHUFFLE_MS}
      lineStaggerMs={HOME_TITLE_STAGGER_MS}
    />
  )
}
