/**
 * Pure frame model for the status notch: a one-row "hardware notch" that
 * hangs from the top edge of the fullscreen layout and tells you at a
 * glance whether a turn is running, just finished, or waiting on you.
 *
 *   ▔▔▔▔▔▔▔▔▜  ◉ Working · 12s  ▛▔▔▔▔▔▔▔▔
 *   wings   cap     body        cap  wings
 *
 * Everything here is a function of (state, now) so the animation can be
 * unit-tested without a terminal; StatusNotch.tsx only drives the clock
 * and maps cells to <Text>.
 */

export type NotchStatus = 'idle' | 'busy' | 'waiting'

/** `done` is a transient phase between busy and idle. */
export type NotchPhase = 'idle' | 'busy' | 'waiting' | 'done'

export type RGB = { r: number; g: number; b: number }

export type NotchCell = {
  char: string
  color?: string
  backgroundColor?: string
  bold?: boolean
}

export type NotchPalette = {
  body: RGB
  /** Approximate terminal background the wings fade into. */
  fade: RGB
  text: RGB
  dimText: RGB
  highlight: RGB
  busy: RGB
  done: RGB
  waiting: RGB
}

export type NotchState = {
  phase: NotchPhase
  phaseStartedAt: number
  /** Turn duration shown by the `done` phase. */
  doneDurationMs: number
  morphFrom: number
  morphTo: number
  morphStartedAt: number
}

export const MORPH_MS = 520
export const DONE_MS = 2600
/** Turns shorter than this skip the `done` celebration — it reads as flicker. */
export const MIN_DONE_TURN_MS = 1000
/** Idle breathing settles to a static dot after this long, so an idle
 *  session stops ticking the render clock. */
export const IDLE_BREATHE_MS = 30_000
export const WING_LENGTH = 10
const BODY_PAD = 2
const CONTENT_FADE_DELAY_MS = 90
const CONTENT_FADE_MS = 300

const SPINNER_FRAMES = ['·', '∘', '○', '◎', '◉', '●', '◉', '◎', '○', '∘']
const SPINNER_FRAME_MS = 110

export const DARK_PALETTE: NotchPalette = {
  body: { r: 36, g: 36, b: 44 },
  fade: { r: 28, g: 28, b: 32 },
  text: { r: 236, g: 236, b: 242 },
  dimText: { r: 138, g: 138, b: 152 },
  highlight: { r: 255, g: 255, b: 255 },
  busy: { r: 240, g: 132, b: 92 },
  done: { r: 92, g: 222, b: 132 },
  waiting: { r: 255, g: 190, b: 72 },
}

export const LIGHT_PALETTE: NotchPalette = {
  ...DARK_PALETTE,
  body: { r: 22, g: 22, b: 26 },
  fade: { r: 236, g: 236, b: 236 },
}

// ── math ────────────────────────────────────────────────────────────────

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)

export function mix(a: RGB, b: RGB, t: number): RGB {
  const k = clamp01(t)
  return {
    r: Math.round(a.r + (b.r - a.r) * k),
    g: Math.round(a.g + (b.g - a.g) * k),
    b: Math.round(a.b + (b.b - a.b) * k),
  }
}

export const rgb = (c: RGB): string => `rgb(${c.r},${c.g},${c.b})`

/** Spring-like ease with a small overshoot (easeOutBack). */
export function easeOutBack(t: number): number {
  const x = clamp01(t)
  const c1 = 1.5
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2

/** 0→1→0 over `periodMs`, smooth. */
function breathe(now: number, periodMs: number): number {
  return (1 - Math.cos((2 * Math.PI * now) / periodMs)) / 2
}

const gauss = (d: number, sigma: number): number =>
  Math.exp(-(d * d) / (2 * sigma * sigma))

// ── state machine ───────────────────────────────────────────────────────

export function initialNotchState(
  status: NotchStatus,
  now: number,
  bodyWidth: number,
): NotchState {
  return {
    phase: status,
    phaseStartedAt: now,
    doneDurationMs: 0,
    morphFrom: bodyWidth,
    morphTo: bodyWidth,
    morphStartedAt: now - MORPH_MS,
  }
}

/** Phase implied by the incoming status, given where we are now. */
export function nextPhase(
  state: NotchState,
  status: NotchStatus,
  now: number,
  turnElapsedMs: number,
): { phase: NotchPhase; doneDurationMs: number } {
  if (status !== 'idle') {
    return { phase: status, doneDurationMs: state.doneDurationMs }
  }
  if (state.phase === 'busy') {
    return turnElapsedMs >= MIN_DONE_TURN_MS
      ? { phase: 'done', doneDurationMs: turnElapsedMs }
      : { phase: 'idle', doneDurationMs: 0 }
  }
  if (state.phase === 'done' && now - state.phaseStartedAt < DONE_MS) {
    return { phase: 'done', doneDurationMs: state.doneDurationMs }
  }
  return { phase: 'idle', doneDurationMs: state.doneDurationMs }
}

/** Current (possibly overshooting) body width of an in-flight morph. */
export function currentBodyWidth(state: NotchState, now: number): number {
  const p = (now - state.morphStartedAt) / MORPH_MS
  if (p >= 1) return state.morphTo
  const w =
    state.morphFrom + (state.morphTo - state.morphFrom) * easeOutBack(p)
  return Math.max(0, Math.round(w))
}

/**
 * Advance the state machine. Pure and idempotent for identical inputs, so
 * it is safe to call during render.
 */
export function advanceNotchState(
  state: NotchState,
  status: NotchStatus,
  now: number,
  turnElapsedMs: number,
  targetBodyWidth: (phase: NotchPhase, doneDurationMs: number) => number,
): NotchState {
  const { phase, doneDurationMs } = nextPhase(
    state,
    status,
    now,
    turnElapsedMs,
  )
  const phaseChanged = phase !== state.phase
  const target = targetBodyWidth(phase, doneDurationMs)
  if (!phaseChanged && target === state.morphTo) return state
  return {
    phase,
    phaseStartedAt: phaseChanged ? now : state.phaseStartedAt,
    doneDurationMs,
    morphFrom: currentBodyWidth(state, now),
    morphTo: target,
    morphStartedAt: now,
  }
}

// ── content ─────────────────────────────────────────────────────────────

type Segment = { text: string; role: 'glyph' | 'label' | 'meta' }

export function formatNotchDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

export function notchContent(
  phase: NotchPhase,
  opts: { now: number; turnElapsedMs: number; doneDurationMs: number; detail?: string },
): Segment[] {
  switch (phase) {
    case 'busy': {
      const frame =
        SPINNER_FRAMES[Math.floor(opts.now / SPINNER_FRAME_MS) % SPINNER_FRAMES.length]!
      return [
        { text: frame, role: 'glyph' },
        { text: ' Working', role: 'label' },
        { text: ` · ${formatNotchDuration(opts.turnElapsedMs)}`, role: 'meta' },
      ]
    }
    case 'done':
      return [
        { text: '✓', role: 'glyph' },
        { text: ' Done', role: 'label' },
        { text: ` · ${formatNotchDuration(opts.doneDurationMs)}`, role: 'meta' },
      ]
    case 'waiting':
      return [
        { text: '◆', role: 'glyph' },
        { text: ' Needs you', role: 'label' },
        ...(opts.detail
          ? [{ text: ` · ${truncate(opts.detail, 22)}`, role: 'meta' as const }]
          : []),
      ]
    case 'idle':
      return [
        { text: '●', role: 'glyph' },
        { text: ' Ready', role: 'label' },
      ]
  }
}

export function contentWidth(segments: Segment[]): number {
  return segments.reduce((n, s) => n + [...s.text].length, 0)
}

export const bodyWidthFor = (segments: Segment[]): number =>
  contentWidth(segments) + BODY_PAD * 2

function accentFor(phase: NotchPhase, palette: NotchPalette): RGB {
  switch (phase) {
    case 'busy':
      return palette.busy
    case 'done':
    case 'idle':
      return palette.done
    case 'waiting':
      return palette.waiting
  }
}

// ── frame ───────────────────────────────────────────────────────────────

export type NotchFrameInput = {
  state: NotchState
  now: number
  turnElapsedMs: number
  detail?: string
  palette: NotchPalette
  reducedMotion: boolean
  /** Hide the glowing wings (narrow terminals). */
  showWings: boolean
}

export type NotchFrame = {
  cells: NotchCell[]
  /** Whether the next frame differs from this one (drives the clock). */
  animating: boolean
}

export function buildNotchFrame(input: NotchFrameInput): NotchFrame {
  const { state, palette, reducedMotion, showWings } = input
  const now = input.now
  const phase = state.phase
  const sincePhase = now - state.phaseStartedAt
  const accent = accentFor(phase, palette)
  const segments = notchContent(phase, {
    now: reducedMotion ? 0 : now,
    turnElapsedMs: input.turnElapsedMs,
    doneDurationMs: state.doneDurationMs,
    detail: input.detail,
  })

  const morphing = !reducedMotion && now - state.morphStartedAt < MORPH_MS
  const bodyWidth = reducedMotion
    ? state.morphTo
    : currentBodyWidth(state, now)
  const contentAlpha = reducedMotion
    ? 1
    : clamp01((sincePhase - CONTENT_FADE_DELAY_MS) / CONTENT_FADE_MS)

  const breathing = phase === 'idle' && sincePhase < IDLE_BREATHE_MS
  // Pulse level 0..1 shared by the glyph, body tint and wings.
  let pulse = 0
  if (!reducedMotion) {
    if (phase === 'waiting') pulse = breathe(sincePhase, 1400)
    else if (breathing) {
      // Ease the breathing out as it approaches the settle point so the
      // dot never visibly snaps.
      const settle = clamp01((IDLE_BREATHE_MS - sincePhase) / 4000)
      pulse = breathe(sincePhase, 3200) * settle
    }
  }

  // ── body ──
  const content = flatten(segments)
  const glyphColor = glyphColorFor(phase, palette, pulse, sincePhase, reducedMotion)
  const body: NotchCell[] = []
  const offset = Math.floor((bodyWidth - content.length) / 2)
  const labelStart = content.findIndex(c => c.role === 'label')
  const labelLen = content.filter(c => c.role === 'label').length
  // Shimmer head sweeps across the label (plus a short gap) while busy.
  const shimmerHead =
    phase === 'busy' && !reducedMotion
      ? ((now / 85) % (labelLen + 8)) - 2
      : Number.NaN
  // Soft light sweep that glides back and forth under the busy content.
  const sweepPos =
    phase === 'busy' && !reducedMotion && bodyWidth > 1
      ? easeInOutSine(pingPong(sincePhase / 2200)) * (bodyWidth - 1)
      : Number.NaN
  const doneFlash =
    phase === 'done' && !reducedMotion
      ? Math.pow(1 - clamp01(sincePhase / 800), 2)
      : 0

  for (let i = 0; i < bodyWidth; i++) {
    let bgMix = 0
    if (!Number.isNaN(sweepPos)) bgMix += 0.22 * gauss(i - sweepPos, 2.6)
    bgMix += 0.34 * doneFlash
    if (phase === 'waiting') bgMix += 0.1 * pulse
    const bgRgb = mix(palette.body, accent, bgMix)
    const bg = rgb(bgRgb)

    const ci = i - offset
    const c = ci >= 0 && ci < content.length ? content[ci]! : null
    if (!c || c.char === ' ') {
      body.push({ char: ' ', backgroundColor: bg })
      continue
    }
    let fg: RGB
    if (c.role === 'glyph') fg = glyphColor
    else if (c.role === 'meta') fg = palette.dimText
    else {
      fg = palette.text
      if (!Number.isNaN(shimmerHead)) {
        const d = ci - labelStart - shimmerHead
        fg = mix(palette.dimText, palette.highlight, 0.25 + 0.75 * gauss(d, 1.3))
      }
    }
    body.push({
      char: c.char,
      // Fade in from this cell's own background so text never flashes
      // darker than a tinted body.
      color: rgb(mix(bgRgb, fg, contentAlpha)),
      backgroundColor: bg,
      bold: c.role === 'label' && phase !== 'idle',
    })
  }

  const cap = rgb(palette.body)
  const cells: NotchCell[] = []
  const wings = showWings
    ? wingCells(phase, sincePhase, pulse, accent, palette, reducedMotion)
    : []
  for (let i = wings.length - 1; i >= 0; i--) cells.push(wings[i]!)
  cells.push({ char: '▜', color: cap })
  cells.push(...body)
  cells.push({ char: '▛', color: cap })
  cells.push(...wings)

  const animating =
    !reducedMotion &&
    (morphing ||
      contentAlpha < 1 ||
      phase === 'busy' ||
      phase === 'waiting' ||
      phase === 'done' ||
      breathing)
  return { cells, animating }
}

function pingPong(t: number): number {
  const f = t % 2
  return f < 1 ? f : 2 - f
}

function flatten(
  segments: Segment[],
): { char: string; role: Segment['role'] }[] {
  return segments.flatMap(s => [...s.text].map(char => ({ char, role: s.role })))
}

function glyphColorFor(
  phase: NotchPhase,
  palette: NotchPalette,
  pulse: number,
  sincePhase: number,
  reducedMotion: boolean,
): RGB {
  switch (phase) {
    case 'busy':
      return palette.busy
    case 'done': {
      // Pop to white on arrival, then settle into green.
      const pop = reducedMotion ? 0 : 1 - clamp01(sincePhase / 500)
      return mix(palette.done, palette.highlight, pop * 0.7)
    }
    case 'idle':
      return mix(mix(palette.done, palette.body, 0.45), palette.done, 1 - pulse)
    case 'waiting':
      return mix(palette.waiting, palette.highlight, pulse * 0.35)
  }
}

/**
 * Wing cells ordered from the notch outward (index 0 touches the cap).
 * Each is a hairline `▔` glowing in the phase accent and fading into the
 * terminal background.
 */
function wingCells(
  phase: NotchPhase,
  sincePhase: number,
  pulse: number,
  accent: RGB,
  palette: NotchPalette,
  reducedMotion: boolean,
): NotchCell[] {
  const out: NotchCell[] = []
  for (let d = 0; d < WING_LENGTH; d++) {
    const falloff = Math.pow(1 - d / WING_LENGTH, 1.7)
    let intensity: number
    switch (phase) {
      case 'busy': {
        intensity = 0.3 * falloff
        if (!reducedMotion) {
          // A comet of light that leaves the notch and runs off the wing.
          const head = ((sincePhase / 1500) % 1) * (WING_LENGTH + 4) - 1
          intensity += 0.95 * gauss(d - head, 1.3) * (0.4 + 0.6 * falloff)
        }
        break
      }
      case 'done': {
        intensity = 0.32 * falloff
        if (!reducedMotion) {
          // One burst rippling outward, then calm.
          const p = clamp01(sincePhase / 750)
          const head = p * (WING_LENGTH + 3)
          intensity += (1 - p) * 1.1 * gauss(d - head, 1.6)
        }
        break
      }
      case 'waiting':
        intensity = (0.3 + 0.55 * pulse) * falloff
        break
      case 'idle':
        intensity = (0.2 + 0.18 * pulse) * falloff
        break
    }
    const k = clamp01(intensity)
    out.push(
      k < 0.04
        ? { char: ' ' }
        : { char: '▔', color: rgb(mix(palette.fade, accent, k)) },
    )
  }
  return out
}
