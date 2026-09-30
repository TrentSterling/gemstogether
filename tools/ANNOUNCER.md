# Gems Together announcer

Trent selected **Silver / arcade lift** from round six, at its original pitch
with no final EQ, compression, reverb, doubling or pitch effects. Silver master
is the default in 3.3.4. Nineteen lines cover greetings, all six stages, chains,
Resonance and completion. The three approved audition WAVs are retained exactly
in `voice-references/silver-approved-*.wav` before MP3 encoding.

The main Audio tab has a visible **Announcer voice** on/off switch. It saves
locally and cancels active and queued speech without muting music or gem sounds.
Audio > Announcer voices has independent volume, previews and the earlier Warm
founder/Cave choices at -2, -4 and -6 semitones. A one-time pack upgrade selects
Silver while keeping existing voice-off and volume preferences; subsequent
voice choices persist normally.

Current casting review is at `tools/out/voices/silver-round6/index.html`.
Trent selected **Silver master** from the twelve-character round five: smooth
bass without rasp. He wants a deep, calming welcome and more expressive wins,
with **Bejeweled 2** as the reference. Thirty local clips compare the exact
liked Silver, three requested deliveries and six processing treatments.
The exact synthetic speaker is frozen in `voice-references/silver-reference.wav`;
its transcript and provenance are in the matching JSON. The page also has
three local Bejeweled listening references, never used in the game or as
cloning inputs. Trent chose arcade lift unprocessed and authorized publishing
the browser game with its remaining lines on 2026-09-30.
See [VOICE-AUDITIONS.md](VOICE-AUDITIONS.md).

The exact new line is **“Welcome back to Gems Together!”** It plays once after
the first audio interaction on a return visit. New players hear “Welcome to
Gems Together!” instead. Ordinary clears keep their musical sounds. New worlds,
completed large chains, Resonance, payouts and challenge completions get short
celebrations.

## Generate and listen

```powershell
cd C:/trontstack/gemstogether
C:/py/python.exe tools/announcer-pack.py
C:/py/python.exe tools/announcer-check.py
python tools/announcer-lab.py
python tools/polish.py
node tools/announcer-audit.mjs
```

Open `tools/out/announcer/index.html` to compare the exact compressed clips.
The welcome-back line appears first. Silver filenames use
`silver-<line>.mp3`, for example `silver-welcome-back.mp3`. Legacy filenames use
`<voice>-<depth>-<line>.mp3`, for example `founder-4-welcome-back.mp3`.
Depth is the number of semitones below the original take; a larger number is
deeper. `cave` is Cave-inspired clean and `founder` is Warm founder.
WAVs and generation receipts are kept beside the MP3s in the ignored output
folder. Unnumbered WAVs are the original, unshifted synthesized takes.

The voices use Qwen3-TTS 1.7B Base with the approved synthetic reference takes
in `tools/voice-references/`. Silver's exact prepared speaker reference and
transcript are in `silver-reference.wav` and its JSON; the new lines use the
selected seed 42 and arcade delivery directions retained in `voice-silver.py`.
Base instruction embeddings are an experimental local model path, preserving
the same method as the approved take. The sixteen new calls measure 79-158 Hz.
The old references use “Supernova! That was beautiful!” and their legacy pitch
shifting uses Praat PSOLA. Silver's finished clips receive no pitch or tone
effects. New generation trims silence, matches loudness to -24 LUFS and adds
short edge fades; FFmpeg encodes final mono clips at 24 kHz / 64 kbps.

`announcer-pack.json` contains 133 MP3s and their checksums. `polish.py` embeds
it into the single HTML file. The browser lazily decodes the selected clips.
Playback needs no TTS service or model.
Only the selected Qwen voices ship; the earlier OmniVoice audition remains
local. The Qwen model's recorded license is Apache-2.0.

## Playback and validation

The voice bus respects master mute and volume, and gently ducks both generated
music and a loaded track. It allows one speaker and one pending cue, with a
seven-second minimum interval and a 45-second repeat guard. Pending cues can
wait through the interval; changing boards or voices, muting or hiding the tab
cancels them. Practice, Showcase and photo mode stay quiet; explicit previews
remain available in the settings panel. Jennifer's calm preset disables speech.
Voice and pitch choices stay local when sharing a board.

The real Chrome gate passed **161/161**: all 133 embedded clips decode with
bounded peaks and nonzero energy, first and returning greetings, duck/restore,
mute, queueing, saved settings, phone layout, a real nine-wave cascade,
stage travel, payouts and private host/peer playback with matching hashes.
The main-tab switch is exercised with real pointer input, including active
and queued cancellation, reload persistence and visible phone placement.
Cached Whisper checked the actual compressed audio: **133/133** spoken-content
checks passed.
Receipts are `tools/out/announcer/runtime-results.json` and
`tools/out/announcer/speech-results.json`.
