# Vice Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/kryptonzxq/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/kryptonzxq/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Cover Studio is an offline web app that turns any photo and caption into
Vice City-style cover art. It was built for the
[make.fun bounty "Make GTA 6 Cover Art"](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Four multi-panel templates** — Vice Grid, Sunset Strip, Hero Split and
  Quad, each a genuinely different composition.
- **Photo editing** — upload several photos, or drag & drop them onto the
  cover. Click a panel to select it, drag inside it to pan the photo, zoom,
  replace or remove it.
- **Text editing** — an editable title and subtitle with size and colour
  controls, an outline and a neon glow.
- **Visual effects** — a Vice City sunset grade, film grain, vignette,
  contrast, brightness and saturation.
- **PNG export** — exact post sizes 1080 × 1080, 1080 × 1350 and
  1920 × 1080, downloaded straight from the browser.
- **Undo / redo / reset**, plus a sample project and four bundled sample
  photos for first-time users.

Everything runs offline from static files. Photos never leave the machine.

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

Or open `app/index.html` directly in a desktop browser. No build step, no
dependencies, no network.

## Entry point

`main.ts` (Node 22) copies `app/` and `screenshots/` to `/output` and writes
`/output/dossier.json` via `vendor/makefun-app.ts`, the library copied
unchanged from the official kit.

## License

MIT — see LICENSE. All artwork, lettering and sample photos are original or
free to use. No Rockstar Games logo, artwork or font is included.
