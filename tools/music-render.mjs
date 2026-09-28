// Offline receipts for the Resonance music (patch 7). Renders the real ResonanceMusic scheduler inside the
// built page with an OfflineAudioContext, so the audio is exactly what the game schedules, then:
//   journey: a 60 s scripted flow curve (calm -> warm -> hot -> x5 lasers -> cool down) -> .wav/.m4a + spectrogram
//   clip:    the flow/laser/cascade curve logged by tools/clip.mjs for <clip> -> muxed under that clip's mp4
// Also checks the live path: after a real pointer gesture the realtime scheduler must be producing notes.
//   node tools/music-render.mjs [file] [clip=r2-cascade]
import {launch, sleep, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync, readFileSync, writeFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const file = process.argv[2] || 'index.html', clip = process.argv[3] || 'r2-cascade';
const base = /^https?:/.test(file) ? file : pathToFileURL(resolve(file)).href;
const out = 'tools/out/music';
mkdirSync(out, {recursive: true});
const J = 'window.__jewel';
const page = await launch({port: 9640, width: 1280, height: 800});
const render = async (name, secs, curve) => {
  const b64 = await page.eval(`(async()=>{const sr=32000,secs=${secs},c=new OfflineAudioContext(1,sr*secs,sr),m=new ResonanceMusic(${J}.app);
    const curve=${JSON.stringify(curve)};const fn=t=>{let i=Math.min(curve.length-1,Math.max(0,Math.floor(t*curve.rate)));return curve.pts[i]};
    m.render(c,secs,fn,${J}.app.audio.key||62);const buf=await c.startRendering(),x=buf.getChannelData(0);
    let peak=0;for(const v of x)peak=Math.max(peak,Math.abs(v));const k=peak>0.98?0.98/peak:1;const pcm=new Int16Array(x.length);for(let i=0;i<x.length;i++)pcm[i]=Math.max(-32767,Math.min(32767,x[i]*k*32767));
    const hdr=new DataView(new ArrayBuffer(44)),w=(o,s)=>{for(let i=0;i<4;i++)hdr.setUint8(o+i,s.charCodeAt(i))};w(0,'RIFF');hdr.setUint32(4,36+pcm.byteLength,true);w(8,'WAVE');w(12,'fmt ');hdr.setUint32(16,16,true);hdr.setUint16(20,1,true);hdr.setUint16(22,1,true);hdr.setUint32(24,sr,true);hdr.setUint32(28,sr*2,true);hdr.setUint16(32,2,true);hdr.setUint16(34,16,true);w(36,'data');hdr.setUint32(40,pcm.byteLength,true);
    const all=new Uint8Array(44+pcm.byteLength);all.set(new Uint8Array(hdr.buffer),0);all.set(new Uint8Array(pcm.buffer),44);let s='';for(let i=0;i<all.length;i+=32768)s+=String.fromCharCode.apply(null,all.subarray(i,i+32768));
    window.__peak=peak;window.__notes=m.stats.notes;return btoa(s);})()`);
  writeFileSync(`${out}/${name}.wav`, Buffer.from(b64, 'base64'));
  const info = {peak: await page.eval('window.__peak'), notes: await page.eval('window.__notes')};
  console.log(name, secs + 's', JSON.stringify(info));
  return info;
};
const R = {};
try {
  await page.goto(base + '#solo=1');
  await page.front();
  await until(() => page.eval(`!!(${J}&&${J}.ready)`), {timeout: 60000, label: 'boot'});
  // Journey: 60 s at 10 Hz. flow ramps like a real session; a x5 chain at 30-40 s turns the lasers on.
  const pts = [];
  for (let i = 0; i < 600; i++) { const t = i / 10;
    const flow = t < 8 ? 0 : t < 20 ? (t - 8) / 12 * .5 : t < 30 ? .5 + (t - 20) / 10 * .6 : t < 42 ? 1.3 : Math.max(0, 1.3 - (t - 42) * .08);
    pts.push({flow, laser: t >= 30 && t < 42 ? 1.2 : 0, cascade: t >= 26 && t < 42 ? Math.min(9, 2 + Math.floor((t - 26) / 1.8)) : 0}); }
  R.journey = await render('journey', 60, {rate: 10, length: pts.length, pts});
  // Clip-synced: the logged state of the clip (30 fps).
  const logf = `tools/out/clips/${clip}/log.json`;
  if (existsSync(logf)) {
    const L = JSON.parse(readFileSync(logf, 'utf8')).log;
    const cpts = L.map(s => ({flow: s.flow || 0, laser: s.laser || 0, cascade: s.phase === 'idle' ? 0 : s.cascade}));
    R.clip = await render(clip, L.length / 30, {rate: 30, length: cpts.length, pts: cpts});
  }
  // Live path: a real gesture starts audio; the realtime scheduler must produce notes.
  const p = await page.eval(`${J}.project(0)`);
  await page.mouse('mousePressed', p[0], p[1]); await page.mouse('mouseReleased', p[0], p[1]);
  await sleep(2500);
  R.live = await page.eval(`${J}.music()`);
  R.errors = (await page.eval(`${J}.diagnostics()`)).errors;
  console.log('live', JSON.stringify(R.live), 'errors', JSON.stringify(R.errors));
} finally { page.kill(); }
writeFileSync(`${out}/music.json`, JSON.stringify(R));
const ff = 'ffmpeg', q = ['-y', '-loglevel', 'error'];
execFileSync(ff, [...q, '-i', `${out}/journey.wav`, '-c:a', 'aac', '-b:a', '160k', `${out}/journey.m4a`]);
execFileSync(ff, [...q, '-i', `${out}/journey.wav`, '-lavfi', 'showspectrumpic=s=1200x360:legend=1:scale=log:color=intensity', `${out}/journey-spectrum.png`]);
execFileSync(ff, [...q, '-i', `${out}/journey.wav`, '-filter_complex', 'showwavespic=s=1200x160:colors=#6fe3a1', '-frames:v', '1', `${out}/journey-wave.png`]);
if (R.clip && existsSync(`tools/out/clips/${clip}.mp4`)) {
  execFileSync(ff, [...q, '-i', `tools/out/clips/${clip}.mp4`, '-i', `${out}/${clip}.wav`, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', `tools/out/clips/${clip}-music.mp4`]);
  console.log('wrote', `tools/out/clips/${clip}-music.mp4`);
}
console.log('wrote', `${out}/journey.m4a`, `${out}/journey-spectrum.png`);
