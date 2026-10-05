# ASCII rendering performance

The preferred path uses the existing Three.js renderer and animation loop:

`sphere scene → grid-sized render target → Sobel/luminance target → glyph atlas → screen`

Sobel runs once per character cell, not once per output pixel. The glyph atlas
is generated once when the font size changes. No per-frame `getImageData`,
canvas-to-canvas copy, strings, React state updates or DOM text layout are
needed. Scene lighting is tone-mapped to match the former displayed-canvas
luminance; the final transparent output uses premultiplied alpha.

The scene and ASCII share one WebGL context and one requestAnimationFrame loop,
targeting the display refresh rate (60 Hz on a 60 Hz display). The existing
physics, pointer tracking, gyroscope and demo controls remain in place.

## Quality and lifecycle

| Profile | Spheres | Geometry segments | Shadow map | Decorative pixel budget |
| --- | ---: | --- | --- | ---: |
| High | 200 | 24 × 16 | 512² | 4,000,000 |
| Mid | 120 | 20 × 12 | 512² | 2,000,000 |
| Low | 80 | 12 × 8 | 256² | 360,000 |

Normal decorative DPR is capped at 1 and reduced further only when the viewport
exceeds the profile's pixel budget, including after resize. Small mobile
viewports therefore keep their native resolution even on the low profile.
Only the decorative canvas changes resolution. HTML typography, CSS dimensions,
navigation and cursor coordinates are unaffected. `?capture=1` overrides the
decorative DPR limit to the browser DPR, capped at 3, to preserve capture detail.
The renderer's own DPR limit is configured because the CDN library overwrites
manually assigned canvas dimensions during resize.

Render targets, glyph textures, shader materials and geometry are disposed on
resize/unmount. Resize events are debounced. A CPU ASCII fallback is kept for
GPU-pass setup failure. The GPU source uses the same pinned Three.js module as
the spheres library, without adding a second Three.js bundle.
Shaders are prepared with `compile` during setup. Three.js 0.170's non-cancellable
`compileAsync` polling can read a disposed material's missing `currentProgram`
during resize, unmount or HMR, so it is deliberately avoided. No asynchronous
shader-readiness callbacks survive disposal.

The audio-entry copy is present in the server HTML. Heavy effects wait until
that gate is dismissed; mobile/touch devices hide it with CSS before hydration.
The main title never waits for the renderer or CDN. Its font fitting uses canvas
text metrics with loaded fonts to prevent layout shifts.

## Reproducible production audit

```bash
npm run build
npm run start
# In another terminal:
node scripts/performance-audit.mjs
# Optional:
AUDIT_URL=http://127.0.0.1:3000 AUDIT_CPU=1 node scripts/performance-audit.mjs
```

The audit measures the entry LCP and layout shifts, then actually enters the
portfolio and measures animation intervals, long tasks and CPU pixel readbacks
at 1080 × 1920. It reports the GPU renderer. SwiftShader/software WebGL results
must not be represented as hardware-GPU results, and a target of 60 fps is not
proof of sustained 60 fps. Recheck on the actual capture machine with Desktop
emulation and compare identical CPU/network/cache settings.

Observed in headless Chrome with SwiftShader, 1080 × 1920 CSS viewport,
150 ms network latency and 200,000 bytes/s download throughput:

| CPU slowdown | Entry LCP | Animation fps | Animation long tasks | CPU readbacks |
| --- | ---: | ---: | ---: | ---: |
| 1× | 0.748 s | 48.8 | 0 | 0 |
| 4× | 0.744 s | 38.9 | 0 | 0 |

These are single-run diagnostic measurements, not field percentiles or proof of
60 fps. The low profile selected a 450 × 800 decorative buffer; HTML and viewport
remained 1080 × 1920. Capture mode bypasses this pixel budget. Entry CLS was about
0.000006 in both runs. Mobile without the CDN, CPU fallback forced by atlas
failure, page navigation, and portrait/landscape resize were checked separately.

## References

- [MDN WebGL best practices: avoid synchronous readbacks](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [Three.js render targets](https://threejs.org/manual/pages/rendertargets.html)
- [Three.js responsive rendering and pixel count](https://threejs.org/manual/pages/responsive.html)
- [Canvas prerendering](https://web.dev/articles/canvas-performance)

An OffscreenCanvas worker was considered. Keeping post-processing in the same
GPU context avoids transferring every source frame to a worker and avoids the
readback altogether; it is a better fit for this already-WebGL source.
