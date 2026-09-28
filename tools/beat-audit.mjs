// Beat-snap receipts (patch 12). Real-time session with audio running: plays real moves for ~12 s, logs every sound
// the game schedules (drop SFX via JewelAudio.play, plus the music grid), then reports where each result sound lands
// relative to the 1/32 grid of the soundtrack. Snapped sounds sit at phase ~0; unsnapped ones spread evenly.
//   node tools/beat-audit.mjs <file> <label>   -> tools/out/beat/<label>.json
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync, writeFileSync} from 'node:fs';
const file = process.argv[2] || 'index.html', label = process.argv[3] || 'after';
const base = /^https?:/.test(file) ? file : pathToFileURL(resolve(file)).href;
mkdirSync('tools/out/beat', {recursive: true});
const J = 'window.__jewel';
const page = await launch({port: 9680, width: 1280, height: 800});
try {
  await page.goto(base + '#solo=1');
  await page.front();
  await until(() => page.eval(`!!(${J}&&${J}.ready)`), {timeout: 60000, label: 'boot'});
  const p = await page.eval(`${J}.project(0)`);
  await page.mouse('mousePressed', p[0], p[1]); await page.mouse('mouseReleased', p[0], p[1]);
  await until(() => page.eval(`!!(${J}.app.music&&${J}.app.music.ctx&&${J}.app.music.next)`), {timeout: 15000, label: 'music live'});
  // Measure the real scheduled start of every SFX voice: AudioBufferSourceNode.start(when) is what the ear hears.
  await page.eval(`(()=>{const a=${J}.app,au=a.audio,names=new Map();for(const [k,v] of Object.entries(au.buffers))for(const b of [].concat(v))names.set(b,k);
    window.__on=[];const st=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(when=0,...r){const k=names.get(this.buffer);if(k){const m=a.music;window.__on.push({k,when:Math.max(when,this.context.currentTime),next:m.next,bpm:m.bpm,now:this.context.currentTime});}return st.call(this,when,...r);};})()`);
  const t0 = Date.now();
  while (Date.now() - t0 < 12000) {
    await page.eval(`(()=>{const a=${J}.app;if(a.phase==='idle'){const m=a.board.legalMoves();if(m.length){const q=m[(a.board.moves*5)%m.length];${J}.swap(q[0],q[1]);}}})()`);
    await sleep(120);
  }
  const on = await page.eval('window.__on');
  const snapped = await page.eval(`!!${J}.app.audio.snapHooked`);
  const rows = on.map(o => { const g = 60 / o.bpm / 8; return {k: o.k, phase: ((((o.when - o.next) / g) % 1) + 1) % 1, wait: o.when - o.now}; });
  const res = rows.filter(r => !['tick', 'whoosh', 'reject', 'land'].includes(r.k));
  const bins = Array(10).fill(0);
  for (const r of res) bins[Math.min(9, Math.floor((r.phase > .95 ? 0 : r.phase) * 10))]++;
  const onGrid = res.filter(r => r.phase < .05 || r.phase > .95).length;
  const out = {label, snapped, sounds: on.length, result: res.length, onGrid, bins, maxWaitMs: Math.round(Math.max(0, ...res.map(r => r.wait)) * 1000), errors: (await page.eval(`${J}.diagnostics()`)).errors};
  writeFileSync(`tools/out/beat/${label}.json`, JSON.stringify(out));
  console.log(JSON.stringify(out));
} finally { page.kill(); }
