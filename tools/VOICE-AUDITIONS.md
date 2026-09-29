# Local announcer auditions

Trent chose **warm and playful** for occasional stage welcomes, big chains and
team moments. The listening lab uses identical lines for each candidate:

- Welcome to Tidepool!
- Dazzling! Look at you go!
- Team Resonance! Better together!
- Supernova! That was beautiful!

Open `tools/out/voices/index.html`. Compare one line across every voice, play a
voice's four lines, mark a favourite, or audition over the real 88 BPM soundtrack.
The page works as a local file and does not upload text or audio.

## Reproduce

Qwen3 and Kokoro use Trent's existing `C:/py` CUDA environment and cached models:

```powershell
cd C:/trontstack/gemstogether
C:/py/python.exe tools/voice-sampler.py --engine kokoro
C:/py/python.exe tools/voice-sampler.py --engine qwen
node tools/music-render.mjs index.html expedition-3.3-stage
ffmpeg -y -loglevel error -ss 12 -t 16 -i tools/out/music/journey.wav -af 'afade=t=in:d=0.2,afade=t=out:st=15.5:d=0.5' tools/out/voices/music-bed.wav
python tools/voice-lab-build.py
```

Kokoro candidates: Heart (`af_heart`), Puck (`am_puck`), Fenrir (`am_fenrir`).
Qwen3 1.7B CustomVoice candidates: Serena and Ryan, with the same warm/playful
style instruction and deterministic seed. Kokoro's natural presets use 1.04x
speed. Clips are trimmed, lightly faded at the edges and adjusted to comparable
levels, with peak protection. Every WAV has a JSON receipt with text, duration,
generation time, model, speaker, style and levels.

The [Kokoro model](https://huggingface.co/hexgrad/Kokoro-82M) and
[Qwen3 CustomVoice model](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice)
are published under Apache-2.0.

VoiceStudio was cloned to `C:/trontstack/clonedrepos/VoiceStudio`, source commit
`0834c8be28460fc4e0518bdb31eb57c494b253b2`. Its default OmniVoice engine uses
an isolated environment at `tools/out/voice-env`, sharing CUDA Torch while
keeping its newer Transformers dependencies separate from Qwen/Kokoro.
Trent explicitly approved the new 3.27 GB model download for local auditions.
Model data stays in `tools/out/voice-models`.

```powershell
tools/out/voice-env/Scripts/python.exe tools/voice-sampler.py --engine omni
python tools/voice-lab-build.py
```

OmniVoice's two synthetic voice designs use a generated reference paragraph to
keep the same persona across short lines. No person's voice is cloned. The
reference audio and original transcript are retained for reproduction.

**OmniVoice auditions are local evaluation assets.** Its pretrained weights
are [CC-BY-NC](https://huggingface.co/k2-fsa/OmniVoice#license); its tokenizer
has separate terms. VoiceStudio's application is AGPL-3.0 and its bundled
OmniVoice implementation has its own Apache-2.0 license, described in its
[license notice](https://github.com/debpalash/VoiceStudio/blob/main/LICENSE-NOTICE.md).
The game and portable package contain the existing synthesized music and
effects. No audition voice is selected or shipped as a production announcer.

## Validation

`tools/voice-lab-audit.mjs` verifies real browser playback and decoded durations
for every clip, desktop/phone controls and the music bed. Sample receipts
measure nonzero energy and bounded peaks. `tools/voice-check.py` uses the existing
cached Whisper base model to check the spoken line and flag listening review.
The stage video alongside the samples
is a deterministic real-game capture; its fade is checked separately by
`tools/expedition-stage.mjs`.

The next voice decision is artistic: compare the samples and choose the persona.
Then produce the full stage/chain/team vocabulary and wire a local volume,
cooldown and music duck into the game's audio bus. Ordinary clears keep their
existing musical sounds.

Current receipts: seven candidates, 28 clips, 34/34 listening-page checks and
28/28 independent speech-content checks. The first OmniVoice female design was
garbled; a fresh design seed and bfloat16 generation passed all four lines.
