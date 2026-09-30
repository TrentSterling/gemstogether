"""Freeze/install the exact selected Original 07 MP3s, without resynthesis."""
import argparse
import base64
import hashlib
import json
import shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
FROZEN=ROOT/'tools/voice-references/silver-crystal'
MANIFEST=FROZEN/'manifest.json'
OUT=ROOT/'tools/out/announcer'
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def adopt():
    if MANIFEST.exists():
        raise ValueError('Selected takes already frozen; use regular install')
    source=ROOT/'tools/out/voices/blends-round10'
    original=ROOT/'tools/out/voices/tuning-round9'
    rows={c['line']:c for c in json.loads((source/'catalog.json').read_text()) if c['voice']=='crystal-tune'}
    controls={c['line']:c for c in json.loads((original/'catalog.json').read_text()) if c['voice']=='crystal-tune'}
    pack=json.loads((ROOT/'tools/announcer-pack.json').read_text())
    expected=set(pack['profiles']['silver']['clips'])
    if set(rows)!=expected or set(controls)!=expected or len(expected)!=19:
        raise ValueError('Selected audition must contain all nineteen lines')
    FROZEN.mkdir(parents=True,exist_ok=True)
    clips={}
    for key,c in rows.items():
        old=controls[key];mp3=source/c['mp3'];wav=source/c['file']
        if digest(mp3)!=c['mp3Sha256'] or digest(wav)!=c['sha256']:
            raise ValueError('Selected audition changed: '+key)
        if c['mp3Sha256']!=old['mp3Sha256'] or c['sha256']!=old['sha256']:
            raise ValueError('Original 07 differs from round-nine take: '+key)
        if old['sourceMp3Sha256']!=pack['profiles']['silver']['clips'][key]['sha256']:
            raise ValueError('Audition does not match shipped Silver performance: '+key)
        shutil.copyfile(mp3,FROZEN/(key+'.mp3'))
        clips[key]=dict(text=c['text'],file=key+'.mp3',sha256=c['mp3Sha256'],duration=c['duration'],
            channels=c['normalization']['channels'],sourcePerformanceSha256=old['sourceSha256'],
            sourceMp3Sha256=old['sourceMp3Sha256'],selectedWavSha256=c['sha256'],
            selectedWav=str(wav.relative_to(ROOT)),normalization=c['normalization'])
    recipe=next(p for p in json.loads((original/'plan.json').read_text())['presets'] if p['id']=='crystal-tune')
    manifest=dict(version=1,name='Silver crystal',selected='crystal-tune',
        audition='Round ten / 03 / Original 07: stereo crystal',
        originalAudition='Round nine / 07 / Tuned stereo crystal',
        approvedDate='2026-09-30',recipe=recipe,clips=clips)
    MANIFEST.write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print('Frozen nineteen selected Original 07 MP3s; no rendering or encoding.',flush=True)


def install():
    manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
    target=ROOT/'tools/announcer-pack.json';pack=json.loads(target.read_text(encoding='utf-8'))
    profile=dict(name='Silver crystal',semitones=0,pitchLabel='Tuned stereo',processing=manifest['recipe'],clips={})
    if set(manifest['clips'])!=set(pack['profiles']['silver']['clips']) or len(manifest['clips'])!=19:
        raise ValueError('Incomplete selected frozen pack')
    OUT.mkdir(parents=True,exist_ok=True);catalog=[]
    for key,c in manifest['clips'].items():
        source=FROZEN/c['file']
        if digest(source)!=c['sha256'] or c['channels']!=2:
            raise ValueError('Frozen selected stereo take changed: '+key)
        mp3=OUT/('silver-'+key+'.mp3');shutil.copyfile(source,mp3)
        profile['clips'][key]=dict(text=c['text'],duration=c['duration'],
            data=base64.b64encode(source.read_bytes()).decode('ascii'),sha256=c['sha256'])
        receipt=dict(voice='silver',line=key,text=c['text'],mp3=mp3.name,duration=c['duration'],
            mp3Sha256=c['sha256'],engine='Qwen3 Base + Praat pitch correction',
            selected='Original 07 / Tuned stereo crystal',processing=manifest['recipe'],
            sourcePerformanceSha256=c['sourcePerformanceSha256'],selectedWavSha256=c['selectedWavSha256'],
            channels=2,normalization=c['normalization'],frozenSource=str(source.relative_to(ROOT)))
        # Keep original unprocessed Silver WAVs and generation receipts untouched.
        (OUT/('silver-crystal-'+key+'.json')).write_text(json.dumps(receipt,indent=2),encoding='utf-8')
        catalog.append(receipt)
    legacy={name:p for name,p in pack['profiles'].items() if name!='silver'}
    for name,p in legacy.items():
        for key,c in p['clips'].items():
            data=base64.b64decode(c['data'])
            if hashlib.sha256(data).hexdigest()!=c['sha256']:
                raise ValueError('Legacy checksum mismatch')
            mp3=OUT/(name+'-'+key+'.mp3');mp3.write_bytes(data)
            catalog.append(dict(voice=name,line=key,text=c['text'],mp3=mp3.name,
                duration=c['duration'],mp3Sha256=c['sha256']))
    pack.update(version=3,defaultProfile='silver',profiles={'silver':profile,**legacy})
    target.write_text(json.dumps(pack,separators=(',',':')),encoding='utf-8')
    (OUT/'catalog.json').write_text(json.dumps(catalog,indent=2),encoding='utf-8')
    print('Installed exact Silver crystal / 19 stereo calls; six legacy profiles retained.',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--adopt',action='store_true');args=parser.parse_args()
    if args.adopt:
        adopt()
    install()
