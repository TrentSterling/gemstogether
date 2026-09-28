// Alignment receipts: fires the frame light chase (fx.trace) and grabs the moment the corner flashes land, at several
// window sizes, then crops each corner around the TRUE projected centre of the corner orb (world [+-4.10, +-4.10,
// gem z]) so any perspective offset is visible. Also grabs the beat aura during a chain.
//   node tools/align-audit.mjs <file> <label>   -> tools/out/align/<label>-<w>x<h>.png + corners.json
import {launch, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync, writeFileSync} from 'node:fs';
const file = process.argv[2] || 'index.html', label = process.argv[3] || 'after';
const base = /^https?:/.test(file) ? file : pathToFileURL(resolve(file)).href;
mkdirSync('tools/out/align', {recursive: true});
const J = 'window.__jewel', out = {};
for (const [w, h] of [[1280, 800], [1920, 1080], [390, 844]]) {
  const page = await launch({port: 9780 + (w % 7), width: w, height: h});
  try {
    await page.goto(base + '#solo=1');
    await until(() => page.eval(`!!(${J}&&${J}.ready)`), {timeout: 60000});
    await page.eval(`document.getElementById('trontAbout')?.style.setProperty('display','none')`);
    await until(() => page.eval(`${J}.app.phase==='idle'`), {timeout: 30000});
    await page.eval(`(()=>{const b=performance.now();window.__fake=0;performance.now=()=>b+window.__fake;${J}.advance(0);const a=${J}.app;a.fx.trace([1,.82,.4],a.time,1);})()`);
    // Corner flashes are born at t + 4*dur (dur = .16 s at speed 1): step to just after.
    await page.eval(`(()=>{for(let i=0;i<42;i++){window.__fake+=1000/60;${J}.advance(1/60);}return 1})()`);
    const pts = await page.eval(`(()=>{const a=${J}.app;return [[-4.1,4.1,.30],[4.1,4.1,.30],[-4.1,-4.1,.40],[4.1,-4.1,.40]].map(p=>project(p,a.vp,a.cssWidth,a.cssHeight).slice(0,2))})()`);
    const f = `tools/out/align/${label}-${w}x${h}.png`;
    await page.shot(f);
    out[`${w}x${h}`] = {file: f, orbs: pts, dpr: await page.eval('devicePixelRatio')};
    console.log(label, w + 'x' + h, JSON.stringify(pts.map(p => p.map(Math.round))));
  } finally { page.kill(); }
}
writeFileSync(`tools/out/align/${label}-corners.json`, JSON.stringify(out));
