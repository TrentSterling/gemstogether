// Easing audit receipts: frame-stepped captures (manual clock, 1/60 s per frame) of the moments that used to snap.
// Runs one build; call it once per build you want to compare.
//   node tools/easing-audit.mjs <file.html> <label>     -> tools/out/easing/<label>/*.png + samples.json
// Scenes: swap (invalid swap + return), combo (plaque in, step punch, out), toast (in/out), float (score pop).
// performance.now() is pinned to a fake clock so the wall-clock UI (toasts) steps with the game clock.
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync, writeFileSync} from 'node:fs';
const file = process.argv[2] || 'index.html', label = process.argv[3] || 'after';
const out = `tools/out/easing/${label}`;
mkdirSync(out, {recursive: true});
const page = await launch({port: +(process.env.PORT || 9498), width: 1280, height: 800});
const J = 'window.__jewel';
const samples = {};
try {
  await page.goto(pathToFileURL(resolve(file)).href + '#solo=1');
  await page.front();
  await until(() => page.eval(`!!(${J}&&${J}.ready)`), {timeout: 60000, label: 'boot'});
  await page.eval(`document.getElementById('trontAbout')?.style.setProperty('display','none')`);
  await until(() => page.eval(`${J}.app.phase==='idle'`), {timeout: 30000, label: 'idle'});
  await sleep(300);
  // Manual clock for both the game (advance) and performance.now (toasts, pings).
  await page.eval(`(()=>{const base=performance.now();window.__fake=0;performance.now=()=>base+window.__fake;${J}.advance(0);
    const a=${J}.app;a.prefs.particles=false;a.living&&(a.living.motion=0);})()`);
  const step = () => page.eval(`(()=>{window.__fake+=1000/60;${J}.advance(1/60);return 1})()`);

  // Scene 1: invalid swap. Pick a horizontal neighbour pair near the middle whose swap makes no match.
  const pair = await page.eval(`(()=>{const a=${J}.app,b=a.board,legal=new Set(b.legalMoves().map(m=>m.join(',')));
    for(const i of [27,28,35,36,26,29,34,37,19,20,43,44]){const j=i+1;if(i%8<7&&!legal.has(i+','+j)&&b.cells[i].type!==b.cells[j].type)return [i,j];}return null})()`);
  const geo = await page.eval(`(()=>{const p=${J}.project(${pair[0]}),q=${J}.project(${pair[1]});return [p,q]})()`);
  samples.swap = {pair, geo, frames: []};
  const ids = await page.eval(`[${J}.app.getActor(${pair[0]}).tile.id,${J}.app.getActor(${pair[1]}).tile.id]`);
  await page.eval(`${J}.swap(${pair[0]},${pair[1]})`);
  for (let f = 0; f < 44; f++) {
    const s = await page.eval(`(()=>{const a=${J}.app,A=a.actors.get(${ids[0]}),B=a.actors.get(${ids[1]});return {t:+a.time.toFixed(4),phase:a.phase,ax:A.pos[0],ay:A.pos[1],az:A.pos[2],bx:B.pos[0],bz:B.pos[2],amove:A.move?.type||null}})()`);
    samples.swap.frames.push(s);
    await page.shot(`${out}/swap-${String(f).padStart(2, '0')}.png`);
    await step();
  }
  for (let f = 0; f < 30; f++) await step();

  // Scene 2: combo plaque. Same draw path as a real cascade: comboEnd + ui.lastCascade.
  samples.combo = {frames: []};
  await page.eval(`(()=>{const a=${J}.app;a.ui.lastCascade=2;a.comboEnd=a.time+.9;})()`);
  for (let f = 0; f < 90; f++) {
    if (f === 24) await page.eval(`(()=>{const a=${J}.app;a.ui.lastCascade=3;a.comboEnd=a.time+.6;})()`);
    const s = await page.eval(`(()=>{const a=${J}.app,u=a.ui;return {t:+a.time.toFixed(4),al:u.cE?u.cE.al:null,dx:u.cE?u.cE.dx:null,s:u.cE?u.cE.s:null,visible:!!(u.cOn||(a.comboEnd&&a.time<a.comboEnd))}})()`);
    samples.combo.frames.push(s);
    if (f % 2 === 0) await page.shot(`${out}/combo-${String(f / 2).padStart(2, '0')}.png`);
    await step();
  }

  // Scene 3: toast.
  samples.toast = {frames: []};
  await page.eval(`${J}.app.toast('No moves, reshuffling')`);
  for (let f = 0; f < 200; f++) {
    const keep = f < 20 || (f >= 160 && f < 190);
    if (keep && f % 2 === 0) await page.shot(`${out}/toast-${String(f).padStart(3, '0')}.png`);
    await step();
  }

  // Scene 4: score float.
  await page.eval(`(()=>{const a=${J}.app;a.floatText('+1,350',[0,-.3,.8]);})()`);
  for (let f = 0; f < 24; f++) { if (f % 2 === 0) await page.shot(`${out}/float-${String(f).padStart(2, '0')}.png`); await step(); }
  samples.floatAt = await page.eval(`${J}.project ? (()=>{const a=${J}.app;return project([0,-.3,.8],a.vp,a.cssWidth,a.cssHeight)})() : null`).catch(() => null);
  const d = await page.eval(`${J}.diagnostics()`);
  samples.errors = d.errors;
  writeFileSync(`${out}/samples.json`, JSON.stringify(samples));
  console.log(label, 'pair', pair, 'errors', JSON.stringify(d.errors));
} finally { page.kill(); }
