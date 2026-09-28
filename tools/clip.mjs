// Frame-stepped clips for before/after receipts. Manual clock (game + performance.now), so every build
// renders the same moments at an exact 30 fps no matter how slow capture is. Solo only (#solo=1).
//   node tools/clip.mjs <file|url> <label> [scene=cascade] [seconds=6]
//   scenes: cascade (the drop's deterministic nine-wave fixture), swap (an illegal swap), showcase
// -> tools/out/clips/<label>-<scene>/NNN.png, <label>-<scene>.mp4, <label>-<scene>.gif
import {launch, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const [file = 'index.html', label = 'after', scene = 'cascade', secs = '6'] = process.argv.slice(2);
const base = /^https?:/.test(file) ? file : pathToFileURL(resolve(file)).href;
const name = `${label}-${scene}`, dir = `tools/out/clips/${name}`;
rmSync(dir, {recursive: true, force: true});
mkdirSync(dir, {recursive: true});
const J = 'window.__jewel', W = +(process.env.W || 1280), H = +(process.env.H || 800);
const page = await launch({port: +(process.env.PORT || 9610), width: W, height: H});
const log = [];
let tour = false, padScript = null, padMove = null;
try {
  await page.goto(base + (process.env.WEBGL ? '?webgl' : '') + '#solo=1');
  await page.front();
  await until(() => page.eval(`!!(${J}&&${J}.ready)`), {timeout: 60000, label: 'boot'});
  await page.eval(`document.getElementById('trontAbout')?.style.setProperty('display','none')`);
  await until(() => page.eval(`${J}.app.phase==='idle'`), {timeout: 30000, label: 'idle'});
  await page.eval(`(()=>{const b=performance.now();window.__fake=0;performance.now=()=>b+window.__fake;${J}.advance(0);})()`);
  const step = n => page.eval(`(()=>{for(let i=0;i<${n};i++){window.__fake+=1000/60;${J}.advance(1/60);}return 1})()`);
  if (scene === 'cascade') {
    await page.eval(`${J}.fixture('cascade')`);
  } else if (scene === 'swap') {
    await step(30);
    await page.eval(`(()=>{const a=${J}.app,b=a.board,legal=new Set(b.legalMoves().flatMap(m=>[m.join(','),[m[1],m[0]].join(',')]));
      for(const i of [27,28,35,36,26,29,34,37]){const j=i+1;if(!legal.has(i+','+j)&&b.cells[i].type!==b.cells[j].type)return ${J}.swap(i,j);}})()`);
  } else if (scene === 'stage') {
    // Sit just under the first stage line (5,000) and play a real legal move across it.
    await page.eval(`(()=>{const a=${J}.app;a.board.score=4970;a.displayScore=4970;})()`);
    await step(20);
    await page.eval(`(()=>{const m=${J}.app.board.legalMoves()[0];return ${J}.swap(m[0],m[1])})()`);
  } else if (scene === 'tour') {
    // All six journey stages: jump the score to each stage line every 2 s (drives the real stage shows).
    tour = true;
  } else if (scene === 'pad') {
    // A scripted standard gamepad (navigator.getGamepads is replaced; real Gamepad objects cannot be made).
    await page.eval(`(()=>{window.__rumbles=[];window.__pad={id:'Scripted standard gamepad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],
      buttons:Array.from({length:17},()=>({pressed:false,value:0})),vibrationActuator:{playEffect:(t,o)=>{window.__rumbles.push(o);return Promise.resolve('complete');}}};
      navigator.getGamepads=()=>[window.__pad];})()`);
    const plan = await page.eval(`(()=>{const a=${J}.app,m=a.board.legalMoves()[0],start=a.keyboardCell;return {m,start}})()`);
    const [i, j] = plan.m, taps = [];
    let cx = plan.start % 8, cy = plan.start / 8 | 0; const tx = i % 8, ty = i / 8 | 0;
    while (cx !== tx) { taps.push(cx < tx ? 15 : 14); cx += cx < tx ? 1 : -1; }
    while (cy !== ty) { taps.push(cy < ty ? 13 : 12); cy += cy < ty ? 1 : -1; }
    const toward = j === i + 1 ? 15 : j === i - 1 ? 14 : j > i ? 13 : 12;
    padScript = [];
    let f0 = 12;
    for (const b of taps) { padScript.push([f0, b, true], [f0 + 2, b, false]); f0 += 4; }
    padScript.push([f0 + 4, 0, true], [f0 + 7, toward, true], [f0 + 9, toward, false], [f0 + 10, 0, false]);
    padScript.push([f0 + 80, 2, true], [f0 + 82, 2, false], [f0 + 100, 3, true], [f0 + 102, 3, false]);
    padMove = plan;
  } else if (scene === 'showcase') {
    await page.eval(`${J}.showcase()`);
  }
  const frames = Math.round(+secs * 30);
  for (let f = 0; f < frames; f++) {
    if (padScript) for (const [pf, pb, pv] of padScript) if (pf === f) await page.eval(`(()=>{const b=window.__pad.buttons[${pb}];b.pressed=${pv};b.value=${pv ? 1 : 0};})()`);
    if (tour && f % 60 === 10) await page.eval(`(()=>{const a=${J}.app,k=${Math.floor(f / 60) + 1},s=5000*k*(k+1)/2+10;a.board.score=s;a.displayScore=s;})()`);
    await page.shot(`${dir}/${String(f).padStart(3, '0')}.png`);
    const s = await page.eval(`(()=>{const a=${J}.app;return {t:+a.time.toFixed(3),phase:a.phase,cascade:a.cascade,score:a.board.score,flow:a.fx?+a.fx.flow.toFixed(3):0,laser:a.fx?+(a.fx.laser||0).toFixed(3):0}})()`);
    log.push(s);
    await step(2);
  }
  const d = await page.eval(`${J}.diagnostics()`);
  const pad = padScript ? await page.eval(`({rumbles:window.__rumbles.length,strongest:Math.max(0,...window.__rumbles.map(r=>r.strongMagnitude)),moves:${J}.app.board.moves,score:${J}.app.board.score,cursor:${J}.app.keyboardCell,point:${J}.points().local,hint:${J}.app.hintCells.length})`) : null;
  if (pad) console.log('pad', JSON.stringify({...pad, move: padMove}));
  writeFileSync(`${dir}/log.json`, JSON.stringify({log, pad, errors: d.errors, maxCascade: await page.eval(`${J}.app.maxCascadeSeen`)}));
  console.log(name, 'frames', frames, 'maxCascade', await page.eval(`${J}.app.maxCascadeSeen`), 'errors', JSON.stringify(d.errors));
} finally { page.kill(); }
const ff = process.env.FFMPEG || 'ffmpeg';
const out = `tools/out/clips/${name}`;
execFileSync(ff, ['-y', '-loglevel', 'error', '-framerate', '30', '-i', `${dir}/%03d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', `${out}.mp4`]);
execFileSync(ff, ['-y', '-loglevel', 'error', '-framerate', '30', '-i', `${dir}/%03d.png`, '-vf', 'fps=20,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192[p];[b][p]paletteuse=dither=sierra2_4a', `${out}.gif`]);
console.log('wrote', `${out}.mp4`, `${out}.gif`);
