// These contours share a unit circle. Drawing with Path2D also preserves the
// caller's current path, which save()/restore() on their own would not do.
const silhouette = new Path2D();
silhouette.moveTo(-0.97, -0.11);
silhouette.bezierCurveTo(-0.97, -0.65, -0.53, -0.97, 0.03, -0.96);
silhouette.bezierCurveTo(0.57, -0.99, 0.96, -0.67, 0.98, -0.15);
silhouette.bezierCurveTo(1.01, 0.33, 0.77, 0.8, 0.34, 0.93);
silhouette.bezierCurveTo(-0.15, 1.08, -0.77, 0.89, -0.91, 0.47);
silhouette.bezierCurveTo(-0.98, 0.27, -0.98, 0.07, -0.97, -0.11);
silhouette.closePath();

const lowerCaustic = new Path2D();
lowerCaustic.moveTo(-0.5, 0.72);
lowerCaustic.bezierCurveTo(-0.19, 0.98, 0.47, 0.98, 0.73, 0.5);
lowerCaustic.bezierCurveTo(0.44, 0.81, 0.02, 0.93, -0.5, 0.72);
lowerCaustic.closePath();

const glint = new Path2D();
glint.moveTo(-0.76, -0.44);
glint.bezierCurveTo(-0.64, -0.69, -0.42, -0.83, -0.19, -0.85);
glint.bezierCurveTo(-0.36, -0.75, -0.57, -0.72, -0.76, -0.44);
glint.closePath();

const glintPoint = new Path2D();
glintPoint.ellipse(-0.61, -0.64, 0.039, 0.021, -0.59, 0, Math.PI * 2);

const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));

// The smaller source window in the centre gives higher optical magnification.
// The outer rings see a wider field as rays meet the surface at a grazing angle.
const bands = [
  { outer: 1, sample: 1.55, offset: -0.085 },
  { outer: 0.93, sample: 1.17, offset: -0.04 },
  { outer: 0.84, sample: 1.04, offset: -0.015 },
  { outer: 0.7, sample: 1, offset: 0 },
];
const rings = bands.map(({ outer }, i) => {
  const ring = new Path2D();
  ring.arc(0, 0, outer * 1.1, 0, Math.PI * 2);
  if (i + 1 < bands.length) {
    ring.moveTo(bands[i + 1].outer * 1.1, 0);
    ring.arc(0, 0, bands[i + 1].outer * 1.1, 0, Math.PI * 2, true);
  }
  return ring;
});

/** Paint a small, transparent liquid lens. Rotation is in radians and u/v are normalised texture coordinates. */
export function paintJourneyLens(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rotation: number,
  warmth: number,
  texture: HTMLImageElement | null,
  u: number,
  v: number,
  opacity: number,
  sourceSpan?: number,
): void {
  if (r <= 0 || opacity <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);
  ctx.rotate(rotation);
  const alpha = ctx.globalAlpha * clamp(opacity, 0, 1);
  const heat = clamp(warmth, 0, 1);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'source-over';

  if (texture?.complete && texture.naturalWidth && texture.naturalHeight && r >= 11) {
    const { naturalWidth: w, naturalHeight: h } = texture;
    const field = Math.min(sourceSpan ?? Math.min(w, h) * 0.33, Math.min(w, h) / 1.55);
    ctx.save();
    ctx.clip(silhouette);
    // The lens turns, but the refracted horizon (or screenshot) stays upright.
    ctx.rotate(-rotation);
    ctx.globalAlpha = alpha * 0.62;
    for (let i = 0; i < bands.length; i++) {
      const { sample, offset } = bands[i];
      const size = field * sample;
      const left = clamp(u * w - size * 0.5 + offset * field, 0, w - size);
      const top = clamp(v * h - size * 0.5 - offset * field, 0, h - size);
      ctx.save();
      ctx.clip(rings[i], 'evenodd');
      ctx.drawImage(texture, left, top, size, size, -1.04, -1.04, 2.08, 2.08);
      ctx.restore();
    }
    ctx.restore();
  }

  const water = ctx.createRadialGradient(-0.25, -0.29, 0.04, -0.06, -0.06, 1.08);
  water.addColorStop(0, 'rgba(224,249,255,.10)');
  water.addColorStop(0.52, 'rgba(99,168,193,.08)');
  water.addColorStop(0.76, 'rgba(18,63,88,.26)');
  water.addColorStop(0.87, 'rgba(181,227,239,.40)');
  water.addColorStop(0.95, 'rgba(34,74,97,.68)');
  water.addColorStop(1, 'rgba(245,252,255,.90)');
  ctx.fillStyle = water;
  ctx.fill(silhouette);

  const rim = ctx.createLinearGradient(-0.8, -0.85, 0.8, 0.85);
  rim.addColorStop(0, '#f5fdff');
  rim.addColorStop(0.24, 'rgba(169,217,229,.72)');
  rim.addColorStop(0.46, 'rgba(20,60,78,.75)');
  rim.addColorStop(0.76, 'rgba(183,238,247,.94)');
  rim.addColorStop(1, 'rgba(33,65,83,.76)');
  ctx.strokeStyle = rim;
  ctx.lineWidth = Math.max(0.017, 0.7 / r);
  ctx.stroke(silhouette);

  const light = ctx.createLinearGradient(-0.48, 0.65, 0.75, 0.92);
  light.addColorStop(0, 'rgba(196,245,255,0)');
  light.addColorStop(0.38, `rgba(255,${Math.round(226 - heat * 30)},${Math.round(180 - heat * 72)},.94)`);
  light.addColorStop(0.62, 'rgba(255,254,246,.98)');
  light.addColorStop(1, 'rgba(137,215,255,.12)');
  ctx.fillStyle = light;
  ctx.fill(lowerCaustic);
  ctx.fillStyle = 'rgba(248,255,255,.91)';
  ctx.fill(glint);
  ctx.fillStyle = 'white';
  ctx.fill(glintPoint);
  ctx.restore();
}

// The workbench sends a photographic slide through the waterline to the folio.
// In the gallery it rounds back into the pointer's magnifying lens.
export function paintGlassSlide(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number,
  spread: number, image: HTMLImageElement | undefined, opacity: number) {
  if (opacity <= 0) return;
  const halfWidth = radius * (1 + .78 * spread);
  const halfHeight = radius * (1 - .16 * spread);
  const corner = Math.max(4, radius * (1 - .87 * spread));
  ctx.save();
  ctx.globalAlpha *= opacity * spread;
  ctx.translate(x, y);
  ctx.transform(1, -.11 * spread, -.06 * spread, 1, 0, 0);
  ctx.beginPath();
  ctx.roundRect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2, corner);
  ctx.clip();
  ctx.fillStyle = '#245476';
  ctx.fillRect(-halfWidth, -halfHeight, 2 * halfWidth, 2 * halfHeight);
  if (image?.complete && image.naturalWidth) {
    const scale = Math.max(2 * halfWidth / image.naturalWidth, 2 * halfHeight / image.naturalHeight);
    const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
  }
  const rim = ctx.createLinearGradient(-halfWidth, -halfHeight, halfWidth, halfHeight);
  rim.addColorStop(0, '#e8ffffe8');
  rim.addColorStop(.14, '#a6d6f231');
  rim.addColorStop(.55, '#b3e1f11c');
  rim.addColorStop(.60, '#f4ffff8c');
  rim.addColorStop(.68, '#e4fcff21');
  rim.addColorStop(1, '#abcbe79e');
  ctx.fillStyle = rim;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#d6f9ff';
  ctx.stroke();
  ctx.restore();
}
