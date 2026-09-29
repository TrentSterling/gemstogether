"""Build a self-contained local listening page from actual generated receipts."""
import json
from pathlib import Path
root=Path(__file__).resolve().parent
out=root/'out/voices'
order=['af_heart','am_puck','am_fenrir','qwen-serena','qwen-ryan','omni-female','omni-male']
lines=['tidepool','dazzling','team','supernova']
clips=[]
for voice in order:
    for line in lines:
        path=out/(voice+'-'+line+'.json')
        if path.exists():
            clip=json.loads(path.read_text(encoding='utf-8'))
            if not (out/clip['file']).exists():
                raise FileNotFoundError(clip['file'])
            clips.append(clip)
html=(root/'voice-lab.html').read_text(encoding='utf-8').replace('__VOICE_CATALOG__',json.dumps(clips))
(out/'index.html').write_text(html,encoding='utf-8')
(out/'catalog.json').write_text(json.dumps(clips,indent=2),encoding='utf-8')
print(len(clips),'actual clips;',len(set(c['voice'] for c in clips)),'voices;',out/'index.html')
