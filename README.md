# Gems Together

**Match three with the people you love.**

Play it: **https://tront.xyz/gemstogether/**

![Gems Together](og-image.png)

A co-op match-three game on one shared 3D jewel board. Drag a gem onto its neighbour to line up three or more. Cascades chain into combos, and bigger matches forge charged gems: blast gems that detonate their surroundings and prisms that shimmer through the spectrum.

Open the normal link and you land in the public room, on the same board as everyone else playing right now, with their cursors and grabs showing live. Co-op Room makes a private code for just the two of you. Showcase lets the board play itself.

Built by Tront for Jennifer.

## Tech

One HTML file. The cabinet, gems and the whole interface render on the GPU (WebGPU, WebGL2 fallback with `?webgl`). Co-op is peer to peer over WebRTC via [Trystero](https://github.com/dmotz/trystero) (loaded from a CDN); no server of ours. Scores, settings and your optional music track stay on your device.

`tools/verify.mjs` is the release gate: headless Chrome on the real GPU, solo boot (`#solo=1`, never the public room), a real pointer-drag swap, About block and meta, phone layout. Run it against a local file or the live URL.

## Credits

By Tront (Trent Sterling), built with AI coding tools. More games at [tront.xyz/games](https://tront.xyz/games/) · [Discord](https://tront.xyz/discord/)

Trystero is MIT licensed, copyright Dan Motzenbecker.
