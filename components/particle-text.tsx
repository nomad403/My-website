"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { useLanguage } from "@/app/contexts/LanguageContext"
import { usePerformanceProfile } from "@/hooks/usePerformanceProfile"
import { getParticleLayout } from "@/lib/performance"

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

interface MapRegion {
  width: number
  height: number
  offsetX: number
  offsetY: number
  centerX: number
  centerY: number
}

export default function ParticleText() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufferCanvasRef = useRef<HTMLCanvasElement>(null)
  const mapCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0, hover: false })
  const repelRef = useRef({ x: 0, y: 0 })
  const dimensionsRef = useRef({ width: 0, height: 0, centerX: 0, centerY: 0 })
  const mapRegionRef = useRef<MapRegion>({ width: 0, height: 0, offsetX: 0, offsetY: 0, centerX: 0, centerY: 0 })
  const isInitializedRef = useRef(false)
  const lastFrameRef = useRef(0)
  const profileRef = useRef<ReturnType<typeof usePerformanceProfile>["profile"]>(null)
  const isCoarsePointerRef = useRef(false)
  const touchBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { t, isLanguageReady } = useLanguage()
  const { profile } = usePerformanceProfile()

  profileRef.current = profile

  const [fontSize, setFontSize] = useState(90)
  const [pixelDensity, setPixelDensity] = useState(4)
  const [particleDensity, setParticleDensity] = useState(2)

  const applyLayout = (width: number) => {
    if (!profile) return
    const layout = getParticleLayout(width, profile)
    setFontSize(layout.fontSize)
    setPixelDensity(layout.pixelDensity)
    setParticleDensity(layout.particleDensity)
  }

  useEffect(() => {
    if (!profile || typeof window === "undefined") return
    applyLayout(window.innerWidth)
  }, [profile])

  const options: ParticleOptions = useMemo(() => ({
    mouse: {
      lerpAmt: 0.4,
      repelThreshold: 120,
    },
    particles: {
      density: particleDensity,
      pixelDensity: pixelDensity,
      pLerpAmt: 0.13,
      vLerpAmt: 0.07,
    },
    text: {
      fontColor: [0, 0, 0, 255],
      fontSize: fontSize,
      message: isLanguageReady ? t("home.subtitle") : "",
    },
  }), [fontSize, pixelDensity, particleDensity, t, isLanguageReady])

  const lerp = (start: number, end: number, amt: number) => start + (end - start) * amt
  const dist = (x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  const angle = (x1: number, y1: number, x2: number, y2: number) => Math.atan2(y2 - y1, x2 - x1)
  const rand = (max: number) => Math.random() * max

  const setupCanvas = () => {
    const canvas = canvasRef.current
    const bufferCanvas = bufferCanvasRef.current
    const mapCanvas = mapCanvasRef.current
    const currentProfile = profileRef.current
    if (!canvas || !bufferCanvas || !mapCanvas || !currentProfile) return false

    if (typeof window === "undefined") return false
    const width = window.innerWidth
    const height = window.innerHeight
    if (width <= 0 || height <= 0) return false

    canvas.width = width
    canvas.height = height
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    bufferCanvas.width = width
    bufferCanvas.height = height

    const mapWidth = Math.floor(width * currentProfile.particles.mapRegionWidthRatio)
    const mapHeight = Math.floor(height * currentProfile.particles.mapRegionHeightRatio)
    const offsetX = Math.floor((width - mapWidth) / 2)
    const offsetY = Math.floor((height - mapHeight) / 2)

    mapCanvas.width = mapWidth
    mapCanvas.height = mapHeight

    mapRegionRef.current = {
      width: mapWidth,
      height: mapHeight,
      offsetX,
      offsetY,
      centerX: mapWidth * 0.5,
      centerY: mapHeight * 0.5,
    }

    dimensionsRef.current = {
      width,
      height,
      centerX: width * 0.5,
      centerY: height * 0.5,
    }

    repelRef.current = {
      x: dimensionsRef.current.centerX,
      y: dimensionsRef.current.centerY,
    }

    return true
  }

  const getEnigmaFamily = () => "enigma"

  const mapParticles = () => {
    const mapCanvas = mapCanvasRef.current
    if (!mapCanvas) return

    const ctx = mapCanvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    const { width, height, centerX, centerY } = mapRegionRef.current
    const { width: screenW, height: screenH } = dimensionsRef.current
    if (width <= 0 || height <= 0) return

    const { offsetX, offsetY } = mapRegionRef.current

    try {
      ctx.clearRect(0, 0, width, height)

      const fontFamily = getEnigmaFamily()
      let textFontSize = options.text.fontSize

      ctx.font = `${textFontSize}px "${fontFamily}", monospace`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillStyle = "white"

      if (ctx.measureText("A").width < 5) {
        ctx.font = `${textFontSize}px monospace`
      }

      const maxWidth = width * 0.95
      let textMetrics = ctx.measureText(options.text.message)

      if (textMetrics.width > maxWidth) {
        while (textMetrics.width > maxWidth && textFontSize > 12) {
          textFontSize -= 2
          ctx.font = `${textFontSize}px "${fontFamily}", monospace`
          textMetrics = ctx.measureText(options.text.message)
        }
      }

      ctx.fillText(options.text.message, centerX, centerY)

      const imageData = ctx.getImageData(0, 0, width, height)
      const pixelData = imageData.data
      const particles: Particle[] = []

      for (let i = 0; i < pixelData.length; i += 4) {
        if (pixelData[i + 3] > 0 && i % (options.particles.pixelDensity * 2) === 0) {
          const localX = (i / 4) % width
          const localY = Math.floor(i / 4 / width)
          const bx = localX + offsetX
          const by = localY + offsetY

          particles.push({
            x: rand(screenW),
            y: rand(screenH),
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

    particlesRef.current.forEach((particle) => {
      const rd = dist(particle.x, particle.y, userX, userY)
      if (hover && rd < options.mouse.repelThreshold) {
        const phi = angle(userX, userY, particle.x, particle.y)
        const f = (options.mouse.repelThreshold ** 2 / rd) * (rd / options.mouse.repelThreshold)
        const dx = particle.bx - particle.x
        const dy = particle.by - particle.y
        particle.vx = lerp(particle.vx, dx + Math.cos(phi) * f, options.particles.vLerpAmt)
        particle.vy = lerp(particle.vy, dy + Math.sin(phi) * f, options.particles.vLerpAmt)
      } else {
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
    const currentProfile = profileRef.current
    if (!canvas || !bufferCanvas || !currentProfile) return

    const ctx = canvas.getContext("2d")
    const bufferCtx = bufferCanvas.getContext("2d", { willReadFrequently: true })
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
          for (let dx = 0; dx < 2; dx++) {
            for (let dy = 0; dy < 2; dy++) {
              const nx = x + dx
              const ny = y + dy
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIndex = (ny * width + nx) * 4
                data[nIndex] = options.text.fontColor[0]
                data[nIndex + 1] = options.text.fontColor[1]
                data[nIndex + 2] = options.text.fontColor[2]
                data[nIndex + 3] = Math.floor(options.text.fontColor[3] * 0.7)
              }
            }
          }
        }
      })

      bufferCtx.putImageData(imageData, 0, 0)

      ctx.save()
      if (currentProfile.particles.enableBlur) {
        ctx.filter = "blur(10px) brightness(220%)"
        ctx.drawImage(bufferCanvas, 0, 0)
        ctx.filter = "blur(0px)"
        ctx.globalCompositeOperation = "lighter"
      }
      ctx.drawImage(bufferCanvas, 0, 0)
      ctx.restore()
    } catch (error) {
      console.warn("Error in renderParticles:", error)
    }
  }

  const animate = (timestamp: number) => {
    if (!isInitializedRef.current) return

    const currentProfile = profileRef.current
    const targetFps = currentProfile?.particles.targetFps ?? 60
    const frameInterval = targetFps < 60 ? 1000 / targetFps : 0

    if (frameInterval > 0 && timestamp - lastFrameRef.current < frameInterval) {
      animationRef.current = requestAnimationFrame(animate)
      return
    }
    lastFrameRef.current = timestamp

    updateParticles()
    renderParticles()
    animationRef.current = requestAnimationFrame(animate)
  }

  const clearTouchBurst = () => {
    if (touchBurstTimerRef.current) {
      clearTimeout(touchBurstTimerRef.current)
      touchBurstTimerRef.current = null
    }
    mouseRef.current.hover = false
  }

  const handleMouseMove = (event: MouseEvent) => {
    // Après un tap mobile, le navigateur émet des mousemove synthétiques qui
    // laissent hover=true indéfiniment (pas de mouseleave sur tactile).
    if (isCoarsePointerRef.current) return
    mouseRef.current = { x: event.clientX, y: event.clientY, hover: true }
  }

  const handleMouseLeave = () => {
    if (isCoarsePointerRef.current) return
    mouseRef.current.hover = false
  }

  const getTouchPosition = (event: TouchEvent) => {
    const touch = event.touches[0] || event.changedTouches[0]
    return touch ? { x: touch.clientX, y: touch.clientY } : null
  }

  const handleTouchMove = (event: TouchEvent) => {
    if (isCoarsePointerRef.current) return
    const pos = getTouchPosition(event)
    if (!pos) return
    mouseRef.current = { x: pos.x, y: pos.y, hover: true }
  }

  const handleTouchStart = (event: TouchEvent) => {
    const pos = getTouchPosition(event)
    if (!pos) return
    mouseRef.current = { x: pos.x, y: pos.y, hover: true }
    clearTouchBurst()
    // Impulsion brève au tap — pas de maintien au doigt sur mobile.
    touchBurstTimerRef.current = setTimeout(clearTouchBurst, 220)
  }

  const handleTouchEnd = () => {
    clearTouchBurst()
  }

  const handleResize = async () => {
    if (typeof window === "undefined" || !profile) return
    applyLayout(window.innerWidth)
    if (!setupCanvas()) return
    await waitForFont()
    mapParticles()
  }

  const waitForFont = async (): Promise<boolean> => {
    try {
      const fontFamily = getEnigmaFamily()
      const fontStr = `${options.text.fontSize}px "${fontFamily}", monospace`

      await document.fonts.load(fontStr, options.text.message)

      await Promise.race([
        (document as Document & { fonts?: FontFaceSet }).fonts?.load(fontStr, options.text.message),
        new Promise((r) => setTimeout(r, 1200)),
      ])

      await Promise.race([
        (document as Document & { fonts?: FontFaceSet }).fonts?.ready ?? Promise.resolve(),
        new Promise((r) => setTimeout(r, 500)),
      ])

      return true
    } catch (error) {
      console.warn("Font loading failed, using fallback:", error)
      return false
    }
  }

  useEffect(() => {
    if (!profile) return

    let cancelled = false

    const initialize = async () => {
      if (!isLanguageReady) return
      if (!setupCanvas()) return

      const fontLoaded = await waitForFont()
      if (cancelled) return

      if (!fontLoaded) {
        console.warn("Using fallback font for particle text")
      }

      mapParticles()
      isInitializedRef.current = true
      animationRef.current = requestAnimationFrame(animate)
    }

    isCoarsePointerRef.current =
      window.matchMedia?.("(pointer: coarse)")?.matches ?? false

    initialize()

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseleave", handleMouseLeave)
    window.addEventListener("resize", handleResize)
    window.addEventListener("touchstart", handleTouchStart, { passive: true })
    window.addEventListener("touchmove", handleTouchMove, { passive: true })
    window.addEventListener("touchend", handleTouchEnd)
    window.addEventListener("touchcancel", handleTouchEnd)

    return () => {
      cancelled = true
      clearTouchBurst()
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseleave", handleMouseLeave)
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
      window.removeEventListener("touchcancel", handleTouchEnd)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      isInitializedRef.current = false
    }
  }, [isLanguageReady, profile])

  useEffect(() => {
    if (isInitializedRef.current && profile) {
      applyLayout(window.innerWidth)
      setupCanvas()
      mapParticles()
    }
  }, [options.text.message, profile])

  if (!profile) return null

  return (
    <>
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }} />
      <canvas ref={bufferCanvasRef} style={{ display: "none" }} />
      <canvas ref={mapCanvasRef} style={{ display: "none" }} />
    </>
  )
}
