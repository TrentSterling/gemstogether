// Controller arrival: real pointer preparation, standard Gamepad API input,
// full text, safe geometry and unchanged selection/hint/point behavior.
import {launch,until} from './cdp.mjs';import {mkdirSync,writeFileSync} from 'node:fs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const file=process.argv[2]||'index.html',label=process.argv[3]||'after',base=/^https?:/.test(file)?file:pathToFileURL(resolve(file)).href,out='tools/out/controller-guide';mkdirSync(out,{recursive:true});
const views=[['desktop',1280,800,false],['webgl',1280,800,true],['phone',390,844,false],['phone-webgl',390,844,true],['narrow',320,600,true],['tiny',320,480,true],['short-phone',390,600,true],['landscape',568,320,true],['landscape-375',667,375,true],['wide-landscape',844,390,true],['short-desktop',1280,400,true]];
const checks=[],captures=[];let view,device;const ok=(name,pass,detail)=>{checks.push({view,device,name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${view} ${device} ${name}`);};
const tap=async(p,xy,mobile)=>{const[x,y]=xy;if(mobile){await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.mouse('mousePressed',x,y);await p.mouse('mouseReleased',x,y);}};
const press=async(p,i,on)=>{await p.eval(`__guidePad.buttons[${i}]={pressed:${on},value:${on?1:0}};__guideStep(.05)`);};
try{
 for(const[n,[name,w,h,webgl]]of views.entries()){
  if(label==='before'&&!['phone','landscape'].includes(name))continue;view=name;const mobile=w<900,p=await launch({port:9820+n,width:w,height:h,mobile});
  try{
   await p.goto(base+(webgl?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
   await p.eval(`(()=>{const a=__jewel.app,u=a.ui;let clock=performance.now();performance.now=()=>clock;window.__guideStep=s=>{clock+=s*1000;__jewel.advance(s);};const draw=a.draw,text=u.text,layout=u.controllerGuideLayout;a.draw=function(...args){window.__guide=null;window.__guideText=[];return draw.apply(this,args);};u.text=function(...args){__guideText.push(args);return text.apply(this,args);};if(layout)u.controllerGuideLayout=function(...args){return window.__guide=layout.apply(this,args);};__jewel.challenge('moves',{seed:1});__guideStep(2);})()`);
   for(let i=0;i<4;i++){for(const xy of await p.eval('__jewel.state().legalMoves[0].map(i=>__jewel.project(i))'))await tap(p,xy,mobile);await p.eval('__guideStep(4)');}
   ok('four real swaps prepare a normal board',await p.eval('__jewel.state().moves===4&&__jewel.state().score>0'));
   for(const [id,key]of[['Xbox Controller','xbox'],['DualSense Wireless Controller','playstation']]){
    device=key;
    await p.eval(`(()=>{const a=__jewel.app;a.padState.id=null;window.__guidePad={id:${JSON.stringify(id)},index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[__guidePad]});__guideStep(0);__guideStep(.3);})()`);
    await p.shot(`${out}/${label}-${name}-${key}.png`);const r=await p.eval('({guide:__guide,toast:__jewel.app.ui.toastMessage,drawn:__guideText,score:__jewel.state().score,moves:__jewel.state().moves,board:__jewel.app.ui.boardRect,plaque:__jewel.app.ui.plaqueAt,about:(()=>{const b=document.getElementById("trontAbout").getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};})(),hits:__jewel.ui().hits})');captures.push({view,device,capturedAt:new Date().toISOString(),...r});
    if(label==='before'){await press(p,2,true);await press(p,2,false);await press(p,3,true);await press(p,3,false);await p.eval('__guideStep(6.5)');continue;}
    ok('full guide is visible without ellipsis',r.guide&&r.guide.lines.join(' ')===r.toast&&!r.toast.includes('...'),r.guide);
    ok('controller names match the device',key==='playstation'?r.toast.includes('Cross')&&r.toast.includes('Square')&&r.toast.includes('Triangle'):r.toast.includes('A select')&&r.toast.includes('X hint')&&r.toast.includes('Y point'));
    ok('select and hold-direction swap are explicit',r.toast.includes('select')&&r.toast.includes('Hold ')&&r.toast.includes('+ direction to swap'));
    ok('complete instructions reach accessibility status',await p.eval('document.getElementById("accessibility-status").textContent==="Controller ready. "+__jewel.app.ui.toastMessage'));
    ok('all glyphs fit at readable size',await p.eval('__guide&&__guide.font>=12&&__guide.lines.every(s=>__jewel.app.ui.measure(s,__guide.font)<=__guide.w-2*(__guide.padding??12)+.1)'));
    const overlap=(a,b)=>a&&b&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h+4>b.y;
    ok('guide stays within viewport',r.guide&&r.guide.x>=0&&r.guide.y>=0&&r.guide.x+r.guide.w<=w&&r.guide.y+r.guide.h+4<=h,r.guide);
    ok('guide clears gems, score and buttons',r.guide&&!overlap(r.guide,r.board)&&!r.hits.some(b=>overlap(r.guide,b))&&!overlap(r.guide,r.plaque?{x:r.plaque[0],y:r.plaque[1],w:r.plaque[2],h:r.plaque[3]}:{x:0,y:Math.max(Math.max(10,r.board.y-93)+47,r.board.y-42),w,h:34}),r.guide);
    ok('guide clears the About entry',!overlap(r.guide,r.about),r.about);
    ok('drawing cannot change saves or shared gameplay',await p.eval(`(()=>{const a=__jewel.app,key=()=>JSON.stringify([a.board.score,a.board.moves,a.expedition.profile,a.expedition.summary(),a.coop.revision,a.coop.seq,localStorage.getItem('gemstogether-expedition-v1')]),before=key();for(let i=0;i<3;i++)a.ui.draw();return key()===before;})()`));
    await press(p,2,true);await press(p,2,false);ok('controller hint still works',await p.eval('__jewel.app.hintCells.length===2'));
    await press(p,3,true);await press(p,3,false);ok('controller point still works',await p.eval('!!__jewel.points().local'));
    await p.eval('__guideStep(4.5)');ok('instructions remain readable beyond old expiry',await p.eval('!!__guide&&__jewel.app.ui.toastUntil>performance.now()'));
    await p.eval('__guideStep(2)');ok('guide expires normally',await p.eval('__guide===null'));
   }
   if(label!=='before'){
    device='transitions';await p.eval('__jewel.app.toast(controllerGuideText("Xbox Controller"),"controller");__guideStep(.3);__jewel.app.openPanel("play");__guideStep(0)');ok('panel suppresses guide',await p.eval('__guide===null'));await p.eval('__jewel.app.closePanel();__guideStep(0)');ok('closing a panel restores unexpired guide',await p.eval('!!__guide'));
    await p.eval('__jewel.app.gameOver={score:__jewel.state().score,stage:__jewel.app.fx.stageInfo(),birth:__jewel.app.time,best:false};__guideStep(0)');ok('results suppress guide',await p.eval('__guide===null'));await p.eval('__jewel.app.gameOver=null;__jewel.app.aaCompare=true;__guideStep(0)');ok('AA comparison suppresses guide',await p.eval('__guide===null'));await p.eval('__jewel.app.aaCompare=false;__jewel.app.expedition.enterPhoto();__guideStep(0)');ok('photo mode suppresses guide',await p.eval('__guide===null'));await p.eval('__jewel.app.closePanel();__guideStep(0)');
    await p.eval('document.getElementById("trontAbout").open=true;__guideStep(0)');ok('open About suppresses guide',await p.eval('__guide===null'));await p.eval('document.getElementById("trontAbout").open=false;__jewel.app.toast("Let the gems settle.");__guideStep(.3)');ok('new ordinary notice replaces guide and retains lifetime',await p.eval('__guide===null&&__jewel.app.ui.toastKind===""&&__jewel.app.ui.toastDuration===2800&&document.getElementById("accessibility-status").textContent==="Let the gems settle."'));
    await p.eval('__jewel.app.prefs.motion=false;__jewel.app.prefs.flash="off";__jewel.app.prefs.highContrast=true;__jewel.app.toast(controllerGuideText("Xbox Controller"),"controller");__guideStep(.3)');ok('comfort settings retain complete instructions',await p.eval('__guide?.lines.join(" ")===__jewel.app.ui.toastMessage'));
    ok('requested renderer and clean runtime',await p.eval(`__jewel.diagnostics().backend===${JSON.stringify(webgl?'WebGL 2':'WebGPU')}&&__jewel.diagnostics().errors.length===0`)&&!p.logs.some(s=>s.startsWith('EXCEPTION')));
   }
  }finally{p.kill();}
 }
}finally{writeFileSync(`${out}/${label}-checks.json`,JSON.stringify({checks,captures},null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
