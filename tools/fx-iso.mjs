// Isolate Resonance layers at a fixed flow/pulse: board idle, fx.frame() pinned, one shot per variant.
//   node tools/fx-iso.mjs   -> tools/out/iso-*.png
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const base = pathToFileURL(resolve(process.argv[2] || 'index.html')).href;
const page = await launch({port: 9489, width: 1280, height: 800});
try {
  await page.goto(base + '#solo=1');
  await page.front();
  await until(() => page.eval('!!(window.__jewel&&window.__jewel.ready)'), {timeout: 60000, label: 'boot'});
  await page.eval(`document.getElementById('trontAbout')?.style.setProperty('display','none')`);
  await sleep(1500);
  const FLOW = +(process.env.FLOW || 1.3), PULSE = +(process.env.PULSE || 0);
  const variants = {base: [0, 0, 0], field: [FLOW, PULSE, 7000], nofield: [FLOW, PULSE, 0]};
  for (const [name, [flow, pulse, count]] of Object.entries(variants)) {
    await page.eval(`(()=>{const f=window.__jewel.app.fx;f.flow=${flow};f.pulse=${pulse};f.target=[.2,1,.6];f.tint=[.2,1,.6];f.swirl=${+(process.env.SWIRL || 3)};
      f.frame=function(){this.field.mesh.count=${count};};})()`);
    await sleep(600);
    await page.shot(`tools/out/iso-${name}.png`);
  }
} finally { page.kill(); }
