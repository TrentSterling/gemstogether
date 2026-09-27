// Resonance FX look check: solo boot, Showcase autoplay, frames every EVERY ms with the fx() state per frame.
// FORCE=1 also fires a synthetic x6 cascade payoff (fireworks, nova, crown fountain) at the start.
//   SHOTS=24 EVERY=250 node tools/fx-shot.mjs [file-or-url]     -> tools/out/fx-NN.png
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const target = process.argv[2] || 'index.html';
const base = /^https?:/.test(target) ? target : pathToFileURL(resolve(target)).href;
const W = +(process.env.W || 1280), H = +(process.env.H || 800);
const SHOTS = +(process.env.SHOTS || 24), EVERY = +(process.env.EVERY || 250), WARM = +(process.env.WARM || 2500);
const page = await launch({port: +(process.env.PORT || 9488), width: W, height: H});
try {
  await page.goto(base + (process.env.WEBGL ? '?webgl' : '') + '#solo=1');
  await page.front();
  await until(() => page.eval('!!(window.__jewel&&window.__jewel.ready)'), {timeout: 60000, label: 'boot'});
  await page.eval(`document.getElementById('trontAbout')?.style.setProperty('display','none')`);
  await page.eval('window.__jewel.showcase()');
  await sleep(WARM);
  if (process.env.FORCE === '1') await page.eval(`(()=>{const a=window.__jewel.app;a.fx.match([0,0,.5],3,6,12,'prism',1.2,a.board.cells.slice(24,36).map((t,i)=>({at:24+i,tile:t})));a.fx.finish(6);})()`);
  for (let i = 0; i < SHOTS; i++) {
    const f = await page.eval('window.__jewel.fx()');
    await page.shot(`tools/out/fx-${String(i).padStart(2, '0')}.png`);
    console.log(String(i).padStart(2, '0'), JSON.stringify(f));
    await sleep(EVERY);
  }
  const d = await page.eval('window.__jewel.diagnostics()');
  console.log('backend', d.backend, 'errors', JSON.stringify(d.errors), 'logs', page.logs.filter(l => /error|EXC|warn/i.test(l)).slice(0, 8));
} finally { page.kill(); }
