"use client"
import { useEffect, useState } from "react"

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <>
      {/* Axe horizontal avec coordonnée intégrée */}
      <div
        style={{
          position: "fixed",
          top: `${pos.y}px`,
          left: 0,
          width: "100vw",
          height: 0,
          pointerEvents: "none",
          zIndex: 9999,
        }}
      >
        <div className="border-t border-orange-500 w-full relative">
          {/* Coord X à côté de la ligne */}
          <div
            className="font-enigma text-orange-500 text-xs"
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              color: "#f97316", // orange-500
              fontSize: 10,
              fontWeight: 500,
            }}
          >
            {pos.x}
          </div>
        </div>
      </div>
      {/* Axe vertical avec coordonnée intégrée */}
      <div
        style={{
          position: "fixed",
          left: `${pos.x}px`,
          top: 0,
          height: "100vh",
          width: 0,
          pointerEvents: "none",
          zIndex: 9999,
        }}
      >
        <div className="border-l border-blue-500 h-full relative">
          {/* Coord Y intégrée dans la ligne */}
          <div
            className="font-enigma text-blue-500 text-xs"
            style={{
              position: "absolute",
              left: 8,
              top: 8,
              color: "#3b82f6", // blue-500
              fontSize: 10,
              fontWeight: 500,
              writingMode: "vertical-rl",
              textOrientation: "mixed",
            }}
          >
            {pos.y}
          </div>
        </div>
      </div>
    </>
  )
} 