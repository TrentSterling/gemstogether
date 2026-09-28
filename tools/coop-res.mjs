// Co-op Resonance check (patch 11): two real browsers in a PRIVATE random room. Host and peer take turns making real
// legal moves; after each settles, both screens must show the same meter (fill) and credit the same player split
// (mine on one screen = theirs on the other).
//   node tools/coop-res.mjs [file-or-url]
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const target = process.argv[2] || 'index.html';
const base = /^https?:/.test(target) ? target : pathToFileURL(resolve(target)).href;
const J = 'window.__jewel', port = 9720 + Math.floor(Math.random() * 20) * 2;
const net = page => page.eval(`(()=>{const n=${J}.net(),c=${J}.app.coop;return {mode:n.mode,role:n.role,code:n.code,connected:n.connected,synced:!!c.synced,hash:n.hash,publicRoom:!!c.publicRoom}})()`);
const guard = async (page, who) => { const n = await net(page); if (n.publicRoom || n.mode === 'public') throw new Error(`${who} in PUBLIC room`); return n; };
const res = page => page.eval(`(()=>{const r=${J}.app.fx.res;return r?{fill:r.fill,mine:r.mine,theirs:r.theirs}:{fill:0,mine:0,theirs:0}})()`);
let A, B, pass = 0, fail = 0;
const ok = (n, c, i = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${i ? '  ' + i : ''}`); };
try {
  A = await launch({port}); await A.goto(base + '#solo=1');
  await until(() => A.eval(`!!(${J}&&${J}.ready)`), {timeout: 60000}); await sleep(800); await guard(A, 'A');
  await A.eval(`(()=>{const a=${J}.app;a.openPanel('coop');a.ui.activate('coop-host');})()`);
  const code = await until(async () => { const n = await guard(A, 'A'); return n.role === 'host' && /^[A-Z2-9]{5}$/.test(n.code) && n.code; }, {timeout: 30000});
  B = await launch({port: port + 1}); await B.goto(base + '#room=' + code);
  await until(() => B.eval(`!!(${J}&&${J}.ready)`), {timeout: 60000});
  await until(async () => { const [a, b] = [await guard(A, 'A'), await guard(B, 'B')]; return a.connected && b.connected && b.synced; }, {timeout: 60000, every: 500});
  await A.eval(`${J}.app.closePanel()`); await B.eval(`${J}.app.closePanel()`);
  const settle = () => until(async () => (await net(A)).hash === (await net(B)).hash && await A.eval(`${J}.app.phase==='idle'`) && await B.eval(`${J}.app.phase==='idle'`), {timeout: 20000, every: 300});
  await settle();
  for (let k = 0; k < 4; k++) {
    const P = k % 2 ? B : A;
    await P.eval(`(()=>{const m=${J}.app.board.legalMoves()[0];${J}.swap(m[0],m[1]);})()`);
    await sleep(600); await settle(); await sleep(300);
    const [ra, rb] = [await res(A), await res(B)];
    ok(`after move ${k + 1} (${k % 2 ? 'peer' : 'host'}): same meter on both screens`, ra.fill === rb.fill && ra.fill > 0, `A ${JSON.stringify(ra)} B ${JSON.stringify(rb)}`);
    ok(`after move ${k + 1}: contribution mirrors (A mine = B theirs)`, ra.mine === rb.theirs && ra.theirs === rb.mine);
  }
  ok('board hashes match', (await net(A)).hash === (await net(B)).hash);
  ok('no errors', !(await A.eval(`${J}.diagnostics()`)).errors.length && !(await B.eval(`${J}.diagnostics()`)).errors.length);
} finally { A?.kill(); B?.kill(); console.log(`${pass} passed, ${fail} failed`); }
