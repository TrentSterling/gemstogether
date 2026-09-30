// Validate analysis assets and real playback, without changing the game.
import {launch,sleep,until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const out=resolve('tools/out/voices/diagnosis-round8'),report=JSON.parse(readFileSync(out+'/analysis.json','utf8')),checks=[];
function check(name,pass,detail){checks.push({name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${name} ${detail===undefined?'':JSON.stringify(detail)}`);}
for(const [file,expected]of Object.entries(report.guards))check('production unchanged '+file,createHash('sha256').update(readFileSync(file)).digest('hex')===expected);
check('nine actual retained sources measured',report.clips.length===9&&report.clips.every(c=>c.sourceSha256.length===64&&Number.isFinite(c.pitch.medianHz)&&Number.isFinite(c.pitch.medianCC)));
const excerpts=report.clips.filter(c=>c.phrase);
check('three same-word excerpts level matched',excerpts.length===3&&excerpts.every(c=>Math.abs(c.phrase.level.lufs+24)<.35&&c.phrase.level.truePeakDb<-1.3));
const page=await launch({port:10023,width:1360,height:950});
try{
 await page.goto(pathToFileURL(out+'/index.html').href);await until(()=>page.eval('document.querySelectorAll("audio").length===18'),{timeout:15000,label:'diagnostic audio controls'});
 check('all four diagnostic plots load',await page.eval('document.querySelectorAll("img").length===4&&[...document.querySelectorAll("img")].every(i=>i.complete&&i.naturalWidth>1000)'));
 const clips=await page.eval('[...document.querySelectorAll("audio")].map(a=>a.getAttribute("src"))');
 for(let i=0;i<clips.length;i++){
  const receipt=await page.eval(`(async()=>{const a=document.querySelectorAll('audio')[${i}];await a.play();await new Promise((resolve,reject)=>{if(a.readyState>=1)return resolve();a.addEventListener('loadedmetadata',resolve,{once:true});a.addEventListener('error',()=>reject(new Error('Audio failed')),{once:true});});return {duration:a.duration,playing:!a.paused,others:[...document.querySelectorAll('audio')].filter(x=>x!==a&&!x.paused).length};})()`);
  check('actual playback '+clips[i],receipt.playing&&receipt.duration>.3&&receipt.duration<5&&receipt.others===0,receipt);
 }
 await page.eval('document.querySelectorAll("audio").forEach(a=>a.pause())');
 check('desktop has no horizontal overflow',await page.eval('document.documentElement.scrollWidth<=innerWidth'));
 await page.shot(out+'/diagnosis-desktop.png');
 await page.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(150);
 check('phone has no horizontal overflow',await page.eval('document.documentElement.scrollWidth<=innerWidth'));
 await page.shot(out+'/diagnosis-phone.png');
 check('no browser exceptions',!page.logs.some(s=>s.startsWith('EXCEPTION')),page.logs.filter(s=>s.startsWith('EXCEPTION')));
}catch(error){check('audit completed',false,error.stack);}finally{page.kill();}
const result={passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks};writeFileSync(out+'/player-results.json',JSON.stringify(result,null,2));console.log(`${result.passed} passed; ${result.failed} failed`);if(result.failed)process.exitCode=1;
