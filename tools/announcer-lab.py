"""Build a local listening page from the exact embedded game announcer pack."""
import base64
import hashlib
import html
import json
from pathlib import Path

root = Path(__file__).resolve().parent
pack = json.loads((root/'announcer-pack.json').read_text(encoding='utf-8'))
out = root/'out/announcer'
out.mkdir(parents=True, exist_ok=True)
options = []
for profile, voice in pack['profiles'].items():
    suffix=' / '+voice.get('pitchLabel','original pitch') if voice['semitones']==0 else ' / '+str(voice['semitones'])+' semitones'
    options.append('<option value="'+profile+'"'+(' selected' if profile == pack['defaultProfile'] else '')+'>'+html.escape(voice['name'])+suffix+'</option>')
    for key, clip in voice['clips'].items():
        data = base64.b64decode(clip['data'])
        if hashlib.sha256(data).hexdigest() != clip['sha256']:
            raise ValueError('Clip checksum mismatch: '+profile+'/'+key)
        (out/(profile+'-'+key+'.mp3')).write_bytes(data)
rows = []
for key, clip in pack['profiles'][pack['defaultProfile']]['clips'].items():
    rows.append('<article data-key="'+key+'"><p>'+html.escape(clip['text'])+'</p><audio controls preload="none" src="'+pack['defaultProfile']+'-'+key+'.mp3"></audio></article>')
page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gems Together announcer</title>
<style>body{max-width:760px;margin:48px auto;padding:0 24px;background:#081a1e;color:#efeddd;font:16px/1.6 system-ui}h1{font-size:32px;line-height:1.2}p{margin:8px 0}header p{color:#a7bdbe}select{width:100%;margin:24px 0;padding:14px;background:#153238;color:#fff0bd;border:1px solid #658183;border-radius:6px;font:inherit}article{padding:20px 0;border-top:1px solid #29474a}audio{width:100%;height:38px}small{color:#a7bdbe}</style>
<header><h1>Your Gems Together announcer</h1><p>Silver crystal is the selected voice: the exact Original 07 takes, with tuned low pitch and short stereo layers. The earlier Warm founder and Cave voices remain selectable.</p><p>Start with “Welcome back to Gems Together!” below. These are the exact compressed clips embedded in the game.</p><small>Turn speech off with Announcer voice on the main Audio tab. Voice and volume choices are in Audio &gt; Announcer voices.</small></header>
<label for="voice">Voice and pitch</label><select id="voice">'''+''.join(options)+'''</select>
'''+''.join(sorted(rows, key=lambda row: 'data-key="welcome-back"' not in row))+'''
<script>document.querySelector('#voice').addEventListener('change',e=>{for(const row of document.querySelectorAll('article')){const a=row.querySelector('audio');a.pause();a.src=e.target.value+'-'+row.dataset.key+'.mp3';}});for(const a of document.querySelectorAll('audio'))a.addEventListener('play',()=>{for(const b of document.querySelectorAll('audio'))if(a!==b)b.pause();});</script></html>'''
(out/'index.html').write_text(page, encoding='utf-8')
print('Listening page:', out/'index.html')
print('Verified',sum(len(p['clips']) for p in pack['profiles'].values()),'embedded MP3 checksums.')
