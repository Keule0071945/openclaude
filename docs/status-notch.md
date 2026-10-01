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

## How the row stays put

The notch is always on, in both layouts, but it gets its row two
different ways.

**Fullscreen (flicker-free) mode** — Ink owns the whole viewport, so the
notch is an ordinary flex row at the top of the layout. Nothing special
happens.

**Inline mode** — the transcript scrolls the real terminal, so nothing
stays put on its own. The notch shrinks what the terminal is allowed to
scroll: `CSI 2 ; rows r` (DECSTBM) makes rows 2..N the scrolling region
and freezes row 1. The row is then painted between a cursor
save/restore pair, so Ink's renderer never sees the cursor move — its
output is byte-for-byte what it would be without the notch.

Two honest costs of the inline path:

- **The row was the terminal's.** Whatever your shell had printed on
  line 1 is overwritten while the session runs, and blanked when it
  ends.
- **A scroll region is session-wide terminal state.** It is released on
  unmount, from `gracefulShutdown`, and from Ink's signal-exit block. A
  process killed with `SIGKILL` between those can leave it set, which
  `reset` or `tput csr 0 $LINES` clears.

The notch hides itself in terminals narrower than 24 columns or shorter
than 4 rows, where it would crowd out the transcript rather than help.

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
- `src/utils/topRow.ts` — the inline reservation: the DECSTBM sequences
  and the release that every exit path calls.
