"use client"
import { useEffect, useRef } from "react"
import * as THREE from "three"

interface EnergySphereProps {
  scale?: number
  translateY?: number
  isTransitioning?: boolean
}

export default function WaterSphereBackground({ 
  scale = 1, 
  translateY = 0, 
  isTransitioning = false 
}: EnergySphereProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let renderer: THREE.WebGLRenderer
    let scene: THREE.Scene
    let camera: THREE.OrthographicCamera
    let animationId: number
    let material: THREE.ShaderMaterial
    let mesh: THREE.Mesh
    let clock: THREE.Clock

    // Water simulation settings
    const waterSettings = {
      resolution: 256,
      damping: 0.913,
      tension: 0.02,
      rippleStrength: 0.2,
      mouseIntensity: 1.2,
      clickIntensity: 3.0,
      rippleRadius: 8,
      splatForce: 50000,
      splatThickness: 0.1,
      vorticityInfluence: 0.2,
      swirlIntensity: 0.2,
      pressure: 0.3,
      velocityDissipation: 0.08,
      densityDissipation: 1.0,
      displacementScale: 0.01,
    }

    const resolution = waterSettings.resolution

    // Water simulation buffers
    const waterBuffers = {
      current: new Float32Array(resolution * resolution),
      previous: new Float32Array(resolution * resolution),
      velocity: new Float32Array(resolution * resolution * 2),
      vorticity: new Float32Array(resolution * resolution),
      pressure: new Float32Array(resolution * resolution),
    }

    // Initialize buffers
    for (let i = 0; i < resolution * resolution; i++) {
      waterBuffers.current[i] = 0.0
      waterBuffers.previous[i] = 0.0
      waterBuffers.velocity[i * 2] = 0.0
      waterBuffers.velocity[i * 2 + 1] = 0.0
      waterBuffers.vorticity[i] = 0.0
      waterBuffers.pressure[i] = 0.0
    }

    // Create water texture
    const waterTexture = new THREE.DataTexture(
      waterBuffers.current,
      waterSettings.resolution,
      waterSettings.resolution,
      THREE.RedFormat,
      THREE.FloatType,
    )
    waterTexture.minFilter = THREE.LinearFilter
    waterTexture.magFilter = THREE.LinearFilter
    waterTexture.needsUpdate = true

    // Init Three.js
    scene = new THREE.Scene()
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    
    // Gérer la perte de contexte WebGL
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      console.warn("WebGL Context Lost in EnergySphereBackground:", event)
      event.preventDefault()
      
      // Arrêter l'animation pendant la récupération
      if (animationId) {
        cancelAnimationFrame(animationId)
        animationId = 0
      }
    })
    
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.log("WebGL Context Restored in EnergySphereBackground")
      
      // Redémarrer l'animation après récupération
      if (!animationId) {
        animate()
      }
    })
    
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect()
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      containerRef.current.appendChild(renderer.domElement)
    }

    // Vertex shader
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

    // Fragment shader (adapté du code original)
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform vec3 u_color3;
      uniform vec3 u_background;
      uniform float u_speed;
      uniform sampler2D u_waterTexture;
      uniform float u_waterStrength;
      uniform float u_ripple_time;
      uniform vec2 u_ripple_position;
      uniform float u_ripple_strength;
      uniform bool u_isMonochrome;
      uniform float u_audioLow;
      uniform float u_audioMid;
      uniform float u_audioHigh;
      uniform float u_audioOverall;
      uniform float u_audioReactivity;
      
      varying vec2 vUv;

      void main() {
        vec2 r = u_resolution;
        
        // Centrage précis avec UV (ultra-fiable)
        vec2 screenP = (vUv - 0.5) * 2.0;
        screenP.x *= r.x / r.y; // correction aspect ratio exacte
        
        // Pour compatibilité avec le reste du code
        vec2 FC = gl_FragCoord.xy;
        vec2 uv = vec2(FC.x / r.x, 1.0 - FC.y / r.y);

        
        // Water texture sampling
        vec2 wCoord = vec2(FC.x / r.x, FC.y / r.y);
        float waterHeight = texture2D(u_waterTexture, wCoord).r;
        float waterInfluence = clamp(waterHeight * u_waterStrength, -0.5, 0.5);
        
        // Dynamic circle radius with water influence
        float baseRadius = 0.9;
        float audioPulse = u_audioOverall * u_audioReactivity * 0.1;
        float waterPulse = waterInfluence * 0.3;
        float circleRadius = baseRadius + audioPulse + waterPulse;
        
        float distFromCenter = length(screenP);
        float inCircle = smoothstep(circleRadius + 0.1, circleRadius - 0.1, distFromCenter);
        
        vec4 o = vec4(0.0);
        
        if (inCircle > 0.0) {
          vec2 p = screenP * 1.1;
          
          // Ripple effects from clicks
          float rippleTime = u_time - u_ripple_time;
          vec2 ripplePos = u_ripple_position * r;
          float rippleDist = distance(FC.xy, ripplePos);
          
          float clickRipple = 0.0;
          if (rippleTime < 3.0 && rippleTime > 0.0) {
            float rippleRadius = rippleTime * 150.0;
            float rippleWidth = 30.0;
            float rippleDecay = 1.0 - rippleTime / 3.0;
            clickRipple = exp(-abs(rippleDist - rippleRadius) / rippleWidth) * rippleDecay * u_ripple_strength;
          }
          
          float totalWaterInfluence = clamp((waterInfluence + clickRipple * 0.1) * u_waterStrength, -0.8, 0.8);
          float audioInfluence = (u_audioLow * 0.3 + u_audioMid * 0.4 + u_audioHigh * 0.3) * u_audioReactivity;
          
          // Rotation and pattern generation
          float angle = length(p) * 4.0 + audioInfluence * 2.0;
          mat2 R = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          p *= R;
          
          float l = length(p) - 0.7 + totalWaterInfluence * 0.5 + audioInfluence * 0.2;
          float t = u_time * u_speed + totalWaterInfluence * 2.0 + audioInfluence * 1.5;
          float enhancedY = p.y + totalWaterInfluence * 0.3 + audioInfluence * 0.2;
          
          // Pattern generation (plasma effect)
          float pattern1 = 0.5 + 0.5 * tanh(0.1 / max(l / 0.1, -l) - sin(l + enhancedY * max(1.0, -l / 0.1) + t));
          float pattern2 = 0.5 + 0.5 * tanh(0.1 / max(l / 0.1, -l) - sin(l + enhancedY * max(1.0, -l / 0.1) + t + 1.0));
          float pattern3 = 0.5 + 0.5 * tanh(0.1 / max(l / 0.1, -l) - sin(l + enhancedY * max(1.0, -l / 0.1) + t + 2.0));
          
          float intensity = 1.0 + totalWaterInfluence * 0.5 + audioInfluence * 0.3;
          
          if (u_isMonochrome) {
            float mono = (pattern1 + pattern2 + pattern3) / 3.0 * intensity;
            o = vec4(mono, mono, mono, inCircle);
          } else {
            o.r = pattern1 * u_color1.r * intensity;
            o.g = pattern2 * u_color2.g * intensity;
            o.b = pattern3 * u_color3.b * intensity;
            o.a = inCircle;
          }
        }
        
        vec3 bgColor = u_isMonochrome ? vec3(0.0) : u_background;
        vec3 finalColor = bgColor;
        finalColor = mix(finalColor, o.rgb, o.a);
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `

    // Create material with uniforms
    material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0.0 },
        u_resolution: { value: new THREE.Vector2(
          containerRef.current?.getBoundingClientRect().width || window.innerWidth,
          containerRef.current?.getBoundingClientRect().height || window.innerHeight
        ) },
        u_speed: { value: 1.3 },
        u_color1: { value: new THREE.Vector3(1.0, 0.4, 0.1) }, // Orange vif
        u_color2: { value: new THREE.Vector3(1.0, 0.8, 0.0) }, // Jaune doré
        u_color3: { value: new THREE.Vector3(0.2, 0.6, 1.0) }, // Bleu électrique
        u_background: { value: new THREE.Vector3(1.0, 1.0, 1.0) }, // Fond blanc
        u_waterTexture: { value: waterTexture },
        u_waterStrength: { value: 0.55 },
        u_ripple_time: { value: -10.0 },
        u_ripple_position: { value: new THREE.Vector2(0.5, 0.5) },
        u_ripple_strength: { value: 0.5 },
        u_isMonochrome: { value: false },
        u_audioLow: { value: 0.0 },
        u_audioMid: { value: 0.0 },
        u_audioHigh: { value: 0.0 },
        u_audioOverall: { value: 0.0 },
        u_audioReactivity: { value: 1.0 },
      },
    })

    const geometry = new THREE.PlaneGeometry(2, 2)
    mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
    camera.position.z = 1
    clock = new THREE.Clock()

    // Water simulation functions
    function updateWaterSimulation() {
      const { current, previous, velocity, vorticity } = waterBuffers
      const { damping, resolution } = waterSettings
      const safeTension = Math.min(waterSettings.tension, 0.05)
      const velocityDissipation = waterSettings.velocityDissipation
      const densityDissipation = waterSettings.densityDissipation
      const vorticityInfluence = Math.min(Math.max(waterSettings.swirlIntensity, 0.0), 0.5)

      // Apply velocity dissipation
      for (let i = 0; i < resolution * resolution * 2; i++) {
        velocity[i] *= 1.0 - velocityDissipation
      }

      // Calculate vorticity
      for (let i = 1; i < resolution - 1; i++) {
        for (let j = 1; j < resolution - 1; j++) {
          const index = i * resolution + j
          const left = velocity[(index - 1) * 2 + 1]
          const right = velocity[(index + 1) * 2 + 1]
          const bottom = velocity[(index - resolution) * 2]
          const top = velocity[(index + resolution) * 2]
          vorticity[index] = (right - left - (top - bottom)) * 0.5
        }
      }

      // Apply vorticity forces
      if (vorticityInfluence > 0.001) {
        for (let i = 1; i < resolution - 1; i++) {
          for (let j = 1; j < resolution - 1; j++) {
            const index = i * resolution + j
            const velIndex = index * 2
            const left = Math.abs(vorticity[index - 1])
            const right = Math.abs(vorticity[index + 1])
            const bottom = Math.abs(vorticity[index - resolution])
            const top = Math.abs(vorticity[index + resolution])
            const gradX = (right - left) * 0.5
            const gradY = (top - bottom) * 0.5
            const length = Math.sqrt(gradX * gradX + gradY * gradY) + 1e-5
            const safeVorticity = Math.max(-1.0, Math.min(1.0, vorticity[index]))
            const forceX = (gradY / length) * safeVorticity * vorticityInfluence * 0.1
            const forceY = (-gradX / length) * safeVorticity * vorticityInfluence * 0.1
            velocity[velIndex] += Math.max(-0.1, Math.min(0.1, forceX))
            velocity[velIndex + 1] += Math.max(-0.1, Math.min(0.1, forceY))
          }
        }
      }

      // Water simulation
      for (let i = 1; i < resolution - 1; i++) {
        for (let j = 1; j < resolution - 1; j++) {
          const index = i * resolution + j
          const velIndex = index * 2
          const top = previous[index - resolution]
          const bottom = previous[index + resolution]
          const left = previous[index - 1]
          const right = previous[index + 1]
          current[index] = (top + bottom + left + right) / 2 - current[index]
          current[index] = current[index] * damping + previous[index] * (1 - damping)
          current[index] += (0 - previous[index]) * safeTension

          const velMagnitude = Math.sqrt(
            velocity[velIndex] * velocity[velIndex] + velocity[velIndex + 1] * velocity[velIndex + 1],
          )
          const safeVelInfluence = Math.min(velMagnitude * waterSettings.displacementScale, 0.1)
          current[index] += safeVelInfluence
          current[index] *= 1.0 - densityDissipation * 0.01
          current[index] = Math.max(-2.0, Math.min(2.0, current[index]))
        }
      }

      // Apply boundary conditions
      for (let i = 0; i < resolution; i++) {
        current[i] = 0
        current[(resolution - 1) * resolution + i] = 0
        velocity[i * 2] = 0
        velocity[i * 2 + 1] = 0
        velocity[((resolution - 1) * resolution + i) * 2] = 0
        velocity[((resolution - 1) * resolution + i) * 2 + 1] = 0
        current[i * resolution] = 0
        current[i * resolution + (resolution - 1)] = 0
        velocity[i * resolution * 2] = 0
        velocity[i * resolution * 2 + 1] = 0
        velocity[(i * resolution + (resolution - 1)) * 2] = 0
        velocity[(i * resolution + (resolution - 1)) * 2 + 1] = 0
      }
      // Swap buffers
      ;[waterBuffers.current, waterBuffers.previous] = [waterBuffers.previous, waterBuffers.current]
      waterTexture.image.data = waterBuffers.current
      waterTexture.needsUpdate = true
    }

    function addRipple(x: number, y: number, strength = 1.0) {
      const { resolution, rippleRadius } = waterSettings
      const normalizedX = x / window.innerWidth
      const normalizedY = 1.0 - y / window.innerHeight
      const texX = Math.floor(normalizedX * resolution)
      const texY = Math.floor(normalizedY * resolution)
      const radius = Math.max(rippleRadius, Math.floor(0.1 * resolution))
      const rippleStrength = strength * (waterSettings.splatForce / 100000)
      const radiusSquared = radius * radius

      for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
          const distanceSquared = i * i + j * j
          if (distanceSquared <= radiusSquared) {
            const posX = texX + i
            const posY = texY + j
            if (posX >= 0 && posX < resolution && posY >= 0 && posY < resolution) {
              const index = posY * resolution + posX
              const velIndex = index * 2
              const distance = Math.sqrt(distanceSquared)
              const falloff = 1.0 - distance / radius
              const rippleValue = Math.cos((distance / radius) * Math.PI * 0.5) * rippleStrength * falloff
              waterBuffers.previous[index] += rippleValue
              const angle = Math.atan2(j, i)
              const velocityStrength = rippleValue * waterSettings.swirlIntensity
              waterBuffers.velocity[velIndex] += Math.cos(angle) * velocityStrength
              waterBuffers.velocity[velIndex + 1] += Math.sin(angle) * velocityStrength
              const swirlAngle = angle + Math.PI * 0.5
              const swirlStrength = Math.min(velocityStrength * 0.3, 0.1)
              waterBuffers.velocity[velIndex] += Math.cos(swirlAngle) * swirlStrength
              waterBuffers.velocity[velIndex + 1] += Math.sin(swirlAngle) * swirlStrength
            }
          }
        }
      }
    }

    // Mouse interaction
    const lastMousePosition = { x: 0, y: 0 }
    let mouseThrottleTime = 0

    function onMouseMove(event: MouseEvent) {
          // Exclure la zone du menu (320px de gauche) pour éviter d'interférer
    if (event.clientX < 320) {
        return // Laisser le menu gérer les interactions
      }
      
      // Ajuster les coordonnées selon les transformations appliquées
      let x = event.clientX
      let y = event.clientY
      
      // Compenser le translateY - décaler la souris dans le sens opposé
      y = y - translateY
      
      // Compenser le scale - ajuster les coordonnées par rapport au centre
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      x = centerX + (x - centerX) / scale
      y = centerY + (y - centerY) / scale
      const now = performance.now()

      if (now - mouseThrottleTime < 8) return
      mouseThrottleTime = now

      const dx = x - lastMousePosition.x
      const dy = y - lastMousePosition.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const velocity = distance / 8

      if (distance > 1) {
        const velocityInfluence = Math.min(velocity / 10, 2.0)
        const baseIntensity = Math.min(distance / 20, 1.0)
        const fluidIntensity = baseIntensity * velocityInfluence * waterSettings.mouseIntensity
        const variation = Math.random() * 0.3 + 0.7
        const finalIntensity = fluidIntensity * variation
        const jitterX = x + (Math.random() - 0.5) * 3
        const jitterY = y + (Math.random() - 0.5) * 3
        addRipple(jitterX, jitterY, finalIntensity)
        lastMousePosition.x = x
        lastMousePosition.y = y
      }
    }

    function onMouseClick(event: MouseEvent) {
          // Exclure la zone du menu (320px de gauche) pour éviter de bloquer les clics
    if (event.clientX < 320) {
        return // Laisser le menu gérer ce clic
      }
      
      // Ajuster les coordonnées selon les transformations appliquées
      let x = event.clientX
      let y = event.clientY
      
      // Compenser le translateY - décaler la souris dans le sens opposé
      y = y - translateY
      
      // Compenser le scale - ajuster les coordonnées par rapport au centre
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      x = centerX + (x - centerX) / scale
      y = centerY + (y - centerY) / scale
      addRipple(x, y, waterSettings.clickIntensity)
      const clickX = x / window.innerWidth
      const clickY = 1.0 - y / window.innerHeight
      material.uniforms.u_ripple_position.value.set(clickX, clickY)
      material.uniforms.u_ripple_time.value = clock.getElapsedTime()
    }

    // Touch events
    function onTouchMove(event: TouchEvent) {
      event.preventDefault()
      const touch = event.touches[0]
      let x = touch.clientX
      let y = touch.clientY
      
      // Compenser le translateY - décaler la souris dans le sens opposé
      y = y - translateY
      
      // Compenser le scale - ajuster les coordonnées par rapport au centre
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      x = centerX + (x - centerX) / scale
      y = centerY + (y - centerY) / scale
      const now = performance.now()

      if (now - mouseThrottleTime < 8) return
      mouseThrottleTime = now

      const dx = x - lastMousePosition.x
      const dy = y - lastMousePosition.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const velocity = distance / 8

      if (distance > 1) {
        const velocityInfluence = Math.min(velocity / 10, 2.0)
        const baseIntensity = Math.min(distance / 20, 1.0)
        const fluidIntensity = baseIntensity * velocityInfluence * waterSettings.mouseIntensity
        const variation = Math.random() * 0.3 + 0.7
        const finalIntensity = fluidIntensity * variation
        const jitterX = x + (Math.random() - 0.5) * 3
        const jitterY = y + (Math.random() - 0.5) * 3
        addRipple(jitterX, jitterY, finalIntensity)
        lastMousePosition.x = x
        lastMousePosition.y = y
      }
    }

    function onTouchStart(event: TouchEvent) {
      event.preventDefault()
      const touch = event.touches[0]
      let x = touch.clientX
      let y = touch.clientY
      
      // Compenser le translateY - décaler la souris dans le sens opposé
      y = y - translateY
      
      // Compenser le scale - ajuster les coordonnées par rapport au centre
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      x = centerX + (x - centerX) / scale
      y = centerY + (y - centerY) / scale
      addRipple(x, y, waterSettings.clickIntensity)
      const clickX = x / window.innerWidth
      const clickY = 1.0 - y / window.innerHeight
      material.uniforms.u_ripple_position.value.set(clickX, clickY)
      material.uniforms.u_ripple_time.value = clock.getElapsedTime()
    }

    // Event listeners - IMPORTANT: pointer-events: auto pour capturer les événements
    const canvas = renderer.domElement
    canvas.style.pointerEvents = "auto"

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("click", onMouseClick)
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchstart", onTouchStart, { passive: false })

    // Animation loop
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      material.uniforms.u_time.value = elapsed
      updateWaterSimulation()
      renderer.render(scene, camera)
    }

    animate()

    // Resize handler avec ResizeObserver pour synchronisation parfaite
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        renderer.setSize(width, height)
        material.uniforms.u_resolution.value.set(width, height)
      }
    }

    let resizeObserver: ResizeObserver | null = null
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener("resize", handleResize)

    // Initial ripple
    setTimeout(() => {
      addRipple(window.innerWidth / 2, window.innerHeight / 2, 1.5)
    }, 500)

    // Cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
      
      // Nettoyer les textures et matériaux
      if (material) {
        material.dispose()
      }
      if (mesh) {
        mesh.geometry.dispose()
      }
      if (renderer) {
        renderer.dispose()
      }
      
      // Nettoyer les textures d'eau
      if (waterTexture) {
        waterTexture.dispose()
      }
      
      // Supprimer les event listeners
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('webglcontextlost', () => {})
        renderer.domElement.removeEventListener('webglcontextrestored', () => {})
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        // Centré dans le container élargi (500vw x 500vh)
        top: '200vh', // = -200vh du container + 200vh pour centrer
        left: '200vw', // = -200vw du container + 200vw pour centrer  
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        background: 'transparent', // CRUCIAL: fond transparent pour éviter démarcations
        pointerEvents: "auto", // CRUCIAL: permet les interactions même en arrière-plan
        transform: `translateY(${translateY}px) scale(${scale})`,
        transition: isTransitioning ? "transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
        transformOrigin: "center center", // Pour que l'agrandissement soit centré
      }}
    />
  )
}
