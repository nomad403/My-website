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
        <div className="border-t w-full relative" style={{ borderColor: '#c0c0c0' }}>
          {/* Coord X à côté de la ligne */}
          <div
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              color: "#c0c0c0", 
              fontSize: 10,
              fontWeight: 500,
              fontFamily: "'Enigma Display', 'Arial', sans-serif",
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
        <div className="border-l h-full relative" style={{ borderColor: '#808080' }}>
          {/* Coord Y intégrée dans la ligne */}
          <div
            style={{
              position: "absolute",
              left: 8,
              top: 8,
              color: "#808080", 
              fontSize: 10,
              fontWeight: 500,
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              fontFamily: "'Enigma Display', 'Arial', sans-serif",
            }}
          >
            {pos.y}
          </div>
        </div>
      </div>
    </>
  )
} 