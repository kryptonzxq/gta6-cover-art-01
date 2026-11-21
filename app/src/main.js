// main.js — Vice Cover Studio editor (gta6-cover-art-01).
// Wires the controls in index.html to the cover renderer in cover.js:
// photo upload / drag & drop / pan / zoom, four layouts, title and caption,
// sunset grade and effects, undo/redo, PNG export at 1080×1080, 1080×1350
// and 1920×1080. Everything runs offline; photos never leave the machine.

import { LAYOUTS, SAMPLE_PHOTOS, EXPORT_SIZES, defaultState, drawCover } from './cover.js';
import { runShot } from './shots.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const canvas = $('#preview');
const ctx = canvas.getContext('2d');
const wrap = $('#preview-wrap');
const statusEl = $('#status');

let state = defaultState();
let panelImages = [null, null, null, null];
let undoStack = [];
let redoStack = [];
let pendingSnapshot = null;

function status(msg, busy = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle('busy', busy);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      img.dataset.src = src;
      resolve(img);
    };
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function reloadPanelImages() {
  for (let i = 0; i < state.panels.length; i++) {
    const src = state.panels[i].src;
    if (!src) {
      panelImages[i] = null;
      continue;
    }
    if (panelImages[i] && panelImages[i].dataset.src === src) continue;
    try {
      panelImages[i] = await loadImage(src);
    } catch {
      panelImages[i] = null;
      state.panels[i].src = null;
    }
  }
}

// Downscale an uploaded file to at most 1600 px on its long side, as a JPEG
// data URL, so undo snapshots stay small and exports stay fast.
function loadFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1600;
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        if (s >= 1) {
          resolve({ img, src: reader.result });
          return;
        }
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s);
        c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const src = c.toDataURL('image/jpeg', 0.9);
        loadImage(src).then((down) => resolve({ img: down, src })).catch(reject);
      };
      img.onerror = () => reject(new Error(`could not read ${file.name}`));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error(`could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function snapshot() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 20) undoStack.shift();
  redoStack = [];
}

function restoreSnapshot(json) {
  state = JSON.parse(json);
  return reloadPanelImages().then(render);
}

async function undo() {
  if (!undoStack.length) {
    status('Nothing to undo.');
    return;
  }
  redoStack.push(JSON.stringify(state));
  await restoreSnapshot(undoStack.pop());
  status('Undone.');
}

async function redo() {
  if (!redoStack.length) {
    status('Nothing to redo.');
    return;
  }
  undoStack.push(JSON.stringify(state));
  await restoreSnapshot(redoStack.pop());
  status('Redone.');
}

// Capture the state before a control interaction; push it on 'change', so a
// slider drag or a text edit is one undo step.
function trackUndo(el) {
  const capture = () => {
    pendingSnapshot = JSON.stringify(state);
  };
  el.addEventListener('pointerdown', capture);
  el.addEventListener('keydown', capture);
  el.addEventListener('focus', capture);
  el.addEventListener('change', () => {
    if (pendingSnapshot !== null) {
      undoStack.push(pendingSnapshot);
      if (undoStack.length > 20) undoStack.shift();
      redoStack = [];
      pendingSnapshot = null;
    }
  });
}

function render() {
  const size = EXPORT_SIZES[state.size];
  const longSide = 960;
  const W = size.w >= size.h ? longSide : Math.round((longSide * size.w) / size.h);
  const H = size.h >= size.w ? longSide : Math.round((longSide * size.h) / size.w);
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  drawCover(ctx, W, H, state, panelImages, { preview: true });
  // Fit the canvas into the stage without changing its aspect.
  const availW = Math.max(120, wrap.clientWidth - 4);
  const availH = Math.max(120, wrap.clientHeight - 4);
  const fit = Math.min(availW / W, availH / H, 1);
  canvas.style.width = `${Math.floor(W * fit)}px`;
  canvas.style.height = `${Math.floor(H * fit)}px`;
  syncUI();
}

function syncUI() {
  const layout = LAYOUTS[state.layout];
  $$('.template').forEach((b) => b.classList.toggle('is-active', b.dataset.layout === state.layout));
  $$('.size').forEach((b) => b.classList.toggle('is-active', b.dataset.size === state.size));
  if (document.activeElement !== $('#title')) $('#title').value = state.title;
  if (document.activeElement !== $('#subtitle')) $('#subtitle').value = state.subtitle;
  setRange('#title-size', state.titleSize, '#title-size-val', (v) => String(Math.round(v)));
  setRange('#tracking', state.tracking, '#tracking-val', (v) => v.toFixed(2));
  setRange('#sunset', state.sunset, '#sunset-val', (v) => v.toFixed(2));
  setRange('#grain', state.grain, '#grain-val', (v) => v.toFixed(2));
  setRange('#vignette', state.vignette, '#vignette-val', (v) => v.toFixed(2));
  setRange('#contrast', state.contrast, '#contrast-val', (v) => v.toFixed(2));
  setRange('#brightness', state.brightness, '#brightness-val', (v) => v.toFixed(2));
  setRange('#saturation', state.saturation, '#saturation-val', (v) => v.toFixed(2));
  $('#title-color').value = state.titleColor;
  $('#outline').checked = state.outline;
  $('#glow').checked = state.glow;
  const sel = Math.min(state.selected, layout.panels.length - 1);
  const panel = state.panels[sel];
  $('#panel-label').textContent = `Panel ${sel + 1} of ${layout.panels.length}`;
  $('#panel-photo').textContent = panel.src ? panel.name || 'photo' : 'empty';
  setRange('#zoom', panel.zoom, '#zoom-val', (v) => `${v.toFixed(2)}×`);
  $('#undo').disabled = undoStack.length === 0;
  $('#redo').disabled = redoStack.length === 0;
}

function setRange(inputSel, value, valSel, fmt) {
  const input = $(inputSel);
  if (document.activeElement !== input) input.value = String(value);
  $(valSel).textContent = fmt(value);
}

function selectedPanel() {
  const layout = LAYOUTS[state.layout];
  return Math.min(state.selected, layout.panels.length - 1);
}

function assignPhoto(index, src, name, img) {
  snapshot();
  state.panels[index] = { ...state.panels[index], src, name, zoom: 1, px: 0.5, py: 0.5 };
  panelImages[index] = img;
  state.selected = index;
  render();
}

async function addFiles(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/'));
  if (!list.length) {
    status('That was not an image file — try a JPG or PNG photo.');
    return;
  }
  status(`Loading ${list.length} photo${list.length > 1 ? 's' : ''}…`, true);
  for (const file of list) {
    const target = state.panels.findIndex((p) => !p.src);
    const index = target === -1 ? selectedPanel() : target;
    try {
      const { img, src } = await loadFileAsImage(file);
      assignPhoto(index, src, file.name.replace(/\.[^.]+$/, ''), img);
    } catch {
      status(`Could not read ${file.name}.`);
      return;
    }
  }
  status(`${list.length} photo${list.length > 1 ? 's' : ''} loaded. Drag inside a panel to move it, use Zoom to crop.`);
}

async function loadSampleProject() {
  status('Loading the sample project…', true);
  snapshot();
  const fresh = defaultState();
  fresh.layout = state.layout;
  fresh.size = state.size;
  fresh.title = state.title;
  fresh.subtitle = state.subtitle;
  state = fresh;
  panelImages = [null, null, null, null];
  for (let i = 0; i < SAMPLE_PHOTOS.length; i++) {
    try {
      const img = await loadImage(SAMPLE_PHOTOS[i].src);
      state.panels[i] = { ...state.panels[i], src: SAMPLE_PHOTOS[i].src, name: SAMPLE_PHOTOS[i].name };
      panelImages[i] = img;
    } catch {
      // A missing sample leaves that panel empty; the rest still load.
    }
  }
  state.selected = 0;
  render();
  status('Sample project loaded — 4 photos across the panels. Switch layouts to remix it, or upload your own photos.');
}

function exportCover() {
  const size = EXPORT_SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  const octx = off.getContext('2d');
  drawCover(octx, size.w, size.h, state, panelImages, { preview: false });
  status(`Exporting ${size.w}×${size.h} PNG…`, true);
  off.toBlob((blob) => {
    if (!blob) {
      status('Export failed — the browser could not make the PNG.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    status(`Exported ${size.w}×${size.h} PNG — check your downloads.`);
  }, 'image/png');
}

function panelAt(nx, ny) {
  const layout = LAYOUTS[state.layout];
  for (let i = 0; i < layout.panels.length; i++) {
    const p = layout.panels[i];
    if (nx >= p.x && nx < p.x + p.w && ny >= p.y && ny < p.y + p.h) return i;
  }
  return -1;
}

function bindEvents() {
  // Template switcher.
  $$('.template').forEach((b) => {
    b.addEventListener('click', () => {
      if (state.layout === b.dataset.layout) return;
      snapshot();
      state.layout = b.dataset.layout;
      state.selected = Math.min(state.selected, LAYOUTS[state.layout].panels.length - 1);
      render();
      status(`Layout: ${LAYOUTS[state.layout].name}.`);
    });
  });

  // Export size.
  $$('.size').forEach((b) => {
    b.addEventListener('click', () => {
      if (state.size === b.dataset.size) return;
      snapshot();
      state.size = b.dataset.size;
      render();
      status(`Export size: ${EXPORT_SIZES[state.size].label}.`);
    });
  });

  // Photo upload, replace, remove.
  $('#file-input').addEventListener('change', (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  });
  $('#replace-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { img, src } = await loadFileAsImage(file);
      assignPhoto(selectedPanel(), src, file.name.replace(/\.[^.]+$/, ''), img);
      status('Photo replaced.');
    } catch {
      status(`Could not read ${file.name}.`);
    }
  });
  $('#replace-photo').addEventListener('click', () => $('#replace-input').click());
  $('#remove-photo').addEventListener('click', () => {
    const i = selectedPanel();
    if (!state.panels[i].src) {
      status('That panel is already empty.');
      return;
    }
    snapshot();
    state.panels[i] = { src: null, name: '', zoom: 1, px: 0.5, py: 0.5 };
    panelImages[i] = null;
    render();
    status(`Panel ${i + 1} cleared.`);
  });
  $('#load-sample-set').addEventListener('click', loadSampleProject);

  // Sample thumbnails: click to fill the selected panel.
  $$('#sample-strip img').forEach((img) => {
    img.addEventListener('click', async () => {
      try {
        const loaded = await loadImage(img.dataset.sample);
        assignPhoto(selectedPanel(), img.dataset.sample, img.dataset.name, loaded);
        status(`${img.dataset.name} placed in panel ${selectedPanel() + 1}.`);
      } catch {
        status('Could not load that sample.');
      }
    });
  });

  // Drag & drop onto the preview.
  wrap.addEventListener('dragover', (e) => {
    e.preventDefault();
    wrap.classList.add('dragging');
  });
  wrap.addEventListener('dragleave', () => wrap.classList.remove('dragging'));
  wrap.addEventListener('drop', (e) => {
    e.preventDefault();
    wrap.classList.remove('dragging');
    addFiles(e.dataTransfer.files);
  });

  // Click to select, drag to pan.
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const i = panelAt(nx, ny);
    if (i === -1) return;
    state.selected = i;
    drag = { index: i, lastX: e.clientX, lastY: e.clientY, moved: false, before: JSON.stringify(state) };
    canvas.setPointerCapture(e.pointerId);
    render();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const layout = LAYOUTS[state.layout];
    const p = layout.panels[drag.index];
    const panel = state.panels[drag.index];
    const img = panelImages[drag.index];
    if (!img) return;
    const rw = p.w * canvas.width;
    const rh = p.h * canvas.height;
    const base = Math.max(rw / img.naturalWidth, rh / img.naturalHeight);
    const dw = img.naturalWidth * base * panel.zoom;
    const dh = img.naturalHeight * base * panel.zoom;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const dx = (e.clientX - drag.lastX) * scaleX;
    const dy = (e.clientY - drag.lastY) * scaleY;
    if (Math.abs(dx) + Math.abs(dy) > 0) drag.moved = true;
    if (dw > rw) panel.px = Math.min(1, Math.max(0, panel.px - dx / (dw - rw)));
    if (dh > rh) panel.py = Math.min(1, Math.max(0, panel.py - dy / (dh - rh)));
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    render();
  });
  const endDrag = () => {
    if (drag && drag.moved) {
      undoStack.push(drag.before);
      if (undoStack.length > 20) undoStack.shift();
      redoStack = [];
      status(`Panel ${drag.index + 1} repositioned.`);
    }
    drag = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', () => {
    drag = null;
  });

  // Text controls.
  const bindText = (id, key) => {
    const el = $(id);
    trackUndo(el);
    el.addEventListener('input', () => {
      state[key] = el.value;
      render();
    });
  };
  bindText('#title', 'title');
  bindText('#subtitle', 'subtitle');

  const bindRange = (id, key) => {
    const el = $(id);
    trackUndo(el);
    el.addEventListener('input', () => {
      state[key] = Number(el.value);
      render();
    });
  };
  bindRange('#title-size', 'titleSize');
  bindRange('#tracking', 'tracking');
  bindRange('#sunset', 'sunset');
  bindRange('#grain', 'grain');
  bindRange('#vignette', 'vignette');
  bindRange('#contrast', 'contrast');
  bindRange('#brightness', 'brightness');
  bindRange('#saturation', 'saturation');

  $('#title-color').addEventListener('input', (e) => {
    state.titleColor = e.target.value;
    render();
  });
  trackUndo($('#title-color'));
  $('#outline').addEventListener('change', (e) => {
    state.outline = e.target.checked;
    render();
  });
  trackUndo($('#outline'));
  $('#glow').addEventListener('change', (e) => {
    state.glow = e.target.checked;
    render();
  });
  trackUndo($('#glow'));

  // Selected panel zoom.
  const zoomEl = $('#zoom');
  trackUndo(zoomEl);
  zoomEl.addEventListener('input', () => {
    state.panels[selectedPanel()].zoom = Number(zoomEl.value);
    render();
  });

  // Export, undo, redo, reset.
  $('#export').addEventListener('click', exportCover);
  $('#undo').addEventListener('click', undo);
  $('#redo').addEventListener('click', redo);
  $('#reset').addEventListener('click', () => {
    snapshot();
    const photos = state.panels.map((p) => ({ src: p.src, name: p.name }));
    const keepLayout = state.layout;
    const keepSize = state.size;
    state = defaultState();
    state.layout = keepLayout;
    state.size = keepSize;
    state.panels.forEach((p, i) => {
      p.src = photos[i].src;
      p.name = photos[i].name;
    });
    render();
    status('Reset — your photos are kept, text and effects are back to defaults.');
  });

  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((e.key.toLowerCase() === 'y') || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
      e.preventDefault();
      redo();
    }
  });

  new ResizeObserver(() => render()).observe(wrap);
}

async function init() {
  bindEvents();
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) {
    const ok = await runShot(shot, { load: loadImage }, (scene, images) => {
      state.layout = scene.layout;
      state.size = scene.size;
      state.title = scene.title;
      state.subtitle = scene.subtitle;
      Object.assign(state, scene.effects);
      scene.photos.forEach((src, i) => {
        state.panels[i] = { ...state.panels[i], src, name: src.split('/').pop().replace('.jpg', '') };
        panelImages[i] = images[i];
      });
      state.selected = 0;
      render();
      status(`Shot scene ${shot}: ${scene.title} — ${LAYOUTS[scene.layout].name}, ${EXPORT_SIZES[scene.size].label}.`);
    });
    if (!ok) {
      await loadSampleProject();
    }
  } else {
    await loadSampleProject();
  }
  render();
}

init().catch((err) => {
  status(`Something went wrong starting the studio: ${err.message}`);
});
