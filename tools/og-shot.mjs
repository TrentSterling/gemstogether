// OG image candidates: solo boot, Showcase autoplay running, frames every EVERY ms.
// Writes tools/out/og-NN.png; copy the keeper to og-image.png and bump ?v= on the meta + games card.
//   W=1200 H=630 SHOTS=14 EVERY=450 BURST=1 node tools/og-shot.mjs [file-or-url]
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const target = process.argv[2] || 'index.html';
const base = /^https?:/.test(target) ? target : pathToFileURL(resolve(target)).href;
const W = +(process.env.W || 1200), H = +(process.env.H || 630);
const SHOTS = +(process.env.SHOTS || 14), EVERY = +(process.env.EVERY || 450), WARM = +(process.env.WARM || 3000);
const page = await launch({port: 9412, width: W, height: H});
try {
  await page.goto(base + '#solo=1');
  await page.front();
  await until(() => page.eval('!!(window.__jewel&&window.__jewel.ready)'), {timeout: 60000, label: 'boot'});
  await page.eval(`document.getElementById('trontAbout')?.style.setProperty('display','none')`);
  await page.eval('window.__jewel.showcase()');
  if (process.env.BURST === '1') await page.eval('window.__jewel.burst()');
  await sleep(WARM);
  for (let i = 0; i < SHOTS; i++) {
    await page.shot(`tools/out/og-${String(i).padStart(2, '0')}.png`);
    await sleep(EVERY);
  }
  console.log('shots', SHOTS, 'state', JSON.stringify(await page.eval('(({score,maxCascade,phase})=>({score,maxCascade,phase}))(window.__jewel.state())')));
  console.log('errors', page.logs.filter(l => /error|EXC/i.test(l)));
} finally { page.kill(); }
