(() => {
 const events=[],pcs=[],channels=[];let socketId=0;const record=(type,data={})=>{events.push({at:performance.now(),type,...data});if(events.length>1200)events.shift();};
 const brief=data=>{try{const o=JSON.parse(data);return {bytes:data.length,action:o.action,offers:o.offers?.length,offer:!!o.offer,answer:!!o.answer,failure:o['failure reason']};}catch{return {bytes:data?.byteLength||data?.length||0};}};
 const WS=WebSocket;
 window.WebSocket=class extends WS{constructor(...args){super(...args);const id=++socketId,u=new URL(args[0]);record('socket-create',{id,endpoint:u.origin+u.pathname});for(const type of['open','error','close'])this.addEventListener(type,e=>record('socket-'+type,{id,code:e.code}));this.addEventListener('message',e=>record('socket-message',{id,...brief(e.data)}));}send(data){record('socket-send',brief(data));return super.send(data);}};
 const RTC=RTCPeerConnection;
 window.RTCPeerConnection=class extends RTC{constructor(...args){super(...args);const id=pcs.push(this)-1;record('rtc-create',{id});for(const type of['connectionstatechange','iceconnectionstatechange','icegatheringstatechange','signalingstatechange'])this.addEventListener(type,()=>record(type,{id,connection:this.connectionState,ice:this.iceConnectionState,signaling:this.signalingState,gathering:this.iceGatheringState}));this.addEventListener('datachannel',e=>channel(e.channel,id));}createDataChannel(...args){const c=super.createDataChannel(...args);channel(c,pcs.indexOf(this));return c;}};
 function channel(c,id){channels.push(c);for(const type of['open','close','error'])c.addEventListener(type,()=>record('channel-'+type,{id,state:c.readyState,buffered:c.bufferedAmount}));}
 window.__connectionProbe={events,channels,summary:()=>pcs.map((p,id)=>({id,connection:p.connectionState,ice:p.iceConnectionState,gathering:p.iceGatheringState,signaling:p.signalingState}))};
 addEventListener('error',e=>record('window-error',{message:e.message}));addEventListener('unhandledrejection',e=>record('unhandled-rejection',{message:String(e.reason)}));
})();
