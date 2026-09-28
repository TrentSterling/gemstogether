// Invalid-swap receipts in every mode the live site runs (patch 5). For one build:
//   solo       frame-stepped manual clock (1/60 s), positions + screenshots
//   co-op host two GPU Chromes on a PRIVATE random room (never the public one), real mouse drag on the host,
//              positions sampled every animation frame on both screens, plus a slow-motion screenshot run
//   co-op peer the same drag on the joining browser
//   node tools/swap-audit.mjs <file.html> <label>   -> tools/out/swap/<label>/ (samples.json + png)
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync, writeFileSync} from 'node:fs';

const file = process.argv[2] || 'index.html', label = process.argv[3] || 'after';
const base = pathToFileURL(resolve(file)).href;
const out = `tools/out/swap/${label}`;
mkdirSync(out, {recursive: true});
const J = 'window.__jewel';
const port0 = 9520 + Math.floor(Math.random() * 20) * 3;
const R = {label, file};

// A horizontal neighbour pair near the middle whose swap makes no match.
const PICK = `(()=>{const a=${J}.app,b=a.board,legal=new Set(b.legalMoves().flatMap(m=>[m.join(','),[m[1],m[0]].join(',')]));
  for(const i of [27,28,35,36,26,29,34,37,19,20,43,44,18,21,42,45]){const j=i+1;if(i%8<7&&!legal.has(i+','+j)&&b.cells[i]&&b.cells[j]&&b.cells[i].type!==b.cells[j].type&&!b.validSwap(i,j))return [i,j];}return null})()`;
const STATE = `(()=>{const a=${J}.app,c=a.coop,now=performance.now();return {phase:a.phase,toast:a.ui&&a.ui.toastUntil>now?a.ui.toastMessage:null,brackets:!!(c&&c.rejectUntil>now),pending:!!(c&&c.pending),moves:a.board.moves,score:a.board.score}})()`;
const REC = (i, j, ms) => `(()=>{const a=${J}.app,ia=a.board.cells[${i}].id,ib=a.board.cells[${j}].id,t0=performance.now();window.__rec=[];
  const f=()=>{const X=a.actors.get(ia),Y=a.actors.get(ib);window.__rec.push({t:performance.now()-t0,ax:X.pos[0],ay:X.pos[1],az:X.pos[2],bx:Y.pos[0],by:Y.pos[1],sx:X.scale?X.scale[0]:1,phase:a.phase,mv:X.move?X.move.type:null});if(performance.now()-t0<${ms})requestAnimationFrame(f);};requestAnimationFrame(f);return 1})()`;
const HOME = (i, j) => `[cellXY(${i}),cellXY(${j})]`;

async function drag(page, i, j) {
  const p = await page.eval(`${J}.project(${i})`), q = await page.eval(`${J}.project(${j})`);
  await page.mouse('mouseMoved', p[0], p[1], 'none', 0); await sleep(60);
  await page.mouse('mousePressed', p[0], p[1]); await sleep(40);
  for (let k = 1; k <= 4; k++) { await page.mouse('mouseMoved', p[0] + (q[0] - p[0]) * k / 4, p[1] + (q[1] - p[1]) * k / 4, 'left', 1); await sleep(16); }
  await page.mouse('mouseReleased', q[0], q[1]);
}

function judge(trace, home, name) {
  const [pa, pb] = home, cell = Math.abs(pb[0] - pa[0]) || 1;
  const reach = Math.max(...trace.map(s => (s.ax - pa[0]) / (pb[0] - pa[0])));
  let jump = 0;
  for (let k = 1; k < trace.length; k++) jump = Math.max(jump, Math.abs(trace[k].ax - trace[k - 1].ax) / cell);
  const last = trace[trace.length - 1];
  return {name, reach: +reach.toFixed(3), maxJump: +jump.toFixed(3), endsHome: Math.abs(last.ax - pa[0]) < .01 && !last.mv, samples: trace.length};
}

let S, A, B;
try {
  // ---- solo, frame stepped ----
  S = await launch({port: port0, width: 1280, height: 800});
  await S.goto(base + '#solo=1');
  await S.front();
  await until(() => S.eval(`!!(${J}&&${J}.ready)`), {timeout: 60000, label: 'solo boot'});
  await S.eval(`document.getElementById('trontAbout')?.style.setProperty('display','none')`);
  await until(() => S.eval(`${J}.app.phase==='idle'`), {timeout: 30000, label: 'solo idle'});
  await sleep(300);
  await S.eval(`(()=>{const base=performance.now();window.__fake=0;performance.now=()=>base+window.__fake;${J}.advance(0);const a=${J}.app;a.living&&(a.living.motion=0);})()`);
  const pair = await S.eval(PICK);
  if (!pair) throw new Error('no invalid pair on the solo board');
  const home = await S.eval(HOME(...pair));
  const ids = await S.eval(`[${J}.app.board.cells[${pair[0]}].id,${J}.app.board.cells[${pair[1]}].id]`);
  R.solo = {pair, home, geo: [await S.eval(`${J}.project(${pair[0]})`), await S.eval(`${J}.project(${pair[1]})`)], frames: []};
  await S.eval(`${J}.swap(${pair[0]},${pair[1]})`);
  for (let f = 0; f < 40; f++) {
    const s = await S.eval(`(()=>{const a=${J}.app,X=a.actors.get(${ids[0]}),Y=a.actors.get(${ids[1]});return {t:+a.time.toFixed(4),ax:X.pos[0],ay:X.pos[1],az:X.pos[2],bx:Y.pos[0],by:Y.pos[1],phase:a.phase,mv:X.move?X.move.type:null}})()`);
    R.solo.frames.push(s);
    await S.shot(`${out}/solo-${String(f).padStart(2, '0')}.png`);
    await S.eval(`(()=>{window.__fake+=1000/60;${J}.advance(1/60);return 1})()`);
  }
  R.solo.after = await S.eval(STATE);
  R.solo.verdict = judge(R.solo.frames, home, 'solo');
  R.solo.errors = (await S.eval(`${J}.diagnostics()`)).errors;
  S.kill(); S = null;

  // ---- co-op: A hosts a private room, B joins ----
  const net = page => page.eval(`(()=>{const n=${J}.net(),c=${J}.app.coop;return {mode:n.mode,role:n.role,code:n.code,connected:n.connected,synced:!!c.synced,hash:n.hash,publicRoom:!!c.publicRoom}})()`);
  const guard = async (page, who) => { const n = await net(page); if (n.publicRoom || n.mode === 'public') throw new Error(`${who} is in the PUBLIC room, aborting`); return n; };
  A = await launch({port: port0 + 1});
  await A.goto(base + '#solo=1');
  await until(() => A.eval(`!!(${J}&&${J}.ready)`), {timeout: 60000, label: 'A boot'});
  await sleep(800);
  await guard(A, 'A');
  await A.eval(`(()=>{const a=${J}.app;a.openPanel('coop');a.ui.activate('coop-host');})()`);
  const code = await until(async () => { const n = await guard(A, 'A'); return n.role === 'host' && /^[A-Z2-9]{5}$/.test(n.code) && n.code; }, {timeout: 30000, label: 'room code'});
  B = await launch({port: port0 + 2});
  await B.goto(base + '#room=' + code);
  await until(() => B.eval(`!!(${J}&&${J}.ready)`), {timeout: 60000, label: 'B boot'});
  await until(async () => { const [a, b] = [await guard(A, 'A'), await guard(B, 'B')]; return a.connected && b.connected && b.synced; }, {timeout: 60000, every: 500, label: 'connection'});
  await A.eval(`${J}.app.closePanel()`); await B.eval(`${J}.app.closePanel()`);
  for (const P of [A, B]) await P.eval(`document.getElementById('trontAbout')?.style.setProperty('display','none')`);
  await until(async () => (await net(A)).hash === (await net(B)).hash && await A.eval(`${J}.app.phase==='idle'`), {timeout: 15000, label: 'sync settle'});
  await sleep(500);
  R.coop = {code};

  for (const [who, P, Q] of [['host', A, B], ['peer', B, A]]) {
    await until(async () => (await net(A)).hash === (await net(B)).hash && await P.eval(`${J}.app.phase==='idle'`) && await Q.eval(`${J}.app.phase==='idle'`), {timeout: 15000, label: who + ' idle'});
    const pr = await P.eval(PICK);
    if (!pr) throw new Error('no invalid pair for ' + who);
    const hm = await P.eval(HOME(...pr));
    await P.front();
    await P.eval(REC(...pr, 900)); await Q.eval(REC(...pr, 900));
    await drag(P, ...pr);
    await sleep(140);
    const during = await P.eval(STATE);
    await sleep(900);
    const trace = await P.eval('window.__rec'), other = await Q.eval('window.__rec');
    const [na, nb] = [await net(A), await net(B)];
    R.coop[who] = {pair: pr, home: hm, trace, other, during, after: await P.eval(STATE),
      verdict: judge(trace, hm, 'co-op ' + who), otherMoved: Math.max(...other.map(s => Math.abs(s.ax - hm[0][0]))) > .02,
      hashesMatch: na.hash === nb.hash, errors: (await P.eval(`${J}.diagnostics()`)).errors};
    // Slow-motion look: the host's anim speed is shared, so both screens run at .2x; screenshots as fast as CDP allows.
    await until(async () => await P.eval(`${J}.app.phase==='idle'`) && await Q.eval(`${J}.app.phase==='idle'`), {timeout: 15000, label: who + ' idle 2'});
    const pr2 = await P.eval(PICK);
    if (pr2) {
      await A.eval(`${J}.app.animSpeed=.2`); await sleep(400);
      R.coop[who].shotPair = pr2;
      R.coop[who].geo = [await P.eval(`${J}.project(${pr2[0]})`), await P.eval(`${J}.project(${pr2[1]})`)];
      await drag(P, ...pr2);
      const t0 = Date.now(); let n = 0;
      while (Date.now() - t0 < 2900) { await P.shot(`${out}/${who}-${String(n++).padStart(2, '0')}.png`); }
      R.coop[who].shots = n;
      await A.eval(`${J}.app.animSpeed=1`); await sleep(600);
    }
  }
  console.log(JSON.stringify({label, solo: R.solo.verdict, soloAfter: R.solo.after, host: R.coop.host.verdict, hostDuring: R.coop.host.during, hostOtherMoved: R.coop.host.otherMoved, peer: R.coop.peer.verdict, peerDuring: R.coop.peer.during, peerOtherMoved: R.coop.peer.otherMoved, hashes: [R.coop.host.hashesMatch, R.coop.peer.hashesMatch], errors: [R.solo.errors, R.coop.host.errors, R.coop.peer.errors]}, null, 1));
} finally {
  writeFileSync(`${out}/samples.json`, JSON.stringify(R));
  S?.kill(); A?.kill(); B?.kill();
}
