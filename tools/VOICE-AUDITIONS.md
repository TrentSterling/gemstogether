# Local announcer auditions

## Selected production voice: Original 07 / Tuned stereo crystal

Trent approved **Original 07: stereo crystal**, shown at row 03 of the
round-ten page, for the final voice. It supersedes the unprocessed Silver
selection and the four later mix candidates. Version 3.3.5 freezes all nineteen
exact selected MP3s in `tools/voice-references/silver-crystal/`; production uses
those bytes without resynthesis or re-encoding. The existing voice-off switch
and saved volume remain. See `tools/ANNOUNCER.md` for rebuilding and validation.
The unselected audit rows below document the earlier listening state.

## Round ten: blend the three closer crystal voices

Trent said round-nine 06, 07 and 08 were closer, but 06 alone was too robotic.
He requested mixing the three. `tools/voice-blends.py` creates four candidates,
retaining shipped Silver and the exact original three as controls. The local
page is `tools/out/voices/blends-round10/index.html`, opened in his existing
Firefox. Its controls are renumbered 02/03/04 and identify their original
06/07/08 names explicitly.

- 05, All three: balanced. Literal blend of original 06/07/08 at 20/45/35%.
- 06, All three: softer robot. Literal blend at 10/60/30%.
- 07, Locked crystal, layered. One voice locked at F-sharp 2, formant ratio
  0.88, low-mid EQ, stronger short stereo layers and a 0.25-second bloom.
- 08, Almost locked, layered. The same treatment with 88% pitch range
  reduction, 65% note attraction and a 25 ms retune time constant.

Literal mixes retain the two original pitch centres and align the shared
performance timing; shorter tails are zero-padded. The combined treatments
test a single main pitch rather than mixing 82 Hz and 92 Hz voices. On the
welcome, dry resynthesis in 07/08 measures 92.48/92.37 Hz with 0.08/0.89
semitone 10th-to-90th-percentile spans. The integrated takes use dark vowels
and stereo settings with centre/wet gains 0.50/0.72, +/-12-cent doubles at
12/27 ms, and a short bloom. New combined renders have compensated transient
limiting; all new audio is linearly matched to -24 LUFS. Exact control PCM
and MP3 hashes are retained.

All 38 actual pitch checks, 152 level/peak checks and 32 compressed preview
speech checks pass. The actual Chrome/game/file player passes 42/42 checks;
native Firefox passes 13/13. All nineteen calls exist for every candidate,
including selected-treatment automatic announcements during solo play.
Favourites, voice-only playback, the real music/ducking/compressor path and
the retained Bejeweled listening references are available. Production and
round-nine sources retain their hashes. These results verify processing and
playback, not perceived quality; no new default has been chosen.

```powershell
python tools/voice-blends.py --check
node tools/voice-processing-audit.mjs blends-round10
node tools/voice-processing-firefox.mjs blends-round10
```

## Round nine: actual pitch correction

Trent requested AutoTune-style processing: the reference sounds like deep,
dark crystals, while Silver sounds like a dude yelling in a tube. The local
comparison is `tools/out/voices/tuning-round9/index.html`, opened in Firefox.
`tools/voice-tuning.py` edits voiced Praat PitchTier frequencies and resynthesizes
with overlap-add. It follows the local GLaDOS correction approach, with lower
tracking bounds, logarithmic range control, explicit retune time and measured
output. This is custom pitch correction, not an installed Antares plug-in.
Historical Bejeweled processing remains unknown.

Eight rows, each with all nineteen retained Silver performances:

1. Exact shipped Silver MP3s.
2. Exact round-seven row 17, Deep echo and room, retained for comparison.
3. Four semitones down and 8% darker formants, without tuning or ambience.
4. Gentle tuning around F-sharp 2, 60% range reduction, 55% note attraction,
   45 ms retune time constant.
5. Hard chromatic tuning, 35% range reduction, full snap, 5 ms time constant.
6. Fixed F-sharp 2 (92.50 Hz) for all voiced syllables.
7. Full tuning with 65% range reduction, 12 ms time constant, low-mid EQ,
   prominent short stereo microshift and a 0.25-second bloom.
8. Lower E2 (82.41 Hz), 85% range reduction, 8 ms time constant, darker
   formants, stronger stereo microshift and a 0.30-second bloom.

The new renders use latency-compensated transient limiting before linear
-24 LUFS matching; retained controls preserve exact PCM/MP3 bytes. The dry
tuned-only FLOAT renders and pitch contours are retained separately. The
welcome output confirms actual correction: gentle/hard median note errors
are 26.6/5.9 cents; the fixed-note version measures 92.49 Hz with a 0.06-semitone
10th-to-90th-percentile span. Rows 7/8 measure 92.39/82.32 Hz with 2.95/1.02
semitone spans before stereo effects. Full-clip stereo difference energy in
rows 7/8 is 28.4/38.0%, versus 2.3% in the previous closest control. Those
full-clip figures are not direct same-word matches to the round-eight reference.

All 23 actual pitch checks, 152 level/peak checks and 32 compressed preview
speech checks pass. Chrome's real-game/file player passes 41/41 checks;
native Firefox passes 13/13. Inside-the-game comparisons route through the
real music, SFX, compressor, ducking and voice gain. Voice only, favourites,
Stop and automatic selected-treatment announcements remain available.
The solo sandbox has isolated saves. Production HTML and the pack retain
their original hashes. These checks establish technical behavior, not a
successful perceptual match. No production treatment has been approved.

```powershell
python tools/voice-tuning.py --check
node tools/voice-processing-audit.mjs tuning-round9
node tools/voice-processing-firefox.mjs tuning-round9
```

## Round eight: diagnose the reference before more processing

Trent rejected the round-seven treatments as a final sound; row 17, Deep echo
and room, was closest. He requested diagnosis of the original Bejeweled 2 voice,
including whether pitch correction might explain the missing quality.
`tools/voice-diagnose.py` measures nine retained clips with two Praat pitch
trackers, stereo structure, stereo-power spectra and cached Whisper word timing.
The local report is `tools/out/voices/diagnosis-round8/index.html`, opened in
Firefox. It includes four plots, matched two-word excerpts and centre/difference
reference playback. Its asset/player gate passes 26/26 checks.

For only "Welcome back", reference versus row 17: median pitch about 91/95 Hz;
10th-to-90th percentile pitch span 3.6/8.9 semitones; estimated word-aligned
duration 0.97/0.71 seconds; stereo difference energy 29.6/2.2%; stereo power in
120-250 Hz 65.3/35.4%. Spectral power averages channel powers, avoiding mono
phase cancellation. Pitch still needs caution: averaging wide channels changes
some estimates, particularly Excellent. Per-channel and cross-correlation
measurements are retained in `analysis.json`; the final snippets do not reveal
the historical plugin chain or separate the actor's work from effects.

The evidence supports testing steadier, slower delivery, stronger low-mid/vowel
resonance and stronger short stereo layering. Pitch correction remains a
hypothesis; no Auto-Tune usage is verified. The measured reference retains
continuous pitch movement. A quiet double or another longer echo does not test
the full observed gap. No new TTS or production changes in this diagnosis.

```powershell
python tools/voice-diagnose.py
node tools/voice-diagnose-audit.mjs
```

## Round seven: processing in the actual game

After listening to shipped 3.3.4, Trent said Silver feels out of place and
requested a processing gauntlet for deeper resonance, echo and ambience.
The new local page is `tools/out/voices/processing-round7/index.html`.
It compares twenty treatments of the **exact shipped Silver performances**,
with all nineteen lines available in every treatment (380 clips). No new TTS.

The first six rows isolate body EQ/compression, vowel resonance and pitch.
Rows 7-10 compare short room, plate, hall and early reflections. Rows 11-14
compare 90/160 ms and 88 BPM eighth/quarter-note echoes. Rows 15-20 combine
depth and ambience, including a quiet stereo double and the gem sound room's
decay/filter/seed. The baseline MP3s retain the exact production bytes.
Other outputs are linearly matched to -24 LUFS with bounded peaks and retained
raw renders; linear gain preserves the entire tail. Exact settings and hashes
are in `plan.json`, `catalog.json` and each clip's receipt.

Listening defaults to **Inside the game**. The embedded cabinet runs the real
3.3.4 music, SFX, compressor, announcer volume and ducking, with separate save
keys and `#solo=1`. Preview four common calls, mark multiple favourites and
compare them sequentially, or enable **Announce while I play**. Every automatic
call uses the selected processing treatment. **Voice only** silences the
cabinet for isolated playback; Stop cancels speech and its full baked tail.
The Bejeweled 2 snippets remain local listening references only.

All 380 level/peak checks pass. Cached Whisper recognizes 78/80 representative
compressed calls exactly enough for the existing speech threshold. Two
quarter-note echo calls repeat their endings audibly and the recognizer
transcribes those repetitions; the page marks those heavy-echo buttons.
Perceived fit and the production processing choice still await listening.
The live game and its production pack have unchanged hashes.
The actual Chrome/file player passes 52/52 checks, including all 380 MP3
decodes, full-tail sequential comparisons, cancellation, saved favourites,
automatic stage calls and a playable board. Native Firefox 157 / WebGL passes
13/13 local-file checks, including all eighty preview decodes and real pointer
playback. Browser receipts and desktop/phone screenshots are in the round folder.

```powershell
python tools/voice-processing.py --check
node tools/voice-processing-audit.mjs
node tools/voice-processing-firefox.mjs
```

## Current direction: smooth, deep Silver master

Trent selected **Silver master** from round five: the bass he wanted without
rasp. He wants variations with more celebratory energy, but a smooth, deep,
calming "Welcome back". His specific tonal reference is **Bejeweled 2**.
This supersedes the earlier baritone/Cave ranking below. On 2026-09-30 he
selected **Silver / arcade lift**, at its original pitch with no final tone
effects, and explicitly authorized the remaining lines and publishing the
browser game. Production generation and validation are in [ANNOUNCER.md](ANNOUNCER.md).

The focused comparison is `tools/out/voices/silver-round6/index.html`:
the exact liked Silver, three requested delivery directions and six DSP rows.
The DSP rows are four semitones down (timing/formants preserved), gentle
EQ/compression, a diffuse short room tail, a quiet stereo double, EQ plus room,
and the lower pitch plus EQ/room. Thirty final clips pass speech and level
checks; the player passes 46 checks, including real reference playback and
Stop cancellation. Asset checks pass 92/92, including exact baseline WAVs,
the frozen reference, stereo channels and game/pack hashes.

The exact prepared synthetic Silver reference is now retained in
`tools/voice-references/silver-reference.wav` with provenance in its JSON.
SHA256: `3043e39c2689dddba1f6dfb6840b8a3ecbe6c2211d32fd5a20952add90215ad8`.
The nine new calls share this reference, with no final pitch edit. Qwen Base
has no documented style-instruction API: these experiments pass instruction
embeddings through the locally inspected model's `instruct_ids` path. The
prompts describe requested moods, not verified subjective results. Two high
calls were retried with the same speaker reference; rejected takes remain
local. Final new calls measure 100-146 Hz. The lower DSP rows measure 96-119 Hz.

Three publicly playable Bejeweled 2 snippets are retained locally under
`tools/out/voices/bejeweled2-reference/`, with source URLs and hashes. Their
measured median pitches are 73 Hz (Excellent), 88 Hz (Welcome back) and 92 Hz
(Incredible). These short recordings contain effects; measurements do not
prove a perceptual match. Level-matched listening references appear at the
bottom of the page. They are never cloning inputs or game assets.

```powershell
C:/py/python.exe tools/voice-silver.py
# Only if reviewing a high-register call: add --retry-reviewed.
C:/py/python.exe tools/deep-voice-level.py --round silver
C:/py/python.exe tools/voice-check.py --round silver
python tools/voice-lab-build.py --round silver
node tools/voice-lab-audit.mjs --silver
```

The generator needs retained round-five outputs, local Bejeweled listening
references and the already cached Base model. It verifies reference and clip
hashes before cache reuse. The normalizer preserves stereo and keeps an
already level-matched baseline byte-identical. No production pack changes.

## Earlier casting

Trent wants a deeper Bejeweled-style announcer with Qwen's expressive energy.
After round four, the fresh baritone is his favourite and Cave with darker
resonance is also good. He explicitly requested a shotgun casting of more
described characters, with less focus on Cave. The game pack remains unchanged
while he listens; his audition ranking does not choose the production default.

Round five casts twelve new descriptions at
`tools/out/voices/casting-round5/index.html`: velvet arcade, bronze champion,
thunder king, grand carnival, golden broadcaster, granite storyteller, regal
judge, roguish champion, honey bass, heroic herald, silver master and canyon
bass. Each uses one retained designed reference and the same three short lines.
The favourite baritone and darker Cave are comparison rows. The page exposes
each exact description. If a native reference measures above 165 Hz, its median
is prepared at 115 Hz with 0.9 formants before the Base model generates the calls.
The native reference remains retained and the final new calls have no pitch edit.
This is local character casting; no original Bejeweled reference match is verified.

Round five is ready and open in Firefox: 42/42 actual speech checks, 42/42
level/duration checks and 55/55 browser/player checks. Final new calls measure
66-167 Hz. Four high-register calls needed another generation seed; each kept
its original speaker reference. Their rejected takes are retained under
`rejected/`. `--retry-reviewed` retries high-register or speech-review calls
without replacing a character. The two comparison rows match round four's PCM
exactly. Playback now also handles Stop during a pending play request without
showing an obsolete cancellation error.

```powershell
C:/py/python.exe tools/voice-casting.py
C:/py/python.exe tools/deep-voice-level.py --round casting
C:/py/python.exe tools/voice-check.py --round casting
python tools/voice-lab-build.py --round casting
node tools/voice-lab-audit.mjs --casting
```

Round four is the focused processing comparison at
`tools/out/voices/tone-round4/index.html`: unchanged Cave / -6, darker vowel
resonance, another two semitones down, gentle EQ/compression/short room and the
unchanged baritone. Its fifteen clips passed speech and level checks; its player
passed 24 checks. Both unchanged rows match the prior audition PCM exactly.

```powershell
C:/py/python.exe tools/voice-tone.py
C:/py/python.exe tools/deep-voice-level.py --round tone
C:/py/python.exe tools/voice-check.py --round tone
python tools/voice-lab-build.py --round tone
node tools/voice-lab-audit.mjs --tone
```

The warm/playful casting below is historical. Round three compared the fresh
bass and baritone with pitch/formant edits of the earlier performances.

The third round uses the exact same three lines for every candidate: Welcome
back to Gems Together, Brilliant / Beautifully done, and Resonance / Let it
shine. Two current-pack rows provide listening baselines. Fresh characters use
one designed reference each, lowered before the cached Base model generates the
three lines. Descriptions alone produced 223-308 Hz calls; those raw casting
experiments are retained locally. The reference-first variants have no final
pitch shift. Speaker identity stays tied to the same retained reference.
The edited rows preserve relative pitch across the three performances and
their duration, with a 0.9 formant ratio. Auditions do not change the game pack.

```powershell
C:/py/python.exe tools/deep-voice-plan.py
C:/py/python.exe tools/deep-voice-audition.py --mode compare --low-reference
C:/py/python.exe tools/deep-voice-level.py
C:/py/python.exe tools/voice-check.py --round deep
python tools/voice-lab-build.py --round deep
node tools/voice-lab-audit.mjs --deep
```

Open `tools/out/voices/deep-round3/index.html` after generation. Exact descriptions,
seeds, reference hashes, offline model revisions, processing and measurements
live alongside the audio. `deep-voice-plan.py` only prepares and measures; it
does not synthesize. The generator sets a workspace-local Numba cache so its
Librosa import can run without writing to the Python installation. Both models
are already cached; no model download is required.

Measurements of the actual embedded MP3s: Warm founder / -4 is approximately
203, 274 and 253 Hz for the three lines; Cave / -6 is 139, 185 and 175 Hz.
These describe measured median pitch, not expression or perceived quality.
A 105 Hz source-set target requires about -19 semitones for founder and -15
for Cave, so compare the edited versions by ear rather than assuming they
will sound natural. The listening page retains current voices as a baseline.

Trent's round-three listening ranking is **Current Cave / -6** first and
**Fresh booming baritone / low reference** second. Neither yet matches his
desired Bejeweled announcer tone. Keep these performances as the next comparison
bases. Discuss modest additional pitch lowering, separate formant changes and
light compression / short reverb before rendering more variants. His favourite
was not the deepest Cave edit; a numerical pitch target cannot choose the voice.
At that stage the specific Bejeweled reference was pending. This is a provisional audition
ranking, not a production-pack selection.

The reference-first generation yielded 87-138 Hz calls without shifting the
finished clips. The audition clips are matched to -24 LUFS, with original
renders retained under `raw/`; exact loudness, peaks and duration receipts are
in `level-results.json`. Cached Whisper checks the actual normalized audio.

Trent chose **warm and playful** for occasional stage welcomes, big chains and
team moments. The listening lab uses identical lines for each candidate:

- Welcome to Tidepool!
- Dazzling! Look at you go!
- Team Resonance! Better together!
- Supernova! That was beautiful!

Open `tools/out/voices/index.html`. Compare one line across every voice, play a
voice's four lines, mark a favourite, or audition over the real 88 BPM soundtrack.
The page works as a local file and does not upload text or audio.

## Trent's selection and lower-register auditions

Trent chose **Qwen3 / Ryan** after listening. Kokoro and OmniVoice were too flat
for the desired expressive game announcements. The next question is Ryan's pitch
and whether a designed voice can approach the existing Cave-inspired announcer.

Open `tools/out/voices/ryan-round2/index.html`. Eight candidates read the same
four lines: original Ryan, Ryan with a lower baritone delivery prompt, Ryan with
PSOLA pitch shifts of -2 and -4 semitones, the exact `glados/presets/facility_pa.json`
VoiceDesign prompt and seed 42 heard clean, that same take through its original
PA DSP, a new deep gravelly warm founder design, and a Base-model clone anchored
to the actual clean WHACKO dawn recording. The original dawn take is included
both clean and through its PA effects. All audition files stay local and ignored.

```powershell
C:/py/python.exe tools/voice-ryan.py
python tools/voice-lab-build.py --round ryan
C:/py/python.exe tools/voice-check.py --round ryan
node tools/voice-lab-audit.mjs --ryan
```

`voice-ryan.py` uses already cached CustomVoice, VoiceDesign and Base models, with
network access disabled. The literal descriptions and seeds are saved alongside
each take, plus source hashes for the preset and processed audio. Ryan's delivery
prompt asks for a lower register, but it cannot guarantee a numerical pitch.
The PSOLA variants multiply pitch-tier frequencies while retaining duration and
leaving formants unshifted; measured median pitches are recorded for comparison.

The facility design reuses the locked preset without modifying it. Your
`glados/CASTING.md` records that changing a design's description can change the
speaker. Audition clean before adding DSP; freeze the selected reference and
use the cached Qwen3 Base cloning model for a consistent production character.
The reference clone candidate exercises that workflow using the existing dawn
take. Its clean source is checked against the known PA recording by running the
original DSP and recording waveform correlation. These short samples remain
casting tests; perceived character consistency still needs Trent's listening review.

### Round-two evidence

32 four-line clips and two existing-run references decode in the browser player.
The pitch-shifted Ryan variants measured lower on all eight takes, with duration
unchanged. A lower-register instruction alone was unreliable: three Ryan takes
measured higher than the originals. Median voiced pitches in the original Ryan
set range from 174 to 233 Hz; the actual-run reference clones range from 102 to
149 Hz. Those measurements describe pitch, not perceived performance quality.

With the stricter 0.95 normalized-text similarity threshold, Whisper recognizes
all Ryan variants and all four reference-cloned lines exactly. 27/32 clips pass;
five description-only / PA takes need listening review for Dazzling or Better
together. The player marks those buttons with "check pronunciation" and retains
the recognized text in their tooltips. Speech checks do not grade expression.

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
OmniVoice is excluded from the game and portable package. The later selected
Qwen voices ship in patch 22; see [ANNOUNCER.md](ANNOUNCER.md).

## Validation

`tools/voice-lab-audit.mjs` verifies real browser playback and decoded durations
for every clip, desktop/phone controls and the music bed. Sample receipts
measure nonzero energy and bounded peaks. `tools/voice-check.py` uses the existing
cached Whisper base model to check the spoken line and flag listening review.
The stage video alongside the samples
is a deterministic real-game capture; its fade is checked separately by
`tools/expedition-stage.mjs`.

Trent subsequently preferred Qwen / Ryan, then selected the round-two Warm
founder and Cave-inspired clean designs and requested lower pitches. Patch 22
ships both selected identities at -2, -4 and -6 semitones, with nineteen lines
each, local controls, a cooldown and music ducking. The requested welcome-back
line is included. Ordinary clears keep their existing musical sounds. The
original and round-two audition pages remain available for comparison.

Current receipts: seven candidates, 28 clips, 34/34 listening-page checks and
28/28 independent speech-content checks. The first OmniVoice female design was
garbled; a fresh design seed and bfloat16 generation passed all four lines.
