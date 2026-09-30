# Gems Together announcer

Trent selected **Original 07 / Tuned stereo crystal** on 2026-09-30. It is
shown as **Silver crystal** in 3.3.5. All nineteen lines use the exact approved
compressed takes: low pitch correction, darker vowels, short stereo layers
and a small bloom. It was row 07 in round nine and row 03 in round ten.
The selected page is `tools/out/voices/blends-round10/index.html`.

The main Audio tab has a visible **Announcer voice** switch. It saves locally
and cancels active and queued speech without muting music or gem sounds.
Audio > Announcer voices has independent volume, previews and the earlier
Warm founder/Cave choices at -2, -4 and -6 semitones. Pack version 3 selects
Silver crystal once while preserving saved voice-off and volume preferences;
subsequent voice choices persist. The Silver profile ID remains `silver`.

## Rebuild and listen

```powershell
python tools/announcer-pack.py
python tools/announcer-lab.py
python tools/polish.py
python tools/announcer-check.py
node tools/announcer-audit.mjs
node tools/verify.mjs
node tools/firefox-highlight.mjs
python tools/crystal-release-audit.py
```

The default pack rebuild installs the selected MP3s frozen in
`voice-references/silver-crystal/`. Its manifest records all nineteen hashes,
source performance hashes, the audition identity and exact processing settings.
Rebuilding needs no TTS model or processing pass and does not re-encode audio.
`announcer-crystal.py --adopt` was the one-time freeze operation; normal runs
install the retained selection. `announcer-pack.py --natural` explicitly
rebuilds the earlier unprocessed Silver pack for archival work.

Open `tools/out/announcer/index.html` to hear the exact compressed game clips.
Silver filenames are `silver-<line>.mp3`, such as `silver-welcome-back.mp3`.
Legacy filenames are `<voice>-<depth>-<line>.mp3`, such as
`founder-4-welcome-back.mp3`. Depth is semitones below the original take.
The selected Silver audio is stereo, 24 kHz / 96 kbps. Source WAVs are matched
to -24 LUFS; the frozen MP3s measure about -24.4 LUFS.
Original unprocessed WAVs and generation receipts remain in the ignored output;
selected production receipts use `silver-crystal-<line>.json`.

The voice uses the retained synthetic Silver speaker and approved arcade-lift
performances from Qwen3-TTS 1.7B Base. Pitch correction edits Praat PitchTier
frequencies and uses overlap-add resynthesis. It is custom correction, not the
Antares plugin. The recipe uses a 92 Hz centre, 65% pitch-range reduction,
full note attraction, a 12 ms retune time constant, formant ratio 0.92,
low-mid EQ, +/-12-cent doubles at 12/27 ms and a 0.25-second bloom. Frozen
compressed audio is authoritative; later DSP code changes cannot alter it.

`announcer-pack.json` contains 133 MP3s and checksums; `polish.py` embeds the
pack into the single HTML file. The browser lazily decodes selected clips;
playback needs no TTS service or model. The six legacy profiles retain their
exact previous bytes. Qwen's recorded model license is Apache-2.0. The three
Bejeweled snippets remain local listening references only, never synthesis
inputs or product assets. See [VOICE-AUDITIONS.md](VOICE-AUDITIONS.md).

## Playback and validation

First interaction welcomes new players; returning players hear **Welcome
back to Gems Together!** once. Ordinary clears retain musical sounds. New
worlds, large chains, Resonance and completion receive occasional narration.
The voice respects master mute and volume and ducks generated music or loaded
tracks. One speaker and one pending cue are allowed, with a seven-second
minimum interval and 45-second repeat guard. Board/voice changes, mute and
hiding the tab cancel speech. Practice, Showcase and photo mode stay quiet;
explicit previews remain available. Calm disables speech. Voice choices are local.

The current runtime gate passes **163/163**, including all embedded MP3s,
exact selected-byte equality, stereo energy, real pointer disabling, saved
preferences, pack migration, phone layout, greetings, actual cascades, stage
travel and private host/peer playback with matching board hashes. Firefox
verifies stereo playback and disabling. The game release gate passes **22/22**.
Speech receipts include MP3 hashes and preserve recognition attempts; a retry
without glossary hints handles done/Dawn confusion without changing audio.
The release audit measures the actual compressed stereo clips and checks their
exact selected hashes before publishing.
