# Shallow-Focus Toon 浅景深卡通 — Style Prompt

Made from a blank page; techniques from Sci-Fi Sitcom Toon (scifi-toon) in Lemo-Opuscar, with the depth-of-field band borrowed from Tilt-Shift Miniature (tilt-shift) and word-at-a-time captions inspired by Caption News (caption-news).
Default size: 1080×1920.

> Flat, deadpan cartoon people with round white heads and noodle legs, standing in a soft, sunlit, painted set that a long lens throws out of focus — a vertical short narrated one big word at a time.
> References (grammar only): vertical narrated cartoon shorts and explainer channels (deadpan stick-legged characters, shallow-focus "camera" in 2D, word-by-word captions). Borrow the grammar, never a channel's characters, names, catchphrases or sets.

## 1. Essence, and what it is not

Two depths of image in one frame: **outlined 2D characters with soft volume shading** (constant thick outlines, round light-and-shade) and a **soft, gradient-shaded painted world** that behaves like it was shot through a real lens: whatever is off the focal plane melts into blur, and focus can **rack** from a foreground face to a tiny figure far away. The characters are **round white heads, small dot eyes under heavy brows, tiny or no nose, noodle legs, chunky clothes**; they act with the face, not the body. A narrator tells the story, and the narration lands on screen **one big outlined word at a time**.

Not a flat vector explainer (the world has depth, shadows and soft light), not 3D animation (characters are outlined drawings with soft shading, not models), not a sci-fi sitcom (no portals, no glowing devices, no boiling chaos).

**Copyright red lines:** invent the cast. Never reproduce an existing channel's characters, their colour combinations, names or catchphrases. Never name a source channel in a film.

## 2. Materials & rendering

- **Characters**: near-black warm line (`#231a1f`), ~6 px at full-body size, constant in screen space (transform points to screen, then stroke). Calm boil: ~0.8 px, 3 drawings at 12 fps. **Soft volume shading** on every form (head, garment, hat, hands, shoes, shell): a radial key light from the upper left, a darker falloff toward the lower right edge and a warm rim light on the right, so the flat drawings read as round objects in the 3D set. The outline stays.
- **Heads**: white `#fbfaf7` circles or soft eggs, 0.45–0.6 of the torso height; eyes are solid dots (4–7 px at full size) with a short lid line for deadpan; brows are thick dark wedges and carry all emotion; a mustache or nose is an optional extra shape.
- **Bodies**: a chunky garment (tunic, vest, poncho) sitting on two noodle legs (constant 12–14 px), small round shoes, mitten hands. A belt, a badge, a stripe pattern: one idea per character.
- **World**: painted, not drawn. Vertical **gradients**, soft ambient occlusion at contact lines, warm bounce light, no outlines (or very faint ones). Built as **depth layers** (z in metres) through one perspective camera.
- **Depth of field**: every layer is blurred by its circle of confusion: `blur px = clamp(k · |1/z − 1/focus|, 0, 26)`. The sharp plane is always on a character. Characters off the focal plane blur too (outline included) — that is the look.
- **Shadows**: a soft dark contact ellipse under each character (~55 %) plus a soft sun shadow falling to the lower left; the right-hand buildings cast a shadow band onto the street; porches shade the walls; ambient occlusion where walls meet the ground. All blur with their layer.
- **Set detail for depth**: wood siding lines, recessed windows with frames, sills and a sky reflection, boardwalks with a front edge.
- **Ground**: a perspective street with wheel ruts and footprints as soft darker strokes, receding to a hazy horizon.

## 3. Colour logic

- **Sunny and saturated**: a sky gradient from deep cerulean at the top to pale blue at the horizon, warm sand ground, terracotta and rust buildings, desaturated and lightened with distance (aerial haze toward `#f3dcc4`).
- **Characters carry the strongest colours**: one saturated garment each (mustard, teal, tomato, plum), never the same hue as the wall behind them.
- White heads always read against the set: never put a head over a white cloud or pale wall in focus.
- Example sets: desert town (cerulean / sand / terracotta / sage); seaside village (cobalt / whitewash / coral); autumn farm (teal sky / straw / barn red).

## 4. Type & captions

- **Word captions**: one word at a time (two only for very short pairs like "a", "of"), **Lilita One ~118 px, white, ~16 px black outline**, soft drop shadow, centred at ~72 % of the frame height. Each word pops in with a 3-frame scale overshoot (0.82 → 1.06 → 1). Words come from the narration's ASR word timings; each word holds until the next starts, and the last word of a line holds ≥ 0.45 s.
- A full `.srt` is exported for accessibility; the burned-in captions are the word stream.
- Keep faces out of the caption band (60–80 % of the height) in close-ups; place the eye line in the upper third.
- Signs in the world use Fredoka, painted into the set, and blur with their layer.

## 5. Motion quality

- **Characters on twos (12 fps)**: poses, blinks, brow changes, walk cycles and boil step at 12 fps. **Camera, focus pulls and tumbleweeds move on ones (24 fps)**.
- **Deadpan acting**: holds, then a single small change (brow drop, eye slide, a blink, hat droop). Idle breathing ±1 % squash.
- Anticipation before every gesture; squash on landings; walk cycles bob 6–10 px.
- **Focus pulls ease in and out** over 0.8–1.6 s (`eio`), never linear, never snapping (except a deliberate snap-zoom gag).

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| **Rack focus FG → BG** | attention shifts; "look over there" | a reveal; an arrival; the thing everyone waits for |
| Foreground over-the-shoulder, BG subject sharp | anticipation; a standoff | a duel; a queue; a waiting room |
| Low ground-level track with a tiny subject | scale; slowness or speed made funny | a small hero; a long journey |
| Slow push-in on a still face | the joke sinks in | deadpan reactions; a realisation |
| Snap zoom + 3-frame shake | sudden shock | a punchline word |
| Wide establishing with layered haze | where we are, in one image | an opening; a time-skip |

Rule: every absurd image is followed by a **deadpan reaction close-up**. Transitions are hard cuts or focus pulls (blur out → cut → blur in); no dissolves.

## 7. Sound palette

- **Small comic score**: plucked nylon / steel guitar (Karplus–Strong), a whistled or ocarina-like sine lead, upright-bass plucks, woodblock and shaker; sparse, lots of air. Keys in major with a bluesy flat 7.
- **Foley**: wind bed, tumbleweed rustle, footsteps on sand, a bell, paper rustle, a "boing", a sad slide-whistle down.
- **Narrator**: one dry, warm voice, close-miked, compressed; music ducked ~8 dB under it. Master −14 LUFS.
- **Silence is a beat**: cut the music for the deadpan reaction; leave only wind and a fly.

## 8. Native moves

- **Rack-focus reveal.** Foreground sharp, then focus slides to a tiny figure far away (and back for the reaction). *Fits:* an arrival; a product in the distance; the real culprit.
- **Word-by-word punchline.** The last word of the joke gets its own beat, bigger and held. *Fits:* a twist; a price; a name.
- **Tiny hero, long lens.** A small subject crawling across a huge blurred world. *Fits:* a slow process; a long journey; a deadline.
- **Deadpan hold.** Nothing moves but a blink and the wind. *Fits:* the reaction to anything absurd.

## 9. Pitfalls of the medium

- Canvas `filter: blur()` costs time: render each depth layer once per frame into an offscreen canvas and blur that, not every shape.
- A blurred layer leaks transparent edges: draw layers with margin beyond the frame.
- The blur of a foreground layer must cover the layers behind it (draw back to front, blur per layer), or sharp edges peek out.
- Captions over a pale sky lose their outline contrast: keep the 16 px outline and a shadow.
- Kokoro reads "mail" and "male" alike; fine for voice, but check captions use the script word, not the ASR spelling.
- A rack focus without a held moment before and after reads as a mistake: hold ≥ 0.6 s on each end.
- ffmpeg 6 under-reports audio length through `loudnorm`; use ffmpeg 7+ for `mux.sh`.

## 10. Engine

In `demo/`: `toon.js` (vector engine adapted from scifi-toon: matrix stack, screen-space boil, constant line width, flat shading, sized for 1080×1920), `world.js` (perspective camera, depth layers, per-layer blur, painted set), `cast.js` (round-head characters), `captions.js` (word captions), `main.js` (timeline and shots), `mix.py` (score, foley, voice). Then the technique base: `$LIB/styles/scifi-toon/`.

## 11. Variation space

Story, cast, sets, opening, ending, pacing and voice are free. Away from the demo:

- Structures: **the queue** (rack focus down a line of people, each reaction worse); **the countdown** (a clock in the background, focus flips between it and a face); **the explainer** (a narrator walks through how something works, each step a new depth).
- Openings: an extreme foreground object, blurred, then focus pulls to the scene; a tiny figure far away, sharp, with a huge blurred face entering the foreground.
- Endings: the camera pulls back and the focus opens up to reveal the whole town; the last word of the narration hangs alone on screen.
