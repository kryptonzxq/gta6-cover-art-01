// Wires the Cover Art Studio: state, uploads, panel editing, templates,
// text and grade controls, undo/redo, export, and the ?shot= screenshot mode.
import { drawCover, LAYOUTS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const panelList = document.getElementById('panel-list');

const SAMPLES = [
  { id: 'boulevard', src: './samples/boulevard.jpg', label: 'Boulevard' },
  { id: 'pier', src: './samples/pier.jpg', label: 'Pier' },
  { id: 'neon', src: './samples/neon.jpg', label: 'Neon Street' },
  { id: 'palms', src: './samples/palms.jpg', label: 'Palm Sunset' },
];

function defaultState() {
  return {
    layout: 'grid',
    sizeKey: 'square',
    panels: [{}, {}, {}, {}],
    selected: 0,
    title: { text: 'VICE CITY', size: 0.11, color: '#ffffff', outline: true, outlineColor: '#14060f', glow: true, glowColor: '#ff2e88', spacing: 0.04, font: "'Arial Black', 'Helvetica Neue', Arial, sans-serif" },
    subtitle: { text: 'A STORY IN EVERY FRAME', color: '#ffd166' },
    grade: { sunset: 0.55, grain: 0.25, vignette: 0.5, contrast: 108, brightness: 104, saturation: 118 },
  };
}

let state = defaultState();
let undoStack = [];
let redoStack = [];

function snapshot() {
  return JSON.parse(JSON.stringify({
    layout: state.layout,
    sizeKey: state.sizeKey,
    panels: state.panels.map((p) => ({ src: p.src || null, panX: p.panX || 0, panY: p.panY || 0, zoom: p.zoom || 1 })),
    selected: state.selected,
    title: state.title,
    subtitle: state.subtitle,
    grade: state.grade,
  }));
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 25) undoStack.shift();
  redoStack = [];
  updateUndoButtons();
}

function restore(snap) {
  state.layout = snap.layout;
  state.sizeKey = snap.sizeKey;
  state.selected = snap.selected;
  state.title = snap.title;
  state.subtitle = snap.subtitle;
  state.grade = snap.grade;
  state.panels = snap.panels.map((p) => ({ src: p.src, panX: p.panX, panY: p.panY, zoom: p.zoom, img: null }));
  return Promise.all(state.panels.map(async (p) => {
    if (p.src) p.img = await loadImage(p.src);
  }));
}

function updateUndoButtons() {
  document.getElementById('undo').disabled = undoStack.length === 0;
  document.getElementById('redo').disabled = redoStack.length === 0;
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function redraw() {
  drawCover(canvas, state);
  renderPanelList();
}

function renderPanelList() {
  const layout = LAYOUTS[state.layout];
  panelList.innerHTML = '';
  layout.slots.forEach((_, i) => {
    const p = state.panels[i];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'panel-chip' + (state.selected === i ? ' active' : '');
    b.textContent = `Panel ${i + 1}${p && p.img ? ' • photo' : ' • empty'}`;
    b.addEventListener('click', () => { state.selected = i; syncPanelControls(); redraw(); });
    panelList.appendChild(b);
  });
}

function syncPanelControls() {
  const p = state.panels[state.selected] || {};
  document.getElementById('zoom').value = p.zoom || 1;
  document.getElementById('zoom-val').textContent = `${Math.round((p.zoom || 1) * 100)}%`;
}

function syncAllControls() {
  document.getElementById('title').value = state.title.text;
  document.getElementById('title-size').value = Math.round(state.title.size * 100);
  document.getElementById('title-color').value = state.title.color;
  document.getElementById('title-outline').checked = !!state.title.outline;
  document.getElementById('title-glow').checked = !!state.title.glow;
  document.getElementById('subtitle').value = state.subtitle.text;
  document.getElementById('subtitle-color').value = state.subtitle.color;
  document.getElementById('sunset').value = Math.round(state.grade.sunset * 100);
  document.getElementById('grain').value = Math.round(state.grade.grain * 100);
  document.getElementById('vignette').value = Math.round(state.grade.vignette * 100);
  document.getElementById('contrast').value = state.grade.contrast;
  document.getElementById('brightness').value = state.grade.brightness;
  document.getElementById('saturation').value = state.grade.saturation;
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === state.sizeKey));
  syncPanelControls();
  updateUndoButtons();
}

async function setPanelPhoto(i, src) {
  pushUndo();
  const img = await loadImage(src);
  state.panels[i] = { src, img, panX: 0, panY: 0, zoom: 1 };
  state.selected = i;
  syncPanelControls();
  redraw();
  setStatus(`Photo added to panel ${i + 1}.`);
}

async function loadSample(id) {
  const s = SAMPLES.find((x) => x.id === id);
  if (!s) return;
  const layout = LAYOUTS[state.layout];
  // Fill the first empty panel, or the selected one.
  let idx = state.panels.findIndex((p, i) => i < layout.slots.length && !p.img);
  if (idx === -1) idx = state.selected;
  await setPanelPhoto(idx, s.src);
}

// --- Uploads ---
const fileInput = document.getElementById('photo');
fileInput.addEventListener('change', async (e) => {
  const files = [...e.target.files].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  const layout = LAYOUTS[state.layout];
  for (const f of files) {
    const url = URL.createObjectURL(f);
    let idx = state.panels.findIndex((p, i) => i < layout.slots.length && !p.img);
    if (idx === -1) idx = state.selected;
    await setPanelPhoto(idx, url);
  }
  fileInput.value = '';
  setStatus(`${files.length} photo(s) loaded. Drag a panel to reposition it.`);
});

// Drag & drop anywhere on the preview.
const dropZone = document.getElementById('stage');
['dragover', 'dragenter'].forEach((ev) => dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach((ev) => dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove('dragging'); }));
dropZone.addEventListener('drop', async (e) => {
  const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  const layout = LAYOUTS[state.layout];
  for (const f of files) {
    const url = URL.createObjectURL(f);
    let idx = state.panels.findIndex((p, i) => i < layout.slots.length && !p.img);
    if (idx === -1) idx = state.selected;
    await setPanelPhoto(idx, url);
  }
  setStatus(`${files.length} photo(s) dropped in.`);
});

// --- Panel drag-to-pan + click-to-select ---
let drag = null;
function slotRectAt(x, y) {
  const r = canvas.getBoundingClientRect();
  const px = (x - r.left) * (canvas.width / r.width);
  const py = (y - r.top) * (canvas.height / r.height);
  const layout = LAYOUTS[state.layout];
  for (let i = 0; i < layout.slots.length; i++) {
    const s = layout.slots[i];
    if (px >= s[0] * canvas.width && px < (s[0] + s[2]) * canvas.width &&
        py >= s[1] * canvas.height && py < (s[1] + s[3]) * canvas.height) return i;
  }
  return -1;
}
canvas.addEventListener('pointerdown', (e) => {
  const i = slotRectAt(e.clientX, e.clientY);
  if (i < 0) return;
  state.selected = i;
  syncPanelControls();
  const p = state.panels[i];
  if (p && p.img) {
    drag = { i, x: e.clientX, y: e.clientY, panX: p.panX || 0, panY: p.panY || 0 };
    canvas.setPointerCapture(e.pointerId);
  }
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const sx = canvas.width / r.width;
  const sy = canvas.height / r.height;
  const p = state.panels[drag.i];
  p.panX = drag.panX + (e.clientX - drag.x) * sx;
  p.panY = drag.panY + (e.clientY - drag.y) * sy;
  redraw();
});
canvas.addEventListener('pointerup', () => {
  if (drag) { pushUndo(); drag = null; }
});
canvas.addEventListener('pointercancel', () => { drag = null; });

// --- Panel controls ---
document.getElementById('zoom').addEventListener('input', (e) => {
  const p = state.panels[state.selected];
  if (!p) return;
  p.zoom = parseFloat(e.target.value);
  document.getElementById('zoom-val').textContent = `${Math.round(p.zoom * 100)}%`;
  redraw();
});
document.getElementById('zoom').addEventListener('change', pushUndo);
document.getElementById('replace').addEventListener('click', () => fileInput.click());
document.getElementById('remove-photo').addEventListener('click', () => {
  pushUndo();
  state.panels[state.selected] = {};
  redraw();
  setStatus(`Panel ${state.selected + 1} cleared.`);
});

// --- Templates ---
document.querySelectorAll('[data-layout]').forEach((b) => {
  b.addEventListener('click', () => {
    pushUndo();
    state.layout = b.dataset.layout;
    state.selected = 0;
    syncAllControls();
    redraw();
    setStatus(`Template: ${LAYOUTS[state.layout].name}.`);
  });
});

// --- Export size ---
document.querySelectorAll('[data-size]').forEach((b) => {
  b.addEventListener('click', () => {
    state.sizeKey = b.dataset.size;
    syncAllControls();
    setStatus(`Export size: ${SIZES[state.sizeKey].label}.`);
  });
});

// --- Text ---
document.getElementById('title').addEventListener('input', (e) => { state.title.text = e.target.value; redraw(); });
document.getElementById('title').addEventListener('change', pushUndo);
document.getElementById('title-size').addEventListener('input', (e) => { state.title.size = parseInt(e.target.value, 10) / 100; redraw(); });
document.getElementById('title-size').addEventListener('change', pushUndo);
document.getElementById('title-color').addEventListener('input', (e) => { state.title.color = e.target.value; redraw(); });
document.getElementById('title-color').addEventListener('change', pushUndo);
document.getElementById('title-outline').addEventListener('change', (e) => { pushUndo(); state.title.outline = e.target.checked; redraw(); });
document.getElementById('title-glow').addEventListener('change', (e) => { pushUndo(); state.title.glow = e.target.checked; redraw(); });
document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle.text = e.target.value; redraw(); });
document.getElementById('subtitle').addEventListener('change', pushUndo);
document.getElementById('subtitle-color').addEventListener('input', (e) => { state.subtitle.color = e.target.value; redraw(); });
document.getElementById('subtitle-color').addEventListener('change', pushUndo);

// --- Grade ---
function bindGrade(id, key, scale = 100) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => { state.grade[key] = parseInt(el.value, 10) / scale; redraw(); });
  el.addEventListener('change', pushUndo);
}
bindGrade('sunset', 'sunset');
bindGrade('grain', 'grain');
bindGrade('vignette', 'vignette');
bindGrade('contrast', 'contrast');
bindGrade('brightness', 'brightness');
bindGrade('saturation', 'saturation');

// --- Undo / redo / reset ---
document.getElementById('undo').addEventListener('click', async () => {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  await restore(undoStack.pop());
  syncAllControls();
  redraw();
});
document.getElementById('redo').addEventListener('click', async () => {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  await restore(redoStack.pop());
  syncAllControls();
  redraw();
});
document.getElementById('reset').addEventListener('click', async () => {
  pushUndo();
  const keep = state.panels;
  state = defaultState();
  state.panels = keep;
  syncAllControls();
  redraw();
  setStatus('Reset to defaults (your photos were kept).');
});

// --- Samples ---
document.querySelectorAll('[data-sample]').forEach((b) => {
  b.addEventListener('click', () => loadSample(b.dataset.sample));
});
document.getElementById('load-sample-set').addEventListener('click', async () => {
  pushUndo();
  const layout = LAYOUTS[state.layout];
  for (let i = 0; i < layout.slots.length; i++) {
    const s = SAMPLES[i % SAMPLES.length];
    state.panels[i] = { src: s.src, img: await loadImage(s.src), panX: 0, panY: 0, zoom: 1 };
  }
  state.selected = 0;
  syncPanelControls();
  redraw();
  setStatus('Sample project loaded — try a template, then export.');
});

// --- Export ---
document.getElementById('export').addEventListener('click', async () => {
  const size = SIZES[state.sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state);
  setStatus(`Exporting ${size.label}…`);
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${size.w}x${size.h}.png`;
    a.click();
    setStatus(`Saved cover-${size.w}x${size.h}.png (${(blob.size / 1024).toFixed(0)} KB).`);
  }, 'image/png');
});

// --- Screenshot mode (?shot=) ---
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, async (next) => {
    pushUndo();
    state.layout = next.layout || state.layout;
    state.sizeKey = next.sizeKey || state.sizeKey;
    state.title = { ...state.title, ...next.title };
    state.subtitle = { ...state.subtitle, ...next.subtitle };
    if (next.grade) state.grade = { ...state.grade, ...next.grade };
    state.panels = [{}, {}, {}, {}];
    const layout = LAYOUTS[state.layout];
    for (let i = 0; i < layout.slots.length; i++) {
      const src = next.photos[i % next.photos.length];
      state.panels[i] = { src, img: await loadImage(src), panX: 0, panY: 0, zoom: 1 };
    }
    state.selected = 0;
    syncAllControls();
    redraw();
  });
} else {
  syncAllControls();
  redraw();
}
