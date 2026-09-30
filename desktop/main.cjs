const {app,BrowserWindow,protocol,net,ipcMain,Menu,shell}=require('electron');
const {join,resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
const {existsSync,readFileSync,writeFileSync,mkdirSync}=require('node:fs');
const {tmpdir}=require('node:os');
const achievements=require('./achievements.json');
const allowed=new Set(achievements.map(x=>x.id));
const smoke=process.argv.includes('--smoke');
const contentRoot=existsSync(join(__dirname,'game','index.html'))?join(__dirname,'game'):resolve(__dirname,'..');
let win,steam=null,steamError='',configFile;
protocol.registerSchemesAsPrivileged([{scheme:'gems',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
app.commandLine.appendSwitch('enable-unsafe-webgpu');
if(smoke){app.setPath('userData',join(tmpdir(),'gems-together-smoke-'+process.pid));app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');app.commandLine.appendSwitch('mute-audio');}
const trusted=event=>win&&!win.isDestroyed()&&event.sender===win.webContents&&event.senderFrame?.url.startsWith('gems://cabinet/');
const readConfig=()=>{try{return JSON.parse(readFileSync(configFile,'utf8'));}catch{return {};}};
const saveConfig=()=>{if(!win||win.isDestroyed()||smoke)return;try{const [width,height]=win.getSize();writeFileSync(configFile,JSON.stringify({width,height,fullscreen:win.isFullScreen()}));}catch{}};
app.whenReady().then(async()=>{
 configFile=join(app.getPath('userData'),'window.json');mkdirSync(app.getPath('userData'),{recursive:true});
 protocol.handle('gems',request=>{const url=new URL(request.url);if(url.hostname!=='cabinet'||!['/','/index.html','/og-image.png'].includes(url.pathname))return new Response('Not found',{status:404});return net.fetch(pathToFileURL(join(contentRoot,url.pathname==='/og-image.png'?'og-image.png':'index.html')).href);});
 const appId=Number(process.env.GEMSTOGETHER_STEAM_APP_ID||0);
 if(Number.isSafeInteger(appId)&&appId>0){try{const steamworks=require('steamworks.js');steam=steamworks.init(appId);steamworks.electronEnableSteamOverlay();}catch(err){steamError=err.message;}}
 const config=readConfig();const width=Math.min(3840,Math.max(960,Number(config.width)||1280)),height=Math.min(2160,Math.max(640,Number(config.height)||800));
 win=new BrowserWindow({width,height,minWidth:800,minHeight:600,show:!smoke,title:'Gems Together',backgroundColor:'#071418',fullscreen:!!config.fullscreen,
  webPreferences:{preload:join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
 Menu.setApplicationMenu(null);
 win.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\/(tront\.xyz|github\.com)\//.test(url))shell.openExternal(url).catch(()=>{});return {action:'deny'};});
 win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('gems://cabinet/'))event.preventDefault();});
 win.webContents.session.setPermissionRequestHandler((_wc,permission,callback)=>callback(permission==='fullscreen'));
 ipcMain.handle('gems:achievement',(event,id)=>{if(!trusted(event)||typeof id!=='string'||!allowed.has(id))throw Error('Unknown achievement');return steam?steam.achievement.activate(id):false;});
 ipcMain.handle('gems:fullscreen',event=>{if(!trusted(event))throw Error('Unknown window');win.setFullScreen(!win.isFullScreen());saveConfig();return win.isFullScreen();});
 ipcMain.handle('gems:resolution',(event,w,h)=>{if(!trusted(event)||![[1280,720],[1600,900],[1920,1080]].some(([W,H])=>W===w&&H===h))throw Error('Unsupported window size');win.setFullScreen(false);win.setSize(w,h);saveConfig();return [w,h];});
 ipcMain.handle('gems:status',event=>{if(!trusted(event))throw Error('Unknown window');return {version:app.getVersion(),steam:!!steam,steamError,fullscreen:win.isFullScreen(),size:win.getSize()};});
 win.on('close',saveConfig);
 await win.loadURL('gems://cabinet/index.html'+(smoke?'#solo=1':''));
 if(smoke){let result;try{for(let i=0;i<100;i++){if(await win.webContents.executeJavaScript('!!window.__jewel?.ready'))break;await new Promise(r=>setTimeout(r,100));}
  result=await win.webContents.executeJavaScript(`(async()=>{
   const J=window.__jewel;if(!J?.ready)throw Error(document.querySelector('#failure-detail')?.textContent||'GPU boot failed');
   J.advance(2);const a=J.app,d=J.diagnostics(),s=J.state(),desktop=await window.gemsDesktop.status();
   const rejected=await window.gemsDesktop.unlock('UNRECOGNIZED').then(()=>false,()=>true);
   await window.gemsDesktop.resolution(1280,720);const resized=await window.gemsDesktop.status();
   const full=await window.gemsDesktop.fullscreen();await window.gemsDesktop.fullscreen();await a.audio.start();
   const n=a.announcer;n.stop();const voices=[];
   for(const p of n.info().profiles){const b=await n.decode(p.id,'welcome-back');voices.push({profile:p.id,duration:b.duration});}
   const stages=FX_STAGES.map(s=>({key:a.audio.key+s.keyShift,progression:s.prog}));
   a.fx.res={on:true,count:0,until:a.time+8};a.music.filterResonance();const filtered=a.music.filterTarget;
   a.fx.res.on=false;a.music.filterResonance();const restored=a.music.filterTarget;
   const harmony=new Set(stages.map(s=>s.key)).size===6&&new Set(stages.map(s=>s.progression)).size===6;
   const musicFilter=!!a.audio.resonanceFilter&&filtered===2200&&restored===20000;
   return {version:d.version,backend:d.backend,errors:d.errors,cells:s.cells.length,solo:!J.net().connected,desktop,
    achievementAllowlist:rejected,resolution:resized.size,fullscreen:full,contextIsolation:typeof window.require==='undefined',
    progression:!!J.expedition(),announcer:voices,stages,musicFilter,comboTreatment:a.prefs.comboTreatment,
    pass:d.errors.length===0&&s.cells.length===64&&rejected&&full&&typeof window.require==='undefined'&&
     voices.length===6&&voices.every(v=>v.duration>1)&&harmony&&musicFilter&&a.prefs.comboTreatment===true};
  })()`);
 }catch(err){result={pass:false,error:err.stack};}
  const report=process.env.GEMSTOGETHER_SMOKE_REPORT;if(report)writeFileSync(report,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));app.exit(result.pass?0:1);
 }
}).catch(err=>{console.error(err);app.exit(1);});
app.on('window-all-closed',()=>app.quit());
