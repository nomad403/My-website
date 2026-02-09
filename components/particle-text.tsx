"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { useLanguage } from "@/app/contexts/LanguageContext"

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
  const animationRef = useRef<number>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0, hover: false })
  const repelRef = useRef({ x: 0, y: 0 })
  const dimensionsRef = useRef({ width: 0, height: 0, centerX: 0, centerY: 0 })
  const isInitializedRef = useRef(false)
  
  // Language context
  const { t, isLanguageReady } = useLanguage()

  // État pour les valeurs dynamiques
  const [fontSize, setFontSize] = useState(90) // Valeur par défaut plus grande
  const [pixelDensity, setPixelDensity] = useState(4)
  const [particleDensity, setParticleDensity] = useState(2)

  // Calculer les valeurs de manière sécurisée
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth
      if (width < 480) {
        setFontSize(24)
        setParticleDensity(5) // Plus de densité sur mobile
      } else if (width < 768) {
        setFontSize(32)
        setParticleDensity(3) // Densité moyenne sur tablette
      } else if (width < 1024) {
        setFontSize(50)
        setParticleDensity(2) // Densité normale sur desktop
      } else if (width < 1440) {
        setFontSize(90)
        setParticleDensity(2)
      } else {
        setFontSize(100)
        setParticleDensity(1)
      }
    }
    setPixelDensity(4) // Valeur fixe pour éviter les getters
  }, [])

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
      message: isLanguageReady ? t('home.subtitle') : '',
    },
  }), [fontSize, pixelDensity, particleDensity, t, isLanguageReady])

  const lerp = (start: number, end: number, amt: number) => start + (end - start) * amt
  const dist = (x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  const angle = (x1: number, y1: number, x2: number, y2: number) => Math.atan2(y2 - y1, x2 - x1)
  const rand = (max: number) => Math.random() * max

  const setupCanvas = () => {
    const canvas = canvasRef.current
    const bufferCanvas = bufferCanvasRef.current
    if (!canvas || !bufferCanvas) return false

    if (typeof window === 'undefined') return false;
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
      centerY: height * 0.5,
    }

    repelRef.current = {
      x: dimensionsRef.current.centerX,
      y: dimensionsRef.current.centerY,
    }

    return true
  }

  const getEnigmaFamily = () => {
    try {
      if (typeof window === "undefined" || !document.documentElement) {
        return "enigma"
      }
      return "enigma"
    } catch (error) {
      console.warn("Error getting font family:", error)
      return "enigma"
    }
  }

  const mapParticles = () => {
    const bufferCanvas = bufferCanvasRef.current
    if (!bufferCanvas) return

    const ctx = bufferCanvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    const { width, height, centerX, centerY } = dimensionsRef.current
    if (width <= 0 || height <= 0) return

    try {
      ctx.clearRect(0, 0, width, height)
      
      const fontFamily = getEnigmaFamily()
      let fontSize = options.text.fontSize
      
      ctx.font = `${fontSize}px "${fontFamily}", monospace`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillStyle = "white"
      
      const testText = "A"
      let metrics = ctx.measureText(testText)
      
      if (metrics.width < 5) {
        console.warn("Font not loaded, using fallback")
        ctx.font = `${fontSize}px monospace`
      }
      
      const textMetrics = ctx.measureText(options.text.message)
      const maxWidth = width * 0.9
      
      if (textMetrics.width > maxWidth) {
        while (textMetrics.width > maxWidth && fontSize > 12) {
          fontSize -= 2
          ctx.font = `${fontSize}px "${fontFamily}", monospace`
          const newMetrics = ctx.measureText(options.text.message)
          if (newMetrics.width <= maxWidth) break
        }
      }
      
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
    if (!canvas || !bufferCanvas) return

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
      ctx.filter = "blur(10px) brightness(220%)"
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

  const getTouchPosition = (event: TouchEvent) => {
    const touch = event.touches[0] || event.changedTouches[0]
    return touch ? { x: touch.clientX, y: touch.clientY } : null
  }

  const handleTouchMove = (event: TouchEvent) => {
    const pos = getTouchPosition(event)
    if (!pos) return
    mouseRef.current = {
      x: pos.x,
      y: pos.y,
      hover: true,
    }
  }

  const handleTouchStart = (event: TouchEvent) => {
    handleTouchMove(event)
  }

  const handleTouchEnd = () => {
    mouseRef.current.hover = false
  }

  const handleResize = async () => {
    if (typeof window === 'undefined') return
    
    const width = window.innerWidth
    if (width < 480) {
      setFontSize(24)
      setParticleDensity(4)
    } else if (width < 768) {
      setFontSize(32)
      setParticleDensity(3)
    } else if (width < 1024) {
      setFontSize(50)
      setParticleDensity(2)
    } else if (width < 1440) {
      setFontSize(90)
      setParticleDensity(2)
    } else {
      setFontSize(100)
      setParticleDensity(2)
    }
    
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
        (document as any).fonts?.load(fontStr, options.text.message),
        new Promise((r) => setTimeout(r, 1200)),
      ])
      
      await Promise.race([
        (document as any).fonts?.ready ?? Promise.resolve(),
        new Promise((r) => setTimeout(r, 500)),
      ])
      
      return true
    } catch (error) {
      console.warn("Font loading failed, using fallback:", error)
      return false
    }
  }

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      // Attendre que la langue soit prête
      if (!isLanguageReady) return
      
      if (!setupCanvas()) return
      
      const fontLoaded = await waitForFont()
      
      if (cancelled) return
      
      if (!fontLoaded) {
        console.warn("Using fallback font for particle text")
      }
      
      mapParticles()
      isInitializedRef.current = true
      animate()
    }

    initialize()

    if (typeof window !== 'undefined') {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseleave", handleMouseLeave)
      window.addEventListener("resize", handleResize)
      window.addEventListener("touchstart", handleTouchStart, { passive: true })
      window.addEventListener("touchmove", handleTouchMove, { passive: true })
      window.addEventListener("touchend", handleTouchEnd)
      window.addEventListener("touchcancel", handleTouchEnd)
    }

    return () => {
      cancelled = true
      if (typeof window !== 'undefined') {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseleave", handleMouseLeave)
        window.removeEventListener("resize", handleResize)
        window.removeEventListener("touchstart", handleTouchStart)
        window.removeEventListener("touchmove", handleTouchMove)
        window.removeEventListener("touchend", handleTouchEnd)
        window.removeEventListener("touchcancel", handleTouchEnd)
      }
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [isLanguageReady])

  // Effet pour mettre à jour le texte quand la langue change
  useEffect(() => {
    if (isInitializedRef.current) {
      // Recalculer la taille de police lors du changement de langue
      if (typeof window !== 'undefined') {
        const width = window.innerWidth
        if (width < 480) {
          setFontSize(24)
          setParticleDensity(5)
        } else if (width < 768) {
          setFontSize(32)
          setParticleDensity(3)
        } else if (width < 1024) {
          setFontSize(50)
          setParticleDensity(2)
        } else if (width < 1440) {
          setFontSize(90)
          setParticleDensity(2)
        } else {
          setFontSize(100)
          setParticleDensity(2)
        }
      }
      mapParticles()
    }
  }, [options.text.message])

  return (
    <>
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }} />
      <canvas ref={bufferCanvasRef} style={{ display: "none" }} />
    </>
  )
}
