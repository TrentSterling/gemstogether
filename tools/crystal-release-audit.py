"""Verify selected audio bytes, compressed levels and current browser receipts."""
import base64
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tools/out'
VERSION=sys.argv[1] if len(sys.argv)>1 else '3.3.6'
pack_path=ROOT/'tools/announcer-pack.json'
pack=json.loads(pack_path.read_text(encoding='utf-8'))
html=(ROOT/'index.html').read_text(encoding='utf-8')
frozen=ROOT/'tools/voice-references/silver-crystal'
manifest=json.loads((frozen/'manifest.json').read_text(encoding='utf-8'))
checks=[]
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def check(name,value):
    checks.append(dict(name=name,passed=bool(value)))
    print('PASS' if value else 'FAIL',name,flush=True)

embedded=json.loads(re.search(r'const ANNOUNCER_PACK=(.*);\nconst ANNOUNCER_VISIT=',html).group(1))
check('final HTML embeds exact selected pack',embedded==pack)
check(VERSION+' browser version and pack upgrade',("version:'"+VERSION+"'") in html and pack['version']==3)
check('Silver crystal default and complete nineteen-line selection',pack['defaultProfile']=='silver'
      and pack['profiles']['silver']['name']=='Silver crystal'
      and set(pack['profiles']['silver']['clips'])==set(manifest['clips']) and len(manifest['clips'])==19)
check('public co-op boot retained','app.coop=new GlobalCoopRoom(app)' in html and 'joinPublic' in html)
old=json.loads(subprocess.check_output(['git','show','d412882:tools/announcer-pack.json'],cwd=ROOT))
check('six legacy profiles unchanged',all(pack['profiles'][k]==p for k,p in old['profiles'].items() if k!='silver'))
levels=[]
for key,c in manifest['clips'].items():
    embedded_clip=pack['profiles']['silver']['clips'][key]
    disk=OUT/'announcer'/('silver-'+key+'.mp3')
    check('exact selected Original 07 bytes: '+key,
        digest(frozen/c['file'])==digest(disk)==c['sha256']==embedded_clip['sha256']
        and hashlib.sha256(base64.b64decode(embedded_clip['data'])).hexdigest()==c['sha256'])
    result=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(disk),
        '-af','loudnorm=I=-24:TP=-1.5:LRA=11:print_format=json','-f','null','-'],
        capture_output=True,text=True,check=True)
    measured=json.JSONDecoder().raw_decode(result.stderr[result.stderr.rfind('{'):])[0]
    info=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0',
        '-show_entries','stream=channels,sample_rate','-of','json',str(disk)]))['streams'][0]
    level=dict(line=key,mp3Sha256=digest(disk),LUFS=float(measured['input_i']),
        truePeakDb=float(measured['input_tp']),channels=info['channels'],sampleRate=int(info['sample_rate']),
        pcmMatchedLUFS=c['normalization']['measuredLUFS'],codecAllowanceLU=1)
    # The approved MP3s measure about 0.45 LU below their matched PCM. Preserve
    # those exact listening-approved bytes and bound delivery within one LU.
    level['passed']=abs(level['LUFS']-level['pcmMatchedLUFS'])<level['codecAllowanceLU'] and level['truePeakDb']<-1.3 and level['channels']==2 and level['sampleRate']==24000
    levels.append(level)
check('all nineteen compressed clips retain stereo, loudness and safe peaks',all(c['passed'] for c in levels))
speech=json.loads((OUT/'announcer/speech-results.json').read_text())
check('all 133 current compressed speech checks pass',len(speech)==133 and all(c['pass'] and
      c['mp3Sha256']==digest(OUT/'announcer'/c['file']) for c in speech))
runtime=json.loads((OUT/'announcer/runtime-results.json').read_text())
check('current audio, settings and private co-op gate',runtime['pass']==163 and runtime['fail']==0)
game_log=OUT/'release'/('game-'+VERSION+'.log') if VERSION!='3.3.5' else OUT/'announcer/crystal-game.log'
log_bytes=game_log.read_bytes()
game=log_bytes.decode('utf-16' if log_bytes.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig')
check('current '+VERSION+' browser release gate',('PASS version '+VERSION) in game and '22 passed, 0 failed' in game)
firefox=json.loads((OUT/'highlights/firefox-results.json').read_text())
check('Firefox selected stereo voice and voice-off control',firefox['pass'] and firefox['voice']['channels']==2
      and firefox['voice']['name']=='Silver crystal' and firefox['voice']['disabled'])
check('original source drop unchanged',not subprocess.check_output(['git','diff','--name-only','d412882','--',
      'versions/gemstogether-v3.2.4.html'],cwd=ROOT).strip())
result=dict(version=VERSION,createdUtc=datetime.now(timezone.utc).isoformat(),
    htmlSha256=digest(ROOT/'index.html'),packSha256=digest(pack_path),selection='Original 07 / Tuned stereo crystal',
    passed=sum(c['passed'] for c in checks),failed=sum(not c['passed'] for c in checks),checks=checks,levels=levels,
    receipts={name:digest(OUT/name) for name in ['announcer/runtime-results.json','announcer/speech-results.json',
        str(game_log.relative_to(OUT)).replace('\\','/'),'highlights/firefox-results.json']})
(OUT/('release/crystal-'+VERSION+'.json')).write_text(json.dumps(result,indent=2),encoding='utf-8')
(OUT/'announcer/crystal-level-results.json').write_text(json.dumps(levels,indent=2),encoding='utf-8')
print(result['passed'],'passed;',result['failed'],'failed',flush=True)
raise SystemExit(1 if result['failed'] else 0)
