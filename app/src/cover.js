// cover.js — the cover renderer for Vice Cover Studio (gta6-cover-art-01).
// Pure canvas drawing: multi-panel layouts, photo cover-fit with pan/zoom,
// sunset grade, vignette, deterministic grain, scrim and tracked title
// lettering. No DOM, no network. The same function draws the editor preview
// and the exported PNG, so what you see is what the PNG holds.

export const LAYOUTS = {
  grid: {
    name: 'Vice Grid',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.632, y: 0, w: 0.368, h: 0.494 },
      { x: 0.632, y: 0.506, w: 0.368, h: 0.494 },
    ],
  },
  strip: {
    name: 'Sunset Strip',
    panels: [
      { x: 0, y: 0, w: 0.325, h: 1 },
      { x: 0.3375, y: 0, w: 0.325, h: 1 },
      { x: 0.675, y: 0, w: 0.325, h: 1 },
    ],
  },
  hero: {
    name: 'Hero Split',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.62 },
      { x: 0, y: 0.632, w: 0.494, h: 0.368 },
      { x: 0.506, y: 0.632, w: 0.494, h: 0.368 },
    ],
  },
  quad: {
    name: 'Quad',
    panels: [
      { x: 0, y: 0, w: 0.494, h: 0.494 },
      { x: 0.506, y: 0, w: 0.494, h: 0.494 },
      { x: 0, y: 0.506, w: 0.494, h: 0.494 },
      { x: 0.506, y: 0.506, w: 0.494, h: 0.494 },
    ],
  },
};

export const SAMPLE_PHOTOS = [
  { src: 'samples/pier.jpg', name: 'Pier' },
  { src: 'samples/boulevard.jpg', name: 'Boulevard' },
  { src: 'samples/neon.jpg', name: 'Neon City' },
  { src: 'samples/palms.jpg', name: 'Palms' },
];

export const EXPORT_SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

export const TITLE_FONT = '"Arial Black", "Arial Bold", "Liberation Sans", Arial, sans-serif';
export const BODY_FONT = 'Arial, "Liberation Sans", Helvetica, sans-serif';

export function defaultState() {
  return {
    layout: 'grid',
    size: 'square',
    title: 'VICE CITY',
    subtitle: 'WELCOME TO THE SUNSHINE STATE',
    titleSize: 110,
    titleColor: '#ffffff',
    outline: true,
    glow: true,
    tracking: 0.1,
    sunset: 0.6,
    grain: 0.5,
    vignette: 0.55,
    contrast: 1.06,
    brightness: 1.0,
    saturation: 1.18,
    selected: 0,
    panels: [
      { src: null, name: '', zoom: 1, px: 0.5, py: 0.5 },
      { src: null, name: '', zoom: 1, px: 0.5, py: 0.5 },
      { src: null, name: '', zoom: 1, px: 0.5, py: 0.5 },
      { src: null, name: '', zoom: 1, px: 0.5, py: 0.5 },
    ],
  };
}

// Seeded PRNG (mulberry32) so the grain is identical on every run.
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const grainTiles = new Map();
function grainTile(seed) {
  if (grainTiles.has(seed)) return grainTiles.get(seed);
  const t = document.createElement('canvas');
  t.width = 128;
  t.height = 128;
  const c = t.getContext('2d');
  const img = c.createImageData(128, 128);
  const rnd = mulberry32(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 116 + Math.floor(rnd() * 24);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  grainTiles.set(seed, t);
  return t;
}

// Cover-fit a photo into a rect, honouring pan (px, py in 0..1) and zoom.
function drawPhotoInto(ctx, img, rect, panel, grade) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const s = base * panel.zoom;
  const dw = iw * s;
  const dh = ih * s;
  const dx = rect.x - (dw - rect.w) * panel.px;
  const dy = rect.y - (dh - rect.h) * panel.py;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = `contrast(${grade.contrast}) brightness(${grade.brightness}) saturate(${grade.saturation})`;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawEmptyPanel(ctx, rect) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, '#3b1d5e');
  g.addColorStop(0.55, '#a83a7d');
  g.addColorStop(1, '#ff7a3d');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const sx = rect.x + rect.w * 0.5;
  const sy = rect.y + rect.h * 0.38;
  const r = Math.min(rect.w, rect.h) * 0.16;
  const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.4);
  rg.addColorStop(0, 'rgba(255, 222, 150, 0.95)');
  rg.addColorStop(0.5, 'rgba(255, 140, 90, 0.45)');
  rg.addColorStop(1, 'rgba(255, 120, 80, 0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(sx, sy, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function trackedWidth(ctx, text, tracking, size) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width;
  return w + tracking * size * Math.max(0, text.length - 1);
}

function drawTracked(ctx, text, cx, y, size, tracking, opts) {
  const total = trackedWidth(ctx, text, tracking, size);
  let x = cx - total / 2;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (opts.shadowColor) {
    ctx.shadowColor = opts.shadowColor;
    ctx.shadowBlur = opts.shadowBlur;
  }
  for (const ch of text) {
    if (opts.stroke) {
      ctx.lineWidth = opts.strokeWidth;
      ctx.strokeStyle = opts.stroke;
      ctx.lineJoin = 'round';
      ctx.strokeText(ch, x, y);
    }
    ctx.fillStyle = opts.fill;
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + tracking * size;
  }
  ctx.restore();
  return total;
}

// Draw the whole cover. `images` is an array of HTMLImageElement|null aligned
// with state.panels. With opts.preview, panel numbers and empty-panel hints
// are drawn on top (editor only — never in the export).
export function drawCover(ctx, W, H, state, images, opts = {}) {
  const preview = !!opts.preview;
  const layout = LAYOUTS[state.layout] || LAYOUTS.grid;
  const scale = W / 1080;
  const grade = {
    contrast: state.contrast,
    brightness: state.brightness,
    saturation: state.saturation,
  };

  // Base: dark plum, so the gutters read as thin dark seams.
  ctx.save();
  ctx.filter = 'none';
  ctx.fillStyle = '#150826';
  ctx.fillRect(0, 0, W, H);

  // Panels.
  layout.panels.forEach((p, i) => {
    const rect = { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H };
    const panel = state.panels[i];
    const img = images[i];
    if (img && panel && panel.src) {
      drawPhotoInto(ctx, img, rect, panel, grade);
    } else {
      drawEmptyPanel(ctx, rect);
    }
    // Thin dark gutter seam around each panel.
    ctx.strokeStyle = 'rgba(10, 4, 20, 0.65)';
    ctx.lineWidth = Math.max(2, W * 0.002);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  // Sunset grade: diagonal pink-orange-purple wash, overlay blend.
  if (state.sunset > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = state.sunset;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(255, 46, 136, 0.55)');
    g.addColorStop(0.5, 'rgba(255, 154, 61, 0.45)');
    g.addColorStop(1, 'rgba(124, 58, 237, 0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = state.sunset * 0.7;
    const warm = ctx.createLinearGradient(0, H * 0.4, 0, H);
    warm.addColorStop(0, 'rgba(255, 120, 60, 0)');
    warm.addColorStop(1, 'rgba(255, 120, 60, 0.9)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Vignette.
  if (state.vignette > 0) {
    const r0 = Math.max(W, H) * 0.36;
    const r1 = Math.max(W, H) * 0.78;
    const v = ctx.createRadialGradient(W / 2, H * 0.46, r0, W / 2, H * 0.46, r1);
    v.addColorStop(0, 'rgba(8, 2, 16, 0)');
    v.addColorStop(1, `rgba(8, 2, 16, ${0.62 * state.vignette})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  // Deterministic film grain.
  if (state.grain > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = state.grain * 0.16;
    ctx.fillStyle = ctx.createPattern(grainTile(20261121), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Bottom scrim behind the lettering.
  const scrim = ctx.createLinearGradient(0, H * 0.52, 0, H);
  scrim.addColorStop(0, 'rgba(8, 2, 16, 0)');
  scrim.addColorStop(0.62, 'rgba(8, 2, 16, 0.55)');
  scrim.addColorStop(1, 'rgba(8, 2, 16, 0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, H);

  // Gold rule above the title.
  const ruleY = H * 0.8;
  const ruleW = W * 0.3;
  const rule = ctx.createLinearGradient(W / 2 - ruleW / 2, 0, W / 2 + ruleW / 2, 0);
  rule.addColorStop(0, 'rgba(255, 209, 102, 0)');
  rule.addColorStop(0.5, 'rgba(255, 209, 102, 0.95)');
  rule.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.fillStyle = rule;
  ctx.fillRect(W / 2 - ruleW / 2, ruleY, ruleW, Math.max(2, 3 * scale));

  // Title, fit to the width with letter tracking.
  const title = (state.title || 'VICE CITY').toUpperCase();
  let titleSize = state.titleSize * scale;
  ctx.font = `900 ${titleSize}px ${TITLE_FONT}`;
  while (titleSize > 18 * scale && trackedWidth(ctx, title, state.tracking, titleSize) > W * 0.92) {
    titleSize *= 0.94;
    ctx.font = `900 ${titleSize}px ${TITLE_FONT}`;
  }
  drawTracked(ctx, title, W / 2, H * 0.9, titleSize, state.tracking, {
    fill: state.titleColor,
    stroke: state.outline ? '#14041f' : null,
    strokeWidth: Math.max(2, titleSize * 0.07),
    shadowColor: state.glow ? '#ff2e88' : null,
    shadowBlur: state.glow ? titleSize * 0.28 : 0,
  });

  // Subtitle.
  const subtitle = (state.subtitle || '').toUpperCase();
  if (subtitle) {
    const subSize = Math.max(10 * scale, state.titleSize * 0.3 * scale);
    ctx.font = `700 ${subSize}px ${BODY_FONT}`;
    drawTracked(ctx, subtitle, W / 2, H * 0.955, subSize, 0.34, {
      fill: '#ffd166',
      stroke: null,
      shadowColor: state.glow ? 'rgba(255, 46, 136, 0.8)' : null,
      shadowBlur: state.glow ? subSize * 0.5 : 0,
    });
  }

  // Preview-only helpers: panel numbers, selection, empty hints.
  if (preview) {
    layout.panels.forEach((p, i) => {
      const rect = { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H };
      const isSel = state.selected === i;
      if (isSel) {
        ctx.strokeStyle = '#ff2e88';
        ctx.lineWidth = Math.max(3, W * 0.005);
        ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
      }
      const badgeR = Math.max(11, 15 * scale);
      const bx = rect.x + badgeR + 8 * scale;
      const by = rect.y + badgeR + 8 * scale;
      ctx.beginPath();
      ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = isSel ? '#ff2e88' : 'rgba(10, 4, 20, 0.72)';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${Math.max(11, 13 * scale)}px ${BODY_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), bx, by + 1);
      if (!state.panels[i].src) {
        ctx.font = `700 ${Math.max(11, 15 * scale)}px ${BODY_FONT}`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.shadowColor = 'rgba(10, 4, 20, 0.9)';
        ctx.shadowBlur = 6;
        ctx.fillText('DROP A PHOTO', rect.x + rect.w / 2, rect.y + rect.h * 0.62);
        ctx.shadowBlur = 0;
      }
    });
  }
  ctx.restore();
}
