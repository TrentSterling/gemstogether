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

left = [(i + 1, l[:100]) for i, l in enumerate(html.split('\n')) if '—' in l and not l.lstrip().startswith(('/*', '//', '*')) and 'replace(/[' not in l]
print('em-dash lines outside comments:', left)
DST.write_text(html, encoding='utf-8', newline='\n')
print(f'wrote {DST} ({len(orig)} -> {len(html)} bytes)')
subprocess.run([sys.executable, 'C:/trontstack/seo/about.py', 'gemstogether'], check=True)
