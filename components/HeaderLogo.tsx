"use client"

import ShuffleDualLines from "@/components/ShuffleDualLines"
import {
  HOME_HOVER_HOLD_MS,
  HOME_TITLE_SHUFFLE_MS,
  HOME_TITLE_STAGGER_MS,
} from "@/lib/home-title-style"

interface HeaderLogoProps {
  mode: "day" | "night"
  className?: string
  variant?: "header" | "loader"
}

const LOGO_DUAL_LINES = [
  { primary: "GLENN", alternate: "NOMAD" },
  { primary: "RICHARD", alternate: "403" },
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
      ? "text-[1.2rem] md:text-[1.28rem]"
      : "text-[1.2rem]"

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
      className={`${alignClass} font-kode font-normal uppercase leading-[0.95] tracking-[0.06em] ${sizeClass} ${colorClass} ${className}`}
      enableHover={variant === "header"}
      holdDurationMs={HOME_HOVER_HOLD_MS}
      shuffleDurationMs={HOME_TITLE_SHUFFLE_MS}
      lineStaggerMs={HOME_TITLE_STAGGER_MS}
    />
  )
}
