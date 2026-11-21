// Deterministic screenshot scenes (?shot=1..3). Each scene loads the same
// sample photos and the same text every time, so screenshots are repeatable.
const SCENES = {
  1: {
    layout: 'grid',
    sizeKey: 'square',
    title: { text: 'VICE CITY', color: '#ffffff' },
    subtitle: { text: 'A STORY IN EVERY FRAME' },
    photos: ['./samples/boulevard.jpg', './samples/pier.jpg', './samples/neon.jpg'],
  },
  2: {
    layout: 'strip',
    sizeKey: 'portrait',
    title: { text: 'SUNSET HEIST', color: '#ffe9f4' },
    subtitle: { text: 'NEON NIGHTS • MIAMI' },
    photos: ['./samples/pier.jpg', './samples/neon.jpg', './samples/palms.jpg'],
  },
  3: {
    layout: 'hero',
    sizeKey: 'wide',
    title: { text: 'PALM & CHROME', color: '#ffffff' },
    subtitle: { text: 'VICE CITY • 2026' },
    photos: ['./samples/boulevard.jpg', './samples/palms.jpg', './samples/neon.jpg'],
  },
};

/** Runs scene `id`, calling `apply(scene)` once its definition is ready. */
export function runShot(id, _params, apply) {
  const scene = SCENES[id] || SCENES[1];
  apply(scene);
}
