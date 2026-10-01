# Status Notch

A one-row bar pinned to the top of the terminal that answers a single
question without you having to read the transcript: **is Claude still
working, or is it waiting for you?**

```
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▐ ● WORKING  1:04 ▌▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
```

## States

| State | Look | Meaning |
|---|---|---|
| **WORKING** | Solid orange pill, a highlight sweeping through it, pulsing dot, elapsed timer | A query is running. Nothing is needed from you. |
| **NEEDS YOU** | Solid blue pill, blinking dot, plus the reason (`approve Bash`, `input needed`) | Claude has stopped and is blocked on your answer. |
| **READY** | One solid green flash, then a thin green outline that stops moving | The turn is finished. Type when you like. |

The design rule is that **motion is the signal**. A notch that is moving
means something is happening; a notch that has gone still and thin means
Claude is done. You can read it from the corner of your eye without
parsing any text.

Transitions ease the pill open and closed over ~260 ms rather than
snapping, so a state change is visible even if you only catch it
peripherally.

## Requirements

The notch is **only painted in fullscreen (flicker-free) mode**. Outside
it the transcript scrolls the terminal, so there is no row that reliably
stays at the top to pin a bar to. Enable fullscreen mode with either:

```bash
CLAUDE_CODE_NO_FLICKER=1 openclaude
```

or `/config` → **flickerFreeMode**.

Inline sessions keep the terminal tab indicator (OSC 21337) instead,
which carries the same three states into the tab sidebar of terminals
that support it.

The notch also hides itself in terminals narrower than 24 columns, where
it would crowd out the transcript.

## Turning it off

`/config` → **statusNotchEnabled**, or in `~/.openclaude.json`:

```json
{ "statusNotchEnabled": false }
```

## Cost

An idle notch unsubscribes from the animation clock entirely once its
flash has burned down, so a session sitting at the prompt pays nothing
for it. While working it repaints at most 12 times a second, and those
repaints are local to the notch — the status is published through a
module store (`src/state/sessionStatusStore.ts`) rather than a prop, so
the REPL is never dragged into the animation cadence.

## Implementation

- `src/components/StatusNotch/notchFrame.ts` — the whole visual language
  as pure functions of `(status, time)`: labels, easing, shimmer window,
  pill geometry. Unit-tested without rendering Ink.
- `src/components/StatusNotch/index.tsx` — thin React shell: subscribes to
  the store, asks the shared clock for frames, paints the segments.
- `src/state/sessionStatusStore.ts` — the published status, written by
  `REPL` from the same value that feeds the tab indicator.
