# Capture mode

Use `?capture=1` on any portfolio route:

```text
http://localhost:3000/?capture=1
http://localhost:3000/projects?capture=1
```

Capture mode creates an invisible outer host and loads the portfolio in a
logical 1080 × 1920 iframe. The host uniformly scales that iframe to the
physical browser viewport. Consequently, CSS media queries, `window.innerWidth`,
viewport units, fixed layers, and the existing responsive JavaScript all keep
seeing 1080 × 1920, whether Chrome's device toolbar is set to 1080 × 1920,
2160 × 3840, or 4320 × 7680.

The physical viewport must remain 9:16 for an edge-to-edge image. At another
ratio, the composition remains centered with unused space around it; this
deliberately avoids changing the design.

## Recording

1. Start the site and open a URL with `?capture=1`.
2. In Chrome Device Toolbar, enter the desired 9:16 physical dimensions and
   leave DPR at 1 or raise it if the machine permits.
3. Wait for fonts and the loading sequence, then record the browser viewport in
OBS. No capture controls or labels are rendered by the site.

The sound-entry gate is intentionally disabled only inside capture mode so it
cannot appear in footage; normal visits retain the existing sound experience.

The WebGL spheres canvas increases its backing buffer by the capture scale in
the logical iframe. This can consume substantial GPU memory at 4320 × 7680;
reduce the physical resolution or DPR if the GPU becomes unstable. Other DOM,
image, and SVG content is rasterized by Chrome at the transformed physical size.
