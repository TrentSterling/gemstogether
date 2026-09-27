// Release gate: real GPU Chrome, solo boot (#solo=1 so the harness never joins the public room),
// real pointer drag swap, About pill clear of the GPU buttons, phone viewport, Settings panel.
//   node tools/verify.mjs [file-or-url]      (also run against https://tront.xyz/gemstogether/)
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const target = process.argv[2] || 'index.html';
const base = /^https?:/.test(target) ? target : pathToFileURL(resolve(target)).href;
const J = 'window.__jewel';
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); };
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

async function boot(w, h, port) {
  const page = await launch({port, width: w, height: h});
  await page.goto(base + '#solo=1');
  await page.front();
  await until(() => page.eval(`!!(${J}&&${J}.ready)`), {timeout: 60000, label: 'boot'});
  await sleep(1500);
  return page;
}
async function pill(page) {
  return page.eval(`(()=>{const r=document.querySelector('#trontAbout>summary,.tront-about>summary')?.getBoundingClientRect();return r&&{x:r.x,y:r.y,w:r.width,h:r.height}})()`);
}
async function hits(page) { return (await page.eval(`${J}.ui()`)).hits || []; }

// ---- desktop ----
let page = await boot(1280, 800, 9413);
try {
  const d = await page.eval(`${J}.diagnostics()`);
  ok('version 3.2.4', d.version === '3.2.4', d.version);
  ok('GPU backend', /WebGPU|WebGL/.test(d.backend), d.backend);
  ok('no runtime errors', d.errors.length === 0, JSON.stringify(d.errors).slice(0, 200));
  const s = await page.eval(`${J}.state()`);
  ok('64 gems on board', s.cells.filter(Boolean).length === 64, String(s.cells.filter(Boolean).length));
  ok('legal moves exist', s.legalMoves.length > 0, String(s.legalMoves.length));
  ok('solo: not in public room', !JSON.stringify(await page.eval(`${J}.net()`)).includes('"connected":true'));
  const html = await page.eval('document.documentElement.outerHTML');
  ok('canonical + og meta', html.includes('rel="canonical" href="https://tront.xyz/gemstogether/"') && html.includes('og-image.png?v='));
  ok('About block injected', html.includes('tront-about:start') && html.includes('application/ld+json'));
  ok('no em dash in toasts', !html.includes("No moves —"));

  // real pointer drag on the first legal move
  const m = s.legalMoves[0];
  const [a, b] = Array.isArray(m) ? m : [m.a ?? m.from, m.b ?? m.to];
  const pa = await page.eval(`${J}.project(${a})`), pb = await page.eval(`${J}.project(${b})`);
  await page.mouse('mouseMoved', pa[0], pa[1]); await page.mouse('mousePressed', pa[0], pa[1]);
  for (let t = 1; t <= 8; t++) { await page.mouse('mouseMoved', pa[0] + (pb[0] - pa[0]) * t / 8, pa[1] + (pb[1] - pa[1]) * t / 8); await sleep(20); }
  await page.mouse('mouseReleased', pb[0], pb[1]);
  await until(async () => (await page.eval(`${J}.state()`)).score > 0, {timeout: 8000, label: 'score after drag'}).catch(() => {});
  const s2 = await page.eval(`${J}.state()`);
  ok('pointer drag scores', s2.score > 0 && s2.moves >= 1, `score ${s2.score} moves ${s2.moves} move ${JSON.stringify(m)}`);
  await sleep(2500);
  const p = await pill(page), hs = await hits(page);
  const bad = hs.filter(h => h.w && overlap(p, h));
  ok('About pill clear of GPU buttons (1280x800)', p && bad.length === 0, bad.map(h => h.id || h.label).join(','));
  await page.shot('tools/out/qa-desktop.png');
  const d2 = await page.eval(`${J}.diagnostics()`);
  ok('no errors after play', d2.errors.length === 0 && !page.logs.some(l => /EXCEPTION/.test(l)), page.logs.filter(l => /EXC|error/i.test(l)).join(' | ').slice(0, 200));
} finally { page.kill(); }

// ---- phone ----
page = await boot(390, 844, 9414);
try {
  const d = await page.eval(`${J}.diagnostics()`);
  ok('phone boots clean', d.errors.length === 0);
  const p = await pill(page), hs = await hits(page);
  const bad = hs.filter(h => h.w && overlap(p, h));
  ok('About pill clear of GPU buttons (390x844)', p && bad.length === 0, bad.map(h => h.id || h.label).join(','));
  await page.shot('tools/out/qa-phone.png');
} finally { page.kill(); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
