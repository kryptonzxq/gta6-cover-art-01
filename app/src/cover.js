// Cover rendering engine: draws the multi-panel Vice City-style cover onto a
// canvas 2D context, at the canvas's own size. Pure rendering — no DOM, no
// network. Deterministic: the film grain uses a fixed-seed PRNG, so the same
// state always draws the same pixels.

/** Four genuinely different multi-panel layouts. Each slot is a normalized
 *  rect [x, y, w, h] in 0..1 coordinates, so a layout works at any export
 *  aspect ratio. */
export const LAYOUTS = {
  grid: {
    name: 'Vice Grid',
    blurb: 'One hero panel, two stacked beside it.',
    slots: [
      [0, 0, 0.62, 1],
      [0.62, 0, 0.38, 0.5],
      [0.62, 0.5, 0.38, 0.5],
    ],
  },
  strip: {
    name: 'Sunset Strip',
    blurb: 'Three equal vertical panels, a triptych.',
    slots: [
      [0, 0, 0.333, 1],
      [0.333, 0, 0.334, 1],
      [0.667, 0, 0.333, 1],
    ],
  },
  hero: {
    name: 'Hero Split',
    blurb: 'A big hero on top, two small panels below.',
    slots: [
      [0, 0, 1, 0.62],
      [0, 0.62, 0.5, 0.38],
      [0.5, 0.62, 0.5, 0.38],
    ],
  },
  quad: {
    name: 'Quad',
    blurb: 'Four equal panels, a clean 2 x 2 grid.',
    slots: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
  },
};

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  wide: { w: 1920, h: 1080, label: '1920 x 1080' },
};

/** A small deterministic PRNG (mulberry32). */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pre-rendered 128x128 monochrome noise tile, fixed seed => identical bytes. */
let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(128, 128);
  const r = rng(20261121);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(r() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

/** Draws one photo into a slot rect, cover-fit, with pan and zoom. */
function drawPhoto(ctx, img, rect, panX, panY, zoom) {
  const [rx, ry, rw, rh] = rect;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(rw / iw, rh / ih);
  const scale = base * (zoom || 1);
  const pw = iw * scale;
  const ph = ih * scale;
  const cx = rx + rw / 2 + (panX || 0);
  const cy = ry + rh / 2 + (panY || 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

/** Renders the full cover. `state` is the app state (see main.js). */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const layout = LAYOUTS[state.layout] || LAYOUTS.grid;

  // Base.
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#1a0f24';
  ctx.fillRect(0, 0, w, h);

  // Photo grade (contrast / brightness / saturation) applies to photos only.
  const g = state.grade || {};
  const filter = [];
  if (g.contrast !== undefined) filter.push(`contrast(${(g.contrast ?? 100) / 100})`);
  if (g.brightness !== undefined) filter.push(`brightness(${(g.brightness ?? 100) / 100})`);
  if (g.saturation !== undefined) filter.push(`saturate(${(g.saturation ?? 100) / 100})`);
  ctx.filter = filter.length ? filter.join(' ') : 'none';

  // Panels.
  const gap = Math.max(2, Math.round(w * 0.004));
  layout.slots.forEach((slot, i) => {
    const p = state.panels[i];
    const rect = [
      slot[0] * w + (slot[0] > 0 ? gap / 2 : 0),
      slot[1] * h + (slot[1] > 0 ? gap / 2 : 0),
      slot[2] * w - (slot[0] > 0 ? gap / 2 : 0) - (slot[0] + slot[2] < 1 ? gap / 2 : 0),
      slot[3] * h - (slot[1] > 0 ? gap / 2 : 0) - (slot[1] + slot[3] < 1 ? gap / 2 : 0),
    ];
    if (p && p.img) {
      drawPhoto(ctx, p.img, rect, p.panX, p.panY, p.zoom);
    } else {
      // Empty slot: a deep gradient placeholder with a thin frame.
      const grad = ctx.createLinearGradient(rect[0], rect[1], rect[0] + rect[2], rect[1] + rect[3]);
      grad.addColorStop(0, '#3a1c4d');
      grad.addColorStop(1, '#12081c');
      ctx.fillStyle = grad;
      ctx.fillRect(rect[0], rect[1], rect[2], rect[3]);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rect[0] + 0.5, rect[1] + 0.5, rect[2] - 1, rect[3] - 1);
    }
    // Thin dark gutter line around each panel.
    ctx.strokeStyle = 'rgba(10,4,16,0.9)';
    ctx.lineWidth = gap;
    ctx.strokeRect(rect[0], rect[1], rect[2], rect[3]);
  });
  ctx.filter = 'none';

  // Sunset grade: warm pink-orange wash, stronger at the bottom.
  const sunset = g.sunset ?? 0.55;
  if (sunset > 0) {
    const grad = ctx.createLinearGradient(0, h * 0.25, 0, h);
    grad.addColorStop(0, `rgba(255, 94, 120, ${0.0})`);
    grad.addColorStop(0.55, `rgba(255, 120, 60, ${0.10 * sunset})`);
    grad.addColorStop(1, `rgba(190, 40, 130, ${0.38 * sunset})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Top cool-purple kiss so the sky reads neon, not flat.
    const top = ctx.createLinearGradient(0, 0, 0, h * 0.3);
    top.addColorStop(0, `rgba(120, 60, 220, ${0.16 * sunset})`);
    top.addColorStop(1, 'rgba(120, 60, 220, 0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h * 0.3);
  }

  // Vignette.
  const vig = g.vignette ?? 0.5;
  if (vig > 0) {
    const rad = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.42,
      w / 2, h / 2, Math.max(w, h) * 0.75,
    );
    rad.addColorStop(0, 'rgba(8,2,14,0)');
    rad.addColorStop(1, `rgba(8,2,14,${0.55 * vig})`);
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, w, h);
  }

  // Film grain.
  const grain = g.grain ?? 0.25;
  if (grain > 0) {
    const tile = getNoiseTile();
    const pat = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.10 * grain;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Title + subtitle. Drawn last so they sit above the grade.
  drawText(ctx, state, w, h);
}

function fitFont(ctx, text, maxW, startSize, family, weight) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxW && size > 10) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawText(ctx, state, w, h) {
  const t = state.title || {};
  const s = state.subtitle || {};
  const family = t.font || "'Arial Black', 'Helvetica Neue', Arial, sans-serif";
  const text = (t.text || '').trim().toUpperCase();
  const sub = (s.text || '').trim();

  // Anchor the text block near the foot, above a slim gradient scrim so it
  // stays readable over any photo.
  const blockH = h * 0.22;
  const scrim = ctx.createLinearGradient(0, h - blockH, 0, h);
  scrim.addColorStop(0, 'rgba(10,3,18,0)');
  scrim.addColorStop(1, 'rgba(10,3,18,0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h - blockH, w, blockH);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (sub) {
    const subSize = fitFont(ctx, sub, w * 0.86, Math.round(h * 0.032), "'Helvetica Neue', Arial, sans-serif", '600');
    ctx.font = `600 ${subSize}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillStyle = s.color || '#ffd166';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = subSize * 0.3;
    ctx.fillText(sub, w / 2, h - h * 0.035);
    ctx.shadowBlur = 0;
  }

  if (text) {
    const size = fitFont(ctx, text, w * 0.92, Math.round(h * (t.size ?? 0.11)), family, '900');
    const y = sub ? h - h * 0.075 : h - h * 0.06;
    ctx.font = `900 ${size}px ${family}`;
    // Letter spacing via manual tracking: draw with a small extra gap by
    // rendering word by word when spacing is set.
    const spacing = t.spacing ?? 0.04;
    ctx.save();
    if (t.glow) {
      ctx.shadowColor = t.glowColor || '#ff2e88';
      ctx.shadowBlur = size * 0.35;
    }
    // Outline.
    if (t.outline) {
      ctx.lineWidth = Math.max(2, size * 0.06);
      ctx.strokeStyle = t.outlineColor || '#14060f';
      ctx.lineJoin = 'round';
      strokeTracked(ctx, text, w / 2, y, spacing * size);
    }
    ctx.fillStyle = t.color || '#ffffff';
    fillTracked(ctx, text, w / 2, y, spacing * size);
    ctx.restore();
  }
}

/** Draws tracked (letter-spaced) text centred at cx. */
function trackedWidth(ctx, text, track) {
  let total = 0;
  for (const ch of text) total += ctx.measureText(ch).width + track;
  return total - track;
}
function fillTracked(ctx, text, cx, y, track) {
  const total = trackedWidth(ctx, text, track);
  let x = cx - total / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + track;
  }
}
function strokeTracked(ctx, text, cx, y, track) {
  const total = trackedWidth(ctx, text, track);
  let x = cx - total / 2;
  for (const ch of text) {
    ctx.strokeText(ch, x, y);
    x += ctx.measureText(ch).width + track;
  }
}
