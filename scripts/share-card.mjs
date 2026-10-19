/* global process */
// Renders the link-preview cards (Open Graph, 1200×630) that WhatsApp, Slack
// and the like show for tymebox.web.app: public/og-pt.png and public/og-en.png.
// Usage: yarn share-card   (needs Google Chrome installed)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const font = (pkg, file) =>
  pathToFileURL(join(root, 'node_modules/@fontsource-variable', pkg, 'files', file)).href;

const COPY = {
  pt: {
    lang: 'pt-BR',
    headline: 'Cada evento<b>,</b> <em>na sua caixa<b>.</b></em>',
    lede: 'Planeje marcos, rode o relógio e termine no horário.',
    left: 'restantes',
    pace: 'No ritmo',
    milestones: ['Abertura', 'Prioridades', 'Riscos e bloqueios'],
    now: 'agora',
  },
  en: {
    lang: 'en-US',
    headline: 'Every event<b>,</b> <em>inside its box<b>.</b></em>',
    lede: 'Plan milestones, run the clock and finish on time.',
    left: 'left',
    pace: 'On track',
    milestones: ['Opening', 'Priorities', 'Risks and blockers'],
    now: 'now',
  },
};

// The full symbol from src/features/brand/TymeboxSymbol.tsx.
const symbol = (frame, sand) => `<svg viewBox="0 0 100 100" width="64" height="64">
  <rect x="8" y="8" width="84" height="84" rx="20" fill="none" stroke="${frame}" stroke-width="7"/>
  <path d="M50 8V15M50 85V92M8 50H15M85 50H92" fill="none" stroke="${frame}" stroke-width="7" stroke-linecap="round"/>
  <circle cx="50" cy="50" r="28" fill="none" stroke="${frame}" stroke-width="4" stroke-dasharray="4.398 10.263" stroke-dashoffset="2.199"/>
  <path d="M39 33H61L50 50Z" fill="${frame}" fill-opacity="0.16" stroke="${frame}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M39 67H61L50 50Z" fill="${sand}" stroke="${frame}" stroke-width="5" stroke-linejoin="round"/>
</svg>`;

const check = `<svg viewBox="0 0 16 16" width="14" height="14"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const page = (c) => `<!doctype html>
<html lang="${c.lang}"><head><meta charset="utf-8"><style>
@font-face { font-family: Jakarta; src: url(${font('plus-jakarta-sans', 'plus-jakarta-sans-latin-wght-normal.woff2')}); font-weight: 200 800; }
@font-face { font-family: Mono; src: url(${font('jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2')}); font-weight: 100 800; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; overflow: hidden; }
body {
  font-family: Jakarta, system-ui, sans-serif; color: #fff;
  background:
    radial-gradient(900px 600px at 100% 0%, #3b82f6 0%, transparent 60%),
    radial-gradient(700px 500px at 0% 100%, #1d4ed8 0%, transparent 70%),
    #2563eb;
  display: grid; grid-template-columns: 1fr 430px; gap: 64px; align-items: center;
  padding: 0 84px;
}
.brand { display: flex; align-items: center; gap: 16px; font-size: 34px; font-weight: 800; letter-spacing: -0.02em; }
h1 { margin-top: 44px; font-size: 68px; line-height: 1.04; font-weight: 800; letter-spacing: -0.03em; text-wrap: balance; }
/* Jakarta's heavy weights leave a wide gap before punctuation. */
h1 b { margin-left: -0.1em; }
h1 em { font-style: normal; color: #fcd34d; }
p { margin-top: 26px; font-size: 27px; line-height: 1.4; color: #dbeafe; font-weight: 500; max-width: 560px; }
.url { margin-top: 40px; font-size: 22px; font-weight: 700; color: #bfdbfe; letter-spacing: 0.01em; }
.card {
  background: #fff; color: #0f172a; border-radius: 28px; padding: 34px 34px 30px;
  box-shadow: 0 30px 60px -20px rgba(15, 23, 42, 0.55), 0 0 0 1px rgba(255,255,255,0.4);
}
.time { font-family: Mono, monospace; font-size: 84px; font-weight: 700; letter-spacing: -0.04em; line-height: 1; }
.time s { text-decoration: none; margin: 0 -0.14em; }
.meta { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; font-size: 19px; color: #64748b; font-weight: 600; }
.pill { background: #ecfdf5; color: #047857; border-radius: 999px; padding: 6px 14px; font-size: 16px; font-weight: 700; }
.bar { margin-top: 22px; height: 10px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
.bar span { display: block; width: 58%; height: 100%; background: #2563eb; border-radius: 999px; }
ul { list-style: none; padding: 0; margin-top: 24px; display: grid; gap: 14px; }
li { white-space: nowrap; display: flex; align-items: center; gap: 14px; font-size: 21px; font-weight: 600; }
.box { width: 26px; height: 26px; border-radius: 8px; border: 2.5px solid #cbd5e1; display: grid; place-items: center; flex: none; }
.done .box { background: #2563eb; border-color: #2563eb; }
.done span { color: #94a3b8; text-decoration: line-through; text-decoration-thickness: 2px; }
.now { margin-left: auto; font-size: 15px; font-weight: 700; color: #b45309; background: #fef3c7; border-radius: 999px; padding: 4px 12px; text-transform: uppercase; letter-spacing: 0.06em; }
</style></head><body>
<div>
  <div class="brand">${symbol('#ffffff', '#fbbf24')}Tymebox</div>
  <h1>${c.headline}</h1>
  <p>${c.lede}</p>
  <div class="url">tymebox.web.app</div>
</div>
<div class="card">
  <div class="time">12<s>:</s>48</div>
  <div class="meta"><span>${c.left}</span><span class="pill">${c.pace}</span></div>
  <div class="bar"><span></span></div>
  <ul>
    <li class="done"><i class="box">${check}</i><span>${c.milestones[0]}</span></li>
    <li><i class="box"></i><span>${c.milestones[1]}</span><b class="now">${c.now}</b></li>
    <li><i class="box"></i><span>${c.milestones[2]}</span></li>
  </ul>
</div>
</body></html>`;

const work = mkdtempSync(join(tmpdir(), 'share-card-'));
for (const [lang, copy] of Object.entries(COPY)) {
  const html = join(work, `${lang}.html`);
  writeFileSync(html, page(copy));
  const out = join(root, 'public', `og-${lang}.png`);
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--allow-file-access-from-files',
      '--window-size=1200,630',
      '--virtual-time-budget=2000',
      `--screenshot=${out}`,
      pathToFileURL(html).href,
    ],
    { stdio: 'ignore' },
  );
  console.log('wrote', out);
}
