import { afterEach, describe, expect, it } from 'bun:test'
import {
  isTopRowReserved,
  markTopRowReserved,
  paintTopRowSequence,
  RELEASE_TOP_ROW_SEQUENCE,
  reserveTopRowSequence,
} from './topRow.js'

const SAVE = '\x1b7'
const RESTORE = '\x1b8'

afterEach(() => {
  markTopRowReserved(false)
})

describe('reserveTopRowSequence', () => {
  it('shrinks the scrolling region to rows 2..N', () => {
    expect(reserveTopRowSequence(40)).toBe(`${SAVE}\x1b[2;40r${RESTORE}`)
  })

  it('reserves nothing in a terminal too short to spare a row', () => {
    expect(reserveTopRowSequence(3)).toBe('')
    expect(reserveTopRowSequence(0)).toBe('')
  })

  it('refuses a nonsense row count rather than emitting a broken region', () => {
    expect(reserveTopRowSequence(Number.NaN)).toBe('')
    expect(reserveTopRowSequence(Number.POSITIVE_INFINITY)).toBe('')
  })

  it('always brackets the region change with a cursor save/restore', () => {
    const seq = reserveTopRowSequence(24)
    expect(seq.startsWith(SAVE)).toBe(true)
    expect(seq.endsWith(RESTORE)).toBe(true)
  })
})

describe('paintTopRowSequence', () => {
  it('homes, clears, writes and puts the cursor back', () => {
    expect(paintTopRowSequence('x')).toBe(
      `${SAVE}\x1b[1;1H\x1b[2Kx${RESTORE}`,
    )
  })

  it('leaves the net cursor position untouched', () => {
    const seq = paintTopRowSequence('anything at all')
    expect(seq.startsWith(SAVE)).toBe(true)
    expect(seq.endsWith(RESTORE)).toBe(true)
  })
})

describe('RELEASE_TOP_ROW_SEQUENCE', () => {
  it('blanks the row and restores the full-screen region', () => {
    expect(RELEASE_TOP_ROW_SEQUENCE).toContain('\x1b[2K')
    expect(RELEASE_TOP_ROW_SEQUENCE).toContain('\x1b[r')
  })

  it('restores the cursor after the region reset, which itself homes it', () => {
    const resetAt = RELEASE_TOP_ROW_SEQUENCE.indexOf('\x1b[r')
    const restoreAt = RELEASE_TOP_ROW_SEQUENCE.lastIndexOf(RESTORE)
    expect(resetAt).toBeGreaterThan(-1)
    expect(restoreAt).toBeGreaterThan(resetAt)
  })
})

describe('reservation state', () => {
  it('starts unreserved and tracks the flag', () => {
    expect(isTopRowReserved()).toBe(false)
    markTopRowReserved(true)
    expect(isTopRowReserved()).toBe(true)
    markTopRowReserved(false)
    expect(isTopRowReserved()).toBe(false)
  })
})
