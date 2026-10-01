/* eslint-disable custom-rules/no-sync-fs -- release runs from signal handlers */
import { writeSync } from 'node:fs'
import { RESET_SCROLL_REGION, setScrollRegion } from '../ink/termio/csi.js'

/**
 * Reserving the terminal's top row outside alt-screen mode.
 *
 * In fullscreen mode Ink owns the whole viewport and a pinned row is just a
 * flex child. Inline, the transcript scrolls the real terminal, so nothing
 * stays put — unless we shrink what the terminal is allowed to scroll.
 * DECSTBM does exactly that: `CSI 2 ; rows r` makes rows 2..N the scrolling
 * region and leaves row 1 frozen. We then paint that row between a cursor
 * save/restore pair, so Ink's renderer never sees the cursor move.
 *
 * The cost is real and worth stating: the row we take was the terminal's,
 * whatever the shell had printed there is overwritten, and a scroll region
 * is session-wide terminal state. Everything here is therefore paired with
 * a release that runs from unmount, from gracefulShutdown and from Ink's
 * signal-exit block — a process killed between them leaves the region set,
 * which `reset` or `tput csr 0 $LINES` clears.
 */

/** DECSC / DECRC — save and restore cursor position. */
const SAVE_CURSOR = '\x1b7'
const RESTORE_CURSOR = '\x1b8'
const CURSOR_HOME = '\x1b[1;1H'
const CLEAR_LINE = '\x1b[2K'

/** Below this the reserved row would leave nothing worth scrolling. */
const MIN_ROWS = 4

let reserved = false

export function isTopRowReserved(): boolean {
  return reserved
}

/**
 * Shrink the scrolling region to rows 2..`rows`. Returns '' when the
 * terminal is too short to give a row away, in which case nothing is
 * reserved and the caller must not paint.
 */
export function reserveTopRowSequence(rows: number): string {
  if (!Number.isFinite(rows) || rows < MIN_ROWS) return ''
  return SAVE_CURSOR + setScrollRegion(2, Math.floor(rows)) + RESTORE_CURSOR
}

/** Repaint the reserved row without disturbing the cursor. */
export function paintTopRowSequence(line: string): string {
  return SAVE_CURSOR + CURSOR_HOME + CLEAR_LINE + line + RESTORE_CURSOR
}

/**
 * Hand the row back: blank it, then restore the full-screen region.
 * RESET_SCROLL_REGION homes the cursor, so the restore comes last.
 */
export const RELEASE_TOP_ROW_SEQUENCE =
  SAVE_CURSOR +
  CURSOR_HOME +
  CLEAR_LINE +
  RESET_SCROLL_REGION +
  RESTORE_CURSOR

export function markTopRowReserved(value: boolean): void {
  reserved = value
}

/**
 * Give the row back synchronously. Safe to call when nothing is reserved,
 * and safe to call twice — exit paths overlap on purpose.
 */
export function releaseTopRowSync(): void {
  if (!reserved) return
  reserved = false
  try {
    writeSync(1, RELEASE_TOP_ROW_SEQUENCE)
  } catch {
    // Exiting anyway; a failed write here must not mask the real reason.
  }
}
