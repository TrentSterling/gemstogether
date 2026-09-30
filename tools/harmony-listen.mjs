// Side-by-side eight-bar renders of the actual saved and current in-page schedulers.
// node tools/harmony-listen.mjs [before HTML]
import {launch,until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const before=process.argv[2]||'tools/out/harmony/before-3.3.2.html',out='tools/out/harmony';
mkdirSync(out,{recursive:true});const page=await launch({port:10007}),catalog=[];
try{
 for(const [tag,file]of [['before',before],['after','index.html']]){
  await page.goto(pathToFileURL(resolve(file)).href+'#solo=1');await until(()=>page.eval('window.__jewel?.ready'));
  const stages=await page.eval('FX_STAGES.map(s=>({name:s.name,prog:s.prog,key:62+(s.keyShift||0)}))');
  for(let i=0;i<stages.length;i++){
   const stage=stages[i];
   const rendered=await page.eval(`(async()=>{
    const sr=32000,seconds=23,c=new OfflineAudioContext(1,sr*seconds,sr),m=new ResonanceMusic(window.__jewel.app),build=m.build.bind(m);
    m.prog=${stage.prog};m.build=(ctx,dest)=>{const g=ctx.createGain(),comp=ctx.createDynamicsCompressor();g.gain.value=.4;g.connect(comp);comp.threshold.value=-16;comp.knee.value=16;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.18;comp.connect(dest);return build(ctx,g);};
    m.render(c,seconds,()=>({flow:.9,laser:1.2,cascade:5}),${stage.key});const b=await c.startRendering(),x=b.getChannelData(0),pcm=new Int16Array(x.length);let peak=0,sum=0;
    for(let i=0;i<x.length;i++){peak=Math.max(peak,Math.abs(x[i]));sum+=x[i]*x[i];pcm[i]=Math.round(clamp(x[i],-1,1)*32767);}
    const bytes=new Uint8Array(44+pcm.byteLength),v=new DataView(bytes.buffer),w=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i));};w(0,'RIFF');v.setUint32(4,36+pcm.byteLength,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,pcm.byteLength,true);bytes.set(new Uint8Array(pcm.buffer),44);
    let str='';for(let i=0;i<bytes.length;i+=32768)str+=String.fromCharCode(...bytes.subarray(i,i+32768));return {wav:btoa(str),peak,rms:Math.sqrt(sum/x.length),bpm:m.bpm,notes:m.stats.notes};
   })()`);
   const stem=`${tag}-stage-${i}`;writeFileSync(out+'/'+stem+'.wav',Buffer.from(rendered.wav,'base64'));
   execFileSync('ffmpeg',['-y','-loglevel','error','-i',out+'/'+stem+'.wav','-b:a','96k',out+'/'+stem+'.mp3']);
   if(rendered.peak>=.98||rendered.rms<.02||rendered.bpm!==88)throw Error('Invalid render: '+stem);
   const {wav,...audio}=rendered;catalog.push({tag,stage:i,...stage,...audio});console.log(stem,JSON.stringify(audio));
  }
 }
}finally{page.kill();}
writeFileSync(out+'/listening-results.json',JSON.stringify(catalog,null,2));
const names=['D minor','G minor','E minor','A minor','F minor','C minor'];
const cards=catalog.filter(s=>s.tag==='after').map(s=>`<section><h2>${s.name}</h2><p>${names[s.stage]} / steady 88 BPM</p><div><label>Before: 3.3.2<audio src="before-stage-${s.stage}.mp3" controls preload="none"></audio></label><label>After: 3.3.3<audio src="after-stage-${s.stage}.mp3" controls preload="none"></audio></label></div></section>`).join('');
writeFileSync(out+'/index.html',`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gems Together stage music</title><style>body{font:17px/1.5 system-ui;background:#071418;color:#e9ddbc;max-width:960px;margin:40px auto;padding:0 20px}h1{font-size:36px}section{padding:20px 0;border-top:1px solid #34474b}h2{font-size:22px}p{color:#9cb7ba}section div{display:flex;gap:32px;flex-wrap:wrap}label{display:grid;gap:12px;flex:1;min-width:260px}audio{width:100%}a{color:#8ff7ff}</style><h1>Six worlds, six harmonies</h1><p>Eight bars from each actual game build, at the same intensity and volume. The last second begins the next eight-bar phrase. These are offline soundtrack renders; live bar timing and Resonance filtering have separate browser receipts.</p><p><a href="../announcer/index.html">Announcer voices</a></p>${cards}<script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')for(const a of document.querySelectorAll('audio'))if(a!==e.target)a.pause()},true)</script>`);
console.log('wrote '+out+'/index.html');
