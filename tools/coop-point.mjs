// Co-op point ping check. Two real GPU Chromes on a PRIVATE room with a random code (never the public room):
// A boots solo (#solo=1) and hosts through the game's own Co-op Room flow (activate('coop-host') picks a random
// 5 char code), B opens #room=CODE. Once both are connected and synced, A right-clicks a gem with real CDP
// input and B must show A's point on the same cell within 3 s, with B's selected/grab untouched and the
// board hashes still matching.
//   node tools/coop-point.mjs [file-or-url]
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync} from 'node:fs';

const target = process.argv[2] || 'index.html';
const base = /^https?:/.test(target) ? target : pathToFileURL(resolve(target)).href;
const J = 'window.__jewel';
const portA = 9460 + Math.floor(Math.random() * 20) * 2, portB = portA + 1;
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); };
mkdirSync('tools/out', {recursive: true});

const net = page => page.eval(`(()=>{const n=${J}.net(),c=${J}.app.coop;return {mode:n.mode,role:n.role,code:n.code,connected:n.connected,synced:!!c.synced,hash:n.hash,publicRoom:!!c.publicRoom}})()`);
const guardPrivate = async (page, who) => { const n = await net(page); if (n.publicRoom || n.mode === 'public') throw new Error(`${who} is in the PUBLIC room, aborting`); return n; };

let A, B;
try {
  A = await launch({port: portA});
  await A.goto(base + '#solo=1');
  await until(() => A.eval(`!!(${J}&&${J}.ready)`), {timeout: 60000, label: 'A boot'});
  await sleep(1000);
  await guardPrivate(A, 'A');
  // The Co-op Room panel's "Host" button path.
  await A.eval(`(()=>{const a=${J}.app;a.openPanel('coop');a.ui.activate('coop-host');})()`);
  const code = await until(async () => { const n = await guardPrivate(A, 'A'); return n.role === 'host' && /^[A-Z2-9]{5}$/.test(n.code) && n.code; }, {timeout: 30000, label: 'A room code'});
  ok('A hosts a private room', (await net(A)).mode === 'private', 'code ' + code);

  B = await launch({port: portB});
  await B.goto(base + '#room=' + code);
  await until(() => B.eval(`!!(${J}&&${J}.ready)`), {timeout: 60000, label: 'B boot'});
  const t0 = Date.now();
  let connected = false;
  try {
    await until(async () => { const [a, b] = [await guardPrivate(A, 'A'), await guardPrivate(B, 'B')]; return a.connected && b.connected && b.synced; }, {timeout: 60000, every: 500, label: 'connection'});
    connected = true;
  } catch {}
  const [na, nb] = [await net(A), await net(B)];
  ok('A and B connected on the private room', connected && nb.code === code, `${((Date.now() - t0) / 1000).toFixed(1)}s A ${JSON.stringify(na)} B ${JSON.stringify(nb)}`);
  if (!connected) throw new Error('no connection');

  // Close the Co-op panels so the boards (and presence cues) are visible, then let the sync settle.
  await A.eval(`${J}.app.closePanel()`); await B.eval(`${J}.app.closePanel()`);
  await until(async () => (await net(A)).hash === (await net(B)).hash, {timeout: 10000, label: 'hash match'}).catch(() => {});
  const gi = 27, gp = await A.eval(`${J}.project(${gi})`);
  const bBefore = await B.eval(`(()=>{const a=${J}.app;return {selected:a.selected,grab:a.grab}})()`);
  await A.front();
  // Record A's outgoing cursor packet sizes: 44 bytes (old 11-float format) unless a point is live, so a tab
  // still on the unpatched build keeps every cursor/hover/selected/grab cue.
  await A.eval(`(()=>{const c=${J}.app.coop,o=c.sendCursorRaw;window.__sizes=[];c.sendCursorRaw=(b,t)=>{window.__sizes.push({n:b.byteLength,t:performance.now()});return o(b,t);};})()`);
  await A.mouse('mouseMoved', gp[0] - 30, gp[1], 'none', 0); await sleep(120);
  await A.mouse('mouseMoved', gp[0], gp[1], 'none', 0); await sleep(700);
  const pre = await A.eval(`window.__sizes.map(x=>x.n)`);
  ok('idle cursor packets stay 44 bytes', pre.length > 0 && pre.every(n => n === 44), JSON.stringify(pre));
  await A.eval(`window.__sizes.length=0`);
  await A.mouse('mousePressed', gp[0], gp[1], 'right');
  await sleep(30);
  await A.mouse('mouseReleased', gp[0], gp[1], 'right');
  const tp = Date.now();
  const pa = await A.eval(`${J}.points()`);
  ok('A right click makes a local point', pa.local && pa.local.i === gi, JSON.stringify(pa));
  let seen = null;
  try { seen = await until(async () => { const p = await B.eval(`${J}.points()`); return p.remote.find(r => r.i === gi) || null; }, {timeout: 3000, every: 50, label: 'remote point on B'}); } catch {}
  ok('B shows A\'s point on the same cell within 3 s', !!seen && seen.seq === pa.local.seq, `${Date.now() - tp}ms ${JSON.stringify(seen)}`);
  await sleep(250);
  await B.shot('tools/out/point-remote.png');
  await sleep(Math.max(0, 1300 - (Date.now() - tp)));
  await B.shot('tools/out/point-remote-mid.png');
  const bAfter = await B.eval(`(()=>{const a=${J}.app;return {selected:a.selected,grab:a.grab}})()`);
  ok('B selected/grab untouched', bAfter.selected === -1 && bAfter.grab === -1 && bBefore.selected === -1, `before ${JSON.stringify(bBefore)} after ${JSON.stringify(bAfter)}`);
  const [ha, hb] = [(await net(A)).hash, (await net(B)).hash];
  ok('board hashes match', ha === hb, `${ha} ${hb}`);
  await sleep(Math.max(0, 3200 - (Date.now() - tp)));
  const pb = await B.eval(`${J}.points()`);
  ok('remote point expires on B', pb.remote.length === 0, JSON.stringify(pb));
  await A.mouse('mouseMoved', gp[0] + 20, gp[1], 'none', 0); await sleep(300);
  const sz = await A.eval(`window.__sizes.map(x=>x.n)`);
  ok('point packets are 52 bytes only while live, then back to 44', sz.includes(52) && sz.at(-1) === 44 && sz.slice(sz.lastIndexOf(52) + 1).length > 0, JSON.stringify(sz));
  const errs = [...A.logs, ...B.logs].filter(l => /EXCEPTION/.test(l));
  ok('no exceptions', errs.length === 0, errs.join(' | ').slice(0, 200));
} catch (e) {
  ok('harness', false, e.message);
} finally {
  A?.kill(); B?.kill();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
