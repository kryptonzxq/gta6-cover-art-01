// shots.js — deterministic screenshot scenes for Vice Cover Studio.
// runShot(id, params, apply) loads the same sample photos every time and
// hands one fixed scene to the editor. Used by ?shot=1/2/3 in the browser
// test so the screenshots are reproducible.
//
//   params.load(src)  -> Promise<HTMLImageElement> for a path under app/
//   apply(scene, images) -> installs the scene's state and panel images

export const SHOT_SCENES = {
  1: {
    layout: 'grid',
    size: 'square',
    title: 'VICE CITY',
    subtitle: 'WELCOME TO THE SUNSHINE STATE',
    photos: ['samples/pier.jpg', 'samples/boulevard.jpg', 'samples/neon.jpg'],
    effects: { sunset: 0.6, grain: 0.5, vignette: 0.55, contrast: 1.06, brightness: 1.0, saturation: 1.18 },
  },
  2: {
    layout: 'strip',
    size: 'portrait',
    title: 'SUNSET HEIST',
    subtitle: 'ONE LAST SCORE',
    photos: ['samples/palms.jpg', 'samples/neon.jpg', 'samples/pier.jpg'],
    effects: { sunset: 0.7, grain: 0.55, vignette: 0.6, contrast: 1.08, brightness: 1.02, saturation: 1.22 },
  },
  3: {
    layout: 'hero',
    size: 'wide',
    title: 'PALM & CHROME',
    subtitle: 'VICE CITY • 2026',
    photos: ['samples/neon.jpg', 'samples/palms.jpg', 'samples/boulevard.jpg'],
    effects: { sunset: 0.55, grain: 0.45, vignette: 0.5, contrast: 1.05, brightness: 1.0, saturation: 1.15 },
  },
};

export async function runShot(id, params, apply) {
  const scene = SHOT_SCENES[id];
  if (!scene) return false;
  const images = [];
  for (const src of scene.photos) {
    images.push(await params.load(src));
  }
  apply(scene, images);
  return true;
}
