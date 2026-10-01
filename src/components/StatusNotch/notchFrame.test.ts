import { describe, expect, it } from 'bun:test'
import {
  buildNotchFrame,
  clampLabel,
  FLARE_MS,
  fitLabel,
  formatElapsed,
  MIN_COLUMNS,
  MORPH_MS,
  naturalPillWidth,
  notchDot,
  notchIntervalMs,
  notchLabel,
  PULSE_STEP_MS,
  SHIMMER_PERIOD_MS,
  shimmerWindow,
} from './notchFrame.js'

const rowWidth = (columns: number, over: Partial<Parameters<typeof buildNotchFrame>[0]> = {}) =>
  buildNotchFrame({
    kind: 'idle',
    elapsedMs: FLARE_MS,
    time: 0,
    columns,
    ...over,
  })
    .segments.map(s => s.text)
    .join('').length

describe('notchIntervalMs', () => {
  it('animates while working', () => {
    expect(notchIntervalMs('busy', 0)).toBeGreaterThan(0)
    expect(notchIntervalMs('busy', 60_000)).toBeGreaterThan(0)
  })

  it('keeps pulsing while it needs an answer', () => {
    expect(notchIntervalMs('waiting', 60_000)).toBeGreaterThan(0)
  })

  it('stops asking for frames once idle has settled', () => {
    expect(notchIntervalMs('idle', 0)).toBeGreaterThan(0)
    expect(notchIntervalMs('idle', FLARE_MS - 1)).toBeGreaterThan(0)
    expect(notchIntervalMs('idle', FLARE_MS)).toBeNull()
  })
})

describe('formatElapsed', () => {
  it('pads to a stable width so the pill does not twitch each second', () => {
    const widths = [0, 9_000, 59_000, 60_000, 599_000].map(
      ms => formatElapsed(ms).length,
    )
    expect(new Set(widths).size).toBe(1)
  })

  it('switches to m:ss past a minute', () => {
    expect(formatElapsed(9_000).trim()).toBe('9s')
    expect(formatElapsed(64_000).trim()).toBe('1:04')
  })

  it('clamps negatives rather than rendering -1s', () => {
    expect(formatElapsed(-5_000).trim()).toBe('0s')
  })
})

describe('notchLabel', () => {
  it('names the three states', () => {
    expect(notchLabel('idle', undefined, 0)).toBe('READY')
    expect(notchLabel('busy', undefined, 5_000)).toContain('WORKING')
    expect(notchLabel('waiting', undefined, 0)).toBe('NEEDS YOU')
  })

  it('shows what it is waiting for when known', () => {
    expect(notchLabel('waiting', 'approve Bash', 0)).toContain('approve Bash')
  })

  it('carries the elapsed time while working', () => {
    expect(notchLabel('busy', undefined, 64_000)).toContain('1:04')
  })
})

describe('notchDot', () => {
  it('cycles a heartbeat while working', () => {
    const frames = [0, 1, 2, 3].map(i => notchDot('busy', i * PULSE_STEP_MS))
    expect(new Set(frames).size).toBeGreaterThan(1)
  })

  it('blinks while waiting and holds steady when idle', () => {
    expect(notchDot('waiting', 0)).not.toBe(notchDot('waiting', PULSE_STEP_MS))
    expect(notchDot('idle', 0)).toBe(notchDot('idle', PULSE_STEP_MS * 7))
  })
})

describe('shimmerWindow', () => {
  it('stays inside the pill at every phase', () => {
    for (let t = 0; t < SHIMMER_PERIOD_MS; t += 37) {
      const window = shimmerWindow(t, 20)
      if (!window) continue
      const [from, to] = window
      expect(from).toBeGreaterThanOrEqual(0)
      expect(to).toBeLessThanOrEqual(20)
      expect(to).toBeGreaterThan(from)
    }
  })

  it('travels left to right over one period', () => {
    const early = shimmerWindow(SHIMMER_PERIOD_MS * 0.25, 40)
    const late = shimmerWindow(SHIMMER_PERIOD_MS * 0.75, 40)
    expect(early).not.toBeNull()
    expect(late).not.toBeNull()
    expect(late![0]).toBeGreaterThan(early![0])
  })

  it('has nothing to highlight in an empty pill', () => {
    expect(shimmerWindow(0, 0)).toBeNull()
  })
})

describe('fitLabel', () => {
  it('centres a short label', () => {
    expect(fitLabel('ab', 6)).toBe('  ab  ')
  })

  it('clips from both ends so the text stays centred', () => {
    expect(fitLabel('abcdef', 2)).toBe('cd')
  })

  it('always returns exactly the requested width', () => {
    for (const width of [0, 1, 5, 12, 40]) {
      expect(fitLabel('WORKING 1:04', width).length).toBe(width)
    }
  })
})

describe('clampLabel', () => {
  it('leaves a label that already fits alone', () => {
    expect(clampLabel('READY', 80)).toBe('READY')
  })

  it('keeps the head and ellipsises the tail', () => {
    const clamped = clampLabel('NEEDS YOU \u00b7 approve a very long tool name', 40)
    expect(clamped.startsWith('NEEDS YOU')).toBe(true)
    expect(clamped.endsWith('\u2026')).toBe(true)
    expect(clamped.length).toBe(32)
  })

  it('gives up rather than overflow when there is no room at all', () => {
    expect(clampLabel('READY', 6)).toBe('')
  })
})

describe('buildNotchFrame', () => {
  it('fills the row exactly, at every width it paints', () => {
    for (let columns = MIN_COLUMNS; columns <= 200; columns++) {
      expect(rowWidth(columns)).toBe(columns)
    }
  })

  it('fills the row exactly in every state', () => {
    for (const kind of ['idle', 'busy', 'waiting'] as const) {
      expect(rowWidth(80, { kind, elapsedMs: 0, waitingFor: 'approve Bash' })).toBe(80)
    }
  })

  it('paints nothing in a terminal too narrow to carry it', () => {
    expect(buildNotchFrame({ kind: 'idle', elapsedMs: 0, time: 0, columns: MIN_COLUMNS - 1 }).segments).toEqual([])
  })

  it('never lets the pill outgrow the terminal', () => {
    const frame = buildNotchFrame({
      kind: 'waiting',
      waitingFor: 'approve a tool with an extremely long name indeed',
      elapsedMs: MORPH_MS,
      time: 0,
      columns: 40,
    })
    expect(frame.pillWidth).toBeLessThanOrEqual(40)
    expect(rowWidth(40, { kind: 'waiting', waitingFor: 'approve a tool with an extremely long name indeed', elapsedMs: MORPH_MS })).toBe(40)
  })

  it('fills solid while working and while freshly done, outline once settled', () => {
    const solid = (over: Partial<Parameters<typeof buildNotchFrame>[0]>) =>
      buildNotchFrame({ kind: 'idle', elapsedMs: 0, time: 0, columns: 80, ...over })
        .segments.some(s => s.backgroundColor !== undefined)

    expect(solid({ kind: 'busy' })).toBe(true)
    expect(solid({ kind: 'waiting' })).toBe(true)
    expect(solid({ kind: 'idle', elapsedMs: 0 })).toBe(true)
    expect(solid({ kind: 'idle', elapsedMs: FLARE_MS })).toBe(false)
  })

  it('eases the pill open from its previous width', () => {
    const target = naturalPillWidth(notchLabel('waiting', 'approve Bash', 0))
    const widthAt = (elapsedMs: number) =>
      buildNotchFrame({
        kind: 'waiting',
        waitingFor: 'approve Bash',
        elapsedMs,
        time: 0,
        columns: 120,
        fromWidth: 9,
      }).pillWidth

    expect(widthAt(0)).toBe(9)
    expect(widthAt(MORPH_MS / 2)).toBeGreaterThan(9)
    expect(widthAt(MORPH_MS / 2)).toBeLessThan(target)
    expect(widthAt(MORPH_MS)).toBe(target)
  })

  it('does not re-trigger the morph as the working timer ticks', () => {
    const widthAt = (elapsedMs: number) =>
      buildNotchFrame({ kind: 'busy', elapsedMs, time: 0, columns: 120, fromWidth: 9 }).pillWidth
    expect(widthAt(10_000)).toBe(widthAt(70_000))
  })
})
