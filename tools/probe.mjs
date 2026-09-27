// Boot probe: load the page solo (no public room), wait for ready, dump diagnostics, screenshot.
//   W=1200 H=630 node tools/probe.mjs [file-or-url]
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const target = process.argv[2] || 'index.html';
const base = /^https?:/.test(target) ? target : pathToFileURL(resolve(target)).href;
const W = +(process.env.W || 1280), H = +(process.env.H || 800);
const page = await launch({port: 9411, width: W, height: H});
try {
  await page.goto(base + '#solo=1');
  await page.front();
  await until(() => page.eval('!!(window.__jewel&&window.__jewel.ready)'), {timeout: 60000, label: 'boot'});
  await sleep(+(process.env.WAIT || 2500));
  console.log(JSON.stringify(await page.eval('window.__jewel.diagnostics()'), null, 1));
  console.log('hooks', await page.eval('Object.keys(window.__jewel).join(" ")'));
  await page.shot(`tools/out/probe-${W}x${H}.png`);
  console.log('logs', page.logs.slice(0, 20));
} finally { page.kill(); }
