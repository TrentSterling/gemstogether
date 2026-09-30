/* Only injected into the ignored local audition clone. All saves are isolated. */
(()=>{
const presets=__PROCESSING_PRESETS__,audio=__PROCESSING_AUDIO__;
let selected='dry',automatic=false,started=false,playbackId=null;
const decoded=new Map(),listeners=new Set();
const send=data=>{if(window.parent!==window)window.parent.postMessage({type:'gems-processing-state',...data},'*');for(const f of listeners)f(data);};
async function boot(){
 if(!window.__jewel?.ready){setTimeout(boot,100);return;}
 const app=__jewel.app,n=app.announcer;
 app.expedition.tourVisible=false;n.welcomed=true;n.setProfile('silver');app.prefs.announcer=true;app.prefs.muted=false;app.audio.setMute(false);
 const originalRequest=n.request.bind(n);
 n.request=(key,options={})=>options.preview||automatic?originalRequest(key,options):false;
 n.decode=async(_profile,key)=>{
  n.route();const clip=audio[selected]?.[key];if(!clip)throw Error('Missing local processing clip');
  const id=selected+'/'+key;if(!decoded.has(id)){const bytes=Uint8Array.from(atob(clip.data),c=>c.charCodeAt(0));decoded.set(id,n.ctx.decodeAudioData(bytes.buffer).catch(e=>{decoded.delete(id);throw e;}));}
  return decoded.get(id);
 };
 async function choose(id){if(!audio[id])throw Error('Unknown treatment');n.stop();selected=id;app.prefs.announcer=true;send({selected,automatic});}
 let lastSpeaking=false;
 async function play(key,id=null){playbackId=id;await app.audio.start();started=true;app.prefs.announcer=true;n.request(key,{preview:true});lastSpeaking=true;send({selected,key,started,automatic,speaking:true,playbackId});}
 setInterval(()=>{const speaking=!!n.source||n.loading;if(speaking!==lastSpeaking){lastSpeaking=speaking;send({speaking,selected,playbackId});}},80);
 window.processingGame={presets,choose,play,stop:()=>n.stop(),setAutomatic:v=>{automatic=!!v;n.stop();send({automatic});},
  info:()=>({selected,automatic,started,decoded:decoded.size,solo:!app.net?.room,announcer:n.info(),backend:__jewel.diagnostics().backend}),
  decode:async(id,key)=>{await choose(id);await app.audio.start();return n.decode('silver',key);}};
 window.addEventListener('message',async e=>{
  if(e.source!==window.parent||e.data?.type!=='gems-processing-command')return;
  try{const m=e.data;if(m.action==='play'){await choose(m.preset);await play(m.key,m.playbackId);}else if(m.action==='choose')await choose(m.preset);else if(m.action==='stop'){n.stop();playbackId=null;}else if(m.action==='automatic')processingGame.setAutomatic(m.value);
  else if(m.action==='mode'){n.stop();app.audio.setMute(m.value==='voice');if(m.value==='game'&&started)await app.audio.start();}
  else if(m.action==='sfx'){await app.audio.start();app.audio.match(3,5,7,0,true);}
  send({action:m.action,selected,automatic});}catch(error){send({error:error.message});}
 });
 const overlay=document.createElement('div');overlay.id='processing-cabinet-label';overlay.textContent='LOCAL VOICE AUDITION / SOLO';
 overlay.style.cssText='position:fixed;top:5px;left:8px;pointer-events:none;font:10px monospace;color:#e6c77e;z-index:2147483001;background:#071418b3;padding:4px 8px';document.body.append(overlay);
 send({ready:true,selected,automatic});
}
boot();
})();
