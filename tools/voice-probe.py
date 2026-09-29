import importlib.util
import sys
from pathlib import Path
import torch

print('Python', sys.executable, flush=True)
print('Torch', torch.__version__, 'CUDA', torch.cuda.is_available(), flush=True)
print({m: bool(importlib.util.find_spec(m)) for m in ['kokoro', 'qwen_tts', 'soundfile', 'faster_whisper']}, flush=True)
cache = Path.home() / '.cache/huggingface/hub'
for model in cache.glob('models--*'):
    if 'TTS' in model.name or 'Kokoro' in model.name:
        for snapshot in (model / 'snapshots').glob('*'):
            print(model.name, snapshot, [p.name for p in snapshot.iterdir()], flush=True)
