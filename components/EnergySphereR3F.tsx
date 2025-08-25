"use client"
import { useMemo, useRef, useEffect } from "react"
import * as THREE from "three"
import { useFrame, useThree } from "@react-three/fiber"

export default function EnergySphereR3F({
  scale = 1,
  translateX = 0,
  translateY = 0,
  isTransitioning = false,
  visible = true,
  transitionEffect = "normal",
}: {
  scale?: number
  translateX?: number
  translateY?: number
  isTransitioning?: boolean
  visible?: boolean
  transitionEffect?: "normal" | "sunrise" | "sunset"
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const { size, viewport } = useThree()
  
  // Positions finales par page (logique globale)
  const targetPositions = useMemo(() => {
    const worldPerPixelX = viewport.width / size.width
    const worldPerPixelY = viewport.height / size.height
    
    // Effets spéciaux pour lever/coucher de soleil
    let finalY = -translateY * worldPerPixelY
    let finalScale = Math.min(viewport.width, viewport.height) * Math.max(0.001, scale)
    
    if (transitionEffect === "sunrise") {
      // Lever de soleil : commencer sous l'écran et très petit
      finalY = -viewport.height * 0.8
      finalScale = Math.min(viewport.width, viewport.height) * 0.1
    } else if (transitionEffect === "sunset") {
      // Coucher de soleil : commencer en haut et grand, puis descendre
      finalY = viewport.height * 0.8
      finalScale = Math.min(viewport.width, viewport.height) * 3.5
    }
    
    console.log('🎯 EnergySphereR3F - Valeurs reçues:', { scale, translateX, translateY, transitionEffect })
    console.log('🎯 EnergySphereR3F - Positions calculées:', { x: translateX * worldPerPixelX, y: finalY, scale: finalScale })
    
    return {
      x: translateX * worldPerPixelX,
      y: finalY,
      scale: finalScale
    }
  }, [translateX, translateY, scale, viewport.width, viewport.height, size.width, size.height, transitionEffect])

  const uniforms = useMemo(() => ({
    u_time: { value: 0.0 },
    u_color1: { value: new THREE.Vector3(1.0, 0.4, 0.1) },
    u_color2: { value: new THREE.Vector3(1.0, 0.8, 0.0) },
    u_color3: { value: new THREE.Vector3(0.2, 0.6, 1.0) },
    u_pointer: { value: new THREE.Vector2(0.5, 0.5) },
    u_pointerStrength: { value: 0.0 },
  }), [size.width, size.height])

  const vertexShader = /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const fragmentShader = /* glsl */`
    uniform float u_time;
    uniform vec3 u_color1;
    uniform vec3 u_color2;
    uniform vec3 u_color3;
    uniform vec2 u_pointer;
    uniform float u_pointerStrength;

    varying vec2 vUv;

    void main() {
      // Utiliser vUv (liée à la géométrie) sans correction d'aspect (correction gérée par la scène)
      vec2 screenP = (vUv - 0.5) * 2.0;

      // Légère respiration pour redonner de la vie
      float breath = 0.02 * sin(u_time * 0.6);
      float circleRadius = 0.78 + breath;

      float distFromCenter = length(screenP);
      float inCircle = smoothstep(circleRadius + 0.1, circleRadius - 0.1, distFromCenter);

      vec4 o = vec4(0.0);
      if (inCircle > 0.0) {
        vec2 p = screenP * 1.08;
        // Ripple léger basé sur le pointeur (mêmes coords que vUv)
        vec2 rippleP = (u_pointer - 0.5) * 2.0;
        float d = length(screenP - rippleP);
        float ripple = 0.12 * sin(d * 25.0 - u_time * 3.0) * exp(-d * 2.0) * u_pointerStrength;

        float l = length(p) - 0.7;
        float t = u_time * 0.6 + ripple;
        float enhancedY = p.y;

        float pattern1 = 0.5 + 0.5 * tanh(0.1 / max(l / 0.1, -l) - sin(l + enhancedY * max(1.0, -l / 0.1) + t));
        float pattern2 = 0.5 + 0.5 * tanh(0.1 / max(l / 0.1, -l) - sin(l + enhancedY * max(1.0, -l / 0.1) + t + 1.0));
        float pattern3 = 0.5 + 0.5 * tanh(0.1 / max(l / 0.1, -l) - sin(l + enhancedY * max(1.0, -l / 0.1) + t + 2.0));

        float intensity = 1.0;
        o.r = pattern1 * u_color1.r * intensity;
        o.g = pattern2 * u_color2.g * intensity;
        o.b = pattern3 * u_color3.b * intensity;
        o.a = inCircle;
      }

      gl_FragColor = vec4(o.rgb, o.a);
    }
  `

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = state.clock.getElapsedTime()
      materialRef.current.uniforms.u_pointerStrength.value = Math.max(0.0, materialRef.current.uniforms.u_pointerStrength.value * 0.95)
    }
    
    // Logique globale simple : transition smooth vers les positions finales
    if (meshRef.current) {
      const smoothFactor = 0.08 // Facteur de transition uniforme
      
      // Transition position X
      meshRef.current.position.x += (targetPositions.x - meshRef.current.position.x) * smoothFactor
      
      // Transition position Y
      meshRef.current.position.y += (targetPositions.y - meshRef.current.position.y) * smoothFactor
      
      // Transition scale
      const currentScale = meshRef.current.scale.x
      meshRef.current.scale.setScalar(currentScale + (targetPositions.scale - currentScale) * smoothFactor)
    }
  })

  // Plane suffisamment grand pour couvrir le viewport avec caméra perspective
  const planeScale = useMemo(() => 1, [])

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, 0]}
      visible={visible}
      onPointerMove={(e) => {
        if (!materialRef.current) return
        const x = e.pointer.x * 0.5 + 0.5
        const y = -e.pointer.y * 0.5 + 0.5
        materialRef.current.uniforms.u_pointer.value.set(x, y)
        materialRef.current.uniforms.u_pointerStrength.value = Math.min(1.0, materialRef.current.uniforms.u_pointerStrength.value + 0.2)
      }}
      onClick={(e) => {
        if (!materialRef.current) return
        const x = e.pointer.x * 0.5 + 0.5
        const y = -e.pointer.y * 0.5 + 0.5
        materialRef.current.uniforms.u_pointer.value.set(x, y)
        materialRef.current.uniforms.u_pointerStrength.value = 1.0
      }}
    >
      <planeGeometry args={[planeScale, planeScale, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}

