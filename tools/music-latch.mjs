// Layer-latch receipts (patch 18). Renders the real in-page ResonanceMusic offline over one scripted burst
// (warm up, a hot chain with x5 lasers, then the board goes quiet) and logs every layer level per beat by wrapping
// play(), so it works on builds before and after the latch.
//   node tools/music-latch.mjs <file> <label>   -> tools/out/music/latch-<label>.json + .wav
import {launch, until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync, writeFileSync} from 'node:fs';
const file = process.argv[2] || 'index.html', label = process.argv[3] || 'after';
const base = /^https?:/.test(file) ? file : pathToFileURL(resolve(file)).href;
mkdirSync('tools/out/music', {recursive: true});
const J = 'window.__jewel';
const page = await launch({port: 9760, width: 800, height: 600});
try {
  await page.goto(base + '#solo=1');
  await until(() => page.eval(`!!(${J}&&${J}.ready)`), {timeout: 60000, label: 'boot'});
  const r = await page.eval(`(async()=>{const sr=32000,secs=40,c=new OfflineAudioContext(1,sr*secs,sr),m=new ResonanceMusic(${J}.app),log=[];
    const play=m.play.bind(m);m.play=(i,t,lv,key,flow)=>{if(i%4===0)log.push([+t.toFixed(2),...lv.map(v=>+v.toFixed(3)),+flow.toFixed(3)]);return play(i,t,lv,key,flow);};
    const fn=t=>{const flow=t<2?0:t<4?(t-2)/2*1.3:t<10?1.3:t<14?1.3*(1-(t-10)/4):0;return {flow,laser:t>=6&&t<9?1.2:0,cascade:t>=5&&t<10?5:0};};
    m.render(c,secs,fn,62);const buf=await c.startRendering(),x=buf.getChannelData(0);let peak=0;for(const v of x)peak=Math.max(peak,Math.abs(v));const k=peak>.98?.98/peak:1;
    const pcm=new Int16Array(x.length);for(let i=0;i<x.length;i++)pcm[i]=Math.max(-32767,Math.min(32767,x[i]*k*32767));
    const h=new DataView(new ArrayBuffer(44)),w=(o,s)=>{for(let i=0;i<4;i++)h.setUint8(o+i,s.charCodeAt(i))};w(0,'RIFF');h.setUint32(4,36+pcm.byteLength,true);w(8,'WAVE');w(12,'fmt ');h.setUint32(16,16,true);h.setUint16(20,1,true);h.setUint16(22,1,true);h.setUint32(24,sr,true);h.setUint32(28,sr*2,true);h.setUint16(32,2,true);h.setUint16(34,16,true);w(36,'data');h.setUint32(40,pcm.byteLength,true);
    const all=new Uint8Array(44+pcm.byteLength);all.set(new Uint8Array(h.buffer),0);all.set(new Uint8Array(pcm.buffer),44);let s='';for(let i=0;i<all.length;i+=32768)s+=String.fromCharCode.apply(null,all.subarray(i,i+32768));
    return {log,bpm:m.bpm,wav:btoa(s)};})()`);
  writeFileSync(`tools/out/music/latch-${label}.wav`, Buffer.from(r.wav, 'base64'));
  writeFileSync(`tools/out/music/latch-${label}.json`, JSON.stringify({bpm: r.bpm, log: r.log}));
  // Seconds after the board goes quiet (flow hits 0 at 14 s) until each layer falls below 10%.
  const quiet = 14, names = ['pad', 'bass', 'arp', 'drums', 'lead'], holds = {};
  names.forEach((n, k) => { const row = r.log.find(e => e[0] > 10 && e[1 + k] < .1); holds[n] = row ? +(row[0] - quiet).toFixed(1) : '>26'; });
  console.log(label, 'bpm', r.bpm, 'seconds each layer survives after the board goes quiet (negative = gone before):', JSON.stringify(holds));
} finally { page.kill(); }
