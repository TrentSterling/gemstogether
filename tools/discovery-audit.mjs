// Exercise discovery with the first torrent tracker unavailable. All rooms are isolated.
import {launch,sleep,until} from './cdp.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=pathToFileURL(resolve(process.argv[2]||'index.html')).href,J='window.__jewel',out='tools/out/release';
mkdirSync(out,{recursive:true});let pass=0,fail=0;const receipts=[];
const ok=(name,v,detail)=>{v?pass++:fail++;receipts.push({name,pass:!!v,detail});console.log(`${v?'PASS':'FAIL'} ${name}${detail?' '+JSON.stringify(detail):''}`);};
const sockets=p=>p.eval(`(()=>{const m=${J}.app.coop.module;return Object.entries(m.getRelaySockets()).map(([url,s])=>({url,nativeUrl:window.__nativeSocketURL.call(s),state:s.readyState}));})()`);
for(const single of [true,false]){
 let A,B;const tag=single?'single tracker control':'redundant discovery';
 try{
  A=await launch({port:10110+(single?0:2)});B=await launch({port:10111+(single?0:2)});
  for(const p of [A,B]){
   await p.goto(base+'#solo=1');await until(()=>p.eval(`!!${J}?.ready`),{timeout:60000});
   await until(()=>p.eval(`${J}.app.phase==='idle'`),{timeout:20000});
   // CDP URL blocking does not reliably block WebSocket handshakes. Force a real
   // failed native socket for this tracker while leaving backup sockets and RTC intact.
   await p.eval(`(()=>{const NativeSocket=window.WebSocket;window.__nativeSocketURL=Object.getOwnPropertyDescriptor(NativeSocket.prototype,'url').get;window.WebSocket=class extends NativeSocket{constructor(url,...args){super(String(url).startsWith('wss://tracker.webtorrent.dev')?'wss://127.0.0.1:10199':url,...args);this.requestedURL=String(url);}get url(){return this.requestedURL||super.url;}};})()`);
   if(single)await p.eval(`(()=>{const c=${J}.app.coop,load=c.loadLibrary.bind(c);c.loadLibrary=async()=>{const m=await load();return {...m,joinRoom:(config,...args)=>m.joinRoom({...config,relayRedundancy:1},...args)};};})()`);
  }
  await A.eval(`${J}.app.coop.host()`);const code=await A.eval(`${J}.net().code`);
  await B.goto(base+'#room='+code);
  await until(()=>B.eval(`${J}.app.coop.code===${JSON.stringify(code)}&&!${J}.app.coop.loading`),{timeout:30000,label:tag+' invite'});
  if(single){
   await sleep(2500);const a=await sockets(A),b=await sockets(B);
   ok(tag+' really blocks the only discovery socket',a.length===1&&b.length===1&&[...a,...b].every(s=>s.nativeUrl==='wss://127.0.0.1:10199/'&&s.state!==1),{a,b});
   ok(tag+' cannot discover its partner',await A.eval(`!${J}.net().connected`)&&await B.eval(`!${J}.net().connected`));
  }else{
   await until(async()=>await A.eval(`${J}.net().connected`)&&await B.eval(`${J}.app.coop.synced`),{timeout:60000,label:'redundant private invite'});
   const a=await sockets(A),b=await sockets(B);
   ok(tag+' blocks the primary and opens backup trackers',[a,b].every(xs=>xs.length===3&&xs.find(s=>s.url.includes('tracker.webtorrent.dev'))?.nativeUrl==='wss://127.0.0.1:10199/'&&xs.find(s=>s.url.includes('tracker.webtorrent.dev'))?.state!==1&&xs.some(s=>!s.url.includes('tracker.webtorrent.dev')&&s.state===1)),{a,b});
   ok(tag+' private invite connects',await A.eval(`!${J}.net().publicRoom&&${J}.net().connected`)&&await B.eval(`!${J}.net().publicRoom&&${J}.app.coop.synced`));
   await A.eval(`${J}.challenge('moves',{seed:1})`);await until(()=>B.eval(`${J}.expedition().run.mode==='moves'`));
   await until(async()=>await A.eval(`${J}.app.phase==='idle'`)&&await B.eval(`${J}.app.phase==='idle'`)&&await A.eval(`${J}.net().hash`)===await B.eval(`${J}.net().hash`),{timeout:20000,label:'settled shared challenge'});
   await A.eval(`${J}.swap(1,2)`);await until(async()=>await A.eval(`${J}.state().moves===1&&${J}.app.phase==='idle'`)&&await B.eval(`${J}.state().moves===1&&${J}.app.phase==='idle'&&${J}.net().hash===${JSON.stringify(await A.eval(`${J}.net().hash`))}`),{timeout:20000,label:'backup tracker shared move'});
   ok(tag+' private boards and challenges agree',await A.eval(`${J}.net().hash`)===await B.eval(`${J}.net().hash`));
   await B.eval(`${J}.app.coop.leave()`);await A.eval(`${J}.app.coop.leave()`);
   const room='gems-discovery-qa-'+randomUUID();for(const p of [A,B])await p.eval(`${J}.app.coop.testPublicRoom=${JSON.stringify(room)};${J}.app.coop.testPublicLimit=1`);
   await A.eval(`${J}.app.coop.joinPublic()`);await until(()=>A.eval(`${J}.app.coop.hosting`),{timeout:30000});
   await B.eval(`${J}.app.coop.joinPublic()`);await until(()=>B.eval(`${J}.app.coop.synced&&${J}.app.coop.spectator`),{timeout:60000,label:'backup tracker spectator'});
   ok(tag+' isolated public spectator connects',await A.eval(`${J}.net().spectators===1&&${J}.app.coop.testPublicRoom!==PUBLIC_ROOM.id`));
   const hash=await A.eval(`${J}.net().hash`);await A.eval(`${J}.app.coop.leave()`);await until(()=>B.eval(`${J}.app.coop.hosting&&!${J}.app.coop.electing`),{timeout:30000});
   ok(tag+' host migration keeps the board',hash===await B.eval(`${J}.net().hash`));
  }
  ok(tag+' has no script or GPU errors',(await Promise.all([A,B].map(p=>p.eval(`${J}.diagnostics().errors.length===0`)))).every(Boolean)&&![...A.logs,...B.logs].some(l=>l.startsWith('EXCEPTION')));
 }catch(error){fail++;console.error(tag,error.stack);for(const [name,p]of [['A',A],['B',B]])if(p)try{console.log(name,await p.eval(`(()=>{const c=${J}.app.coop;return {role:c.role,code:c.code,connected:c.connected,loading:c.loading,error:c.error,phase:${J}.app.phase,log:c.log.slice(-6)};})()`),await sockets(p));}catch{}}
 finally{A?.kill();B?.kill();}
}
writeFileSync(out+'/discovery-results.json',JSON.stringify({pass,fail,receipts},null,2));console.log(`${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;
