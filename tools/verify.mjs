// Release gate: real GPU Chrome, solo boot (#solo=1 so the harness never joins the public room),
// real pointer drag swap, About pill clear of the GPU buttons, phone viewport, Settings panel.
//   node tools/verify.mjs [file-or-url] [expected-version]  (also run against https://tront.xyz/gemstogether/)
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const target = process.argv[2] || 'index.html';
const expectedVersion = process.argv[3] || process.env.EXPECT_VERSION || '3.3.6';
const base = /^https?:/.test(target) ? target : pathToFileURL(resolve(target)).href;
const J = 'window.__jewel';
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); };
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

async function boot(w, h, port) {
  const page = await launch({port, width: w, height: h});
  try {
  await page.goto(base + '#solo=1');
  await page.front();
  await until(() => page.eval(`!!(${J}&&${J}.ready)`), {timeout: 60000, label: 'boot'});
  await sleep(1500);
  return page;
  } catch (error) { page.kill(); throw error; }
}
async function pill(page) {
  return page.eval(`(()=>{const r=document.querySelector('#trontAbout>summary,.tront-about>summary')?.getBoundingClientRect();return r&&{x:r.x,y:r.y,w:r.width,h:r.height}})()`);
}
async function hits(page) { return (await page.eval(`${J}.ui()`)).hits || []; }

// ---- desktop ----
let page = await boot(1280, 800, 9476);
try {
  const d = await page.eval(`${J}.diagnostics()`);
  ok('version ' + expectedVersion, d.version === expectedVersion, d.version);
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

  // right-click regression: a real right click on a gem must not open Chrome's native
  // "Save image as / Inspect" menu (contextmenu defaultPrevented) and must not grab/select/score.
  // Capture listener (first) counts events; bubble listener registered LAST sees the final state.
  await page.eval(`(()=>{const r=window.__ctx={fired:0,prevented:[],targets:[]};
    window.addEventListener('contextmenu',e=>{r.fired++;r.targets.push(e.target?.id||e.target?.tagName||'?');},true);
    setTimeout(()=>window.addEventListener('contextmenu',e=>r.prevented.push(e.defaultPrevented),false),0);})()`);
  await sleep(50);
  const probe = `(()=>{const a=${J}.app,s=${J}.state();return {score:s.score,moves:s.moves,phase:s.phase,selected:a.selected,grab:a.grab,down:!!a.down,panel:!!a.panelOpen}})()`;
  const rightClick = async (x, y) => {
    await page.mouse('mouseMoved', x, y, 'none', 0);
    await page.mouse('mousePressed', x, y, 'right');
    await sleep(30);
    await page.mouse('mouseReleased', x, y, 'right');
    await sleep(250);
  };
  const gi = 27, gp = await page.eval(`${J}.project(${gi})`);
  const before = await page.eval(probe);
  await rightClick(gp[0], gp[1]);
  const c1 = await page.eval('window.__ctx'), after = await page.eval(probe);
  ok('right click on gem fires contextmenu', c1.fired >= 1, `fired ${c1.fired} target ${c1.targets.join(',')}`);
  ok('right click on gem: native menu suppressed', c1.prevented.length >= 1 && c1.prevented.every(Boolean), JSON.stringify(c1.prevented));
  ok('right click on gem: no grab/select/score', after.selected === before.selected && after.grab < 0 && !after.down && after.score === before.score && after.moves === before.moves,
    `before ${JSON.stringify(before)} after ${JSON.stringify(after)}`);
  // point ping: the same right press drops a local point marker on that gem (nothing else changes).
  const pt1 = await page.eval(`${J}.points()`);
  ok('right click on gem creates local point', pt1.local && pt1.local.i === gi && pt1.local.age < 1500, JSON.stringify(pt1));
  const pointAt = Date.now();
  await page.shot('tools/out/qa-point.png');
  const btn = (await hits(page)).find(h => h.kind === 'button' && h.w > 4 && h.h > 4);
  if (btn) {
    const seqBefore = (await page.eval(`${J}.points()`)).local?.seq;
    await page.eval(`window.__ctx.fired=0;window.__ctx.prevented=[];window.__ctx.targets=[]`);
    const b0 = await page.eval(probe);
    await rightClick(btn.x + btn.w / 2, btn.y + btn.h / 2);
    const c2 = await page.eval('window.__ctx'), b1 = await page.eval(probe);
    ok(`right click on GPU button '${btn.id}': native menu suppressed`, c2.fired >= 1 && c2.prevented.every(Boolean) && c2.prevented.length >= 1,
      `fired ${c2.fired} target ${c2.targets.join(',')} prevented ${JSON.stringify(c2.prevented)}`);
    ok(`right click on GPU button '${btn.id}': does not activate`, b1.panel === b0.panel && b1.score === b0.score && b1.moves === b0.moves, `before ${JSON.stringify(b0)} after ${JSON.stringify(b1)}`);
    const seqAfter = (await page.eval(`${J}.points()`)).local?.seq;
    ok(`right click on GPU button '${btn.id}': no point`, seqAfter === seqBefore, `seq ${seqBefore} -> ${seqAfter}`);
  } else ok('GPU button hit region found for right-click check', false, 'no button hits');

  await sleep(Math.max(0, 3000 - (Date.now() - pointAt)));
  const pt2 = await page.eval(`${J}.points()`);
  ok('point expires after ~3 s', pt2.local === null, JSON.stringify(pt2));

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
  const bad = hs.filter(h => p && h.w && overlap(p, h));
  ok('About pill clear of GPU buttons (1280x800)', p && bad.length === 0, bad.map(h => h.id || h.label).join(','));
  await page.shot('tools/out/qa-desktop.png');
  const d2 = await page.eval(`${J}.diagnostics()`);
  ok('no errors after play', d2.errors.length === 0 && !page.logs.some(l => /EXCEPTION/.test(l)), page.logs.filter(l => /EXC|error/i.test(l)).join(' | ').slice(0, 200));
} finally { page.kill(); }

// ---- phone ----
page = await boot(390, 844, 9477);
try {
  const d = await page.eval(`${J}.diagnostics()`);
  ok('phone boots clean', d.errors.length === 0);
  const p = await pill(page), hs = await hits(page);
  const bad = hs.filter(h => p && h.w && overlap(p, h));
  ok('About pill clear of GPU buttons (390x844)', p && bad.length === 0, bad.map(h => h.id || h.label).join(','));
  await page.shot('tools/out/qa-phone.png');
} finally { page.kill(); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
