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
  } else if (scene === 'showcase') {
    await page.eval(`${J}.showcase()`);
  }
  const frames = Math.round(+secs * 30);
  for (let f = 0; f < frames; f++) {
    await page.shot(`${dir}/${String(f).padStart(3, '0')}.png`);
    const s = await page.eval(`(()=>{const a=${J}.app;return {t:+a.time.toFixed(3),phase:a.phase,cascade:a.cascade,score:a.board.score}})()`);
    log.push(s);
    await step(2);
  }
  const d = await page.eval(`${J}.diagnostics()`);
  writeFileSync(`${dir}/log.json`, JSON.stringify({log, errors: d.errors, maxCascade: await page.eval(`${J}.app.maxCascadeSeen`)}));
  console.log(name, 'frames', frames, 'maxCascade', await page.eval(`${J}.app.maxCascadeSeen`), 'errors', JSON.stringify(d.errors));
} finally { page.kill(); }
const ff = process.env.FFMPEG || 'ffmpeg';
const out = `tools/out/clips/${name}`;
execFileSync(ff, ['-y', '-loglevel', 'error', '-framerate', '30', '-i', `${dir}/%03d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', `${out}.mp4`]);
execFileSync(ff, ['-y', '-loglevel', 'error', '-framerate', '30', '-i', `${dir}/%03d.png`, '-vf', 'fps=20,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192[p];[b][p]paletteuse=dither=sierra2_4a', `${out}.gif`]);
console.log('wrote', `${out}.mp4`, `${out}.gif`);
