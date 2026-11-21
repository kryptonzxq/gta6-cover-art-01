# Vice Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/kryptonzxq/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/kryptonzxq/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns any photo and caption into Vice City-style
cover art, built for the
[make.fun bounty "Make GTA 6 Cover Art"](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Photo editor** — upload several photos (or drag & drop), click a panel to
  select it, drag inside it to reposition, zoom, replace or remove.
- **Multi-panel composer** — four genuinely different templates: Vice Grid,
  Sunset Strip, Hero Split and Quad.
- **Text editor** — editable title and subtitle, size, colour, outline and
  neon glow, with letter tracking.
- **Visual effects** — Vice City sunset grade, film grain, vignette, contrast,
  brightness and saturation.
- **Export** — exact PNG sizes 1080 × 1080, 1080 × 1350 and 1920 × 1080,
  downloaded straight from the browser.
- **Undo / redo / reset**, a sample project for first-time users, and four
  bundled sample photos. Everything runs offline from static files; photos
  never leave the machine.

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

Or open `app/index.html` directly in a desktop browser. No build step, no
dependencies, no network.

## Entry point

`main.ts` (Node 22) copies `app/` and `screenshots/` to `/output` and writes
`/output/dossier.json` via `vendor/makefun-app.ts` (copied unchanged from the
official kit).

## License

MIT, see LICENSE. All artwork, lettering and sample photos are original or
free to use; no Rockstar Games logo, artwork or font is included.
