import {launch,until,sleep} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const deep=process.argv.includes('--deep'),tone=process.argv.includes('--tone'),casting=process.argv.includes('--casting'),three=deep||tone||casting,out='tools/out/voices'+(casting?'/casting-round5':tone?'/tone-round4':deep?'/deep-round3':process.argv.includes('--ryan')?'/ryan-round2':''),base=pathToFileURL(resolve(out+'/index.html')).href;
let page,pass=0,fail=0;const receipts=[];const ok=(name,v)=>{v?pass++:fail++;receipts.push({name,pass:!!v});console.log(`${v?'PASS':'FAIL'} ${name}`);};
try{
 page=await launch({port:Number(process.env.GEMS_VOICE_PORT)||9986});await page.goto(base);await until(()=>page.eval(`!!window.voiceLab`),{timeout:10000});
 const clips=await page.eval(`voiceLab.catalog`);ok('catalog contains complete '+(three?'three':'four')+'-line voice sets',clips.length>=(three?12:20)&&await page.eval(`voiceLab.groups.every(v=>voiceLab.catalog.filter(c=>c.voice===v).length===${three?3:4})`));
 for(const clip of clips){const info=await page.eval(`new Promise((resolve,reject)=>{const a=new Audio(${JSON.stringify(clip.file)});a.onloadedmetadata=()=>resolve({duration:a.duration});a.onerror=()=>reject(new Error('Audio metadata failed'));a.load();})`);ok(clip.voice+' / '+clip.line+' decodes',Math.abs(info.duration-clip.duration)<.02);}
 if(process.argv.includes('--ryan')){
  const originals=clips.filter(c=>c.voice==='qwen-ryan'),shifted=clips.filter(c=>c.voice==='qwen-ryan-minus2'||c.voice==='qwen-ryan-minus4');
  ok('all eight shifted Ryan takes have lower measured pitch and unchanged duration',shifted.length===8&&shifted.every(c=>{const original=originals.find(o=>o.line===c.line);return c.medianPitchHz<original.medianPitchHz&&Math.abs(c.duration-original.duration)<.02;}));
  for(const file of ['facility-reference.wav','facility-reference-clean.wav']){
   const duration=await page.eval(`new Promise((resolve,reject)=>{const a=new Audio(${JSON.stringify(file)});a.onloadedmetadata=()=>resolve(a.duration);a.onerror=()=>reject(new Error('Reference decode failed'));a.load();})`);ok(file+' reference decodes',duration>11&&duration<12);
  }
 }
 if(deep){
  const edits=clips.filter(c=>c.voice.startsWith('edited-')),fresh=clips.filter(c=>c.voice.endsWith('-lowref'));
  ok('all edited takes reach a lower register',edits.length===6&&edits.every(c=>c.medianPitchHz>=65&&c.medianPitchHz<=140&&c.durationFactor===1));
  ok('fresh candidates use one retained reference per speaker',fresh.length===6&&new Set(fresh.map(c=>c.referenceSha256)).size===2&&fresh.every(c=>c.referenceText&&c.modelRevision));
  ok('fresh low-reference takes are deep without editing the finished clip',fresh.length===6&&fresh.every(c=>c.medianPitchHz>=65&&c.medianPitchHz<=150&&c.finalPitchEdit===false));
  ok('comparison menu names the three actual lines',await page.eval(`Array.from(document.querySelector('#line').options).map(o=>o.value).join(',')==='welcome-back,brilliant,resonance'`));
 }
 if(tone){
  ok('all 15 comparisons retain the two liked source performances',clips.length===15&&clips.every(c=>c.sourceSha256&&c.measurementCheck?.pass));
  ok('favourite performance is the first row',await page.eval(`voiceLab.groups[0]==='cave-current'`));
  ok('each treatment clearly explains the listening difference',await page.eval(`document.querySelectorAll('.voice .hint').length===5`));
 }
 if(casting){
  const fresh=clips.filter(c=>!c.voice.startsWith('reference-'));
  ok('twelve new described characters have complete three-line sets',fresh.length===36&&new Set(fresh.map(c=>c.voice)).size===12&&fresh.every(c=>c.style&&c.designSeed&&c.finalPitchEdit===false));
  ok('every new character keeps one reference across its lines',new Set(fresh.map(c=>c.referenceSha256)).size===12&&Array.from(new Set(fresh.map(c=>c.voice))).every(v=>new Set(fresh.filter(c=>c.voice===v).map(c=>c.referenceSha256)).size===1));
  ok('baritone favourite and darker Cave are the comparison anchors',await page.eval(`voiceLab.groups[0]==='reference-baritone'&&voiceLab.groups.at(-1)==='reference-cave'`));
  ok('all twelve casting descriptions can be opened',await page.eval(`document.querySelectorAll('.voice details').length===12`));
 }
 await page.eval(`document.querySelector('[data-clip]').click()`);await until(()=>page.eval(`!document.querySelector('#speech').paused&&document.querySelector('#speech').currentTime>.05`),{timeout:4000,every:60,label:'real audio playback'});ok('sample button starts real playback',true);
 await page.eval(`document.querySelector('#music').click()`);await sleep(250);ok('music toggle plays the real game bed',await page.eval(`!document.querySelector('#bed').paused&&document.querySelector('#bed').currentTime>0`));
 await page.eval(`document.querySelector('#stop').click();document.querySelector('.favorite').click()`);ok('stop and favourite respond',await page.eval(`document.querySelector('#speech').paused&&document.querySelector('#bed').paused&&document.querySelector('.favorite').getAttribute('aria-pressed')==='true'`));
 if(casting){
  await page.eval(`document.querySelector('#line').value='welcome-back';document.querySelector('#compare').click()`);
  await until(()=>page.eval(`document.querySelector('#speech').src.endsWith('/velvet-welcome-back.wav')&&!document.querySelector('#speech').paused`),{timeout:7000,every:80,label:'casting comparison advances'});
  ok('compare every voice advances from the favourite to a new character',true);
  await page.eval(`document.querySelector('#stop').click()`);await sleep(2800);
  ok('stop cancels the remaining comparison queue',await page.eval(`document.querySelector('#speech').paused&&document.querySelector('#now').textContent==='Stopped.'`));
  await page.eval(`for(let i=0;i<8;i++){document.querySelector('[data-clip]').click();document.querySelector('#stop').click();}`);await sleep(150);
  ok('rapid stop during play setup keeps a clean stopped state',await page.eval(`document.querySelector('#speech').paused&&document.querySelector('#now').textContent==='Stopped.'`));
  await page.eval(`document.querySelector('.voice details').open=true`);
 }
 await page.shot(out+'/desktop.png');await page.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await sleep(100);ok('phone fits without horizontal scrolling',await page.eval(`document.documentElement.scrollWidth<=390`));await page.shot(out+'/phone.png');
 ok('no browser exceptions',!page.logs.some(x=>x.startsWith('EXCEPTION')));
}catch(error){fail++;console.error(error.stack);}finally{page?.kill();writeFileSync(out+'/browser-results.json',JSON.stringify({pass,fail,receipts},null,2));console.log(`${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;}
