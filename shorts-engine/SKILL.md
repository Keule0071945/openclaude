---
name: story-shorts-engine
description: Make vertical (1080x1920) story Shorts in the "drawn 2D cartoon characters in a bright toon-shaded 3D world" genre with this repo's code engine (Three.js + Canvas2D characters, rendered headless). Use for scripting, staging, character design, camera, light, QA, voice, music/SFX and rendering of such a Short.
---

# Story Shorts engine: playbook + workflow

This file holds every lesson from the beer, food, popcorn and popcorn-story builds.
The reference genre is studied from @RicksClips3000. Build **original** stories, characters and sets.
Never copy his designs, captions or wording.

## 0. The one lesson that matters most
**A Short is a tiny film, not an illustrated explainer.** The reference analyses (pink jail cell, button town,
memory shop) show the same structure every time:
- There is one **protagonist with a goal**. People do things in places.
- **Every line is an action** with a fresh view: someone pours paint, climbs a ladder, arm-wrestles.
  Floating badges and bar charts read as "AI slop".
- **Numbers are objects in the world**: a note taped to the wall, a stopwatch showing "15", a counter going
  0047 to 0048, a receipt, a price display, a scale readout.
- There are **many locations**, 10 or more per minute, and the **light changes across the story**: dusk, then evening, then night, then screen light.
- A **twist ending** reframes the hook. Wry, deadpan narration with a "Wait, what?" style viewer interruption.
Topics can still be economics or science. Tell them *through* a character (Jule, the customer, and Frau Brandt, the owner).

## 1. Measured targets (check them, don't guess)
| Property | Reference | Our tool |
|---|---|---|
| Mean luma | 150-168 (0-255) | `lum.py frames/*.jpg` (flags DARK < 135, OVERSAT > 175) |
| Saturation | 110-160 | `lum.py` |
| New view | every 1.1-2.0 s | `shots.cjs` prints the shot table |
| Dissolve | 0.15-0.25 s moving | engine `XF=0.24` |
| Camera | always moving, push-ins as default | `DRIFT.push=0.045`, `{pull:true}` for reveals |
| Captions | 1-2 words, band 61-71 % height | engine captions at `H*0.66` |
| Speech | ~200 wpm, ~0.3 s gaps | Piper `--length-scale 0.9` |
| Loudness | -14 LUFS, music -17 to -18 dB, FX -10 dB under voice | `audio_story.py` |
Our first attempts measured mean luma 30-125, which is why they looked cheap. Light sets warm and bright
(hemisphere light at about 1.1, cream and gold walls, lighter vignettes). Only true night scenes go darker,
and those get a warm practical light against a cool exterior.

## 2. Characters
- **Shape language first.** Each character is ONE primitive: Herr Groschen = circle (a 2-euro coin),
  Jule = bean, Kevin = an egg on a noodle, Frau Brandt = a rectangle. Add 2-3 signature props
  (monocle and top hat; round red glasses, curly puff and scarf; paper cap and name tag; cat-eye glasses on a chain and a pencil).
  A generic parametric "body kit" with recoloured clothes is what read as slop. Don't do it.
- **Rubber-hose limbs** (`hose()` in `cast2d.js`) for everyone, so the whole cast shares one world. Use mitten hands,
  shoes kept level with the ground, and big readable eyes (`eyes/brows/mouth` from `narrators.js`).
- **Expressions** are swapped on the stressed word (`faceAt`). The narrator talks from the voice envelope (`talkAt`).
- **Costume switch** for a twist (`costume:'popcorn'` gives Brandt an apron and a paper hat, with a poof flash).
- Characters are `Toon2D` billboards: a canvas is redrawn every frame from springs on arms, lean and head, plus a walk cycle.
  They are lit by the scene and cast real shadows. To hide legs when someone sits, put them behind a seat row.
- Design sheet: `shorts-engine/design/cast.html` renders every character in 5 poses. Check it before using a new character.

## 3. Files
- `shorts-engine/`: shared code.
  - `cartoon2d.js`: paint, grain and outline helpers.
  - `narrators.js`: Herr Groschen and the other narrators. Exports the helper set `H`.
  - `cast2d.js`: the designed cast.
  - `toon2d_engine.js`: the Toon2D class, gestures `G2` and base poses `BASE2`.
- `popcorn-story/` is the current reference project. Copy it for a new Short.
  - `script.json`: one entry per line, `{scene, text}`. A scene is a location; several lines may share one.
  - `build_voice.py`: Piper "thorsten" (free, local, deep German), pitched down 8 % with warm EQ.
    Whisper `word_timestamps` gives exact word times (aligned to the script by text), then it writes `timeline.json` with the word list, scene list and envelope.
  - `kit.js`: reusable props and sets (lobby, box office, popcorn machine, buckets, coins, posters, stage).
  - `story.js`: `STORY` (title, keywords, rim colours) plus `DEF.<scene>={build(){... return {sc, anchors, shots, grade, update(lt)}}}`.
  - `assemble.py`: builds `render3d.html` from the engine (`food-short/render3d.html`), Toon2D, the kit and the story, and applies the pacing patches.
  - `shots.cjs`: renders the middle frame of every camera segment to `frames/s_XX.jpg`. **This is the main QA loop.**
  - `capture3d.cjs preview t1,t2,…`: renders single stills. `render_segments.sh` is a resumable 300-frame segment render.
  - `audio_story.py`: an original music bed (synthesised) plus event-synced SFX, mastered with loudnorm.

## 4. Shots
`[t_local, 0, points, yawDeg, pitchDeg, minHeight_m, {follow:'anchor', pull:true}]`.
- **Points:** `'name:top|face|chest|knee|feet'` or `[x,y,z]`. `fitShot` frames them inside the safe band.
- **Yaw:** 0 = camera on +z looking -z. 180 = from the other side, for example from the cinema screen toward the audience.
- **Timing:** set `t` to the word time minus 0.3. The cut lands about 0.35 s before the word.
- **Moving targets:** `track(fn)` makes any object (coins in a tube, a bucket) usable as an anchor or a follow target.
- **Overhead or plan shots:** hide occluders when `camera.position.y` is high. That is a cut-away, not a camera behind a wall.
- **Vertical frame:** wide horizontal layouts force the camera far away. Stack things vertically or shoot them one by one.

## 5. Workflow (staged approvals)
1. **Script approval.** Write a story with a protagonist, actions, numbers as objects and a twist.
   The user may record the voice (ElevenLabs "Helmut"); otherwise use Piper.
2. **Storyboard approval.** Run `shots.cjs`, build a contact sheet, then fix every bad frame:
   - a prop between the camera and a face
   - a camera behind a plane or wall
   - a mirrored Flat (rotate it toward the camera side)
   - a face too close
   - dark or flat light
3. **Voice to timeline.** Use the user's recording if there is one, otherwise Piper. Re-check the shot table, because short segments under 0.6 s mean a cut is too early.
4. **Render.** Run `render_segments.sh` in the background, then `audio_story.py`, then mux:
   `ffmpeg -i video3d_noaudio.mp4 -i audio/mix.wav -c:v copy -c:a aac -b:a 192k -shortest out.mp4`.
5. **Final QA.** Contact sheet at about 3 fps, `lum.py`, and listen to the loudness numbers from `ebur128`.

## 6. Known pitfalls (all hit once)
- In one-line JS files, a `//` comment inside a string replacement comments out the rest of the line. Use `/* */`.
- Never mutate shared pose objects. The walk swing used to accumulate into `BASE2`, and arms drifted upward over time.
- Anchors must use the shot-time position. `fitShot` moves the mesh before asking.
- Toon2D `flipBase:true` mirrors a character so a gesture reaches toward the other side.
- YouTube can't be downloaded from the cloud container: its bot check blocks it, and circumventing that is not allowed. Get reference videos as files uploaded by the user, or use the Higgsfield `video_analysis` scene breakdowns.
- Blender (`pip install bpy`) works here, but Cycles and EEVEE take 45-80 s per frame without a GPU. That is too slow for a full Short. Stay with Three.js.

## 7. Light and shadow (lesson from round 2: "more shadows")
- **Flat = cheap.** A strong hemisphere light fills every shadow, and toon shading only works on *direct* light.
  Use a key to fill ratio of about 3:1 or more: `LIGHT={fill:0.38,key:2.6}` scales every `lightsBasic` call.
  A scene without a sun automatically gets a shadow-casting key.
- **Put the key at the side**, for example `[7,7.5,3.5]`, not behind the camera. Shadows then fall diagonally across the floor and stay visible.
- **Shadow catcher:** a `ShadowMaterial` plane (`shadowCatcher(sc,y,opacity,size,x,z)`) just above floors, desks and counters.
  Cast shadows stay readable even where practical point lights (lamps, neon, machines) fill the floor. `lightsBasic` adds one at floor level automatically.
- Characters get an **emissive lift** (0.2), so faces and hands never go muddy in shadow.
  They also get a **contact shadow** (a soft dark ellipse under the feet), so they stand on the floor instead of floating.
- Keep the brightness check (`lum.py`). Night scenes and the cinema auditorium may sit at 55-110 when a motivated light source is in frame.

## 8. Camera never through walls
- Mark architecture with `mesh.userData.wall=true`. `room()` walls are marked automatically.
  `collide()` works like a game camera's spring arm: it raycasts from the shot target to the camera and pulls the camera in front of the first wall.
- **Rooms are camera boxes.** `room()` stores `scene.userData.bounds`, and the camera may not leave it, because there is no front wall.
  A camera outside the room shows wall edges and the end of the floor, which reads as "flying through a wall".
- Before every render, run `node camcheck.cjs`. It lists every shot the spring arm had to shorten. If a shot is shortened below about 70 %,
  redesign it: move the actors, use fewer points, or yaw toward the open side. Don't accept a crushed frame.
- Raycasts need current matrices. Call `scene.updateMatrixWorld(true)` before the first raycast of a scene, or walls appear to sit at the origin.
