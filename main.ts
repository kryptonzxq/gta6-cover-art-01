// Vice Cover Studio — the gta6-cover-art-01 entry point (Node 22, standard
// library only).
//
// The app itself is the app/ directory beside this file: plain static files
// (app/index.html and its ES modules) that a desktop browser loads offline,
// with no library and no network request. This program is only the hand-in:
// it copies app/ and screenshots/ into the output directory and writes
// /output/dossier.json, the summary the judge reads, using the vendored
// make.fun library.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// and serve the app itself with:
//   node serve.ts        # then open http://localhost:8080

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The repository root: the directory this file lives in.
const here = fileURLToPath(new URL('.', import.meta.url));

// The grader writes to /output; a local run overrides it with
// MAKEFUN_OUTPUT_DIR.
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps mirror the scorer's own gates: more than 4 screenshots, or one
// over 256 KiB, would be refused; so would more than 993 files in app/, more
// than 48 MiB of app files in all, or a path under app/ over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
