# Egyptian temple art candidate — 3.4.0-candidate.2

Local, unpublished production-art iteration requested after the first Egyptian pass. The prior reviewed candidate remains in the workspace snapshot and Library version history. Chrome-only muted headless rendering without input, focus or audio was approved at 21:14 UTC. After a coordinated startup diagnosis, the official execution approval route succeeded without browser/OS security changes. Bounded actual WebGPU/WebGL art inspection is now recorded; it is **not full release qualification**. Firefox remains disabled. The denied swap/co-op runner remains unrun.

## Visible change

- A stepped temple gateway and tall battered pylons replace the garden arch/vine silhouette. Wide carved faces, lotus capitals, deep cavetto cornices and cloisonne panels carry the theme at a distance.
- The scarab has a split raised shell, head, legs and solid sun disk. Two feather ranks use lapis underflight, turquoise coverts, gold shafts and shoulder clasps.
- The cabinet gains raised cartouche panels and a broad enamel lower frieze. The original board aperture, title and control layout are preserved.
- Accepted matches build from rail chase to carved ankh seals, eight outward-opening solar shutters, a physical feathered sun, then a staggered second sun rank for the encore. These charge, unfold and fold away once; they emit no new particles or repeated screen strobes.
- The event selector keeps tier, age and envelope together. A fresh low-tier match cannot borrow the rank of an older fading high-tier event.

## Build and preservation

`python tools/polish.py` builds the candidate from the frozen source and modules. Art resides in `egyptian-art.js`, `egyptian-hero.js`, `egyptian-temple.js` and `egyptian-spectacle.js`. Existing renderers/material shaders are unchanged.

Legacy garden geometry is constructed into a discarded local geometry object so its seeded random consumption is preserved. Downstream floating islands and crystals retain their exact seeded sequence. This is a bounded startup allocation, not per-frame work. The uploaded static world becomes smaller: 61,967 to 56,002 triangles. Feedback adds one fixed mesh batch with capacity eight; no allocation grows with a long chain.

CPU validation checks finite/nondegenerate actual meshes, deterministic output, preserved seeded islands, 48 comfort cases, eight suppression states, 10,000 bounded event updates and clean expiration. Reversing only the explicit art integration changes reconstructs the prior reviewed runtime byte for byte, covering PR26 notices and the existing rules, HUD, progression, saves, co-op and audio.

CPU timings measure mesh construction and storage-only instance updates. They are not GPU frame cost, player FPS, phone hardware performance or input latency. Software-rasterized previews use the same generated triangle data and are marked **CPU ASSET PREVIEW / NOT IN-GAME VALIDATED**. They omit game UI, gameplay and shader/postprocessing behavior and cannot replace runtime review.

## Required before publication

Finish bounded render/capture review within the approved Chrome-only scope. The original input/co-op/mobile and native Firefox gates remain separately held; publication still needs those authorized gates, independent final release review, and the existing CI/deploy/live workflow. Nothing has been pushed, merged or deployed. Do not rerun the denied input runner or use alternate input paths while its hold remains.

## Actual-render refinement

Chrome inspection confirmed that the new architecture and staged physical suns read clearly while keeping the board and controls visible. The wide crest was too subordinate beside the pylons, so wide feathers now spread horizontally by 1.6, keeping body dimensions, vertical framing, depth and the full phone form unchanged. Independent review passed 2,592 production-camera cases, 5,184 exact phone-buffer comparisons, unchanged geometry/batch counts, complete non-art reconstruction and a byte-identical independent build. At 844x390 the original narrow vertical title slot still limits fine crest detail. At 320x480 the existing About/title overlap is present in the earlier public baseline and is not introduced or fixed by this art pass.

Actual images and silent staged sequences exercise presentation hooks on unchanged boards. They do not exercise real matches, input, co-op or saves. Millisecond wall-clock draw/completion samples are desktop headless measurements, not phone hardware FPS or latency. Each owned Chrome process retains its isolated profile, stdout/stderr, exit and exact-profile cleanup receipts.

## Maximum-punch crest correction

The saved CPU review reproduced wide-layout wing clipping at maximum camera punch (about 13 px above the viewport at 1280x800). The frame pose now solves the existing camera projection for the crest's quiet vertical screen centre. Only the wide crest's presentation position changes during punch/shake; its size, the gameplay camera, compact layouts and the quiet pose remain unchanged. Crown, wings and their support use the same corrected pose. Independent review passed 2,592 actual-geometry/camera cases; the 1280x800 minimum top improves from -12.714px to +9.222px, with no title/About overlap in the sampled cases. Actual approved Chrome inspection remains pending. The previously delivered `cd1b3e6442b2` build remains intact under `evidence/gems-royal-temple/before-punch-correction` and in Library. The correction companion is `libfile_ba10727367448191a744e15cebe94cb4`; it contains corrected offline/source HTML, the module patch and CPU evidence.
