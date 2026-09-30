/* Gems Together 3.3: progression, shared challenges and the player's cabinet.
   Injected after the original classes. Board decisions belong to the host;
   cosmetics, progression, comfort and photos belong to each visitor. */
const EXPEDITION_KEY='gemstogether-expedition-v1';
const EXPEDITION_MODES={zen:'Endless',timed:'Timed',moves:'30 moves',puzzle:'Puzzles',daily:'Daily board'};
const EXPEDITION_ORNAMENTS=[100,500,1500,5000,15000,50000];
const EXPEDITION_PUZZLES=[
 {name:'A little light',seed:1,moves:1,goal:'targets',pair:[1,2],description:'Clear the marked gems in one move.'},
 {name:'Forge a sun',seed:1,moves:2,goal:'blast',pair:[28,36],description:'Forge a blast gem in two moves.'},
 {name:'Find the spectrum',seed:13,moves:3,goal:'prism',pair:[53,61],description:'Forge a prism in three moves.'},
 {name:'Let it cascade',seed:43,moves:3,goal:'chain',pair:[11,19],description:'Reach a five-wave chain in three moves.'}
];
const EXPEDITION_ACHIEVEMENTS=[
 ['FIRST_LIGHT','First light','Clear your first gems.'],['BLAST_FORGED','Forge a sun','Create a blast gem.'],
 ['PRISM_FORGED','The spectrum','Create a prism.'],['CHAIN_5','Dazzling','Reach a five-wave chain.'],
 ['CHAIN_7','Crown of light','Reach a seven-wave chain.'],['CHAIN_9','Constellation','Reach a nine-wave chain.'],
 ['SCORE_5000','Five thousand','Score 5,000 in a run.'],['SCORE_50000','Fifty thousand','Score 50,000 in a run.'],
 ['STAGE_TIDEPOOL','Tidepool','Visit Tidepool.'],['STAGE_EMBER','Ember reef','Visit Ember Reef.'],
 ['STAGE_AURORA','Aurora deep','Visit Aurora Deep.'],['STAGE_STARFALL','Starfall','Visit Starfall.'],
 ['STAGE_PRISM','Prism heart','Visit Prism Heart.'],['RESONANCE','Resonant','Complete a Resonance.'],
 ['SUPERNOVA','Supernova','Clear 90 gems in a Resonance.'],['TEAM_RESONANCE','Together in light','Complete a team Resonance.'],
 ['HIGH_FIVE','High five','Two players clear within one second.'],['COOP_CLEAR','Better together','Clear gems with a partner.'],
 ['TREASURY_1000','A growing treasury','Clear 1,000 lifetime gems.'],['PUZZLE_CLEAR','A little ingenuity','Solve a puzzle.'],
 ['DAILY_CLEAR','A daily ritual','Finish a daily board.'],['TIMED_CLEAR','Two minutes of light','Finish a timed run.']
];
const expeditionDay=()=>new Date().toISOString().slice(0,10);
function expeditionSeed(day){let h=2166136261;for(const c of 'gems-together-daily-v1:'+day)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
const expeditionClone=x=>JSON.parse(JSON.stringify(x));
const expeditionNumber=(v,max=1e12)=>Number.isFinite(v)&&v>=0?Math.min(max,Math.floor(v)):0;
function expeditionProfile(raw){
 const p=raw&&typeof raw==='object'?raw:{};
 const visited=[...new Set([0,...(Array.isArray(p.visited)?p.visited:[]).filter(v=>Number.isInteger(v)&&v>=0&&v<6)])];
 const ids=new Set(EXPEDITION_ACHIEVEMENTS.map(a=>a[0]));
 const bests={};for(const mode of ['timed','moves','daily']){const b=p.bests?.[mode];if(b&&Number.isFinite(b.score)&&Array.isArray(b.samples))bests[mode]={score:expeditionNumber(b.score),samples:b.samples.slice(0,121).filter(x=>Array.isArray(x)&&x.length===2&&x.every(Number.isFinite)&&x[0]>=0&&x[1]>=0).map(x=>[Math.min(120,x[0]),expeditionNumber(x[1])])};}
 const d=p.daily;const daily=d&&/^\d{4}-\d{2}-\d{2}$/.test(d.day)?{day:d.day,score:expeditionNumber(d.score),moves:expeditionNumber(d.moves,30)}:null;
 return {version:1,gems:expeditionNumber(p.gems),visited,achievements:(Array.isArray(p.achievements)?p.achievements:[]).filter(x=>ids.has(x)),puzzles:(Array.isArray(p.puzzles)?p.puzzles:[]).filter(x=>Number.isInteger(x)&&x>=0&&x<EXPEDITION_PUZZLES.length),
  input:{tap:expeditionNumber(p.input?.tap),drag:expeditionNumber(p.input?.drag),pad:expeditionNumber(p.input?.pad),keyboard:expeditionNumber(p.input?.keyboard)},onboarded:!!p.onboarded,bests,daily};
}
class GemsExpedition {
 constructor(app){
  this.a=app;this.profile=expeditionProfile(readStorage(EXPEDITION_KEY,{}));this.lastClear=new Map();this.dailyFriends=new Map();this.socialRates=new Map();this.social=null;this.socialRoom=null;this.announcement=null;this.photo=null;this.saving=false;this.selectedStage=0;this.selectedPuzzle=0;this.tourVisible=!this.profile.onboarded;this.ghost=true;
  this.run=this.makeRun('zen');this.lastClock=performance.now();this.current={chain:0,gems:0,points:0};this.highlights=[];this.forgeFocus=null;this.props=this.buildProps();this.ornamentMesh=app.renderer.createMesh(gemGeometry(5,7).data(),6);this.ornaments=0;
  app.prefs.tapOnly=!!app.prefs.tapOnly;app.prefs.highContrast=!!app.prefs.highContrast;app.prefs.largeCursor=!!app.prefs.largeCursor;app.prefs.ghost=app.prefs.ghost!==false;app.prefs.comboTreatment=app.prefs.comboTreatment!==false;
  window.__jewel.expedition=()=>this.info();window.__jewel.challenge=(mode,options)=>this.start(mode,options);window.__jewel.cheer=()=>this.cheer();
  window.addEventListener('pagehide',()=>this.save());
  window.addEventListener('keydown',event=>{if(event.key.startsWith('Arrow')||event.key===' '||event.key==='Enter')app.lastInputDevice='keyboard';},true);
  if(window.gemsDesktop)for(const id of this.profile.achievements)window.gemsDesktop.unlock(id).catch(()=>{});
 }
 makeRun(mode,options={}){const puzzle=EXPEDITION_PUZZLES[options.puzzle||0];return {id:netID(12),mode,stageStart:mode==='zen'?options.stage||0:0,elapsed:0,started:false,finished:false,reason:'',limit:mode==='timed'?120:mode==='moves'||mode==='daily'?30:mode==='puzzle'?puzzle.moves:0,puzzle:options.puzzle||0,day:mode==='daily'?(options.day||expeditionDay()):'',targets:[],forged:[],bestChain:0,samples:[],cleared:0};}
 get active(){return !this.a.practice&&!this.a.auto&&!this.a.coop?.spectator;}
 get authority(){const n=this.a.coop;return !n?.mirror&&!n?.electing;}
 get offset(){return this.run.stageStart?5000*this.run.stageStart*(this.run.stageStart+1)/2:0;}
 save(){writeStorage(EXPEDITION_KEY,this.profile);}
 input(kind){if(!this.active||!Object.hasOwn(this.profile.input,kind))return;this.profile.input[kind]++;this.dismissTour();this.save();}
 dismissTour(){this.tourVisible=false;this.profile.onboarded=true;this.save();}
 unlock(id){if(this.profile.achievements.includes(id))return;this.profile.achievements.push(id);this.save();const label=EXPEDITION_ACHIEVEMENTS.find(x=>x[0]===id)?.[1];if(label)this.a.toast('Achievement: '+label);window.gemsDesktop?.unlock(id).catch(()=>{});}
 control(){if(!this.authority){this.a.toast('The host chooses the shared challenge. Comfort settings stay yours.');return false;}return true;}
 start(mode='zen',options={}){
  if(!Object.hasOwn(EXPEDITION_MODES,mode)||!this.control())return false;
  const stage=Number(options.stage??this.selectedStage),puzzle=Number(options.puzzle??this.selectedPuzzle);
  if(!Number.isInteger(stage)||stage<0||stage>5||mode==='zen'&&!this.profile.visited.includes(stage))return false;
  if(!Number.isInteger(puzzle)||puzzle<0||puzzle>=EXPEDITION_PUZZLES.length)return false;
  this.run=this.makeRun(mode,{stage,puzzle});this.lastClock=performance.now();this.current={chain:0,gems:0,points:0};this.highlights=[];this.lastClear.clear();this.a.fx.res=null;this.a.fx.resScore=0;this.a.fx.stage=undefined;this.a.gameOver=null;if(this.a.ui){this.a.ui.sc=null;this.a.ui.rc=null;this.a.ui.rp=null;this.a.ui.co=null;this.a.ui.burst=null;}
  const seed=mode==='daily'?expeditionSeed(this.run.day):mode==='puzzle'?EXPEDITION_PUZZLES[puzzle].seed:options.seed??Date.now();
  this.starting=true;try{this.a.newBoard(seed);}finally{this.starting=false;}
  if(mode==='puzzle'&&EXPEDITION_PUZZLES[puzzle].goal==='targets'){
   const b=this.a.board,m=EXPEDITION_PUZZLES[puzzle].pair;[b.cells[m[0]],b.cells[m[1]]]=[b.cells[m[1]],b.cells[m[0]]];
   const plan=b.makeClearPlan([m[1],m[0]]);this.run.targets=plan.clear.map(i=>b.cells[i].id);[b.cells[m[0]],b.cells[m[1]]]=[b.cells[m[1]],b.cells[m[0]]];
  }
  if(this.a.coop?.hosting){this.a.coop.revision++;this.a.coop.publish('reset',{state:this.a.coop.snapshot()});}
  this.a.closePanel();this.a.toast(mode==='zen'?'Endless: '+FX_STAGES[stage].name:mode==='puzzle'?EXPEDITION_PUZZLES[puzzle].description:mode==='daily'?'Daily board: '+this.run.day:'Challenge: '+EXPEDITION_MODES[mode]);return true;
 }
 resetForBoard(fixture){if(this.starting)return;this.run=this.makeRun('zen');this.current={chain:0,gems:0,points:0};this.highlights=[];this.lastClear.clear();this.a.fx.res=null;this.a.fx.stage=undefined;this.forgeFocus=null;}
 acceptSwap(){const r=this.run;if(!this.active)return true;if(r.finished)return false;if(r.mode==='timed'&&r.elapsed>=r.limit)return false;return !['moves','daily','puzzle'].includes(r.mode)||this.a.board.moves<r.limit;}
 tick(dt){
  this.connectSocial();const a=this.a,r=this.run,now=performance.now(),elapsed=a.debugManual?dt:Math.max(0,(now-this.lastClock)/1000);this.lastClock=now;
  if(this.authority&&this.active&&!r.finished&&!a.frozen){if(a.phase==='idle')r.started=true;if(r.started){r.elapsed=Math.min(86400,r.elapsed+Math.max(0,elapsed));if(r.mode==='timed'){const second=Math.min(120,Math.floor(r.elapsed));if(!r.samples.length||r.samples.at(-1)[0]<second)r.samples.push([second,a.board.score]);}}}
  if(this.authority&&this.active&&!r.finished&&a.phase==='idle'){
   if(r.mode==='timed'&&r.elapsed>=r.limit)this.finish('TIME COMPLETE');
   else if(r.mode==='puzzle'&&this.puzzleWon())this.finish('PUZZLE COMPLETE');
   else if(['moves','daily','puzzle'].includes(r.mode)&&a.board.moves>=r.limit)this.finish(r.mode==='puzzle'?'TRY THIS PUZZLE AGAIN':r.mode==='daily'?'DAILY COMPLETE':'RUN COMPLETE');
  }
 }
 recordClear(result,plan,cascade){
  if(!this.active)return;const a=this.a,r=this.run,n=a.coop,removed=result.removed||[],count=removed.length;
  this.profile.gems+=count;r.cleared+=count;r.bestChain=Math.max(r.bestChain,cascade);this.current.chain=Math.max(this.current.chain,cascade);this.current.gems+=count;this.current.points+=result.points;
  const gone=new Set(removed.map(x=>x.tile.id));r.targets=r.targets.filter(id=>!gone.has(id));
  for(const s of plan.create||[]){r.forged.push(s.special);this.unlock(s.special===2?'PRISM_FORGED':'BLAST_FORGED');}
  if(count)this.unlock('FIRST_LIGHT');if(cascade>=5)this.unlock('CHAIN_5');if(cascade>=7)this.unlock('CHAIN_7');if(cascade>=9)this.unlock('CHAIN_9');
  if(a.board.score>=5000)this.unlock('SCORE_5000');if(a.board.score>=50000)this.unlock('SCORE_50000');if(this.profile.gems>=1000)this.unlock('TREASURY_1000');
  if(n?.connected){this.unlock('COOP_CLEAR');const owner=a.turnPlayer||a.turnOwner||'me',t=a.time;
   for(const [other,at]of this.lastClear)if(other!==owner&&t-at>=0&&t-at<=1){this.teamMoment();break;}this.lastClear.set(owner,t);
   if(a.turnOwner==='partner'&&cascade>=5)this.announce('PARTNER x'+cascade,n.publicRoom?n.playerColor(owner):COOP_PALETTE.peer,1.4);
  }
  this.save();
 }
 visit(stage){if(!this.active)return;const k=stage<6?stage:1+((stage-6)%5);if(!this.profile.visited.includes(k)){this.profile.visited.push(k);this.save();if(k)this.unlock(['','STAGE_TIDEPOOL','STAGE_EMBER','STAGE_AURORA','STAGE_STARFALL','STAGE_PRISM'][k]);}}
 finishTurn(cascade){if(!this.active)return;const c=this.current;if(!c.gems)return;
  const tier=Math.max(cascade,c.chain),name=tier>=9?'CONSTELLATION':tier>=8?'PRISM PARADE':tier>=7?'CROWN OF LIGHT':tier>=5?'DAZZLING CHAIN':'CASCADE';
  this.addHighlight({name,chain:c.chain,gems:c.gems,points:c.points,at:Math.round(this.run.elapsed)});
  if(cascade>=7){this.announce(name,TIER_COLS[Math.min(9,cascade)],2.5);this.a.fx.fountain(Math.round(650*this.a.fx.j),this.a.time);}
  this.current={chain:0,gems:0,points:0};
 }
 addHighlight(entry){const all=[...this.highlights,entry],chains=all.filter(x=>!x.resonance).sort((a,b)=>b.chain-a.chain||b.points-a.points),resonances=all.filter(x=>x.resonance).sort((a,b)=>b.gems-a.gems);this.highlights=[...chains.slice(0,5),...resonances.slice(0,3)];}
 resonance(count,team){if(!this.active)return;this.addHighlight({name:count>=90?'SUPERNOVA':count>=60?'PRISMATIC RESONANCE':'RADIANT RESONANCE',chain:0,gems:count,points:0,at:Math.round(this.run.elapsed),resonance:true});this.unlock('RESONANCE');if(count>=90)this.unlock('SUPERNOVA');if(team)this.unlock('TEAM_RESONANCE');}
 puzzleWon(){const p=EXPEDITION_PUZZLES[this.run.puzzle];return p.goal==='targets'?!this.run.targets.length:p.goal==='blast'?this.run.forged.includes(1):p.goal==='prism'?this.run.forged.includes(2):this.run.bestChain>=5;}
 finish(reason){
  const a=this.a,r=this.run;if(r.finished)return;r.finished=true;r.reason=reason;r.score=a.board.score;r.moves=a.board.moves;a.selected=-1;a.grab=-1;a.down=null;a.gameOver={score:r.score,stage:a.fx.stageInfo(),birth:a.time,best:false};
  if(r.mode==='timed'){if(r.samples.at(-1)?.[0]===120)r.samples[r.samples.length-1]=[120,r.score];else r.samples.push([120,r.score]);}this.commitResult();this.a.fx.fanfare();this.a.rumble?.(.9,.6,380);if(a.coop?.hosting)a.coop.publish('settings');
 }
 commitResult(){const r=this.run;if(!r.finished||this.committed===r.id||!this.active)return;this.committed=r.id;
  if(r.mode==='puzzle'&&r.reason==='PUZZLE COMPLETE'){if(!this.profile.puzzles.includes(r.puzzle))this.profile.puzzles.push(r.puzzle);this.unlock('PUZZLE_CLEAR');}
  if(r.mode==='timed')this.unlock('TIMED_CLEAR');
  if(r.mode==='daily'){const old=this.profile.daily;if(!old||old.day!==r.day||r.score>old.score)this.profile.daily={day:r.day,score:r.score,moves:r.moves};this.unlock('DAILY_CLEAR');this.shareDaily();}
  if(['timed','moves','daily'].includes(r.mode)&&(!this.profile.bests[r.mode]||r.score>this.profile.bests[r.mode].score))this.profile.bests[r.mode]={score:r.score,samples:r.samples.slice(-121)};
  this.save();
 }
 ghostScore(){const samples=this.profile.bests.timed?.samples||[],t=this.run.elapsed;let score=0;for(const x of samples){if(x[0]>t)break;score=x[1];}return score;}
 announce(label,col='#ffd98a',duration=2){this.announcement={label,col,at:this.a.time,duration};}
 teamMoment(){if(this.a.time-(this.lastHighFive??-100)<1)return;this.lastHighFive=this.a.time;this.unlock('HIGH_FIVE');this.announce('HIGH FIVE','#8ff7ff',1.8);const fx=this.a.fx,t=this.a.time;fx.trace([.55,1,1],t,1.4);if(fx.on){for(const side of [-1,1])fx.firework([side*4.10,4.10,.30],[.55,1,1],t,1.4);}this.teamFanfare(false);}
 teamFanfare(resonance=true){const a=this.a,au=a.audio;if(!au.started||au.muted||!au.buffers?.glass)return;const key=a.music?.key(au.ctx.currentTime+.6)||au.key||62,root=(au.key||62)+(resonance?12:7)-(key+(resonance?36:19)>105?12:0);[0,7,12,15,19,24].slice(0,resonance?6:3).forEach((v,i)=>au.play(au.buffers.glass[i%6],Math.pow(2,(root+v-69)/12),.075,i%2?.3:-.3,i*.095));}
 calm(){const a=this.a;Object.assign(a.prefs,{flash:'low',juice:80,motion:false,idleMotion:true,musicVolume:28,muted:false,endRun:false});a.applyPreferences();a.savePreferences();a.audio.start().catch(()=>{});if(this.authority)this.start('zen',{stage:0});else a.toast("Jennifer's calm preset applied");}
 connectSocial(){const n=this.a.coop;if(!n?.room){this.social=null;this.socialRoom=null;return;}if(this.socialRoom!==n.room){this.socialRoom=n.room;const [send,on]=n.room.makeAction('gems_social');this.social=send;on((m,id)=>this.receiveSocial(m,id));this.socialPeers='';}const peers=Object.keys(n.room.getPeers()).sort().join(',');if(peers&&peers!==this.socialPeers||performance.now()-(this.dailySent||0)>5000){this.socialPeers=peers;this.dailySent=performance.now();this.shareDaily();}}
 receiveSocial(m,id){
  const n=this.a.coop;if(!m||m.v!==1||typeof id!=='string'||!n?.room?.getPeers()[id])return;
  const now=performance.now(),key=id+':'+m.type;if(now-(this.socialRates.get(key)||-10000)<1200)return;
  if(m.type==='cheer'){this.socialRates.set(key,now);this.showCheer(n.publicRoom?n.playerColor(id):n.role==='host'?COOP_PALETTE.peer:COOP_PALETTE.host);}
  if(m.type==='daily'&&/^\d{4}-\d{2}-\d{2}$/.test(m.day)&&Number.isSafeInteger(m.score)&&m.score>=0&&m.score<=1e12){this.socialRates.set(key,now);this.dailyFriends.set(id,{day:m.day,score:m.score});}
 }
 shareDaily(){const d=this.profile.daily;if(this.social&&d)this.social({v:1,type:'daily',day:d.day,score:d.score}).catch(()=>{});}
 cheer(){const now=performance.now();if(now-(this.lastCheer??-10000)<1500)return false;this.lastCheer=now;const n=this.a.coop,col=n?.publicRoom?n.playerColor():n?.role==='peer'?COOP_PALETTE.peer:COOP_PALETTE.host;this.showCheer(col);this.social?.({v:1,type:'cheer'}).catch(()=>{});return true;}
 showCheer(col){const a=this.a,fx=a.fx,c=color(col);this.announce('A LITTLE CHEER',col,1.6);if(!fx.on)return;const from=[-5.36,-.04,.12],to=[0,4.98,.05];for(let i=0;i<12;i++)a.world.sparks.emit(from,to,c,.11-i*.004,a.time+i*.022,.8,6,i,0);fx.firework(to,c,a.time+.8,1.2);}
 summary(){return {...this.run,forged:[...new Set(this.run.forged)],samples:this.run.samples.slice(-121)};}
 restore(raw){
  if(!raw||!Object.hasOwn(EXPEDITION_MODES,raw.mode)||typeof raw.id!=='string'||raw.id.length>32||!Number.isInteger(raw.stageStart)||raw.stageStart<0||raw.stageStart>5||!Number.isFinite(raw.elapsed)||raw.elapsed<0||!Number.isInteger(raw.puzzle)||raw.puzzle<0||raw.puzzle>=EXPEDITION_PUZZLES.length)return;
  const fresh=this.run.id!==raw.id;this.run={...this.makeRun(raw.mode,{stage:raw.stageStart,puzzle:raw.puzzle}),...expeditionClone(raw),targets:(raw.targets||[]).slice(0,64),forged:(raw.forged||[]).slice(0,64),samples:(raw.samples||[]).slice(-121)};
  if(fresh){this.highlights=[];this.current={chain:0,gems:0,points:0};this.lastClear.clear();this.a.fx.res=null;this.a.fx.resScore=this.a.board.score;this.a.fx.stage=undefined;this.a.gameOver=null;}
  if(this.run.finished){this.a.gameOver={score:this.run.score,stage:this.a.fx.stageInfo(),birth:this.a.time,best:false};this.commitResult();}
 }
 info(){return {version:'3.3.2',run:this.summary(),profile:expeditionClone(this.profile),highlights:expeditionClone(this.highlights),ornaments:EXPEDITION_ORNAMENTS.filter(n=>this.profile.gems>=n).length,tutorial:this.tourVisible,photo:!!this.photo,dailyFriends:[...this.dailyFriends.values()],props:this.props.active||0,ghostScore:this.ghostScore()};}
 buildProps(){
  const meshes=[];for(let form=0;form<6;form++){const g=new Geo(),c=color(['#ffd98a','#78e4e5','#ff9159','#bda9ff','#b4d5ff','#f486ee'][form]);
   if(form===1){g.append(tintGeo(gemGeometry(1,7),c),trs([0,0,0],[0,0,0],[.7,.3,.6]));for(let k=0;k<7;k++){const an=k/7*TAU,pts=[];for(let j=0;j<10;j++)pts.push([Math.cos(an)*(.35+Math.sin(j*.7)*.08),-.2-j*.14,Math.sin(an)*.35+Math.cos(j*.65)*.1]);g.tube(pts,.019,c,3,5);}}
   else if(form===2){for(let k=0;k<7;k++){const an=k/7*TAU;g.tube([[0,-1,0],[Math.cos(an)*.2,-.4,Math.sin(an)*.2],[Math.cos(an)*.5,.25,Math.sin(an)*.5],[Math.cos(an)*.65,.7+(k%3)*.13,Math.sin(an)*.65]],.045,c,3,6);}}
   else if(form===3){const pts=[];for(let k=0;k<48;k++){const t=k/47;pts.push([Math.sin(t*TAU)*.5,t*3-1.5,Math.cos(t*TAU)*.3]);}g.tube(pts,.06,c,3,6);}
   else if(form===4){g.tube([[-.75,0,0],[.75,0,0]],.03,c,3,5);g.tube([[0,-.75,0],[0,.75,0]],.03,c,3,5);g.append(tintGeo(gemGeometry(2,7),c),trs([0,0,0],[0,0,0],[.3,.3,.3]));}
   else {g.append(tintGeo(gemGeometry(form===5?5:2,7),c),trs([0,0,0],[0,0,.15],[.65,1.25,.65]));g.ring([0,0,0],.9,.022,c,3,'y',36);}
   meshes.push(this.a.renderer.createMesh(g.data(),8));
  }return {meshes,active:0};
 }
 meshes(){
  const a=this.a,r=a.renderer,out=[],form=a.fx.fieldForm,t=a.prefs.motion&&!a.frozen?a.time:0,b=a.fx.fieldBlend;
  const forms=b?[[b.form,1-b.progress,b.phase],[form,b.progress,a.fx.propPhase]]:[[form,1,a.fx.propPhase]];this.props.active=0;
  for(const [kind,weight,phaseDepth=0]of forms){if(weight<.001)continue;const instances=[];let count=0;
   for(let i=0;i<8;i++){const opacity=weight*(i<4?1:clamp(phaseDepth-(i<6?0:1),0,1));if(opacity<.001)continue;count++;const scale=.001+.999*opacity,side=i&1?1:-1,row=i>>1,phase=i*1.8,beat=a.fx.beat||0,x=i<4?7.4+row*3:i<6?5.8:10.8,y=i<4?-1.4+row*4.2:i<6?-5.4:4.9,z=i<4?-4-row*3:i<6?-3.6:-8;
    instances.push(...packedInstance(trs([side*x,y+Math.sin(t*.5+phase)*.35-(1-opacity)*.8,z],[.04*Math.sin(t*.3+phase),Math.sin(t*.2+phase)*.3,kind===4?t*.08:Math.sin(t*.3+phase)*.08],[scale*(1+beat*.025),scale*(1+beat*.025),scale]),[opacity,opacity,opacity],(.35+phaseDepth*.1+beat*.15)*opacity,-1));}
   r.upload(this.props.meshes[kind],new Float32Array(instances),count);out.push(this.props.meshes[kind]);this.props.active+=count;
  }
  const ornaments=[];this.ornaments=EXPEDITION_ORNAMENTS.filter(v=>this.profile.gems>=v).length;
  for(let i=0;i<this.ornaments;i++){const side=i&1?1:-1,at=1.2+(i>>1)*.9;ornaments.push(...packedInstance(trs([side*at,-4.40,.43],[0,t*.13,side*.08],[.20,.24,.19]),GEM_COLORS[i%6],.3,-1));}
  r.upload(this.ornamentMesh,new Float32Array(ornaments),this.ornaments);out.push(this.ornamentMesh);return out;
 }
 enterPhoto(){const a=this.a;if(this.photo)return;this.photo={time:a.time,actors:new Map([...a.actors].map(([id,x])=>[id,expeditionClone(x)])),board:expeditionClone(netBoardSave(a)),stage:a.fx.stageInfo().name,score:a.board.score,yaw:0,pitch:0,zoom:1,wantCapture:false,exporting:false};a.openPanel('photo');}
 async capturePhoto(){
  if(this.saving||!this.photo)return;this.saving=true;const a=this.a,p=this.photo;p.wantCapture=false;
  try{const width=a.canvas.width,height=a.canvas.height;const blob=await new Promise(resolve=>a.canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG export failed');this.lastPhoto={size:blob.size,width,height};const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='gems-together-'+p.stage.toLowerCase().replace(/ /g,'-')+'-'+p.score+'.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);a.toast('Photo saved');}
  catch(e){a.toast('Photo could not be saved: '+e.message);}finally{p.exporting=false;this.saving=false;}
 }
}

// Wire progression and modes into real host and peer events.
const expeditionNewBoard=JewelApp.prototype.newBoard;
JewelApp.prototype.newBoard=function(seed,fixture){if(this.expedition&&!this.coop?.mirror)this.expedition.resetForBoard(fixture);const result=expeditionNewBoard.call(this,seed,fixture);if(result!==false)this.music?.reset();return result;};
const expeditionUpdate=JewelApp.prototype.update;
JewelApp.prototype.update=function(dt){this.expedition?.tick(dt);return expeditionUpdate.call(this,dt);};
const expeditionTrySwap=JewelApp.prototype.trySwap;
JewelApp.prototype.trySwap=function(a,b,authorised=false){if(this.expedition&&!this.expedition.acceptSwap())return false;return expeditionTrySwap.call(this,a,b,authorised);};
const expeditionClickCell=JewelApp.prototype.clickCell;
JewelApp.prototype.clickCell=function(i){if(this.expedition&&this.phase==='idle'&&this.selected>=0&&this.board.adjacent(this.selected,i))this.expedition.input(this.keyboardActive?(this.lastInputDevice==='pad'?'pad':'keyboard'):'tap');return expeditionClickCell.call(this,i);};
const expeditionPrepare=JewelPresentation.prototype.startMove;
JewelPresentation.prototype.startMove=function(){const e=this.app.expedition;if(e)e.current={chain:0,gems:0,points:0};return expeditionPrepare.call(this);};
const expeditionForge=JewelPresentation.prototype.forge;
JewelPresentation.prototype.forge=function(at,special,removed){const a=this.app;expeditionForge.call(this,at,special,removed);if(a.expedition){a.expedition.forgeFocus={at,birth:a.time,special};a.fx.trace(special===2?[.6,.9,1]:[1,.8,.4],a.time,.8);if(a.prefs.motion)a.punch=Math.max(a.punch||0,.6);}};
const expeditionFinish=JewelPresentation.prototype.finish;
JewelPresentation.prototype.finish=function(c){this.app.expedition?.finishTurn(c);return expeditionFinish.call(this,c);};
const expeditionApplyClear=JewelBoard.prototype.applyClear;
JewelBoard.prototype.applyClear=function(plan,cascade){const r=expeditionApplyClear.call(this,plan,cascade);if(this.resonanceDouble){this.score+=r.points;r.points*=2;}return r;};
const expeditionExplode=JewelApp.prototype.explode;
JewelApp.prototype.explode=function(authority){this.board.resonanceDouble=!!(this.expedition?.active&&this.expedition.run.mode==='timed'&&this.fx.res?.on);expeditionExplode.call(this,authority);this.expedition?.recordClear(this.clearResult,this.clearPlan,this.cascade);};
const expeditionStageAt=ResonanceFX.prototype.stageAt;
ResonanceFX.prototype.stageAt=function(score){return expeditionStageAt.call(this,score+(this.a.expedition?.offset||0));};
const expeditionStageInfo=ResonanceFX.prototype.stageInfo;
ResonanceFX.prototype.stageInfo=function(k){const info=expeditionStageInfo.call(this,k);const o=this.a.expedition?.offset||0;info.start-=o;info.end-=o;return info;};
const expeditionStageTick=ResonanceFX.prototype.stageTick;
ResonanceFX.prototype.stageTick=function(dt){const tint=this.stTint.slice(),old=this.fieldForm;expeditionStageTick.call(this,dt);if(old!==this.fieldForm&&this.a.expedition)this.stTint=tint;this.blendField(dt);this.a.expedition?.visit(this.stage);};
// Two additive fields share the same clock. Their light crossfades while stage props
// settle into place; the board, score and input continue throughout the journey.
const expeditionBuildField=ResonanceFX.prototype.buildField;
ResonanceFX.prototype.buildField=function(k){const form=k<6?k:1+(k-6)%5;if(form===this.fieldForm)return;
 const previous=this.fieldForm,phase=this.propPhase||0,old=this.a.expedition&&this.field.count?this.field.data.slice():null;
 expeditionBuildField.call(this,k);this.propPhase=0;if(!old)return;
 if(!this.outgoingField){const q=new Geo();q.quad([-.5,-.5,0],[.5,-.5,0],[.5,.5,0],[-.5,.5,0],[1,1,1],0,[[0,0],[1,0],[1,1],[0,1]]);this.outgoingField=new ParticlePool(this.a.renderer,q.data(),FX_FIELD,true);}
 this.outgoingField.data.set(old);this.outgoingField.count=FX_FIELD;
 this.fieldBlend={form:previous,phase,from:old,to:this.field.data.slice(),elapsed:0,progress:0};this.blendField(0);
};
ResonanceFX.prototype.blendField=function(dt){const b=this.fieldBlend;if(!b)return;b.elapsed+=Math.max(0,dt);const x=clamp(b.elapsed/3.2,0,1);b.progress=x*x*(3-2*x);
 const count=this.a.prefs.quality<.9?Math.floor(FX_FIELD*.45):FX_FIELD;
 for(let i=0;i<FX_FIELD;i++){for(let c=8;c<11;c++){const j=i*16+c;this.field.data[j]=b.to[j]*b.progress;this.outgoingField.data[j]=b.from[j]*(1-b.progress);}const size=i*16+11;this.field.data[size]=b.to[size]*Math.sqrt(b.progress);this.outgoingField.data[size]=b.from[size]*Math.sqrt(1-b.progress);}
 this.a.renderer.upload(this.field.mesh,this.field.data,count);this.a.renderer.upload(this.outgoingField.mesh,this.outgoingField.data,count);
 if(x===1){this.outgoingField.mesh.count=0;this.fieldBlend=null;}
};
const expeditionResStart=ResonanceFX.prototype.resStart;
ResonanceFX.prototype.resStart=function(){expeditionResStart.call(this);if(this.res.team)this.a.expedition?.teamFanfare(true);};
const expeditionPayout=CabinetUI.prototype.resPayout;
CabinetUI.prototype.resPayout=function(count,team){this.app.expedition?.resonance(count,team);return expeditionPayout.call(this,count,team);};
const expeditionPose=LivingJewels.prototype.pose;
LivingJewels.prototype.pose=function(actor){const p=expeditionPose.call(this,actor);if(!this.app.prefs.idleMotion||!this.app.prefs.motion||actor.move||actor.pop||actor.charge)return p;const t=this.clock*88/60*TAU+actor.seed;return [p[0]+(actor.tile.type===4?.025*Math.sin(t/2):0),p[1]+(actor.tile.type===2?.035*Math.sin(t/4):0),p[2]+(actor.tile.type===4?.04*Math.sin(t/4):0)];};
const expeditionAnimate=JewelApp.prototype.animateActors;
JewelApp.prototype.animateActors=function(){expeditionAnimate.call(this);if(!this.prefs.idleMotion||!this.prefs.motion)return;for(const actor of this.actors.values()){if(actor.move||actor.pop||actor.charge)continue;const beat=.5+.5*Math.sin(this.living.clock*88/60*TAU+actor.seed);if(actor.tile.type===0){actor.scale[0]*=1+.025*beat;actor.scale[1]*=1+.04*beat;}if(actor.tile.type===2)actor.energy+=Math.pow(beat,14)*.25;}};

const expeditionSettings=CoopRoom.prototype.settings;
CoopRoom.prototype.settings=function(){const s=expeditionSettings.call(this),e=this.app.expedition;delete s.juice;if(e)s.expedition=e.summary();return s;};
const expeditionApplySettings=CoopRoom.prototype.applySettings;
CoopRoom.prototype.applySettings=function(s){if(s){const local={...s};delete local.juice;expeditionApplySettings.call(this,local);}if(s?.expedition&&this.mirror)this.app.expedition?.restore(s.expedition);};
const expeditionSharedControl=CoopRoom.prototype.sharedControl;
CoopRoom.prototype.sharedControl=function(id){return id==='juice'?false:expeditionSharedControl.call(this,id);};
const expeditionSnapshot=CoopRoom.prototype.snapshot;
CoopRoom.prototype.snapshot=function(){const s=expeditionSnapshot.call(this);if(this.app.expedition){s.expedition={run:this.app.expedition.summary(),highlights:expeditionClone(this.app.expedition.highlights),current:expeditionClone(this.app.expedition.current)};s.resonance=expeditionClone(this.app.fx.res||null);s.turnPlayer=this.app.turnPlayer||'';}return s;};
const expeditionRestore=CoopRoom.prototype.restore;
CoopRoom.prototype.restore=function(s,local){expeditionRestore.call(this,s,local);const e=this.app.expedition;if(e&&s.expedition){e.restore(s.expedition.run);e.highlights=(s.expedition.highlights||[]).slice(0,8);e.current=s.expedition.current||{chain:0,gems:0,points:0};}if(s.resonance){this.app.fx.res=expeditionClone(s.resonance);if(this.mirror){const r=this.app.fx.res;[r.mine,r.theirs]=[r.theirs,r.mine];}}this.app.turnPlayer=s.turnPlayer||'';};
const expeditionPublishSwap=CoopRoom.prototype.publishSwap;
CoopRoom.prototype.publishSwap=function(a,b){if(!this.hosting)return;this.publish('start_swap',{a,b,board:netBoardSave(this.app),actors:this.app.swapActors.map(x=>netClone(x)),forced:this.app.swapResult?.forced?[...this.app.swapResult.forced]:null,player:this.app.turnPlayer});};
const expeditionApplyEvent=CoopRoom.prototype.applyEvent;
CoopRoom.prototype.applyEvent=function(m){if(m.type==='start_swap'){this.app.turnPlayer=m.player||this.hostID;const own=m.player===this.selfId;const pending=this.pending;if(pending&&own)pending.accepted=true;}
 expeditionApplyEvent.call(this,m);if(m.type==='start_swap'&&m.player)this.app.turnOwner=m.player===this.selfId?'me':'partner';};

// Photo mode is a local view. The authoritative board and network keep advancing.
const expeditionCamera=JewelApp.prototype.updateCamera;
JewelApp.prototype.updateCamera=function(){expeditionCamera.call(this);const p=this.expedition?.photo;if(!p)return;const z=cabinetFraming(this.cssWidth,this.cssHeight).distance*p.zoom;this.eye=[Math.sin(p.yaw)*z,.62+Math.sin(p.pitch)*z,Math.cos(p.yaw)*z];this.forward=vnorm(vsub([0,0,0],this.eye));this.right=vnorm(vcross(this.forward,[0,1,0]));this.up=vcross(this.right,this.forward);this.vp=matMul(perspective(42*PI/180,this.cssWidth/this.cssHeight,.1,150),lookAt(this.eye,[0,0,0],[0,1,0]));};
const expeditionFXFrame=ResonanceFX.prototype.frame;
ResonanceFX.prototype.frame=function(){const a=this.a;if(a.expedition?.photo)return;expeditionFXFrame.call(this);
 if(this.fieldForm===4&&this.on&&a.prefs.motion&&!a.frozen&&this.beats!==this.shootingBeat&&this.beats%4===0){this.shootingBeat=this.beats;for(let i=0;i<3;i++)a.world.sparks.emit([-16-i*1.1,6.5+i*.8,-7-i*.4],[16,-4.5,0],[1.3,1.55,2],.12-i*.02,a.time+i*.12,1.7,10,i*13+.5,-.2);}
};
const expeditionDraw=JewelApp.prototype.draw;
JewelApp.prototype.draw=function(){const e=this.expedition,p=e?.photo;if(!p)return expeditionDraw.call(this);const original={actors:this.actors,time:this.time,board:this.board,shake:this.shake,punch:this.punch};try{this.actors=p.actors;this.time=p.time;this.board={...this.board,...p.board,rng:this.board.rng,legalMoves:()=>[]};this.shake=0;this.punch=0;p.exporting=p.wantCapture||e.saving;expeditionDraw.call(this);if(p.wantCapture)e.capturePhoto();}finally{Object.assign(this,original);}};

CabinetUI.prototype.expeditionHUD=function(){
 const a=this.app,e=a.expedition,p=this.ink;if(!e||e.photo||a.panelOpen)return;const r=e.run,w=a.cssWidth;
 if(r.mode!=='zen'&&!a.practice){const label=r.mode==='timed'?Math.max(0,Math.ceil(120-r.elapsed))+' seconds':r.mode==='puzzle'?EXPEDITION_PUZZLES[r.puzzle].name:r.mode==='daily'?'DAILY '+r.day:'30-MOVE CHALLENGE',detail=r.mode==='timed'?'Resonance scores double':Math.max(0,r.limit-a.board.moves)+' moves left',gs=e.ghostScore(),d=a.board.score-gs,hasGhost=r.mode==='timed'&&a.prefs.ghost&&e.profile.bests.timed;
  if(this.plaqueAt){const [x,y,w,h]=this.plaqueAt,yy=y+h+116;this.text(label,x+3,yy,13,UI_ART.highlight,'left',w-6,.12,true);this.text(detail,x+3,yy+24,11,UI_ART.dim,'left',w-6);if(hasGhost){this.text('Ghost '+gs+' / '+(d>=0?'+':'')+d,x+3,yy+48,11,UI_ART.aqua,'left',w-6);const f=clamp(gs/Math.max(1,e.profile.bests.timed.score),0,1);p.line(x+3,yy+68,x+w-3,yy+68,2,UI_ART.brass,.4);p.box(x+3+(w-6)*f-2,yy+65,4,6,UI_ART.aqua,1,.6);}}
  else{const {cx,bw}=this.boardBox(),y=this.boardRect.y+this.boardRect.h+9;this.text(label+' / '+(hasGhost?'ghost '+gs:detail),cx,y,11,UI_ART.highlight,'center',bw-8,.12,true);}}
 if(e.tourVisible&&a.board.moves===0&&r.mode==='zen'&&!a.practice&&!a.gameOver){if(this.plaqueAt){const [x,y,w,h]=this.plaqueAt,yy=y+h+118;this.plaque(x,yy-10,w,125,true);const end=this.paragraph('Tap a gem, then its neighbour.',x+8,yy,w-16,13,UI_ART.highlight);this.text('Drag and controller also work.',x+8,end+4,10,UI_ART.dim,'left',w-16);this.button('exp-dismiss','Got it',x+7,end+28,w-14,32);}else{const {cx,bw}=this.boardBox(),y=this.boardRect.y+this.boardRect.h+8;this.text('Tap a gem, then its neighbour',cx,y,11,UI_ART.highlight,'center',bw-8);this.hit('exp-dismiss',cx-bw/2,y-3,bw,20,'button',null,'Dismiss first-run hint');}}
 const ann=e.announcement;if(ann){const age=a.time-ann.at;if(age>=0&&age<ann.duration){const {cx,cy,bw}=this.boardBox(),al=Math.min(1,age*10)*clamp((ann.duration-age)/.4,0,1);p.opacity=al;this.text(ann.label,cx,cy-bw*.28,Math.min(36,bw*.08)*(1+.3*Math.exp(-age*12)),ann.col,'center',bw*1.1,.15,true);p.opacity=1;}}
};
// Weld the rendered mesh once. Split shared edges at facet midpoints so the
// crown's T junctions do not turn into spurious silhouette segments.
const gemContourMeshes=new Map();
function gemContourMesh(type){
 if(gemContourMeshes.has(type))return gemContourMeshes.get(type);
 const data=gemGeometry(type).data(),vertices=[],faces=[],ids=new Map(),edges=new Map();
 for(let offset=0;offset<data.length;offset+=36){const face=[];for(let k=0;k<3;k++){const v=Array.from(data.slice(offset+k*12,offset+k*12+3)),key=v.join(',');if(!ids.has(key)){ids.set(key,vertices.length);vertices.push(v);}face.push(ids.get(key));}faces.push(face);}
 faces.forEach((face,f)=>{for(let k=0;k<3;k++){const from=face[k],to=face[(k+1)%3],v=vertices[from],d=vsub(vertices[to],v),len=vdot(d,d),cuts=[[0,from],[1,to]];
  vertices.forEach((p,i)=>{if(i===from||i===to)return;const t=vdot(vsub(p,v),d)/len;if(t<=0||t>=1)return;const delta=vsub(p,vadd(v,vmul(d,t)));if(vdot(delta,delta)<1e-13)cuts.push([t,i]);});cuts.sort((a,b)=>a[0]-b[0]);
  for(let j=1;j<cuts.length;j++){const a=cuts[j-1][1],b=cuts[j][1],key=Math.min(a,b)+':'+Math.max(a,b);if(!edges.has(key))edges.set(key,{a,b,faces:[]});edges.get(key).faces.push(f);}
 }});
 const mesh={vertices,faces,edges:[...edges.values()]};gemContourMeshes.set(type,mesh);return mesh;
}
function gemContours(actor,app){
 const mesh=gemContourMesh(actor.tile.type),model=trs(actor.pos,actor.rotation,actor.scale),points=mesh.vertices.map(v=>project(transform(model,v),app.vp,app.cssWidth,app.cssHeight));
 const front=mesh.faces.map(([a,b,c])=>(points[b][0]-points[a][0])*(points[c][1]-points[a][1])-(points[b][1]-points[a][1])*(points[c][0]-points[a][0])<0);
 const edges=mesh.edges.filter(e=>e.faces.some(f=>front[f])&&(e.faces.length===1||e.faces.some(f=>!front[f]))),links=new Map();
 edges.forEach((e,i)=>{for(const v of [e.a,e.b]){if(!links.has(v))links.set(v,[]);links.get(v).push(i);}});
 const used=new Set(),loops=[];
 for(let i=0;i<edges.length;i++){if(used.has(i))continue;const start=edges[i].a,path=[...points[start].slice(0,2)];let current=start,next=i;
  while(next!==undefined&&!used.has(next)){used.add(next);const edge=edges[next];current=edge.a===current?edge.b:edge.a;path.push(...points[current].slice(0,2));if(current===start)break;next=links.get(current)?.find(k=>!used.has(k));}
  if(current===start&&path.length>=8)loops.push(path);
 }
 // Facet folds can create hidden interior loops. The preview traces the outer
 // silhouette only; keep the heart's concave notch rather than a convex hull.
 const area=path=>{let sum=0;for(let k=2;k<path.length;k+=2)sum+=path[k-2]*path[k+1]-path[k]*path[k-1];return Math.abs(sum);};
 loops.sort((a,b)=>area(b)-area(a));return loops.slice(0,1);
}
CabinetUI.prototype.expeditionDecor=function(){
 const a=this.app,e=a.expedition,p=this.ink;if(!e||e.photo||a.panelOpen)return;
 const marks=new Map(),mark=(i,col,width=2)=>marks.set(i,{col,width});
 if(a.prefs.highContrast)for(let i=0;i<64;i++)mark(i,'#ffffff',1.5);
 if(a.selected>=0&&a.phase==='idle'){mark(a.selected,'#ffe27a',3);for(const j of [a.selected-8,a.selected+8,a.selected-1,a.selected+1])if(a.board.adjacent(a.selected,j)){const q=window.__jewel.project(j),s=window.__jewel.project(a.selected),t=(a.time*1.5)%1,x=mix(s[0],q[0],t),y=mix(s[1],q[1],t);p.box(x-2.5,y-2.5,5,5,'#8ff7ff',2,.8);mark(j,'#8ff7ff',1);}}
 if(e.run.mode==='puzzle')for(let i=0;i<64;i++)if(e.run.targets.includes(a.board.cells[i]?.id)){mark(i,'#ffe27a',3);const q=window.__jewel.project(i);p.box(q[0]-3,q[1]+19,6,6,'#ffe27a',2);}
 for(const [i,{col,width}]of marks){const ac=a.getActor(i);if(!ac||ac.pop||ac.pos[1]>3.75)continue;for(const pts of gemContours(ac,a))p.poly(pts,width,col,.9);}
 const f=e.forgeFocus;if(f&&a.time-f.birth<.8){const ac=a.getActor(f.at);if(ac){const q=project([ac.pos[0],ac.pos[1],.55],a.vp,a.cssWidth,a.cssHeight),R=24+(a.time-f.birth)*35,pts=[];for(let k=0;k<=32;k++){const t=k/32*TAU;pts.push(q[0]+Math.cos(t)*R,q[1]+Math.sin(t)*R);}p.poly(pts,3,f.special===2?'#8ff7ff':'#ffe27a',clamp(1-(a.time-f.birth)/.8,0,1));}}
};
const expeditionDrawHUD=CabinetUI.prototype.drawHUD;
CabinetUI.prototype.drawHUD=function(){if(this.app.expedition?.photo)return;expeditionDrawHUD.call(this);this.expeditionHUD();};
const expeditionDrawCursor=CabinetUI.prototype.drawCursor;
CabinetUI.prototype.drawCursor=function(){this.expeditionDecor();return expeditionDrawCursor.call(this);};
CabinetUI.prototype.coopRail=function(bottom){const a=this.app,n=a.coop,w=a.cssWidth,h=a.cssHeight,gap=7,items=[['hint','Hint'],['journey','Journey'],['demo',a.auto?'Stop demo':'Showcase'],['sound',a.prefs.muted?'Sound off':'Sound on'],['settings','Settings'],['coop-open','Co-op Room']];const cols=w>=600?6:4,width=Math.min(w-24,w>=600?780:528),bw=(width-gap*(cols-1))/cols,x=(w-width)/2,y=Math.min(h-(w>=600?57:105),bottom+28);
 items.forEach(([id,label],i)=>{if(w<600&&i===5)this.button(id,n?.publicRoom?'Public / '+Math.max(1,n.playerCount)+' players':'Co-op Room',x+width*.35+gap,y+50,width*.65-gap,38,!!n?.connected);else if(w<600&&i===4)this.button(id,label,x,y+50,width*.35,38);else this.button(id,label,x+(i%cols)*(bw+gap),y+Math.floor(i/cols)*50,bw,w>=600?42:40,id==='sound'?!a.prefs.muted:id==='demo'?a.auto:false);});return y;};

CabinetUI.prototype.expeditionPanel=function(){
 const a=this.app,e=a.expedition,p=this.ink;if(this.tab==='photo'){this.photoPanel();return;}
 const m=this.panelLayout();this.panelRect=m;p.box(0,0,a.cssWidth,a.cssHeight,UI_ART.ink,0,.78);this.plaque(m.x,m.y,m.w,m.h,true);this.text('Your journey',m.x+21,m.y+21,23,UI_ART.highlight,'left',m.w-133,.12,true);this.button('close','Back',m.x+m.w-94,m.y+12,76,37);
 const tabs=[['journey','Journey'],['play','Play'],['moments','Moments'],['comfort','Comfort'],['music-toys','Music']],cols=a.cssWidth<500?3:5,tw=(m.w-32-4*(cols-1))/cols;
 tabs.forEach(([id,label],i)=>this.button('exp-tab-'+id,label,m.x+16+(i%cols)*(tw+4),m.y+59+Math.floor(i/cols)*41,tw,34,this.tab===id));
 p.clip(m.body);const x=m.body.x+6,y0=m.body.y+13-this.scroll,w=m.body.w-19;let y=y0;
 const para=t=>{y=this.paragraph(t,x,y,w,13,UI_ART.dim)+12;};const title=t=>{this.text(t,x,y,18,UI_ART.highlight,'left',w,.12);y+=35;};const row=(id,label,on=false)=>{this.button(id,label,x,y,w,42,on);y+=53;};
 if(this.tab==='journey'){
  title(e.profile.gems.toLocaleString()+' lifetime gems');para('The stages you visit stay with you. Choose an unlocked skin as the start of your next endless journey.');
  const h=64;FX_STAGES.forEach((s,k)=>{const unlocked=e.profile.visited.includes(k),col=stageHex({...s});p.line(x+15,y+7,x+15,y+h-5,2,UI_ART.brass,.55);p.box(x+8,y+15,14,14,unlocked?col:UI_ART.muted,5,unlocked?1:.4);this.text((k+1)+'  '+s.name,x+39,y+6,14,unlocked?UI_ART.text:UI_ART.muted,'left',w-154);this.text(unlocked?'Visited':'Keep travelling',x+39,y+29,11,UI_ART.dim,'left',w-154);if(unlocked)this.button('exp-stage-'+k,e.selectedStage===k?'Selected':'Start here',x+w-108,y,108,42,e.selectedStage===k);y+=h;});
  row('exp-mode-zen','Start endless',true);title('Your treasury');const count=EXPEDITION_ORNAMENTS.filter(n=>e.profile.gems>=n).length,next=EXPEDITION_ORNAMENTS[count];para(count+' of 6 cabinet ornaments earned. '+(next?(next-e.profile.gems).toLocaleString()+' gems until your next ornament.':'Every ornament is yours.'));const start=count?EXPEDITION_ORNAMENTS[count-1]:0,f=next?clamp((e.profile.gems-start)/(next-start),0,1):1;p.box(x,y,w,8,UI_ART.enamel,3);p.box(x,y,w*f,8,UI_ART.highlight,3);y+=30;row('exp-photo','Photo mode');
 }else if(this.tab==='play'){
  para(a.coop?.mirror?'The host starts challenges for the room. Everyone shares the board, timer and move budget.':'Start a challenge for everyone on this board. Endless is always available.');
  for(const [mode,label,desc]of [['zen','Endless','No timer or move limit.'],['timed','Two minutes','Resonance clears score double. Race your best run ghost.'],['moves','30 moves','Make each move count. Cascades cost no extra moves.'],['daily','Daily board: '+expeditionDay(),'A shared seed and 30 moves. Compare today with connected friends.']]){row('exp-mode-'+mode,label,e.run.mode===mode);para(desc);}
  title('Puzzle boards');EXPEDITION_PUZZLES.forEach((q,i)=>{row('exp-puzzle-'+i,(e.profile.puzzles.includes(i)?'Solved / ':'')+(i+1)+'. '+q.name,e.selectedPuzzle===i);para(q.description);});
  const d=e.profile.daily;if(d?.day===expeditionDay())para('Your daily best: '+d.score.toLocaleString());for(const d of e.dailyFriends.values())if(d.day===expeditionDay())para('Connected friend: '+d.score.toLocaleString());
  if(a.padState?.id){title('Controller');this.padLegend(x,y,w);y+=75;}
 }else if(this.tab==='moments'){
  title('This session');if(!e.highlights.length)para('Your best chains and Resonance payouts will appear here as you play.');
  e.highlights.forEach(q=>{this.text(q.name,x,y,15,q.resonance?'#b9a4ff':'#ffe27a','left',w);y+=27;para((q.chain?'x'+q.chain+' / ':'')+q.gems+' gems'+(q.points?' / '+q.points.toLocaleString()+' points':'')+' / '+q.at+' seconds');});
  row('exp-cheer','Send a cheer');title('Achievements');EXPEDITION_ACHIEVEMENTS.forEach(([id,name,desc])=>{const on=e.profile.achievements.includes(id);this.text((on?'* ':'')+name,x,y,14,on?UI_ART.highlight:UI_ART.dim,'left',w);y+=25;para(desc);});
 }else if(this.tab==='comfort'){
  row('exp-calm',"Jennifer's calm preset");para('Endless, Flashes Low, Juice 80, music on and a steady camera.');
  for(const [key,label]of [['tapOnly','Tap-tap swaps only'],['highContrast','High contrast outlines'],['largeCursor','Larger cursor'],['comboTreatment','Big combo screen flash'],['ghost','Best run ghost']])row('exp-pref-'+key,label+': '+(a.prefs[key]?'On':'Off'),!!a.prefs[key]);
  const i=e.profile.input;para('Swap gestures: '+i.tap+' tap / '+i.drag+' drag / '+i.pad+' pad / '+i.keyboard+' keyboard.');row('exp-tutorial','Show tap-to-swap hint');row('exp-photo','Photo mode');row('fullscreen','Fullscreen');
  if(window.gemsDesktop){title('Window size');for(const [W,H]of [[1280,720],[1600,900],[1920,1080]])row('exp-resolution-'+W+'x'+H,W+' x '+H);}
 }else{
  title('The music follows you');para('One steady 88 BPM. Earned layers hold, then step down gently. Your own loaded track takes priority.');
  const names=['Pad','Bass','Arpeggio','Drums','Lead'];names.forEach((name,i)=>{const level=a.music.lv[i]||0;this.text(name,x,y,15,level>.3?UI_ART.highlight:UI_ART.dim);this.text(Math.round(level*100)+'%',x+w,y,13,UI_ART.aqua,'right');y+=29;p.box(x,y,w,12,UI_ART.enamel,4);p.box(x,y,w*clamp(level,0,1),12,level>.3?'#8ff7ff':UI_ART.brass,4);y+=43;});para(a.audio.loadedTrack?'Playing your local track. The generative soundtrack is waiting.':a.audio.started&&!a.audio.muted?'The soundtrack is playing.':'Turn sound on to hear the layers.');row('sound',a.prefs.muted?'Sound on':'Sound off');row('exp-audio','Audio settings');
 }
 this.maxScroll=Math.max(0,y+this.scroll-m.body.y-m.body.h+12);this.scroll=clamp(this.scroll,0,this.maxScroll);p.clip(null);if(this.maxScroll){const h=m.body.h,th=Math.max(26,h*h/(h+this.maxScroll));p.box(m.x+m.w-12,m.body.y,3,h,UI_ART.enamel,1);p.box(m.x+m.w-14,m.body.y+(h-th)*this.scroll/this.maxScroll,6,th,UI_ART.edge,2);}this.text('Esc to return / scroll for more',m.x+21,m.y+m.h-24,11,UI_ART.dim,'left',m.w-42);
};
CabinetUI.prototype.padLegend=function(x,y,w){const g=this.app.padState?.id||'',ps=/dualsense|dualshock|playstation|054c/i.test(g),p=this.ink;const labels=ps?['Select','Back','Hint','Point']:['A select','B back','X hint','Y point'];for(let i=0;i<4;i++){const cx=x+(i+.5)*w/4,cy=y+12;if(ps){if(i===0){p.line(cx-7,cy-7,cx+7,cy+7,2,UI_ART.aqua);p.line(cx-7,cy+7,cx+7,cy-7,2,UI_ART.aqua);}if(i===1){const pts=[];for(let k=0;k<=20;k++){const a=k/20*TAU;pts.push(cx+Math.cos(a)*8,cy+Math.sin(a)*8);}p.poly(pts,2,'#f486ee');}if(i===2)p.poly([cx-7,cy-7,cx+7,cy-7,cx+7,cy+7,cx-7,cy+7,cx-7,cy-7],2,'#b9a4ff');if(i===3)p.poly([cx,cy-8,cx+8,cy+7,cx-8,cy+7,cx,cy-8],2,'#8addb5');}else this.text('ABXY'[i],cx,cy-8,18,UI_ART.aqua,'center',20);this.text(labels[i],cx,y+36,10,UI_ART.dim,'center',w/4-6);}};
CabinetUI.prototype.photoPanel=function(){const a=this.app,e=a.expedition,p=e.photo;if(!p)return;this.text(p.stage,a.cssWidth/2,18,21,UI_ART.highlight,'center',a.cssWidth-24,.12,true);this.text('Score '+p.score.toLocaleString()+' / Gems Together by Tront',a.cssWidth/2,49,12,UI_ART.text,'center',a.cssWidth-24);if(p.exporting)return;const w=Math.min(680,a.cssWidth-24),x=(a.cssWidth-w)/2,y=a.cssHeight-116,bw=(w-21)/4;[['exp-photo-left','Orbit left'],['exp-photo-right','Orbit right'],['exp-photo-save',e.saving?'Saving...':'Save PNG'],['close','Back']].forEach(([id,label],i)=>this.button(id,label,x+i*(bw+7),y,bw,40));this.text('Your view is frozen. The shared board continues.',a.cssWidth/2,y+56,11,UI_ART.dim,'center',a.cssWidth-24);};
const expeditionPanelOriginal=CabinetUI.prototype.drawPanel;
CabinetUI.prototype.drawPanel=function(){if(['journey','play','moments','comfort','music-toys','photo'].includes(this.tab)&&this.app.expedition)return this.expeditionPanel();return expeditionPanelOriginal.call(this);};
const expeditionActivate=CabinetUI.prototype.activate;
CabinetUI.prototype.activate=function(id){const a=this.app,e=a.expedition;if(!e)return expeditionActivate.call(this,id);
 if(id==='journey'){a.openPanel('journey');return;}if(id==='exp-dismiss'){e.dismissTour();return;}
 if(id.startsWith('exp-tab-')){this.tab=id.slice(8);this.scroll=0;return;}if(id.startsWith('exp-stage-')){const k=Number(id.slice(10));if(e.profile.visited.includes(k)){e.selectedStage=k;e.start('zen',{stage:k});}return;}
 if(id.startsWith('exp-mode-')){e.start(id.slice(9));return;}if(id.startsWith('exp-puzzle-')){e.selectedPuzzle=Number(id.slice(11));e.start('puzzle',{puzzle:e.selectedPuzzle});return;}
 if(id.startsWith('exp-pref-')){const key=id.slice(9);if(['tapOnly','highContrast','largeCursor','comboTreatment','ghost'].includes(key)){a.prefs[key]=!a.prefs[key];a.savePreferences();}return;}
 if(id==='exp-calm'){e.calm();return;}if(id==='exp-cheer'){e.cheer();return;}if(id==='exp-tutorial'){e.tourVisible=true;a.closePanel();return;}if(id==='exp-audio'){a.openPanel('audio');return;}if(id==='exp-comfort'){a.openPanel('comfort');return;}if(id==='exp-music'){a.openPanel('music-toys');return;}
 if(id==='exp-photo'){e.enterPhoto();return;}if(id==='exp-photo-left'||id==='exp-photo-right'){if(e.photo)e.photo.yaw=clamp(e.photo.yaw+(id.endsWith('left')?-.06:.06),-.3,.3);return;}
 if(id==='exp-photo-save'){if(e.photo&&!e.saving)e.photo.wantCapture=true;return;}if(id.startsWith('exp-resolution-')){const [w,h]=id.slice(15).split('x').map(Number);window.gemsDesktop?.resolution(w,h).catch(err=>a.toast(err.message));return;}
 if(id==='again'&&e.run.finished){e.start(e.run.mode,{stage:e.run.stageStart,puzzle:e.run.puzzle});return;}if(id==='exp-endless'){e.start('zen',{stage:0});return;}if(id==='exp-next-puzzle'){e.start('puzzle',{puzzle:(e.run.puzzle+1)%EXPEDITION_PUZZLES.length});return;}
 return expeditionActivate.call(this,id);
};
const expeditionClosePanel=JewelApp.prototype.closePanel;
JewelApp.prototype.closePanel=function(){if(this.expedition?.photo){this.expedition.photo=null;this.fx.last=performance.now();this.ui.hits=[];}return expeditionClosePanel.call(this);};
const expeditionFullscreen=JewelApp.prototype.fullscreen;
JewelApp.prototype.fullscreen=function(){if(window.gemsDesktop)return window.gemsDesktop.fullscreen().catch(err=>this.toast(err.message));return expeditionFullscreen.call(this);};
const expeditionGameOver=CabinetUI.prototype.drawGameOver;
CabinetUI.prototype.drawGameOver=function(){const a=this.app,e=a.expedition,r=e?.run;if(!r?.finished)return expeditionGameOver.call(this);if(a.panelOpen)return;const p=this.ink,{cx,cy,bw}=this.boardBox(),W=bw*.91,H=Math.min(440,Math.max(330,bw*.84)),x=cx-W/2,y=cy-H/2;p.box(x-8,y-8,W+16,H+16,UI_ART.ink,10,.96);this.plaque(x,y,W,H,true);this.text(r.reason,cx,y+25,Math.min(27,bw*.067),UI_ART.highlight,'center',W-24,.12,true);this.text((r.score||0).toLocaleString(),cx,y+76,Math.min(60,bw*.14),UI_ART.text,'center',W-24,.13,true);this.text(r.moves+' moves / '+r.cleared+' gems',cx,y+147,13,UI_ART.dim,'center',W-24);if(e.highlights[0])this.text(e.highlights[0].name+(e.highlights[0].chain?' x'+e.highlights[0].chain:''),cx,y+180,13,'#8ff7ff','center',W-24);const bx=x+18,ww=W-36,by=y+H-113;this.button(r.mode==='puzzle'&&r.reason==='PUZZLE COMPLETE'?'exp-next-puzzle':'again',r.mode==='puzzle'&&r.reason==='PUZZLE COMPLETE'?'Next puzzle':'Play again',bx,by,ww,42);this.button('exp-endless','Return to endless',bx,by+52,ww,42);};
const expeditionPollPad=JewelApp.prototype.pollPad;
JewelApp.prototype.pollPad=function(){const g=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);if(g&&(g.buttons.some(b=>b.pressed)||g.axes.some(v=>Math.abs(v)>.55)))this.lastInputDevice='pad';if(!this.panelOpen)return expeditionPollPad.call(this);if(!g)return;const S=this.menuPad||(this.menuPad={buttons:[],next:0}),now=performance.now(),bt=i=>!!g.buttons[i]?.pressed,down=i=>bt(i)&&!S.buttons[i],ui=this.ui;this.padState=this.padState||{};this.padState.id=g.id;
 if(down(1)||down(9)){this.closePanel();S.buttons=g.buttons.map(b=>b.pressed);return;}let dir=bt(12)||g.axes[1]<-.55?-1:bt(13)||g.axes[1]>.55?1:0;
 if(dir&&now>S.next){S.next=now+180;const hits=ui.hits.filter(h=>h.kind==='button'),i=hits.findIndex(h=>h.id===ui.focus);ui.focus=hits[(i+dir+hits.length)%hits.length]?.id;if(!hits.length)ui.scroll=clamp(ui.scroll+dir*55,0,ui.maxScroll);}
 if((bt(6)||bt(7))&&now>S.next){S.next=now+130;ui.scroll=clamp(ui.scroll+(bt(7)?1:-1)*100,0,ui.maxScroll);}
 if(down(0)&&ui.focus)ui.activate(ui.focus);S.buttons=g.buttons.map(b=>b.pressed);
};
