import type * as Three from "three"
import { ASCII_LUMINANCE_GRADIENT } from "@/lib/ascii/ascii-gradient"
import type { AsciiMode } from "@/lib/ui/performance"

/** Public renderer bridge exposed by threejs-components 0.0.8. */
export interface AsciiGpuSource {
  api: typeof Three
  renderOriginal: () => void
  three: {
    renderer: Three.WebGLRenderer
    scene: Three.Scene
    camera: Three.Camera
    render: () => void
  }
}

export interface AsciiGpuOptions {
  cols: number
  rows: number
  fontPx: number
  mode: AsciiMode
  invert: boolean
  color: string
  opacity: number
  visible: boolean
}

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const ANALYSIS_SHADER = `
  #include <tonemapping_pars_fragment>
  uniform sampler2D sceneTexture;
  uniform vec2 grid;
  uniform float invertLuminance;
  uniform float effectMode;
  uniform float glyphCount;
  uniform float time;
  varying vec2 vUv;

  float luminance(vec2 cell) {
    vec4 sampleColor = texture2D(sceneTexture, (cell + 0.5) / grid);
    vec3 mapped = ACESFilmicToneMapping(sampleColor.rgb);
    vec3 srgb = mix(12.92 * mapped,
      1.055 * pow(max(mapped, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
      step(vec3(0.0031308), mapped));
    vec3 rgb = mix(vec3(1.0 - invertLuminance), srgb, sampleColor.a);
    float value = dot(rgb, vec3(0.299, 0.587, 0.114));
    return mix(value, 1.0 - value, invertLuminance);
  }

  void main() {
    vec2 cell = floor(vUv * grid);
    float value = luminance(cell);
    if (effectMode > 1.5) {
      float tl = luminance(cell + vec2(-1.0, 1.0));
      float tc = luminance(cell + vec2(0.0, 1.0));
      float tr = luminance(cell + vec2(1.0, 1.0));
      float ml = luminance(cell + vec2(-1.0, 0.0));
      float mr = luminance(cell + vec2(1.0, 0.0));
      float bl = luminance(cell + vec2(-1.0, -1.0));
      float bc = luminance(cell + vec2(0.0, -1.0));
      float br = luminance(cell + vec2(1.0, -1.0));
      float gx = -tl + tr - 2.0 * ml + 2.0 * mr - bl + br;
      float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
      value = min(1.0, length(vec2(gx, gy)));
      if (cell.x < 1.0 || cell.y < 1.0 || cell.x >= grid.x - 1.0 || cell.y >= grid.y - 1.0) value = 0.0;
    } else if (effectMode > 0.5) {
      float noise = fract(sin(dot(cell, vec2(12.9898, 78.233)) + time) * 43758.5453);
      value = clamp(value + (noise - 0.5) * (18.0 / 255.0), 0.0, 1.0);
    }
    gl_FragColor = vec4(value, 0.0, 0.0, 1.0);
  }
`

const PRESENT_SHADER = `
  uniform sampler2D levelsTexture;
  uniform sampler2D glyphTexture;
  uniform vec2 grid;
  uniform vec3 ink;
  uniform float alpha;
  uniform float glyphCount;
  // Normalized padding inside each atlas slot (kills LinearFilter bleed seams).
  uniform float glyphPad;
  varying vec2 vUv;
  void main() {
    // Keep cell ids stable at exact integer UV boundaries.
    vec2 cellUv = min(vUv * grid, grid - 1e-4);
    vec2 cell = floor(cellUv);
    float value = texture2D(levelsTexture, (cell + 0.5) / grid).r;
    float glyph = floor(value * (glyphCount - 1.0) + 0.5);
    vec2 local = fract(cellUv);
    // Stay inside the padded slot (no neighbor bleed) without cropping the glyph.
    float pad = glyphPad * 0.5;
    float u = mix(pad, 1.0 - pad, local.x);
    float v = mix(pad, 1.0 - pad, local.y);
    // Slight coverage lift: seam fixes removed atlas bleed that previously
    // fattened glyphs, which made the ink look washed on white.
    float coverage = min(1.0, texture2D(glyphTexture, vec2((glyph + u) / glyphCount, v)).a * 1.18);
    float opacity = min(1.0, coverage * alpha);
    gl_FragColor = vec4(ink * opacity, opacity);
  }
`

/** Render the existing scene and ASCII in one context, without CPU readback. */
export function createAsciiGpuPass(source: AsciiGpuSource, options: AsciiGpuOptions) {
  const { api, three } = source
  const { renderer } = three
  const previousMetadata = {
    asciiRenderer: renderer.domElement.dataset.asciiRenderer,
    asciiGrid: renderer.domElement.dataset.asciiGrid,
    asciiFontPx: renderer.domElement.dataset.asciiFontPx,
  }
  const glyphs = ASCII_LUMINANCE_GRADIENT
  const atlas = document.createElement("canvas")
  // Oversample glyphs once so DPR captures stay sharp, without rendering the
  // expensive sphere scene at the output resolution.
  const atlasPad = 1
  const innerWidth = Math.ceil(options.fontPx * 0.6 * 3)
  const innerHeight = Math.ceil(options.fontPx * 3)
  const cellWidth = innerWidth + atlasPad * 2
  const cellHeight = innerHeight + atlasPad * 2
  atlas.width = cellWidth * glyphs.length
  atlas.height = cellHeight
  const ctx = atlas.getContext("2d")
  if (!ctx) throw new Error("ASCII glyph atlas: 2D canvas unavailable")
  ctx.font = `${options.fontPx * 3}px Consolas, Monaco, "Liberation Mono", monospace`
  ctx.textBaseline = "alphabetic"
  ctx.textAlign = "center"
  ctx.fillStyle = "white"
  for (let i = 0; i < glyphs.length; i++) {
    // Center each glyph in its padded slot so columns don't show empty strips.
    const cx = i * cellWidth + atlasPad + innerWidth * 0.5
    const cy = atlasPad + innerHeight * 0.8
    ctx.fillText(glyphs[i], cx, cy)
  }
  const glyphTexture = new api.CanvasTexture(atlas)
  glyphTexture.generateMipmaps = false
  glyphTexture.minFilter = api.LinearFilter
  glyphTexture.magFilter = api.LinearFilter
  glyphTexture.wrapS = api.ClampToEdgeWrapping
  glyphTexture.wrapT = api.ClampToEdgeWrapping
  const glyphPad = atlasPad / cellWidth
  const target = new api.WebGLRenderTarget(options.cols, options.rows, {
    minFilter: api.NearestFilter,
    magFilter: api.NearestFilter,
    depthBuffer: true,
    stencilBuffer: false,
    type: renderer.extensions.has("EXT_color_buffer_float") ? api.HalfFloatType : api.UnsignedByteType,
  })
  const levelsTarget = new api.WebGLRenderTarget(options.cols, options.rows, {
    minFilter: api.NearestFilter,
    magFilter: api.NearestFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })
  const analysis = new api.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: ANALYSIS_SHADER,
    uniforms: {
      sceneTexture: { value: target.texture },
      grid: { value: new api.Vector2(options.cols, options.rows) },
      invertLuminance: { value: 0 },
      effectMode: { value: 0 },
      glyphCount: { value: glyphs.length },
      time: { value: 0 },
      toneMappingExposure: { value: renderer.toneMappingExposure },
    },
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  const material = new api.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: PRESENT_SHADER,
    uniforms: {
      levelsTexture: { value: levelsTarget.texture },
      glyphTexture: { value: glyphTexture },
      grid: { value: new api.Vector2(options.cols, options.rows) },
      ink: { value: new api.Vector3() },
      alpha: { value: 0 },
      glyphCount: { value: glyphs.length },
      glyphPad: { value: glyphPad },
    },
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  const geometry = new api.PlaneGeometry(2, 2)
  const analysisScene = new api.Scene()
  analysisScene.add(new api.Mesh(geometry, analysis))
  const screen = new api.Scene()
  screen.add(new api.Mesh(geometry, material))
  const camera = new api.Camera()
  const originalRender = source.renderOriginal
  const waitingRender = () => {}
  let disposed = false
  const clearColor = new api.Color()
  const color = new api.Color()
  const update = (next: Pick<AsciiGpuOptions, "color" | "opacity" | "visible" | "invert" | "mode">) => {
    // Untonemapped present pass blends as display-referred sRGB.
    color.set(next.color)
    if (color.convertLinearToSRGB) color.convertLinearToSRGB()
    material.uniforms.ink.value.set(color.r, color.g, color.b)
    material.uniforms.alpha.value = next.visible ? next.opacity : 0
    analysis.uniforms.invertLuminance.value = Number(next.invert)
    analysis.uniforms.effectMode.value = next.mode === "sobel" ? 2 : next.mode === "dither" ? 1 : 0
  }
  update(options)
  const render = () => {
    const previousTarget = renderer.getRenderTarget()
    renderer.getClearColor(clearColor)
    const previousAlpha = renderer.getClearAlpha()
    try {
      renderer.setRenderTarget(target)
      // Transparent background is composited after tone mapping, matching the
      // original canvas-to-2D pipeline rather than tone mapping the white fill.
      renderer.setClearColor(0x000000, 0)
      renderer.render(three.scene, three.camera)
      renderer.setRenderTarget(levelsTarget)
      analysis.uniforms.time.value = performance.now() * 0.001
      analysis.uniforms.toneMappingExposure.value = renderer.toneMappingExposure
      renderer.render(analysisScene, camera)
      renderer.setRenderTarget(previousTarget)
      renderer.setClearColor(0x000000, 0)
      renderer.render(screen, camera)
    } finally {
      renderer.setRenderTarget(previousTarget)
      renderer.setClearColor(clearColor, previousAlpha)
    }
  }
  three.render = waitingRender
  return {
    update,
    prepare() {
      // Three.js 0.170 compileAsync polls material.currentProgram without a
      // cancellation guard. Resize/HMR can dispose it before the next poll,
      // causing an uncaught isReady error. Compile during setup instead: this
      // synchronous section cannot race with effect cleanup or renderer disposal.
      const previousTarget = renderer.getRenderTarget()
      try {
        renderer.setRenderTarget(target)
        renderer.compile(three.scene, three.camera)
        renderer.setRenderTarget(levelsTarget)
        renderer.compile(analysisScene, camera)
        renderer.setRenderTarget(previousTarget)
        renderer.compile(screen, camera)
      } finally {
        renderer.setRenderTarget(previousTarget)
      }
      if (!disposed) {
        renderer.domElement.dataset.asciiRenderer = "gpu"
        renderer.domElement.dataset.asciiGrid = `${options.cols}x${options.rows}`
        renderer.domElement.dataset.asciiFontPx = String(options.fontPx)
        three.render = render
      }
    },
    dispose() {
      disposed = true
      if (three.render === render || three.render === waitingRender) three.render = originalRender
      for (const [key, value] of Object.entries(previousMetadata)) {
        if (value === undefined) delete renderer.domElement.dataset[key]
        else renderer.domElement.dataset[key] = value
      }
      target.dispose()
      levelsTarget.dispose()
      glyphTexture.dispose()
      material.dispose()
      analysis.dispose()
      geometry.dispose()
    },
  }
}
