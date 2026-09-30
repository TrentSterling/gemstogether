// Geometry and real GPU receipts for the move preview and cabinet lights.
import {launch,until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
const file=process.argv[2]||'index.html',label=process.argv[3]||'after',before=label==='before';
const out='tools/out/highlights',base=pathToFileURL(resolve(file)).href;
mkdirSync(out,{recursive:true});const receipts=[];let pass=0,fail=0;
const check=(name,value,detail)=>{value?pass++:fail++;receipts.push({name,pass:!!value,detail});console.log(`${value?'PASS':'FAIL'} ${name}${detail?' '+JSON.stringify(detail):''}`);};
for(const [width,height,gl]of (before?[[1280,800,false]]:[[1280,800,false],[390,844,false],[1280,800,true]])){
 const name=(gl?'webgl':'webgpu')+'-'+width;let p;
 try{
  p=await launch({port:9960+(gl?2:0)+(width===390?1:0),width,height});await p.goto(base+(gl?'?webgl=1':'')+'#solo=1');await until(()=>p.eval('!!window.__jewel?.ready'),{timeout:60000});await until(()=>p.eval("__jewel.app.phase==='idle'"),{timeout:30000});
  await p.eval(`(()=>{const a=__jewel.app;a.debugManual=true;a.closePanel();a.prefs.motion=false;a.prefs.particles=false;a.prefs.muted=true;a.ui.toastUntil=0;a.expedition.tourVisible=false;a.expedition.announcement=null;a.ui.sc=null;a.selected=27;a.hover=27;a.keyboardActive=true;a.keyboardCell=27;
   for(const [i,type]of [[27,0],[26,2],[28,5],[19,4],[35,3]]){a.board.cells[i].type=type;a.getActor(i).tile.type=type;}__jewel.advance(.4);a.fx.beat=1;a.fx.flow=1;a.draw();return true;})()`);
  await p.shot(`${out}/${label}-${name}-preview.png`);
  if(!before){
   const geometry=await p.eval(`(()=>{const a=__jewel.app,ac=a.getActor(27),saved={tile:ac.tile,pos:ac.pos,scale:ac.scale,rotation:ac.rotation},results=[];
    for(let type=0;type<6;type++)for(const rot of [[0,0,0],[.2,-.25,.12],[-.3,.4,-.2]]){ac.tile={...saved.tile,type};ac.rotation=rot;ac.pos=[.12,.2,.55];ac.scale=[1.13,.91,1.08];const mesh=gemContourMesh(type),loops=gemContours(ac,a),m=trs(ac.pos,ac.rotation,ac.scale),points=mesh.vertices.map(v=>project(transform(m,v),a.vp,a.cssWidth,a.cssHeight));
     const exact=loops.every(loop=>{for(let i=0;i<loop.length;i+=2)if(!points.some(q=>Math.hypot(q[0]-loop[i],q[1]-loop[i+1])<.0001))return false;return loop[0]===loop.at(-2)&&loop[1]===loop.at(-1);});
     const bounds=loops.flatMap(loop=>Array.from({length:loop.length/2},(_,i)=>[loop[i*2],loop[i*2+1]]));const enclosed=points.every(q=>q[0]>=Math.min(...bounds.map(v=>v[0]))-.01&&q[0]<=Math.max(...bounds.map(v=>v[0]))+.01&&q[1]>=Math.min(...bounds.map(v=>v[1]))-.01&&q[1]<=Math.max(...bounds.map(v=>v[1]))+.01);
     results.push({type,rot,loops:loops.length,exact,enclosed});}Object.assign(ac,saved);return results;})()`);
   check(name+' all six silhouettes follow lifted, rotated, scaled mesh vertices',geometry.every(r=>r.loops===1&&r.exact&&r.enclosed),geometry.filter(r=>r.loops!==1||!r.exact||!r.enclosed));
   const preview=await p.eval(`(()=>{const a=__jewel.app,p=a.ui.ink,poly=p.poly,paths=[];p.poly=function(points,width,col,alpha){paths.push({points,width,col});};try{a.ui.expeditionDecor();}finally{p.poly=poly;}return {count:paths.length,cells:[27,26,28,19,35].map(i=>gemContours(a.getActor(i),a)[0]),paths};})()`);
   check(name+' selected gem and four neighbours each have one contour',preview.count===5&&preview.cells.every(points=>preview.paths.some(p=>JSON.stringify(p.points)===JSON.stringify(points))));
   const focus=await p.eval(`(()=>{const a=__jewel.app,r=a.renderer,upload=r.upload;let data;r.upload=function(mesh,values,count){if(mesh===a.world.halos)data=Array.from(values);return upload.call(this,mesh,values,count);};try{a.draw();}finally{r.upload=upload;}return {data,socket:cellXY(27),noHud:typeof a.ui.drawPadCursor==='undefined',uniforms:[r.uniforms[19],r.uniforms[35]]};})()`);
   check(name+' one focus bracket follows the physical socket depth',focus.data.length===24&&Math.abs(focus.data[12]-focus.socket[0])<1e-6&&Math.abs(focus.data[13]-focus.socket[1])<1e-6&&Math.abs(focus.data[14]-.085)<1e-6&&focus.noHud);
   check(name+' frame beat is in the scene material',focus.uniforms[0]>0&&focus.uniforms[1]>1&&await p.eval("typeof __jewel.app.ui.drawBeat==='undefined'"));
   await p.eval(`(()=>{const a=__jewel.app;a.selected=-1;a.hover=-1;a.keyboardActive=false;a.prefs.highContrast=true;a.draw();})()`);await p.shot(`${out}/${label}-${name}-all-shapes.png`);
   await p.eval(`(()=>{const a=__jewel.app;a.prefs.highContrast=false;a.prefs.flash='off';a.draw();})()`);check(name+' flashes off stops the frame beat',await p.eval('__jewel.app.renderer.uniforms[19]===0'));
   await p.eval('__jewel.app.ui.focus=null;document.activeElement.blur();__jewel.app.keyboardCell=27');await p.call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight'});const keyboard=await p.eval('({active:__jewel.app.keyboardActive,cell:__jewel.app.keyboardCell})');check(name+' keyboard still navigates',keyboard.active&&keyboard.cell===28,keyboard);
   await p.eval(`(()=>{const a=__jewel.app;a.selected=-1;a.hover=-1;a.keyboardActive=false;a.prefs.flash='full';a.fx.beat=1;a.fx.flow=1;a.draw();})()`);await p.shot(`${out}/${label}-${name}-frame.png`);
   check(name+' GPU and JavaScript remain clean',await p.eval('__jewel.diagnostics().errors.length===0')&&!p.logs.some(l=>l.startsWith('EXCEPTION')),p.logs.filter(l=>l.startsWith('EXCEPTION')));
  }
 }catch(error){check(name+' completes',false,error.stack);if(p)console.log(p.logs.slice(-5));}finally{p?.kill();}
}
writeFileSync(`${out}/${label}-results.json`,JSON.stringify({pass,fail,receipts},null,2));console.log(`${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;
