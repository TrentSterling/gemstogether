import {launch,until,sleep} from './cdp.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const arg=process.argv[2]||'index.html',base=/^https?:/.test(arg)?arg:pathToFileURL(resolve(arg)).href,out=process.argv[3]||'tools/out/social-notice';mkdirSync(out,{recursive:true});let port=9910;const runs=[];
for(const webgl of[false,true])for(const[width,height]of[[1280,800],[390,844],[568,320],[320,480],[844,390],[844,360]]){
 const p=await launch({port:port++,width,height,mobile:width<900});const tag=(webgl?'gl':'gpu')+'-'+width+'x'+height;
 try{
  await p.call('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('gemstogether-settings-v1',JSON.stringify({muted:true}));`});await p.goto(base+'?'+(webgl?'webgl&':'')+'social='+tag+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.app.phase==="idle"'),{timeout:60000});
  await p.eval(`__jewel.advance(0);__jewel.challenge('zen',{seed:43});__jewel.advance(3);__jewel.app.ui.toastUntil=-1000;__jewel.app.expedition.tourVisible=false;`);await p.eval(readFileSync(new URL('./social-notice-fixture.js',import.meta.url),'utf8'));
  const cases=await p.eval('runSocialCases()');assert.ok(cases.pure);assert.ok(cases.rows.every(r=>r.safe),tag+' collision');assert.ok(cases.rows.filter(r=>r.mode==='zen'&&!r.withToast).every(r=>r.drawn),tag+' hidden Zen notice');
  await p.eval(`__jewel.app.expedition.showCheer('#8ff7ff');__jewel.advance(.25)`);const cheer=await p.eval('auditSocial()');assert.ok(cheer.drawn&&cheer.safe);await sleep(130);await p.shot(out+'/'+tag+'.png');
  const priority=await p.eval(`(()=>{const a=__jewel.app,u=a.ui,e=a.expedition,checks=[];for(const key of['panelOpen','gameOver','aaCompare']){const v=a[key];a[key]=true;checks.push(!u.socialNoticeLayout());a[key]=v;}for(const key of['photo']){const v=e[key];e[key]={};checks.push(!u.socialNoticeLayout());e[key]=v;}const v=e.run.finished;e.run.finished=true;checks.push(!u.socialNoticeLayout());e.run.finished=v;for(const kind of['controller','ornament']){u.toastKind=kind;u.toastUntil=performance.now()+500;checks.push(!u.socialNoticeLayout());}u.toastUntil=-1000;return checks})()`);assert.ok(priority.every(Boolean));
  await p.call('Emulation.setDeviceMetricsOverride',{width:height,height:width,deviceScaleFactor:1,mobile:width<900});await p.eval('__jewel.app.draw();new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');const rotation=await p.eval('runSocialCases()');assert.ok(rotation.pure&&rotation.rows.every(r=>r.safe));
  const d=await p.eval('__jewel.diagnostics()');assert.equal(d.version,'3.4.0');assert.equal(d.backend,webgl?'WebGL 2':'WebGPU');assert.deepEqual(d.errors,[]);assert.deepEqual(d.nonfiniteActors,[]);
  runs.push({tag,cases,cheer,priority,rotation,diagnostics:d});console.log('PASS '+tag+' 80 layouts, purity, notice priority, rotation and real rendering');
 }finally{await p.kill();}
}
writeFileSync(out+'/results.json',JSON.stringify({runs},null,2));
