"""Build index.html from a ChatGPT drop in versions/ for hosting at https://tront.xyz/gemstogether/.
Exact bytes except: social meta + canonical after the description, em dashes out of player-facing
strings, and the tront.xyz About block. Every replacement must match exactly once or the script aborts.
    python tools/polish.py [versions/gemstogether-v3.2.4.html]
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'versions' / 'gemstogether-v3.2.4.html'
DST = ROOT / 'index.html'
OGV = 1
html = SRC.read_text(encoding='utf-8')
orig = html


def rep(old, new, count=1):
    global html
    n = html.count(old)
    if n != count:
        sys.exit(f'ABORT: expected {count} match(es), found {n} for: {old[:90]!r}')
    html = html.replace(old, new)


DESC = 'Match three with the people you love. A co-op jewel board in the browser: everyone who opens the page plays on the same board, or share a private room code.'
rep('<title>Gems Together</title>',
    '<title>Gems Together</title>'
    '<meta name="author" content="Trent Sterling (Tront)">'
    '<link rel="canonical" href="https://tront.xyz/gemstogether/">'
    '<meta property="og:type" content="website">'
    '<meta property="og:title" content="Gems Together by Tront">'
    f'<meta property="og:description" content="{DESC}">'
    '<meta property="og:url" content="https://tront.xyz/gemstogether/">'
    f'<meta property="og:image" content="https://tront.xyz/gemstogether/og-image.png?v={OGV}">'
    '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'
    '<meta name="twitter:card" content="summary_large_image">'
    '<meta name="twitter:title" content="Gems Together by Tront">'
    f'<meta name="twitter:description" content="{DESC}">'
    f'<meta name="twitter:image" content="https://tront.xyz/gemstogether/og-image.png?v={OGV}">')

rep("this.toast('No moves — reshuffling')", "this.toast('No moves, reshuffling')")

# Internal names: the game is Gems Together. Save keys, the co-op appId (network namespace) and the
# debug alias still said jewelbound (ChatGPT's working title); rename them. Resets pre-launch saves only.
rep("jewelbound-", "gemstogether-", 15)
rep("window.jewelbound=app;", "")

# Right-click / long-press on the canvas opened Chrome's "Save image as" menu over the board.
rep("bindInput(){const c=this.canvas;",
    "bindInput(){const c=this.canvas;c.addEventListener('contextmenu',e=>e.preventDefault());")
rep("#scene{display:block;", "#scene{-webkit-touch-callout:none;display:block;")
# Browser shortcuts also fired game hotkeys (Ctrl+F = fullscreen, Ctrl+D = Showcase, Alt+Left swallowed).
rep("let k=e.key.toLowerCase();if([' '", "if(e.ctrlKey||e.metaKey||e.altKey)return;let k=e.key.toLowerCase();if([' '")
# Trackpad pinch / Ctrl+wheel over the board zoomed the page and cropped the GPU UI.
rep("c.addEventListener('wheel',e=>{if(a.panelOpen){", "c.addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();return;}if(a.panelOpen){")

# Tront patch: point ping
# Right mouse on a gem drops a short-lived "look here" marker (pointAt) without selecting, grabbing or
# swapping. The marker is drawn locally and sent to co-op partners as two extra floats on the cursor
# packet: [...11 cursor floats, pointCell, pointSeq], ONLY while a point is active. Otherwise the packet stays
# the original 11 floats (44 bytes), so a tab still running the unpatched 3.2.4 drop (which rejects anything
# but 44 bytes) keeps every cursor, hover, selected and grab cue and only misses the ~2.5 s of point packets.
# The first 11-float packet after a point doubles as the clear. Receivers accept both lengths and pulse
# again whenever pointSeq changes.
rep("cursorMs:40,", "cursorMs:40,pointMs:2500,")
# JewelApp: point state, test/debug info, and the right-button listener (GPU UI hits and empty space do nothing).
rep(" bindInput(){const c=this.canvas;c.addEventListener('contextmenu',e=>e.preventDefault());",
    " pointAt(i){if(!Number.isInteger(i)||i<0||i>=64||!this.board.cells[i])return false;this.pointSeq=(this.pointSeq||0)+1;this.point={i,seq:this.pointSeq,at:performance.now()};return true;}\n"
    " activePoint(now=performance.now()){const p=this.point;return p&&now-p.at<COOP.pointMs?p:null;}\n"
    " pointsInfo(){const now=performance.now(),p=this.activePoint(now),n=this.coop,remote=[];"
    "const add=(peer,r)=>{const q=r?.point;if(q&&now-q.at<COOP.pointMs)remote.push({peer,i:q.i,seq:q.seq,age:Math.round(now-q.at)});};"
    "if(n){if(n.publicRoom)for(const [id,r]of n.remotes)add(id,r);else if(n.connected)add(n.peer,n.remote);}"
    "return {local:p?{i:p.i,seq:p.seq,age:Math.round(now-p.at)}:null,remote};}\n"
    " bindInput(){const c=this.canvas;c.addEventListener('contextmenu',e=>e.preventDefault());"
    "c.addEventListener('pointerdown',e=>{if(e.button!==2||e.pointerType==='touch'||this.panelOpen||this.aaCompare)return;"
    "if(this.ui?.find(e.clientX,e.clientY))return;const i=this.pick(e.clientX,e.clientY);if(i>=0)this.pointAt(i);});")
# CoopRoom: cursor packet fields, packet parsing, and a soft glass ping for the receiver (muted by the sound toggle).
rep(" receiveCursor(buf,id){if(id!==this.peer",
    " pointFields(){const p=this.app.activePoint();return p&&!this.app.panelOpen?[p.i,p.seq]:[];}\n"
    " readPoint(f,old){const i=f.length>12&&Number.isInteger(f[11])&&f[11]>=0&&f[11]<64?f[11]:-1;if(i<0)return null;const seq=f[12];"
    "if(old&&old.seq===seq&&old.i===i)return old;this.pointPing(i);return {i,seq,at:performance.now()};}\n"
    " pointPing(i){const a=this.app,t=a.board.cells[i],au=a.audio;if(!t||document.hidden||!au?.started||!au.buffers?.glass)return;"
    "try{au.play(au.buffers.glass[t.type],1.25,.03,cellXY(i)[0]*.09);}catch{}}\n"
    " receiveCursor(buf,id){if(id!==this.peer")
rep("onBoard?a.grab:-1,m.inside?1:0,m.down?1:0];", "onBoard?a.grab:-1,m.inside?1:0,m.down?1:0,...this.pointFields()];", 2)
rep("||bytes.byteLength!==44)return;", "||bytes.byteLength!==44&&bytes.byteLength!==52)return;", 2)
rep("grab:valid(f[8]),visible:!!f[9],down:!!f[10],at:performance.now()};",
    "grab:valid(f[8]),visible:!!f[9],down:!!f[10],at:performance.now(),point:this.readPoint(f,prev.point)};")
rep("grab:cell(f[8]),visible:!!f[9],down:!!f[10],at:performance.now()});",
    "grab:cell(f[8]),visible:!!f[9],down:!!f[10],at:performance.now(),point:this.readPoint(f,prev.point)});")
# Renderer: a breathing round reticle with crosshair ticks, thick ripples and a bobbing chevron in the pointer's
# colour, ink-underlaid so it reads on white diamonds, drawn around (never over) the gem in the pointed cell.
# Round on purpose: coopPresence already uses square corner brackets for partner hover/selected/grab.
rep("const privateCoopBadge=CabinetUI.prototype.coopBadge;",
    "CabinetUI.prototype.pointMark=function(i,col,age){\n"
    " const a=this.app,p=this.ink,T=COOP.pointMs,actor=a.getActor(i);if(!actor||actor.pop||actor.pos[1]>3.75||age<0||age>=T)return;\n"
    " const q=actor.pos,lo=project([q[0]-.5,q[1]+.5,.68],a.vp,a.cssWidth,a.cssHeight),hi=project([q[0]+.5,q[1]-.5,.68],a.vp,a.cssWidth,a.cssHeight);\n"
    " const cx=(lo[0]+hi[0])/2,cy=(lo[1]+hi[1])/2,s=Math.max(8,Math.min(hi[0]-lo[0],hi[1]-lo[1])/2),t=age/T,f=Math.min(1,age/90)*(1-t*t*t);\n"
    " const e=Math.min(1,age/280),beat=.5+.5*Math.cos(age/2600*Math.PI*2*5.5),al=f*(.72+.28*beat),R=s*1.02*(1+.45*Math.pow(1-e,3))*(1+.07*beat);\n"
    " const circ=(r)=>{const pts=[];for(let j=0;j<=36;j++){const an=j/36*Math.PI*2;pts.push(cx+Math.cos(an)*r,cy+Math.sin(an)*r);}return pts;};\n"
    " for(const k of [0,.5]){const ph=(age/900+k)%1;if(age<k*900)continue;const pts=circ(s*(1.1+.7*ph)),ra=f*(1-ph);p.poly(pts,6,UI_ART.ink,.3*ra);p.poly(pts,3.8,col,.9*ra);}\n"
    " const ring=circ(R);p.poly(ring,8,UI_ART.ink,.55*f);p.poly(ring,4,col,al);\n"
    " const tk=s*.34,g=R+3+4*(1-beat);for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){const pts=[cx+dx*g,cy+dy*g,cx+dx*(g+tk),cy+dy*(g+tk)];p.poly(pts,7.5,UI_ART.ink,.55*f);p.poly(pts,3.6,col,al);}\n"
    " const bob=Math.sin(age/130)*5,up=cy-R-tk-28>18,dir=up?1:-1,ty=up?cy-R-tk-17-bob:cy+R+tk+17+bob,ch=[cx-10,ty-11*dir,cx,ty,cx+10,ty-11*dir];p.poly(ch,8,UI_ART.ink,.6*f);p.poly(ch,3.8,col,al);\n"
    "};\n"
    "CabinetUI.prototype.pointMarkers=function(){\n"
    " const a=this.app,n=a.coop;if(a.panelOpen)return;const now=performance.now(),T=COOP.pointMs,lp=a.activePoint(now);\n"
    " if(lp)this.pointMark(lp.i,n?.publicRoom?n.playerColor():n?.connected&&n.role!=='host'?COOP_PALETTE.peer:COOP_PALETTE.host,now-lp.at);\n"
    " if(!n)return;\n"
    " if(n.publicRoom){for(const [id,r]of n.remotes)if(r.point&&now-r.point.at<T&&n.roster.some(x=>x.id===id&&x.slot>0))this.pointMark(r.point.i,n.playerColor(id),now-r.point.at);}\n"
    " else if(n.connected&&n.remote?.point&&now-n.remote.point.at<T)this.pointMark(n.remote.point.i,n.role==='host'?COOP_PALETTE.peer:COOP_PALETTE.host,now-n.remote.point.at);\n"
    "};\n"
    "const privateCoopBadge=CabinetUI.prototype.coopBadge;")
# Markers go under coopPresence so the partner cursor diamond and its "P1 / Host" tag stay on top.
rep("this.coopPresence();this.drawCursor();", "this.pointMarkers();this.coopPresence();this.drawCursor();")
rep("window.__jewel.net=()=>app.coop.diagnostics();",
    "window.__jewel.net=()=>app.coop.diagnostics();window.__jewel.point=i=>app.pointAt(i);window.__jewel.points=()=>app.pointsInfo();")

# Tront patch: Resonance FX (Andre on Discord: "up the particles/fx even more for a kind of Tetris Effect-like
# experience"). The class, uniform packing and shader snippets live in tools/resonance.js; the pairs below wire
# them into the drop. Uniform slots used: uForward.w, uAA.z, uAA.w, uLife.w (all unread by the drop).
FX = (ROOT / 'tools' / 'resonance.js').read_text(encoding='utf-8')
rep("const SKY_GL_FS=`", FX + "\nconst SKY_GL_FS=`")
# Sky: aurora bands and an expanding tinted wave behind everything.
rep("void main(){outColor=vec4(skyColor(vUV,uParams.z,uParams.x),1.0);}",
    "${FX_TINT_GL}${FX_SKY_GL}void main(){outColor=vec4(skyColor(vUV,uParams.z,uParams.x)+fxSky(vUV,uParams.z),1.0);}")
rep("@fragment fn fs(a:QOut)->@location(0) vec4f{return vec4f(skyColor(vec2f(a.uv.x,1.0-a.uv.y),U.params.z,U.params.x),1.0);}",
    "${FX_TINT_WG}${FX_SKY_WG}@fragment fn fs(a:QOut)->@location(0) vec4f{return vec4f(skyColor(vec2f(a.uv.x,1.0-a.uv.y),U.params.z,U.params.x)+fxSky(vec2f(a.uv.x,1.0-a.uv.y),U.params.z),1.0);}")
# Particle vertex motion for kinds 9-12 (WebGL2, then WebGPU).
rep("out vec3 vCol;out vec3 vNorm;out vec2 vUV;out vec3 vData;\nvoid main(){",
    "out vec3 vCol;out vec3 vNorm;out vec2 vUV;out vec3 vData;\n${FX_TINT_GL}\nvoid main(){")
rep("\n else {p=iOrigin.xyz+vec3(aPos.xy,0.0)*size*(1.0-t*0.82);}",
    "\n else if(kind>8.5&&kind<9.5){float sw=uForward.w;float ang=iOrigin.y+sw*iVelocity.x;float r=iOrigin.x*(1.0+uAA.w*0.10*sin(seed*3.0))+uAA.w*1.1;"
    "p=vec3(cos(ang)*r,sin(ang)*r*0.62+sin(sw*0.9+seed)*iVelocity.y,iOrigin.z);p+=(uRight.xyz*aPos.x+uUp.xyz*aPos.y)*size*(0.8+uAA.z*0.3+uAA.w*0.35);}"
    "\n else if(kind>9.5&&kind<10.5){vec3 dv=iVelocity.xyz*exp(-age*0.7)+vec3(0.0,iMisc.w*age,0.0);vec3 f=uForward.xyz;vec3 sv=dv-f*dot(dv,f);float sl=length(sv);"
    "vec3 dir=sl>0.0001?sv/sl:uRight.xyz;vec3 side=normalize(cross(dir,f));p+=dir*aPos.x*size*(1.0+sl*1.2)*(1.0-t*0.4)+side*aPos.y*size*0.32*(1.0-t*0.5);}"
    "\n else if(kind>10.5&&kind<11.5){float ca=seed+age*iVelocity.z;float cr=iVelocity.y*(0.3+t);p=iOrigin.xyz+vec3(cos(ca)*cr,age*iVelocity.x,sin(ca)*cr*0.5);"
    "p+=(uRight.xyz*aPos.x+uUp.xyz*aPos.y)*size*(1.0-t*0.5);}"
    "\n else if(kind>11.5&&kind<12.5){p=iOrigin.xyz+vec3(aPos.xy,0.0)*(size+age*iVelocity.x);}"
    "\n else {p=iOrigin.xyz+vec3(aPos.xy,0.0)*size*(1.0-t*0.82);}")
rep("if(kind>4.5&&kind<5.5)fade=sin(t*3.14159265)*0.6;",
    "if(kind>4.5&&kind<5.5)fade=sin(t*3.14159265)*0.6;"
    "if(kind>8.5&&kind<9.5){fade=(0.12+uAA.z*0.38+uAA.w*0.45)*(0.6+0.4*sin(uParams.x*(1.3+fract(seed)*2.0)+seed*7.0));vCol=mix(iColor.rgb,fxTint(uLife.w),0.15+min(uAA.z,1.0)*0.35);}"
    "if(kind>10.5&&kind<11.5)fade=sin(t*3.14159265);")
rep("const PARTICLE_WG=`${WG_UNIFORMS}${toWGSL(PARTICLE_SHARED)}", "const PARTICLE_WG=`${WG_UNIFORMS}${toWGSL(PARTICLE_SHARED)}${FX_TINT_WG}")
rep("\n else {p=a.origin.xyz+vec3f(a.pos.xy,0.0)*size*(1.0-t*0.82);}",
    "\n else if(kind>8.5&&kind<9.5){let sw=U.forward.w;let ang=a.origin.y+sw*a.vel.x;let r=a.origin.x*(1.0+U.aa.w*0.10*sin(seed*3.0))+U.aa.w*1.1;"
    "p=vec3f(cos(ang)*r,sin(ang)*r*0.62+sin(sw*0.9+seed)*a.vel.y,a.origin.z);p+=(U.right.xyz*a.pos.x+U.up.xyz*a.pos.y)*size*(0.8+U.aa.z*0.3+U.aa.w*0.35);}"
    "\n else if(kind>9.5&&kind<10.5){let dv=a.vel.xyz*exp(-age*0.7)+vec3f(0.0,a.misc.w*age,0.0);let f=U.forward.xyz;let sv=dv-f*dot(dv,f);let sl=length(sv);"
    "var dir=U.right.xyz;if(sl>0.0001){dir=sv/sl;}let side=normalize(cross(dir,f));p+=dir*a.pos.x*size*(1.0+sl*1.2)*(1.0-t*0.4)+side*a.pos.y*size*0.32*(1.0-t*0.5);}"
    "\n else if(kind>10.5&&kind<11.5){let ca=seed+age*a.vel.z;let cr=a.vel.y*(0.3+t);p=a.origin.xyz+vec3f(cos(ca)*cr,age*a.vel.x,sin(ca)*cr*0.5);"
    "p+=(U.right.xyz*a.pos.x+U.up.xyz*a.pos.y)*size*(1.0-t*0.5);}"
    "\n else if(kind>11.5&&kind<12.5){p=a.origin.xyz+vec3f(a.pos.xy,0.0)*(size+age*a.vel.x);}"
    "\n else {p=a.origin.xyz+vec3f(a.pos.xy,0.0)*size*(1.0-t*0.82);}")
rep("if(kind>4.5&&kind<5.5){fade=sin(t*3.14159265)*0.6;}o.col=a.col.rgb;",
    "if(kind>4.5&&kind<5.5){fade=sin(t*3.14159265)*0.6;}o.col=a.col.rgb;"
    "if(kind>8.5&&kind<9.5){fade=(0.12+U.aa.z*0.38+U.aa.w*0.45)*(0.6+0.4*sin(U.params.x*(1.3+fract(seed)*2.0)+seed*7.0));o.col=mix(a.col.rgb,fxTint(U.life.w),0.15+min(U.aa.z,1.0)*0.35);}"
    "if(kind>10.5&&kind<11.5){fade=sin(t*3.14159265);}")
# Particle fragment shapes (shared GLSL, converted to WGSL by the drop): ring for 12, soft capsule for 10, round mote for 9.
rep("if((kind>1.5&&kind<2.5)||(kind>7.5&&kind<8.5)){float d=", "if(kind>11.5&&kind<12.5){float d=(length(q)-0.80)*70.0;a=exp(-d*d)*0.9;}\n else if((kind>1.5&&kind<2.5)||(kind>7.5&&kind<8.5)){float d=")
rep("  else if(kind>3.5&&kind<4.5){a=exp(-q.y*q.y*42.0)*2.7*pow(max(0.0,1.0-abs(q.x)),0.2);}",
    "  else if(kind>3.5&&kind<4.5){a=exp(-q.y*q.y*42.0)*2.7*pow(max(0.0,1.0-abs(q.x)),0.2);}"
    "\n else if(kind>9.5&&kind<10.5){a=exp(-q.y*q.y*6.0)*max(1.0-q.x*q.x,0.0)*0.9;}"
    "\n else if(kind>8.5&&kind<9.5){a=exp(-dot(q,q)*6.0)*0.7;}")
# Final pass: the screen rim glows in the last cleared colour on every hit.
rep("${SHARED_SHADER}\nvoid main(){vec2 uv=vUV;", "${SHARED_SHADER}\n${FX_TINT_GL}\nvoid main(){vec2 uv=vUV;")
rep("c=tone(c*uSettings.x);c*=1.0-dot(q,q)*0.32;", "c=tone(c*uSettings.x);c*=1.0-dot(q,q)*0.32;c+=fxTint(uLife.w)*dot(q,q)*(uAA.w*0.32+min(uAA.z,1.2)*0.05);")
rep("${toWGSL(SHARED_SHADER)}\n@group(1)@binding(0)var tScene", "${toWGSL(SHARED_SHADER)}${FX_TINT_WG}\n@group(1)@binding(0)var tScene")
rep("c=tone(c*U.settings.x);c*=1.0-dot(q,q)*0.32;", "c=tone(c*U.settings.x);c*=1.0-dot(q,q)*0.32;c+=fxTint(U.life.w)*dot(q,q)*(U.aa.w*0.32+min(U.aa.z,1.2)*0.05);")
# Bigger pools, fatter bursts.
rep("sparks=new ParticlePool(renderer,quad.data(),24000,true),shards=new ParticlePool(renderer,shard.data(),6000,false)",
    "sparks=new ParticlePool(renderer,quad.data(),60000,true),shards=new ParticlePool(renderer,shard.data(),10000,false)")
rep("n=Math.floor(10+power*16);", "n=Math.floor(14+power*22);")
rep("const sparks=Math.floor(17+power*32);", "const sparks=Math.floor(28+power*48);")
# Wiring: create, per-frame step + uniforms, field draw, and the event hooks.
rep("this.world=buildWorld(renderer);this.audio=new JewelAudio();", "this.world=buildWorld(renderer);this.audio=new JewelAudio();this.fx=new ResonanceFX(this);")
rep("u.set([this.living.clock,this.living.light,this.living.polish,0],48);", "u.set([this.living.clock,this.living.light,this.living.polish,0],48);this.fx.frame();this.fx.uniforms(u);")
rep("const particles=this.prefs.particles?[this.world.shards.mesh,", "const particles=this.prefs.particles?[this.fx.field.mesh,this.world.shards.mesh,")
rep("this.presentation.feed(center,this.cascade,mode,result.points);",
    "this.fx.match(center,typ,this.cascade,result.removed.length,mode,magnitude,result.removed);this.presentation.feed(center,this.cascade,mode,result.points);")
rep("finish(cascade){if(cascade<3)return;const a=this.app;this.payoffs", "finish(cascade){this.app.fx?.finish(cascade);if(cascade<3)return;const a=this.app;this.payoffs")
rep("this.audio.swap((pa[0]+pb[0])*.5);", "this.audio.swap((pa[0]+pb[0])*.5);this.fx.swap(pa,pb);")
rep("if(this.phase!=='intro')this.audio.land(a.at%8,distance);", "if(this.phase!=='intro'){this.audio.land(a.at%8,distance);this.fx.land(m.to,a.tile.type,distance);}")
rep("window.__jewel={ready:false,app:a,", "window.__jewel={ready:false,app:a,fx:()=>a.fx.info(),")

# Tront patch: easing audit (S93). Receipts: tools/easing-audit.mjs -> tools/out/easing/index.html.
# 1. (Invalid swap: superseded by patch 5 below.)
# 2. Combo plaque popped on and off. Now: slides in from the right with overshoot, the number punches on every
#    new step, and it fades and drifts out over .3 s after the combo ends.
rep("const privateCoopBadge=CabinetUI.prototype.coopBadge;",
    "CabinetUI.prototype.comboEase=function(a){\n"
    " const live=a.comboEnd&&this.lastCascade>1&&!a.panelOpen&&a.time<a.comboEnd+.3;if(!live){this.cOn=false;return false;}\n"
    " if(!this.cOn){this.cOn=true;this.cIn=a.time;this.cPunch=a.time;this.cLast=this.lastCascade;}\n"
    " if(this.lastCascade!==this.cLast){this.cLast=this.lastCascade;this.cPunch=a.time;}\n"
    " const ui=clamp((a.time-this.cIn)/.22),uo=clamp((a.comboEnd+.3-a.time)/.3),u=1+2.7*(ui-1)**3+1.7*(ui-1)**2,k=Math.exp(-(a.time-this.cPunch)*9);\n"
    " this.cE={al:smooth(ui)*smooth(uo),dx:(1-u)*46+(1-smooth(uo))*24,s:1+.42*k};return true;};\n"
    "const privateCoopBadge=CabinetUI.prototype.coopBadge;")
rep("if(a.comboEnd&&a.time<a.comboEnd&&this.lastCascade>1&&!a.panelOpen){const sy=wide?top+(bottom-top)*.31:Math.max(8,top-126),cx=wide?Math.min(w-91,right+111):w/2;",
    "if(this.comboEase(a)){const sy=wide?top+(bottom-top)*.31:Math.max(8,top-126),cx=(wide?Math.min(w-91,right+111):w/2)+this.cE.dx;this.ink.opacity=this.cE.al;")
rep("+this.lastCascade,cx,sy+20,39,UI_ART.highlight,'center',130,.14,true);",
    "+this.lastCascade,cx,sy+20-39*(this.cE.s-1)*.5,39*this.cE.s,UI_ART.highlight,'center',130,.14,true);")
rep("'center',132);}", "'center',132);}this.ink.opacity=1;")
# 3. Toasts popped on and off. Now: fade + rise in over .18 s, fade + settle out over .26 s.
rep("if(this.toastUntil>performance.now()&&!a.panelOpen){const text=this.fitLine(this.toastMessage,w-58,13),tw=Math.min(w-22,this.measure(text,13)+32);let ty=wide?h-43:Math.max(6,top-136);",
    "const tnow=performance.now();if(this.toastUntil+260>tnow&&!a.panelOpen){const tI=smooth(clamp((2800-(this.toastUntil-tnow))/180)),tO=smooth(clamp((this.toastUntil+260-tnow)/260));this.ink.opacity=tI*tO;"
    "const text=this.fitLine(this.toastMessage,w-58,13),tw=Math.min(w-22,this.measure(text,13)+32);let ty=(wide?h-43:Math.max(6,top-136))+(1-tI)*10+(1-tO)*6;")
rep("this.text(text,w/2,ty+9,13,UI_ART.highlight,'center',tw-20);}", "this.text(text,w/2,ty+9,13,UI_ART.highlight,'center',tw-20);this.ink.opacity=1;}")
# 4. Score floats appeared at full size. Now they pop in at 1.5x and settle in about .2 s.
rep("this.text(f.text,x,y-36*(1-Math.exp(-age*2.5)),f.special?22:24,",
    "this.text(f.text,x,y-36*(1-Math.exp(-age*2.5)),(f.special?22:24)*(1+.5*Math.exp(-age*13)),")

# Milestone banner: floats may carry their own size, colour and life (defaults unchanged).
rep("this.floats=this.floats.filter(f=>a.time-f.birth<1.1);", "this.floats=this.floats.filter(f=>a.time-f.birth<(f.life||1.1));")
rep("alpha=Math.min(age*9,1)*clamp((1.1-age)*3,0,1);", "alpha=Math.min(age*9,1)*clamp(((f.life||1.1)-age)*3,0,1);")
rep("(f.special?22:24)*(1+.5*Math.exp(-age*13)),f.special?UI_ART.aqua:UI_ART.highlight,'center',Math.min(300,a.cssWidth-40)",
    "(f.size||(f.special?22:24))*(1+.5*Math.exp(-age*13)),f.col||(f.special?UI_ART.aqua:UI_ART.highlight),'center',Math.min(f.size?900:300,a.cssWidth-40)")

# Tront patch 5 (S94, 2026-09-28): Bejeweled-parity invalid swap + juice (hitstop, camera punch, directional
# squash/stretch, turnaround puff, score comets). Receipts: tools/swap-audit.mjs -> tools/out/swap/index.html.
# Why patch 4 missed: tront.xyz drops everyone into the public co-op room, and there coop.requestSwap() rejects an
# illegal move before trySwap() ever runs: no motion at all, flat 2D red corner brackets and a "No match" toast.
# Patch 4 only fixed trySwap's solo path (the harness ran #solo=1).
# Invalid swap, every mode: the pair swaps fully at normal swap speed, bumps into the wrong cell (squash, rattle,
# dust puff, reject sound) and swaps back the same way. In co-op it is presentation only: phase and board are
# untouched and nothing is sent, so the host keeps taking partner swaps. Peers check against their mirrored
# board, so the bounce starts instantly instead of after a round trip.
rep(r"""const privateCoopBadge=CabinetUI.prototype.coopBadge;""",
    r"""const BOUNCE_HOLD=.075;
JewelApp.prototype.bounceSwap=function(a,b){
 const aa=this.getActor(a),bb=this.getActor(b);if(!aa||!bb||aa.move||bb.move)return false;
 const pa=cellXY(a),pb=cellXY(b),d=2*FEEL.swap+BOUNCE_HOLD;this.selected=-1;this.grab=-1;this.hintCells=[];this.keyboardCell=b;
 aa.move={type:'bounce',from:pa.slice(),to:pb.slice(),start:this.time,duration:d,sign:1};bb.move={type:'bounce',from:pb.slice(),to:pa.slice(),start:this.time,duration:d,sign:-1};
 this.audio.swap((pa[0]+pb[0])*.5);this.fx.swap(pa,pb);this.bounceUntil=this.time+d;this.idleSince=this.time;this.lastInput=this.time;return true;};
const gemHex=t=>'#'+mixColor(GEM_COLORS[t]||GEM_COLORS[5],[1,1,1],.25).map(v=>Math.round(clamp(v,0,1)*255).toString(16).padStart(2,'0')).join('');
// Score comets: every cleared gem streaks into the score. Co-op: in the colour of whoever made the move.
CabinetUI.prototype.comets=function(removed,owner){
 const a=this.app,co=a.coop;if(!a.fx?.on||!removed?.length||a.prefs.juice<=0)return;this.cm=this.cm||[];const mine=owner!=='partner';
 for(let k=0;k<Math.min(removed.length,8);k++){const r=removed[k];const col=co?.connected?(mine===(co.role==='host')?COOP_PALETTE.host:COOP_PALETTE.peer):gemHex(r.tile.type);
  this.cm.push({p:cellXY(r.at),col,birth:a.time+.06+k*.035,dur:.5+Math.random()*.16,bend:(Math.random()-.5)*.9,big:k===0});}
 if(this.cm.length>160)this.cm.splice(0,this.cm.length-160);};
CabinetUI.prototype.drawComets=function(){
 const a=this.app,p=this.ink,T=this.scoreAt,now=a.time;p.opacity=1;if(!this.cm?.length&&!this.flares?.length)return;if(!T||a.panelOpen){this.cm=[];this.flares=[];return;}
 this.flares=this.flares||[];
 this.cm=this.cm.filter(c=>{const t=(now-c.birth)/c.dur;if(t<0)return true;if(t>=1){this.scoreHit=now;this.flares.push({x:T[0],y:T[1],birth:now,col:c.col});return false;}
  const S=project(c.p,a.vp,a.cssWidth,a.cssHeight),dx=T[0]-S[0],dy=T[1]-S[1],cx=S[0]+dx*.35-dy*c.bend,cy=S[1]+dy*.35+dx*c.bend;
  const at=u=>{const v=1-u;return [v*v*S[0]+2*v*u*cx+u*u*T[0],v*v*S[1]+2*v*u*cy+u*u*T[1]];};
  const u=t*t*(1.6-.6*t),head=at(u),fade=Math.min(1,t*6);let prev=head;
  for(let k=1;k<=7;k++){const q=at(Math.max(0,u-k*.03*(.4+u)));p.line(prev[0],prev[1],q[0],q[1],(c.big?10:7.5)*(1-k/9),c.col,.75*(1-k/9)*fade);prev=q;}
  p.line(head[0],head[1],head[0],head[1],c.big?22:16,c.col,.35*fade);p.line(head[0],head[1],head[0],head[1],c.big?13:10,c.col,fade);p.line(head[0],head[1],head[0],head[1],c.big?6:4.5,'#ffffff',fade);return true;});
 this.flares=this.flares.filter(f=>{const k=(now-f.birth)/.32;if(k>=1||k<0)return k<0;const r=46+k*40,al=(1-k)*(1-k)*.9;let px=f.x+r,py=f.y;
  for(let i=1;i<=24;i++){const an=i/24*TAU,qx=f.x+Math.cos(an)*r,qy=f.y+Math.sin(an)*r*.42;p.line(px,py,qx,qy,4*(1-k)+.8,f.col,al);px=qx;py=qy;}return true;});};
const privateCoopBadge=CabinetUI.prototype.coopBadge;""")
# Solo / host-authorised path: an invalid swap becomes the same bounce, held in the 'reject' phase.
rep(r"""this.phase='swap';this.deadline=this.time+FEEL.swap+FEEL.swapSettle;""",
    r"""this.phase='swap';this.deadline=this.time+FEEL.swap+FEEL.swapSettle;if(!this.swapResult){const d=2*FEEL.swap+BOUNCE_HOLD;aa.move={type:'bounce',from:pa.slice(),to:pb.slice(),start:this.time,duration:d,sign:1};bb.move={type:'bounce',from:pb.slice(),to:pa.slice(),start:this.time,duration:d,sign:-1};this.phase='reject';this.deadline=this.time+d;}""")
rep(r"""if(!authorised&&(this.coop?.hosting||this.coop?.mirror))return this.coop.requestSwap(a,b);""",
    r"""if(!authorised&&(this.coop?.hosting||this.coop?.mirror))return this.coop.requestSwap(a,b);if(!authorised)this.turnOwner='me';""")
# Co-op path: check locally first, bounce without a network call.
rep(r"""const app=this.app;if(!this.hosting&&(app.phase!=='idle'||app.frozen||this.pending)){this.rejectLocal(a,b,'The board is resolving');return false;}""",
    r"""const app=this.app;if(!this.hosting&&(app.phase!=='idle'||app.frozen||this.pending)){this.rejectLocal(a,b,'The board is resolving');return false;}if(app.time<(app.bounceUntil||0))return false;if(app.phase==='idle'&&!app.frozen&&app.board.adjacent(a,b)&&!app.board.validSwap(a,b)){app.bounceSwap(a,b);return false;}""")
# Any other rejection still bounces when it can; the red corner brackets are gone, and "No match" needs no toast.
rep(r"""rejectLocal(a,b,reason){""",
    r"""rejectLocal(a,b,reason){if(Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>=0&&a<64&&b<64&&this.app.phase==='idle'&&this.app.board.adjacent(a,b)&&this.app.bounceSwap(a,b)){this.pending=null;if(reason!=='No match')this.app.toast(reason);return;}""")
rep(r"""if(n.rejectUntil>now&&!a.panelOpen)for(const i of n.rejectCells||[])ring(i,'#ff839c',true);""", "", 2)
# Whose move was it (for comet colour): host knows the intent's sender, a peer matches its own accepted intent.
rep(r"""this.app.trySwap(a,b,true);this.note('intent-accepted'""",
    r"""this.app.turnOwner=peer==='self'?'me':'partner';this.app.trySwap(a,b,true);this.note('intent-accepted'""")
rep(r"""this.pending=null;netBoardLoad(a,m.board);a.selected=-1;""",
    r"""{const q=this.pending;a.turnOwner=q&&q.accepted&&(q.a===m.a&&q.b===m.b||q.a===m.b&&q.b===m.a)?'me':'partner';}this.pending=null;netBoardLoad(a,m.board);a.selected=-1;""")
# The bounce itself: out on the normal swap curve, a .075 s bump against the wrong cell, back on the same curve.
rep(r"""}else{const t=clamp(age/m.duration),e=m.type==='swap'?smooth(t):easeIO(t);""",
    r"""}else if(m.type==='bounce'){const T=FEEL.swap,H=BOUNCE_HOLD,j=this.prefs.juice/100,dx=m.to[0]-m.from[0],dy=m.to[1]-m.from[1],hz=Math.abs(dx)>=Math.abs(dy),L=Math.hypot(dx,dy)||1;let u,arc=0,st=0,sq=0,rat=0;
     if(age<T){const t=age/T;u=smooth(t);arc=Math.sin(t*PI);st=arc;}
     else if(age<T+H){const t=(age-T)/H;u=1;sq=Math.sin(t*PI);rat=Math.sin(t*TAU*2)*(1-t);if(!m.turned){m.turned=true;if(m.sign>0){this.audio.reject(m.from[0]);this.fx.bump?.(m.from,m.to);}}}
     else{const t=clamp((age-T-H)/T);u=1-smooth(t);arc=Math.sin(t*PI);st=arc;}
     pos=m.from.map((x,i)=>mix(x,m.to[i],u));pos[2]+=arc*.22*(m.sign>0?1:.6);rz=arc*.13*m.sign;pos[0]+=dx/L*rat*.05*j;pos[1]+=dy/L*rat*.05*j;
     const along=1+st*.09*j-sq*.17*j,across=1-st*.06*j+sq*.11*j;sx=hz?along:across;sy=hz?across:along;
     if(age>=m.duration){pos=m.from.slice();a.move=null;}
    }else{const t=clamp(age/m.duration),e=m.type==='swap'?smooth(t):easeIO(t);""")
# Squash and stretch: swaps stretch along their travel axis (the drop squeezed every move the same way), landings
# squash a little harder.
rep(r"""const squeeze=Math.sin(t*PI)*.045;sx=1+squeeze;sy=1-squeeze;""",
    r"""const squeeze=Math.sin(t*PI)*(m.type==='swap'?.09*this.prefs.juice/100:.045),hz=Math.abs(m.to[0]-m.from[0])>=Math.abs(m.to[1]-m.from[1]);sx=hz?1+squeeze:1-squeeze*.66;sy=hz?1-squeeze*.66:1+squeeze;""")
rep(r"""amp=clamp(.085+distance*.020,.095,.20)*this.prefs.juice/100""", r"""amp=clamp(.1+distance*.028,.11,.27)*this.prefs.juice/100""")
# Hitstop + camera punch on x4+ cascades and specials. Hitstop freezes game time (and so every particle and the
# shake) for 45-80 ms; the punch pushes the camera in a few percent and springs back. Reduced motion: no punch.
rep(" update(dt){\n  if(this.coop?.updatePeer(dt))return;",
    " update(dt){\n  if(this.hitstop>0){this.hitstop-=dt;return;}this.punch=(this.punch||0)*Math.exp(-dt*7);\n  if(this.coop?.updatePeer(dt))return;")
rep(r"""this.shake=Math.min(.85,magnitude*(special?.48:.26));""",
    r"""this.shake=Math.min(.85,magnitude*(special?.48:.26));if(special||this.cascade>=4){const k=this.prefs.juice/100;this.hitstop=Math.max(this.hitstop||0,(special?.08:.045+Math.min(this.cascade-4,4)*.008)*Math.min(k,1.25));if(this.prefs.motion)this.punch=Math.min(1.2,(this.punch||0)+(special?.9:.45+this.cascade*.04)*k);}""")
rep(r"""this.eye=[sx,.62+sy,z];""", r"""this.eye=[sx,.62+sy,z*(1-.045*(this.punch||0))];""")
# Comets: spawn from explode (host, solo and mirrors alike), land on the score readout, which punches on impact.
rep(r"""result.removed);this.presentation.feed(""", r"""result.removed);this.ui?.comets?.(result.removed,this.turnOwner);this.presentation.feed(""")
rep(r"""this.text(Math.round(a.displayScore).toLocaleString('en-US'),sx+17,sy+46,35,""",
    r"""this.scoreAt=[sx+17+Math.min(70,sw*.3),sy+64];const sk=1+.16*Math.exp(-(a.time-(this.scoreHit??-9))*11);this.text(Math.round(a.displayScore).toLocaleString('en-US'),sx+17,sy+46-35*(sk-1)*.5,35*sk,""")
rep(r"""this.text(Math.round(a.displayScore).toLocaleString('en-US'),w/2-18,sy+8,18,""",
    r"""this.scoreAt=[w/2-40,sy+17];const sk=1+.16*Math.exp(-(a.time-(this.scoreHit??-9))*11);this.text(Math.round(a.displayScore).toLocaleString('en-US'),w/2-18,sy+8-18*(sk-1)*.5,18*sk,""")
rep(r"""this.coopPresence();this.drawCursor();p.submit();""", r"""this.coopPresence();this.drawComets();this.drawCursor();p.submit();""")


# Tront patch 6 (S94 gauntlet R1): the combo ladder. Callout + burst drawn here; lasers + stings in resonance.js.
rep(r"""const privateCoopBadge=CabinetUI.prototype.coopBadge;""",
    r"""const TIER_NAMES=['','','','SPARKLING','RADIANT','DAZZLING','BRILLIANT','PRISMATIC','LEGENDARY','TRANSCENDENT'];
const TIER_COLS=['#8ff7ff','#8ff7ff','#8ff7ff','#8ff7ff','#ffe27a','#ff8ff0','#b9a4ff','#7dffb0','#ffb347','#ffffff'];
CabinetUI.prototype.callout=function(c){const a=this.app;this.co={c,birth:a.time,name:TIER_NAMES[Math.min(c,9)]};if(c>=5)this.burst={birth:a.time,c};};
CabinetUI.prototype.boardBox=function(){const a=this.app,p0=project(cellXY(0),a.vp,a.cssWidth,a.cssHeight),p1=project(cellXY(63),a.vp,a.cssWidth,a.cssHeight);return {cx:(p0[0]+p1[0])/2,cy:(p0[1]+p1[1])/2,bw:Math.abs(p1[0]-p0[0])*8/7};};
CabinetUI.prototype.drawBurst=function(){const a=this.app,p=this.ink,b=this.burst;if(!b||a.panelOpen)return;const age=a.time-b.birth,L=.5;if(age<0)return;if(age>L){this.burst=null;return;}
 const {cx,cy,bw}=this.boardBox(),k=age/L,w=a.cssWidth,h=a.cssHeight,col=TIER_COLS[Math.min(b.c,9)];p.opacity=1;
 if(a.prefs.motion&&age<.16){const f=1-age/.16;p.box(0,0,w,h,age<.05?'#ffffff':col,0,.5*f*f);}
 const n=40+Math.min(b.c-5,6)*8;for(let i=0;i<n;i++){const r=Math.abs(Math.sin(i*12.9898+b.c*7.1)*43758.5453)%1,an=i/n*TAU+(r-.5)*.12,r0=bw*(.8+k*.9)+r*bw*.1,r1=r0+bw*(.35+r*.65)*(1-k*.4),th=(3+r*6)*(1-k*.5),cs=Math.cos(an),sn=Math.sin(an),cl=i%3?'#ffffff':col;
  for(let q=0;q<4;q++){const u0=r0+(r1-r0)*q/4,u1=r0+(r1-r0)*(q+1)/4;p.line(cx+cs*u0,cy+sn*u0,cx+cs*u1,cy+sn*u1,th*(.2+.8*(q+1)/4),cl,.9*(1-k)*(.4+.6*(q+1)/4));}}};
CabinetUI.prototype.drawCallout=function(){const a=this.app,o=this.co;if(!o||a.panelOpen)return;const age=a.time-o.birth,L=1.2;if(age<0)return;if(age>L){this.co=null;return;}
 const {cx,cy,bw}=this.boardBox(),c=o.c,s=1+1.5*Math.exp(-age*15),al=Math.min(1,age*18)*clamp((L-age)/.32,0,1),size=bw*(.19+.045*Math.min(c-3,6));
 const shake=c>=5?Math.sin(age*95)*6*Math.exp(-age*7):0,col=c>=9?gemHex(((a.time*10)|0)%6):TIER_COLS[Math.min(c,9)],p=this.ink;
 p.opacity=al;const y=cy-size*.72*s,rise=-(age>.8?(age-.8)*40:0);
 this.text('x'+c,cx+shake,y+rise,size*s,col,'center',Infinity,.2,true);
 this.text(o.name,cx-shake*.5,cy+size*.36*s+rise,size*.3*Math.max(1,s*.9),'#ffffff','center',bw*1.25,.16,true);p.opacity=1;};
const privateCoopBadge=CabinetUI.prototype.coopBadge;""")
rep(r"""this.coopPresence();this.drawComets();this.drawCursor();p.submit();""", r"""this.coopPresence();this.drawBurst();this.drawCallout();this.drawComets();this.drawCursor();p.submit();""")

# Tront patch 7 (S94 gauntlet R2): Resonance music, a generative soundtrack on the music bus (tools/music.js).
MUSIC = (ROOT / 'tools' / 'music.js').read_text(encoding='utf-8')
rep("const SKY_GL_FS=`", MUSIC + "\nconst SKY_GL_FS=`")
rep("this.fx=new ResonanceFX(this);", "this.fx=new ResonanceFX(this);this.music=new ResonanceMusic(this);")
rep("this.fx.frame();this.fx.uniforms(u);", "this.fx.frame();this.music?.tick();this.fx.uniforms(u);")
rep("fx:()=>a.fx.info(),", "fx:()=>a.fx.info(),music:()=>({...a.music.stats,lv:a.music.lv.map(v=>+v.toFixed(2)),step:a.music.step,live:!!a.music.ctx}),")

# Tront patch 8 (S94 gauntlet R3): journey stages. Stage logic + sky grade in resonance.js, tempo/progression in
# music.js; here: the sky multiply, the stage card, and a stage line + progress bar under the score plaque.
rep(r"""${FX_TINT_GL}${FX_SKY_GL}void main(){outColor=vec4(skyColor(vUV,uParams.z,uParams.x)+fxSky(""",
    r"""${FX_TINT_GL}${FX_SKY_GL}${FX_STAGE_GL}void main(){outColor=vec4(fxStage(skyColor(vUV,uParams.z,uParams.x),vUV)+fxSky(""")
rep(r"""${FX_TINT_WG}${FX_SKY_WG}@fragment fn fs(a:QOut)->@location(0) vec4f{return vec4f(skyColor(vec2f(a.uv.x,1.0-a.uv.y),U.params.z,U.params.x)+fxSky(""",
    r"""${FX_TINT_WG}${FX_SKY_WG}${FX_STAGE_WG}@fragment fn fs(a:QOut)->@location(0) vec4f{return vec4f(fxStage(skyColor(vec2f(a.uv.x,1.0-a.uv.y),U.params.z,U.params.x),vec2f(a.uv.x,1.0-a.uv.y))+fxSky(""")
rep(r"""this.scoreAt=[sx+17+Math.min(70,sw*.3),sy+64];""", r"""this.scoreAt=[sx+17+Math.min(70,sw*.3),sy+64];this.plaqueAt=[sx,sy,sw,159];""")
rep(r"""this.scoreAt=[w/2-40,sy+17];""", r"""this.scoreAt=[w/2-40,sy+17];this.plaqueAt=null;""")
rep(r"""const privateCoopBadge=CabinetUI.prototype.coopBadge;""",
    r"""const stageHex=info=>'#'+info.tint.map(v=>Math.round(clamp(v/170,.35,1)*255).toString(16).padStart(2,'0')).join('');
CabinetUI.prototype.stageCallout=function(info){this.sc={...info,birth:this.app.time};};
CabinetUI.prototype.drawStage=function(){const a=this.app,p=this.ink,fx=a.fx;if(!fx||fx.stage===undefined||a.panelOpen)return;const info=fx.stageInfo(),col=stageHex(info);p.opacity=1;
 if(this.plaqueAt&&!a.practice){const [x,y,w,h]=this.plaqueAt,yy=y+h+10,f=clamp((a.displayScore-info.start)/(info.end-info.start),0,1);
  this.text('STAGE '+info.n+(info.loop?'  ENCORE':''),x+4,yy,11,col,'left',w,.12,true);this.text(info.name,x+4,yy+15,15,'#ffffff','left',w-8,.14,true);
  p.box(x+2,yy+37,w-4,9,'#071418',4,.95);p.box(x+4,yy+39,w-8,5,col,2,.22);if(f>0)p.box(x+4,yy+39,Math.max(5,(w-8)*f),5,col,2,1);}
 const o=this.sc;if(!o)return;const age=a.time-o.birth,L=2.6;if(age<0)return;if(age>L){this.sc=null;return;}
 const {cx,cy,bw}=this.boardBox(),inn=clamp(age/.35,0,1),out=clamp((age-(L-.4))/.4,0,1),u=1+2.7*(inn-1)**3+1.7*(inn-1)**2,dx=(1-u)*-bw*.9+out*out*bw*1.1,oc=stageHex(o);
 p.opacity=clamp(inn*3,0,1)*(1-out);const Y=cy+bw*.04;p.box(cx-bw*.62+dx,Y,bw*1.24,bw*.34,'#071418',10,.85);p.box(cx-bw*.62+dx,Y,bw*1.24,5,oc,2,1);p.box(cx-bw*.62+dx,Y+bw*.34-5,bw*1.24,5,oc,2,1);
 this.text('STAGE '+o.n+(o.loop?'  ENCORE':''),cx+dx,Y+bw*.035,bw*.07,oc,'center',bw*1.2,.14,true);this.text(o.name,cx+dx*1.15,Y+bw*.13,bw*.14,'#ffffff','center',bw*1.2,.18,true);p.opacity=1;};
const privateCoopBadge=CabinetUI.prototype.coopBadge;""")
rep(r"""this.coopPresence();this.drawBurst();this.drawCallout();this.drawComets();""", r"""this.coopPresence();this.drawStage();this.drawBurst();this.drawCallout();this.drawComets();""")

left = [(i + 1, l[:100]) for i, l in enumerate(html.split('\n')) if '—' in l and not l.lstrip().startswith(('/*', '//', '*')) and 'replace(/[' not in l]
print('em-dash lines outside comments:', left)
DST.write_text(html, encoding='utf-8', newline='\n')
print(f'wrote {DST} ({len(orig)} -> {len(html)} bytes)')
subprocess.run([sys.executable, 'C:/trontstack/seo/about.py', 'gemstogether'], check=True)
