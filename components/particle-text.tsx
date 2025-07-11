"use client"

import { useEffect, useRef } from "react"

interface ParticleOptions {
  mouse: {
    lerpAmt: number
    repelThreshold: number
  }
  particles: {
    density: number
    pixelDensity: number
    pLerpAmt: number
    vLerpAmt: number
  }
  text: {
    fontColor: [number, number, number, number]
    fontSize: number
    message: string
  }
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  bx: number
  by: number
}

export default function ParticleText() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufferCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0, hover: false })
  const repelRef = useRef({ x: 0, y: 0 })
  const dimensionsRef = useRef({ width: 0, height: 0, centerX: 0, centerY: 0 })
  const isInitializedRef = useRef(false)

  const options: ParticleOptions = {
    mouse: {
      lerpAmt: 0.5,
      repelThreshold: 100,
    },
    particles: {
      density: 2,
      get pixelDensity() {
        return (4 - this.density) * 2
      },
      pLerpAmt: 0.25,
      vLerpAmt: 0.1,
    },
    text: {
      fontColor: [0, 0, 0, 255],
      fontSize: 300,
      message: "NOMAD403",
    },
  }

  // Utility functions
  const lerp = (start: number, end: number, amt: number) => start + (end - start) * amt
  const dist = (x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  const angle = (x1: number, y1: number, x2: number, y2: number) => Math.atan2(y2 - y1, x2 - x1)
  const rand = (max: number) => Math.random() * max

  const setupCanvas = () => {
    const canvas = canvasRef.current
    const bufferCanvas = bufferCanvasRef.current
    if (!canvas || !bufferCanvas) return false

    const width = window.innerWidth
    const height = window.innerHeight
    if (width <= 0 || height <= 0) return false

    canvas.width = width
    canvas.height = height
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    bufferCanvas.width = width
    bufferCanvas.height = height

    dimensionsRef.current = {
      width,
      height,
      centerX: width * 0.5,
      centerY: height * 0.65 -100,
    }

    repelRef.current = {
      x: dimensionsRef.current.centerX,
      y: dimensionsRef.current.centerY,
    }

    return true
  }

  const mapParticles = () => {
    const bufferCanvas = bufferCanvasRef.current
    if (!bufferCanvas) return

    const ctx = bufferCanvas.getContext("2d")
    if (!ctx) return

    const { width, height, centerX, centerY } = dimensionsRef.current
    if (width <= 0 || height <= 0) return

    try {
      ctx.clearRect(0, 0, width, height)
      ctx.font = `${options.text.fontSize}px 'Kode Mono', monospace`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillStyle = "white"
      ctx.fillText(options.text.message, centerX, centerY)

      const imageData = ctx.getImageData(0, 0, width, height)
      const pixelData = imageData.data
      const particles: Particle[] = []

      for (let i = 0; i < pixelData.length; i += 4) {
        if (pixelData[i + 3] > 0 && i % (options.particles.pixelDensity * 2) === 0) {
          const x = rand(width)
          const y = rand(height)
          const bx = (i / 4) % width
          const by = Math.floor(i / 4 / width)

          particles.push({
            x,
            y,
            vx: 0,
            vy: 0,
            bx,
            by,
          })
        }
      }

      particlesRef.current = particles
    } catch (error) {
      console.warn("Error in mapParticles:", error)
    }
  }

  const updateParticles = () => {
    const { hover, x: userX, y: userY } = mouseRef.current
    // const { centerX, centerY } = dimensionsRef.current

    particlesRef.current.forEach((particle) => {
      // Calcul de la distance entre la particule et la souris
      const rd = dist(particle.x, particle.y, userX, userY)
      if (hover && rd < options.mouse.repelThreshold) {
        // Repousse localement la particule
        const phi = angle(userX, userY, particle.x, particle.y)
        const f = (options.mouse.repelThreshold ** 2 / rd) * (rd / options.mouse.repelThreshold)
        const dx = particle.bx - particle.x
        const dy = particle.by - particle.y
        particle.vx = lerp(particle.vx, dx + Math.cos(phi) * f, options.particles.vLerpAmt)
        particle.vy = lerp(particle.vy, dy + Math.sin(phi) * f, options.particles.vLerpAmt)
      } else {
        // Retour à la position d'origine sans répulsion
        const dx = particle.bx - particle.x
        const dy = particle.by - particle.y
        particle.vx = lerp(particle.vx, dx, options.particles.vLerpAmt)
        particle.vy = lerp(particle.vy, dy, options.particles.vLerpAmt)
      }
      particle.x = lerp(particle.x, particle.x + particle.vx, options.particles.pLerpAmt)
      particle.y = lerp(particle.y, particle.y + particle.vy, options.particles.pLerpAmt)
    })
  }

  const renderParticles = () => {
    const canvas = canvasRef.current
    const bufferCanvas = bufferCanvasRef.current
    if (!canvas || !bufferCanvas) return

    const ctx = canvas.getContext("2d")
    const bufferCtx = bufferCanvas.getContext("2d")
    if (!ctx || !bufferCtx) return

    const { width, height } = dimensionsRef.current
    if (width <= 0 || height <= 0) return

    try {
      ctx.clearRect(0, 0, width, height)
      bufferCtx.clearRect(0, 0, width, height)

      const imageData = bufferCtx.createImageData(width, height)
      const data = imageData.data

      particlesRef.current.forEach((particle) => {
        const x = Math.floor(particle.x)
        const y = Math.floor(particle.y)

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const index = (y * width + x) * 4
          data[index] = options.text.fontColor[0]
          data[index + 1] = options.text.fontColor[1]
          data[index + 2] = options.text.fontColor[2]
          data[index + 3] = options.text.fontColor[3]

          // Add neighboring pixels for better visibility
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const nx = x + dx
              const ny = y + dy
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIndex = (ny * width + nx) * 4
                data[nIndex] = options.text.fontColor[0]
                data[nIndex + 1] = options.text.fontColor[1]
                data[nIndex + 2] = options.text.fontColor[2]
                data[nIndex + 3] = Math.floor(options.text.fontColor[3] * 0.6)
              }
            }
          }
        }
      })

      bufferCtx.putImageData(imageData, 0, 0)

      ctx.save()
      ctx.filter = "blur(8px) brightness(200%)"
      ctx.drawImage(bufferCanvas, 0, 0)
      ctx.filter = "blur(0px)"
      ctx.globalCompositeOperation = "lighter"
      ctx.drawImage(bufferCanvas, 0, 0)
      ctx.restore()
    } catch (error) {
      console.warn("Error in renderParticles:", error)
    }
  }

  const animate = () => {
    if (!isInitializedRef.current) return

    updateParticles()
    renderParticles()
    animationRef.current = requestAnimationFrame(animate)
  }

  const handleMouseMove = (event: MouseEvent) => {
    mouseRef.current = {
      x: event.clientX,
      y: event.clientY,
      hover: true,
    }
  }

  const handleMouseLeave = () => {
    mouseRef.current.hover = false
  }

  const handleResize = () => {
    setupCanvas()
    mapParticles()
  }

  useEffect(() => {
    const initialize = () => {
      if (!setupCanvas()) return
      mapParticles()
      isInitializedRef.current = true
      animate()
    }

    initialize()

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseleave", handleMouseLeave)
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseleave", handleMouseLeave)
      window.removeEventListener("resize", handleResize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
    // eslint-disable-next-line
  }, [])

  return (
    <>
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }} />
      <canvas ref={bufferCanvasRef} style={{ display: "none" }} />
    </>
  )
}
