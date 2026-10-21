// A local exit must not depend on an acknowledgement from a stalled transport.
// Retire only the captured old room before allowing its cached discovery entry
// to be reused. Normal control-message ordering and public-room handoff stay intact.
function privateRoomDeadline(operation,ms){
 let timer;return Promise.race([
  Promise.resolve().then(operation).then(()=>true,()=>false),
  new Promise(resolve=>{timer=setTimeout(()=>resolve(false),ms);})
 ]).finally(()=>clearTimeout(timer));
}
async function retirePrivateRoom(room,connections,goodbye){
 if(goodbye&&await privateRoomDeadline(goodbye,150))
  await new Promise(resolve=>setTimeout(resolve,100));
 // Trystero's backpressure waiter does not settle when a channel closes.
 // Close the old PCs and let its close callbacks remove membership before
 // calling leave once with no recipients. A second late leave could delete a
 // newly reused same-code cache entry. Never flush the blocked gameplay queue.
 for(const pc of connections){try{pc.close();}catch{}}
 const deadline=performance.now()+600;
 while(Object.keys(room.getPeers()).length&&performance.now()<deadline)
  await new Promise(resolve=>setTimeout(resolve,20));
 if(Object.keys(room.getPeers()).length)return false;
 return privateRoomDeadline(()=>room.leave(),250);
}
CoopRoom.prototype.leave=function(quiet=false){
 const room=this.room,peer=this.peer,raw=this.sendRaw,code=this.code,closed=this.role==='host';
 ++this.generation;this.privateRequest=(this.privateRequest||0)+1;
 this.room=null;this.peer=null;this.hostID=null;this.role='solo';this.synced=false;this.wasSynced=false;
 this.code='';this.pending=null;this.events=[];this.anchor=null;this.remote=null;this.loading=false;
 this.roomClosed=false;this.peerReady=false;this.peers.clear();this.requests=[];this.sendTails.clear();
 this.status='Solo mode';this.detail='Your board is kept. Start another room whenever you like.';this.error='';
 this.app.selected=-1;this.app.grab=-1;this.app.down=null;this.app.frozen=false;
 document.getElementById('freeze').checked=false;
 // Quiet switches retain the expected host for any superseding same-code join.
 // An explicit Play Solo still forgets the private-room resume record.
 if(!quiet)netWrite(COOP.recordKey,null);
 try{history.replaceState(null,'','#solo=1');}catch{}
 if(!quiet)this.app.toast('Solo mode. Your board is kept.');
 if(room){
  let connections=[];try{connections=Object.values(room.getPeers());}catch{}
  const generation=this.generation,goodbye=peer&&raw?()=>raw({v:COOP.protocol,room:code,type:'goodbye',closed},peer):null;
  const retirement=retirePrivateRoom(room,connections,goodbye).catch(()=>false);
  this.privateRetirement=retirement;
  retirement.then(ok=>{
   this.note('private-room-retired',{ok});
   if(this.privateRetirement===retirement&&ok)this.privateRetirement=null;
   if(!ok&&this.generation===generation&&!this.room){
    this.error='The old connection is still closing. Keep playing solo, or reload before joining another room.';
   }
  });
 }
 return Promise.resolve();
};
const privateSoloLeave=GlobalCoopRoom.prototype.leave;
GlobalCoopRoom.prototype.leave=function(){
 if(this.publicRoom)return privateSoloLeave.call(this);
 return CoopRoom.prototype.leave.call(this);
};
function afterPrivateRetirement(room,operation,args){
 const request=room.privateRequest=(room.privateRequest||0)+1,retirement=room.privateRetirement;
 if(!retirement)return operation.apply(room,args);
 return retirement.then(ok=>{
  if(request!==room.privateRequest)return false;
  if(!ok){room.error='The old connection is still closing. Keep playing solo, or reload before joining another room.';return false;}
  return operation.apply(room,args);
 });
}
const privateSoloConnect=GlobalCoopRoom.prototype.connect;
GlobalCoopRoom.prototype.connect=function(...args){
 if(!this.publicRoom&&this.room)CoopRoom.prototype.leave.call(this,true);
 return afterPrivateRetirement(this,privateSoloConnect,args);
};
const privateSoloPublic=GlobalCoopRoom.prototype.joinPublic;
GlobalCoopRoom.prototype.joinPublic=function(...args){
 if(!this.publicRoom&&(this.room||this.loading))CoopRoom.prototype.leave.call(this,true);
 return afterPrivateRetirement(this,function(...next){
  if(!this.publicRoom)netWrite(COOP.recordKey,null);
  return privateSoloPublic.apply(this,next);
 },args);
};
