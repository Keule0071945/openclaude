import type { TabStatusKind } from '../../ink/hooks/use-tab-status.js'
import type { Theme } from '../../utils/theme.js'

/**
 * Pure render model for the status notch — a one-row bar pinned to the top
 * of the fullscreen layout that answers one question at a glance: is Claude
 * still working, or is it waiting for me?
 *
 * Everything here is deterministic in (status, time). The React shell in
 * ./index.tsx only feeds it a clock and paints the segments, so the whole
 * visual language is unit-testable without rendering Ink.
 *
 * Visual grammar — the point is that motion is the signal:
 *   busy     solid brand fill, a shimmer travelling through it, dot heartbeat
 *   waiting  solid permission fill, dot blinking — it wants an answer
 *   idle     one bright inverse flash, then a thin outline that never moves
 *
 * A notch that has stopped moving is the "I'm done" signal, so idle also
 * stops asking for animation frames entirely (see notchIntervalMs).
 */

/** Open/close easing when the notch changes state. */
export const MORPH_MS = 260
/** How long the "just finished" flash stays lit after entering idle. */
export const FLARE_MS = 900
/** One full travel of the working shimmer. */
export const SHIMMER_PERIOD_MS = 1400
/** Width of the shimmer highlight, in cells. */
export const SHIMMER_WIDTH = 6
/** Heartbeat step for the status dot. */
export const PULSE_STEP_MS = 420
/** Cells of chrome around the label: cap, space, dot, space … space, cap. */
export const PILL_CHROME = 6
/** Below this terminal width the notch would crowd out the transcript. */
export const MIN_COLUMNS = 24

/** Upper one-eighth block — the screen's top edge the pill hangs from. */
const RAIL = '▔'
/** Right/left half blocks, used as the pill's round-ish end caps. */
const CAP_LEFT = '▐'
const CAP_RIGHT = '▌'

const BUSY_DOTS = ['·', '•', '●', '•'] as const
const DOT_FILLED = '●'
const DOT_HOLLOW = '○'

export type NotchSegment = {
  text: string
  color?: keyof Theme
  backgroundColor?: keyof Theme
}

export type NotchFrame = {
  segments: NotchSegment[]
  /** Final pill width in cells — the caller feeds it back as `fromWidth`. */
  pillWidth: number
}

export type NotchInput = {
  kind: TabStatusKind
  /** Short reason shown while waiting, e.g. "approve Bash". */
  waitingFor?: string
  /** Time spent in the current `kind`. */
  elapsedMs: number
  /** Free-running clock; drives shimmer and heartbeat phase. */
  time: number
  columns: number
  /** Pill width before the last state change, for the morph. 0 on mount. */
  fromWidth?: number
}

export function easeOutCubic(t: number): number {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t
  return 1 - (1 - clamped) ** 3
}

/**
 * How often this state needs a repaint, or null to stop animating.
 *
 * Idle returns null once the flash has burned down: a settled notch is a
 * still notch, and a still notch costs nothing. The store subscription wakes
 * the component again on the next state change.
 */
export function notchIntervalMs(
  kind: TabStatusKind,
  elapsedMs: number,
): number | null {
  if (kind === 'busy') return 80
  if (kind === 'waiting') return 120
  return elapsedMs < FLARE_MS ? 60 : null
}

/** Fixed-width elapsed time, so the pill doesn't twitch every second. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  if (total < 60) return `${total}s`.padStart(5, ' ')
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`.padStart(5, ' ')
}

export function notchLabel(
  kind: TabStatusKind,
  waitingFor: string | undefined,
  elapsedMs: number,
): string {
  if (kind === 'busy') return `WORKING ${formatElapsed(elapsedMs)}`
  if (kind === 'waiting') {
    return waitingFor ? `NEEDS YOU · ${waitingFor}` : 'NEEDS YOU'
  }
  return 'READY'
}

export function notchDot(kind: TabStatusKind, time: number): string {
  const step = Math.floor(time / PULSE_STEP_MS)
  if (kind === 'busy') {
    return BUSY_DOTS[((step % BUSY_DOTS.length) + BUSY_DOTS.length) % BUSY_DOTS.length]!
  }
  if (kind === 'waiting') return step % 2 === 0 ? DOT_FILLED : DOT_HOLLOW
  return DOT_FILLED
}

/**
 * Half-open [start, end) of the shimmer highlight inside a pill of `width`.
 * Travels off both edges so it reads as a pass, not a bounce. Null when the
 * highlight is entirely outside the pill.
 */
export function shimmerWindow(
  time: number,
  width: number,
): [number, number] | null {
  if (width <= 0) return null
  const phase = (time % SHIMMER_PERIOD_MS) / SHIMMER_PERIOD_MS
  const travel = width + SHIMMER_WIDTH * 2
  const start = Math.round(phase * travel) - SHIMMER_WIDTH
  const from = Math.max(0, start)
  const to = Math.min(width, start + SHIMMER_WIDTH)
  return to <= from ? null : [from, to]
}

/**
 * Centre `label` in `width` cells, clipping from both ends when it doesn't
 * fit. Clipping (rather than truncating the tail) keeps the text centred
 * through the morph, so the pill reads as opening rather than scrolling.
 */
export function fitLabel(label: string, width: number): string {
  if (width <= 0) return ''
  if (label.length >= width) {
    const start = Math.floor((label.length - width) / 2)
    return label.slice(start, start + width)
  }
  const left = Math.floor((width - label.length) / 2)
  return ' '.repeat(left) + label + ' '.repeat(width - label.length - left)
}

/** Width the pill wants right now, before morphing and before clamping. */
export function naturalPillWidth(label: string): number {
  return label.length + PILL_CHROME
}

/**
 * Trim a label to what the pill can carry in `columns`, ellipsising the tail.
 *
 * Distinct from fitLabel's centre-clip: that one exists for the morph, where
 * the pill is briefly narrower than its own target and clipping evenly keeps
 * the text centred. A label that is genuinely too long must instead keep its
 * head — "NEEDS YOU · approve …" beats a sliver from the middle of the reason.
 */
export function clampLabel(label: string, columns: number): string {
  // PILL_CHROME already covers the caps; the extra 2 keeps at least one rail
  // cell on each side, so the pill reads as hanging from the top edge rather
  // than being the top edge.
  const max = columns - 2 - PILL_CHROME
  if (max <= 0) return ''
  if (label.length <= max) return label
  return `${label.slice(0, max - 1)}\u2026`
}

type Palette = { base: keyof Theme; accent: keyof Theme; solid: boolean }

function paletteFor(kind: TabStatusKind, elapsedMs: number): Palette {
  if (kind === 'busy') {
    return { base: 'brand', accent: 'brandShimmer', solid: true }
  }
  if (kind === 'waiting') {
    return { base: 'permission', accent: 'permissionShimmer', solid: true }
  }
  // Idle flashes solid once ("done!"), then rests as a quiet outline.
  return { base: 'success', accent: 'success', solid: elapsedMs < FLARE_MS }
}

/** Splits `text` into up to three runs, highlighting [from, to). */
function withShimmer(
  text: string,
  window: [number, number] | null,
  base: NotchSegment,
  accent: keyof Theme,
): NotchSegment[] {
  if (!window) return [{ ...base, text }]
  const [from, to] = window
  const runs: NotchSegment[] = []
  if (from > 0) runs.push({ ...base, text: text.slice(0, from) })
  runs.push({ ...base, text: text.slice(from, to), backgroundColor: accent })
  if (to < text.length) runs.push({ ...base, text: text.slice(to) })
  return runs
}

/** Resolve a frame's segments to an ANSI string for the inline top row. */
export function segmentsToAnsi(
  segments: NotchSegment[],
  paint: (
    c: keyof Theme | undefined,
    type: 'foreground' | 'background',
  ) => (text: string) => string,
): string {
  return segments
    .map(segment => {
      // Foreground inside, background outside — the same nesting order
      // applyTextStyles uses, so chalk's resets line up with Ink's output.
      const withFg = paint(segment.color, 'foreground')(segment.text)
      return paint(segment.backgroundColor, 'background')(withFg)
    })
    .join('')
}

/**
 * Build the whole row: rail, pill, rail. Returns an empty frame when the
 * terminal is too narrow to carry one without eating the transcript.
 */
export function buildNotchFrame(input: NotchInput): NotchFrame {
  const { kind, waitingFor, elapsedMs, time, columns, fromWidth = 0 } = input
  if (columns < MIN_COLUMNS) return { segments: [], pillWidth: 0 }

  const label = clampLabel(notchLabel(kind, waitingFor, elapsedMs), columns)
  const target = Math.min(naturalPillWidth(label), columns - 2)
  // Morph only on state changes; within a state the pill takes its natural
  // width so a ticking timer doesn't re-trigger the easing every second.
  const pillWidth =
    fromWidth > 0 && elapsedMs < MORPH_MS
      ? Math.round(fromWidth + (target - fromWidth) * easeOutCubic(elapsedMs / MORPH_MS))
      : target

  const palette = paletteFor(kind, elapsedMs)
  const inner = fitLabel(`${notchDot(kind, time)} ${label}`, Math.max(0, pillWidth - 2))
  const body: NotchSegment = palette.solid
    ? { text: '', color: 'inverseText', backgroundColor: palette.base }
    : { text: '', color: palette.base }
  const shimmer =
    kind === 'busy' ? shimmerWindow(time, inner.length) : null

  const railWidth = Math.max(0, columns - pillWidth)
  const leftRail = Math.floor(railWidth / 2)
  const segments: NotchSegment[] = []
  if (leftRail > 0) {
    segments.push({ text: RAIL.repeat(leftRail), color: 'inactive' })
  }
  segments.push({ text: CAP_LEFT, color: palette.base })
  segments.push(...withShimmer(inner, shimmer, body, palette.accent))
  segments.push({ text: CAP_RIGHT, color: palette.base })
  const rightRail = railWidth - leftRail
  if (rightRail > 0) {
    segments.push({ text: RAIL.repeat(rightRail), color: 'inactive' })
  }
  return { segments, pillWidth }
}
