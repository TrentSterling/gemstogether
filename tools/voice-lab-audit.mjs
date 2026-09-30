import {launch,until,sleep} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const out='tools/out/voices'+(process.argv.includes('--ryan')?'/ryan-round2':''),base=pathToFileURL(resolve(out+'/index.html')).href;
let page,pass=0,fail=0;const receipts=[];const ok=(name,v)=>{v?pass++:fail++;receipts.push({name,pass:!!v});console.log(`${v?'PASS':'FAIL'} ${name}`);};
try{
 page=await launch({port:9986});await page.goto(base);await until(()=>page.eval(`!!window.voiceLab`),{timeout:10000});
 const clips=await page.eval(`voiceLab.catalog`);ok('catalog contains complete four-line voice sets',clips.length>=20&&await page.eval(`voiceLab.groups.every(v=>voiceLab.catalog.filter(c=>c.voice===v).length===4)`));
 for(const clip of clips){const info=await page.eval(`new Promise((resolve,reject)=>{const a=new Audio(${JSON.stringify(clip.file)});a.onloadedmetadata=()=>resolve({duration:a.duration});a.onerror=()=>reject(new Error('Audio metadata failed'));a.load();})`);ok(clip.voice+' / '+clip.line+' decodes',Math.abs(info.duration-clip.duration)<.02);}
 if(process.argv.includes('--ryan')){
  const originals=clips.filter(c=>c.voice==='qwen-ryan'),shifted=clips.filter(c=>c.voice==='qwen-ryan-minus2'||c.voice==='qwen-ryan-minus4');
  ok('all eight shifted Ryan takes have lower measured pitch and unchanged duration',shifted.length===8&&shifted.every(c=>{const original=originals.find(o=>o.line===c.line);return c.medianPitchHz<original.medianPitchHz&&Math.abs(c.duration-original.duration)<.02;}));
  for(const file of ['facility-reference.wav','facility-reference-clean.wav']){
   const duration=await page.eval(`new Promise((resolve,reject)=>{const a=new Audio(${JSON.stringify(file)});a.onloadedmetadata=()=>resolve(a.duration);a.onerror=()=>reject(new Error('Reference decode failed'));a.load();})`);ok(file+' reference decodes',duration>11&&duration<12);
  }
 }
 await page.eval(`document.querySelector('[data-clip]').click()`);await until(()=>page.eval(`!document.querySelector('#speech').paused&&document.querySelector('#speech').currentTime>.05`),{timeout:4000,every:60,label:'real audio playback'});ok('sample button starts real playback',true);
 await page.eval(`document.querySelector('#music').click()`);await sleep(250);ok('music toggle plays the real game bed',await page.eval(`!document.querySelector('#bed').paused&&document.querySelector('#bed').currentTime>0`));
 await page.eval(`document.querySelector('#stop').click();document.querySelector('.favorite').click()`);ok('stop and favourite respond',await page.eval(`document.querySelector('#speech').paused&&document.querySelector('#bed').paused&&document.querySelector('.favorite').getAttribute('aria-pressed')==='true'`));
 await page.shot(out+'/desktop.png');await page.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await sleep(100);ok('phone fits without horizontal scrolling',await page.eval(`document.documentElement.scrollWidth<=390`));await page.shot(out+'/phone.png');
 ok('no browser exceptions',!page.logs.some(x=>x.startsWith('EXCEPTION')));
}catch(error){fail++;console.error(error.stack);}finally{page?.kill();writeFileSync(out+'/browser-results.json',JSON.stringify({pass,fail,receipts},null,2));console.log(`${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;}
