/* Local announcer presentation. Clips are embedded; settings never enter co-op state. */
const ANNOUNCER_PACK=__ANNOUNCER_PACK__;
const ANNOUNCER_VISIT='gemstogether-announcer-visited-v1';
class GemsAnnouncer {
 constructor(app){
  this.a=app;app.audio.announcer=this;this.ctx=null;this.cache=new Map();this.epoch=0;this.source=null;this.activeSources=new Set();this.loading=false;this.pending=null;this.last=-100;this.recent=new Map();this.history=[];this.stats={played:0,dropped:0,errors:0,peak:0};this.welcomed=false;
  const p=app.prefs,newPack=p.announcerPackVersion!==ANNOUNCER_PACK.version;p.announcer=p.announcer!==false;p.announcerProfile=!newPack&&Object.hasOwn(ANNOUNCER_PACK.profiles,p.announcerProfile)?p.announcerProfile:ANNOUNCER_PACK.defaultProfile;p.announcerVolume=Number.isFinite(+p.announcerVolume)?clamp(+p.announcerVolume,0,100):65;p.announcerPackVersion=ANNOUNCER_PACK.version;if(newPack)app.savePreferences();
  this.returning=!!readStorage(ANNOUNCER_VISIT,false)||!!app.expedition?.profile.gems;
  const input=document.createElement('input');input.id='announcer-volume';input.type='range';input.min='0';input.max='100';input.value=p.announcerVolume;input.hidden=true;input.oninput=()=>{p.announcerVolume=clamp(+input.value,0,100);this.level();if(!p.announcerVolume)this.stop();app.savePreferences();};document.body.append(input);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});window.addEventListener('pagehide',()=>this.stop());
  window.__jewel.announcer=()=>this.info();
 }
 route(){
  const au=this.a.audio,c=au.ctx;if(!c||!au.music||!au.compressor||this.ctx===c)return;
  this.a.music.routeMusic();this.ctx=c;this.voiceGain=c.createGain();this.voiceGain.connect(au.compressor);this.level();
  this.ducker=c.createGain();this.ducker.gain.value=1;const musicOutput=au.resonanceFilter;musicOutput.disconnect(au.compressor);musicOutput.connect(this.ducker);this.ducker.connect(au.compressor);
 }
 level(){if(this.voiceGain&&this.ctx)this.voiceGain.gain.setTargetAtTime(this.a.prefs.announcerVolume/100*.95,this.ctx.currentTime,.025);}
 eligible(preview=false){const a=this.a,au=a.audio;return !!(a.prefs.announcer&&a.prefs.announcerVolume>0&&!au.muted&&au.volume>0&&au.ctx?.state==='running'&&!document.hidden&&(preview||!a.practice&&!a.auto&&!a.frozen&&!a.expedition?.photo));}
 async decode(profile,key){
  this.route();const clip=ANNOUNCER_PACK.profiles[profile]?.clips[key];if(!clip||!this.ctx)throw Error('Unknown announcer clip');
  const id=profile+'/'+key;if(!this.cache.has(id)){const bytes=Uint8Array.from(atob(clip.data),c=>c.charCodeAt(0));this.cache.set(id,this.ctx.decodeAudioData(bytes.buffer).catch(error=>{this.cache.delete(id);throw error;}));}return this.cache.get(id);
 }
 request(key,{priority=1,preview=false}={}){
  if(!this.eligible(preview)){this.stats.dropped++;return false;}const profile=this.a.prefs.announcerProfile;if(!ANNOUNCER_PACK.profiles[profile]?.clips[key])return false;
  const now=this.ctx?.currentTime??this.a.audio.ctx.currentTime;
  if(!preview&&now-(this.recent.get(key)??-100)<45){this.stats.dropped++;return false;}
  if(preview){this.stop();this.play(key,profile,true);return true;}
  if(this.source||this.loading||now-this.last<7){if(!this.pending||priority>=this.pending.priority)this.pending={key,profile,priority,expires:performance.now()+Math.max(0,7-(now-this.last))*1000+4000};else this.stats.dropped++;return true;}
  this.play(key,profile,false);return true;
 }
 async play(key,profile,preview){
  this.loading=true;const epoch=this.epoch;
  try{
   const buffer=await this.decode(profile,key);if(epoch!==this.epoch||profile!==this.a.prefs.announcerProfile||!this.eligible(preview))return;
   const src=this.ctx.createBufferSource();src.buffer=buffer;src.connect(this.voiceGain);this.source=src;this.activeSources.add(src);this.last=this.ctx.currentTime;this.recent.set(key,this.last);this.stats.played++;this.stats.peak=Math.max(this.stats.peak,this.activeSources.size);
   this.history.push({key,profile,text:ANNOUNCER_PACK.profiles[profile].clips[key].text,at:this.last,duration:buffer.duration,preview});if(this.history.length>60)this.history.shift();
   const gain=this.ducker.gain;gain.cancelScheduledValues(this.last);gain.setValueAtTime(gain.value,this.last);gain.linearRampToValueAtTime(.34,this.last+.07);
   src.onended=()=>{this.activeSources.delete(src);src.disconnect();if(this.source===src){this.source=null;this.release();}};src.start();
  }catch(error){this.stats.errors++;console.warn('Announcer:',error.message);this.release();}
  finally{if(epoch===this.epoch)this.loading=false;}
 }
 release(){if(!this.ducker||!this.ctx)return;const g=this.ducker.gain,t=this.ctx.currentTime;g.cancelScheduledValues(t);g.setTargetAtTime(1,t,.16);}
 stop(){this.epoch++;this.pending=null;this.loading=false;const src=this.source;this.source=null;if(src){this.activeSources.delete(src);try{src.stop();}catch{}}this.release();}
 tick(){
  if(!this.pending)return;const p=this.pending;if(performance.now()>p.expires||!this.eligible()||p.profile!==this.a.prefs.announcerProfile){this.pending=null;this.stats.dropped++;return;}
  if(this.source||this.loading||this.a.audio.ctx.currentTime-this.last<7)return;this.pending=null;this.request(p.key,{priority:p.priority});
 }
 started(){
  this.route();if(this.welcomed||!this.eligible())return;this.welcomed=true;writeStorage(ANNOUNCER_VISIT,true);this.request(this.returning?'welcome-back':'welcome',{priority:2});
 }
 setProfile(profile){if(!Object.hasOwn(ANNOUNCER_PACK.profiles,profile))return false;this.stop();this.a.prefs.announcerProfile=profile;this.a.savePreferences();return true;}
 info(){return {profile:this.a.prefs.announcerProfile,enabled:this.a.prefs.announcer,volume:this.a.prefs.announcerVolume,speaking:!!this.source,loading:this.loading,pending:this.pending?.key||null,duck:this.ducker?.gain.value??1,decoded:this.cache.size,stats:{...this.stats},history:this.history.slice(),profiles:Object.entries(ANNOUNCER_PACK.profiles).map(([id,p])=>({id,name:p.name,semitones:p.semitones,clips:Object.keys(p.clips).length}))};}
}

const announcerAudioStart=JewelAudio.prototype.start;
JewelAudio.prototype.start=async function(){await announcerAudioStart.call(this);this.announcer?.started();};
const announcerMute=JewelAudio.prototype.setMute;
JewelAudio.prototype.setMute=function(value){announcerMute.call(this,value);if(value)this.announcer?.stop();};
const announcerVolume=JewelAudio.prototype.setVolume;
JewelAudio.prototype.setVolume=function(value){announcerVolume.call(this,value);if(!value)this.announcer?.stop();};
const announcerUpdate=JewelApp.prototype.update;
JewelApp.prototype.update=function(dt){announcerUpdate.call(this,dt);this.announcer?.tick();};
const announcerBoard=JewelApp.prototype.newBoard;
JewelApp.prototype.newBoard=function(...args){this.announcer?.stop();return announcerBoard.apply(this,args);};
const announcerStage=ResonanceFX.prototype.stageShow;
ResonanceFX.prototype.stageShow=function(k){announcerStage.call(this,k);const i=k<6?k:1+((k-6)%5);this.a.announcer?.request(['dawn','tidepool','ember','aurora','starfall','prism-heart'][i],{priority:2});};
const announcerChain=JewelPresentation.prototype.finish;
JewelPresentation.prototype.finish=function(c){announcerChain.call(this,c);if(c>=5)this.app.announcer?.request(c>=9?'constellation':c===8?'parade':c===7?'crown':c===6?'brilliant':'dazzling');};
const announcerResStart=ResonanceFX.prototype.resStart;
ResonanceFX.prototype.resStart=function(){announcerResStart.call(this);this.a.announcer?.request(this.res?.team?'team':'resonance',{priority:3});};
const announcerPayout=CabinetUI.prototype.resPayout;
CabinetUI.prototype.resPayout=function(count,team){announcerPayout.call(this,count,team);this.app.announcer?.request(count>=90?'supernova':count>=60?'prismatic':'radiant',{priority:3});};
const announcerComplete=GemsExpedition.prototype.finish;
GemsExpedition.prototype.finish=function(reason){const finished=this.run.finished;announcerComplete.call(this,reason);if(!finished)this.a.announcer?.request('complete',{priority:2});};
const announcerCalm=GemsExpedition.prototype.calm;
GemsExpedition.prototype.calm=function(){this.a.prefs.announcer=false;this.a.announcer?.stop();return announcerCalm.call(this);};

const announcerPanel=CabinetUI.prototype.drawPanel;
CabinetUI.prototype.drawPanel=function(){
 if(this.tab!=='announcer')return announcerPanel.call(this);const a=this.app,n=a.announcer,p=this.ink,m=this.panelLayout();this.panelRect=m;
 p.box(0,0,a.cssWidth,a.cssHeight,UI_ART.ink,0,.78);this.plaque(m.x,m.y,m.w,m.h,true);this.text('Your announcer',m.x+21,m.y+21,23,UI_ART.highlight,'left',m.w-133,.12,true);this.button('announcer-back','Audio',m.x+m.w-94,m.y+12,76,37);
 p.clip(m.body);const x=m.body.x+6,w=m.body.w-19;let y=m.body.y+13-this.scroll;
 y=this.paragraph('A little celebration for new worlds, big chains and Resonance. Choose a voice and hear it over your music.',x,y,w,13,UI_ART.dim)+18;
 this.toggle('announcer-on','Announcer',a.prefs.announcer,x,y,w);y+=62;this.slider('announcer-volume','Voice volume',a.prefs.announcerVolume,0,100,5,x,y,w,'%');y+=80;
 const chosen=ANNOUNCER_PACK.profiles[a.prefs.announcerProfile],gap=8,bw=(w-gap)/2;this.text('Voice',x,y,16,UI_ART.highlight);y+=32;
 this.button('announcer-voice-silver',ANNOUNCER_PACK.profiles.silver.name,x,y,w,46,a.prefs.announcerProfile==='silver');y+=58;
 for(const [i,id,name]of [[0,'founder','Warm founder'],[1,'cave','Cave-inspired clean']])this.button('announcer-voice-'+id,name,x+i*(bw+gap),y,bw,50,a.prefs.announcerProfile.startsWith(id+'-'));y+=73;
 if(chosen.semitones<0){this.text('Pitch depth',x,y,16,UI_ART.highlight);y+=32;const dw=(w-gap*2)/3;for(const [i,depth,label]of [[0,2,'Lower'],[1,4,'Deep'],[2,6,'Extra deep']])this.button('announcer-depth-'+depth,label,x+i*(dw+gap),y,dw,42,chosen.semitones===-depth);y+=65;}else{this.text(chosen.pitchLabel||'Original pitch',x,y,13,UI_ART.dim);y+=35;}
 for(const [key,label]of [['welcome-back','Welcome back'],['dazzling','Big combo'],['team','Team Resonance']]){this.button('announcer-preview-'+key,'Hear: '+label,x,y,w,42);y+=53;}
 this.text(n.source?'Speaking...':!a.prefs.announcer?'Announcer off.':a.prefs.muted?'Sound is off.':!a.prefs.announcerVolume?'Voice volume is zero.':'Occasional celebrations; the music keeps playing.',x,y,12,UI_ART.dim,'left',w);y+=37;
 this.maxScroll=Math.max(0,y+this.scroll-m.body.y-m.body.h+12);this.scroll=clamp(this.scroll,0,this.maxScroll);p.clip(null);if(this.maxScroll){const h=m.body.h,th=Math.max(26,h*h/(h+this.maxScroll));p.box(m.x+m.w-12,m.body.y,3,h,UI_ART.enamel,1);p.box(m.x+m.w-14,m.body.y+(h-th)*this.scroll/this.maxScroll,6,th,UI_ART.edge,2);}this.text('Esc to return / scroll for more',m.x+21,m.y+m.h-24,11,UI_ART.dim,'left',m.w-42);
};
const announcerActivate=CabinetUI.prototype.activate;
CabinetUI.prototype.activate=function(id){
 const a=this.app,n=a.announcer;if(!n)return announcerActivate.call(this,id);
 if(id==='announcer-open'){a.openPanel('announcer');return;}if(id==='announcer-back'){a.openPanel('audio');return;}
 if(id==='announcer-on'){a.prefs.announcer=!a.prefs.announcer;if(!a.prefs.announcer)n.stop();a.savePreferences();return;}
 if(id.startsWith('announcer-voice-')){const voice=id.slice(16),depth=-ANNOUNCER_PACK.profiles[a.prefs.announcerProfile].semitones||4;n.setProfile(voice==='silver'?'silver':voice+'-'+depth);return;}
 if(id.startsWith('announcer-depth-')){const voice=a.prefs.announcerProfile.split('-')[0];if(voice!=='silver')n.setProfile(voice+'-'+id.slice(16));return;}
 if(id.startsWith('announcer-preview-')){if(a.prefs.muted){a.toast('Turn sound on to hear your announcer.');return;}if(!a.prefs.announcer){a.toast('Turn the announcer on to hear a sample.');return;}a.audio.start().then(()=>n.request(id.slice(18),{preview:true})).catch(()=>{});return;}
 return announcerActivate.call(this,id);
};
