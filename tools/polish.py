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

left = [(i + 1, l[:100]) for i, l in enumerate(html.split('\n')) if '—' in l and not l.lstrip().startswith(('/*', '//', '*')) and 'replace(/[' not in l]
print('em-dash lines outside comments:', left)
DST.write_text(html, encoding='utf-8', newline='\n')
print(f'wrote {DST} ({len(orig)} -> {len(html)} bytes)')
subprocess.run([sys.executable, 'C:/trontstack/seo/about.py', 'gemstogether'], check=True)
