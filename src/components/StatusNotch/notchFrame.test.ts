import { describe, expect, test } from 'bun:test'
import {
  advanceNotchState,
  bodyWidthFor,
  buildNotchFrame,
  currentBodyWidth,
  DARK_PALETTE,
  DONE_MS,
  formatNotchDuration,
  IDLE_BREATHE_MS,
  initialNotchState,
  MORPH_MS,
  type NotchPhase,
  type NotchState,
  notchContent,
  WING_LENGTH,
} from './notchFrame.js'

const widthFor =
  (turnElapsedMs = 0) =>
  (phase: NotchPhase, doneDurationMs: number): number =>
    bodyWidthFor(notchContent(phase, { now: 0, turnElapsedMs, doneDurationMs }))

const text = (state: NotchState, now: number, extra: Partial<Parameters<typeof buildNotchFrame>[0]> = {}) =>
  buildNotchFrame({
    state,
    now,
    turnElapsedMs: 0,
    palette: DARK_PALETTE,
    reducedMotion: false,
    showWings: true,
    ...extra,
  })
    .cells.map(c => c.char)
    .join('')

describe('advanceNotchState', () => {
  test('busy → done → idle after a long enough turn', () => {
    let s = initialNotchState('busy', 0, widthFor()('busy', 0))
    s = advanceNotchState(s, 'idle', 10_000, 5_000, widthFor())
    expect(s.phase).toBe('done')
    expect(s.doneDurationMs).toBe(5_000)

    // Still celebrating just before DONE_MS.
    expect(advanceNotchState(s, 'idle', 10_000 + DONE_MS - 1, 0, widthFor()).phase).toBe('done')
    expect(advanceNotchState(s, 'idle', 10_000 + DONE_MS, 0, widthFor()).phase).toBe('idle')
  })

  test('sub-second turns skip the done phase', () => {
    const s = initialNotchState('busy', 0, 10)
    expect(advanceNotchState(s, 'idle', 500, 400, widthFor()).phase).toBe('idle')
  })

  test('waiting wins over any phase', () => {
    const s = initialNotchState('busy', 0, 10)
    expect(advanceNotchState(s, 'waiting', 100, 100, widthFor()).phase).toBe('waiting')
  })

  test('is idempotent for unchanged inputs', () => {
    const s = initialNotchState('idle', 0, widthFor()('idle', 0))
    expect(advanceNotchState(s, 'idle', 50, 0, widthFor())).toBe(s)
  })

  test('a phase change morphs from the current width to the new target', () => {
    const idle = initialNotchState('idle', 0, widthFor()('idle', 0))
    const busy = advanceNotchState(idle, 'busy', 1_000, 0, widthFor())
    expect(busy.morphFrom).toBe(widthFor()('idle', 0))
    expect(busy.morphTo).toBe(widthFor()('busy', 0))
    expect(currentBodyWidth(busy, 1_000)).toBe(busy.morphFrom)
    expect(currentBodyWidth(busy, 1_000 + MORPH_MS)).toBe(busy.morphTo)
  })

  test('morph overshoots its target like a spring', () => {
    const s: NotchState = {
      ...initialNotchState('busy', 0, 10),
      morphFrom: 10,
      morphTo: 30,
      morphStartedAt: 0,
    }
    const widths = Array.from({ length: 20 }, (_, i) => currentBodyWidth(s, (i * MORPH_MS) / 20))
    expect(Math.max(...widths)).toBeGreaterThan(30)
  })
})

describe('buildNotchFrame', () => {
  test('renders caps, wings and centered content with a constant footprint', () => {
    const s = initialNotchState('idle', 0, widthFor()('idle', 0))
    const out = text(s, 1_000)
    expect(out).toContain('▜')
    expect(out).toContain('▛')
    expect(out).toContain('● Ready')
    expect(out.length).toBe(WING_LENGTH * 2 + 2 + widthFor()('idle', 0))
  })

  test('hides wings when asked', () => {
    const s = initialNotchState('idle', 0, widthFor()('idle', 0))
    const out = text(s, 1_000, { showWings: false })
    expect(out.startsWith('▜')).toBe(true)
    expect(out.endsWith('▛')).toBe(true)
  })

  test('shows the waiting detail', () => {
    const s = initialNotchState('waiting', 0, 40)
    expect(text(s, 1_000, { detail: 'approve Bash' })).toContain('Needs you · approve Bash')
  })

  test('idle stops animating once breathing settles', () => {
    const s = initialNotchState('idle', 0, widthFor()('idle', 0))
    const frame = (now: number) =>
      buildNotchFrame({ state: s, now, turnElapsedMs: 0, palette: DARK_PALETTE, reducedMotion: false, showWings: true })
    expect(frame(1_000).animating).toBe(true)
    expect(frame(IDLE_BREATHE_MS + 1).animating).toBe(false)
  })

  test('reduced motion never animates and jumps straight to the target width', () => {
    const idle = initialNotchState('idle', 0, widthFor()('idle', 0))
    const busy = advanceNotchState(idle, 'busy', 1_000, 0, widthFor())
    const frame = buildNotchFrame({ state: busy, now: 1_001, turnElapsedMs: 0, palette: DARK_PALETTE, reducedMotion: true, showWings: false })
    expect(frame.animating).toBe(false)
    expect(frame.cells.map(c => c.char).join('')).toContain('Working')
  })
})

test('formatNotchDuration', () => {
  expect(formatNotchDuration(0)).toBe('0s')
  expect(formatNotchDuration(12_400)).toBe('12s')
  expect(formatNotchDuration(184_000)).toBe('3m 04s')
  expect(formatNotchDuration(3_900_000)).toBe('1h 05m')
})
