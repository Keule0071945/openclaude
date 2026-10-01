import * as React from 'react'
import { memo, useContext, useEffect, useRef, useSyncExternalStore } from 'react'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { Box, Text, useAnimationFrame } from '../../ink.js'
import type { TabStatusKind } from '../../ink/hooks/use-tab-status.js'
import { TerminalWriteContext } from '../../ink/useTerminalNotification.js'
import {
  getSessionStatus,
  subscribeSessionStatus,
} from '../../state/sessionStatusStore.js'
import { getGlobalConfig } from '../../utils/config.js'
import { isFullscreenEnvEnabled } from '../../utils/fullscreen.js'
import {
  isTopRowReserved,
  markTopRowReserved,
  paintTopRowSequence,
  RELEASE_TOP_ROW_SEQUENCE,
  reserveTopRowSequence,
} from '../../utils/topRow.js'
import { color } from '../design-system/color.js'
import { useTheme } from '../design-system/ThemeProvider.js'
import {
  buildNotchFrame,
  type NotchFrame,
  notchIntervalMs,
  segmentsToAnsi,
} from './notchFrame.js'

/**
 * Whether to paint the notch at all. It works in both layouts — fullscreen
 * as a pinned flex row, inline by reserving the terminal's top row — so the
 * user's setting is the only gate.
 *
 * No TTY check here on purpose: the notch writes through Ink's own stdout,
 * which already carries cursor and colour sequences, and Ink is what decides
 * whether to render interactively at all.
 */
export function statusNotchShouldDisplay(config = getGlobalConfig()): boolean {
  return config.statusNotchEnabled ?? true
}

/**
 * Shared animation state. Returns the frame to paint plus the interval the
 * caller should be ticking at; both variants below render the same model,
 * they only differ in where the row ends up.
 */
function useNotchFrame(columns: number): NotchFrame {
  const status = useSyncExternalStore(subscribeSessionStatus, getSessionStatus)
  // Width to ease the morph from, frozen at the moment the state changed,
  // and the width we last painted. Refs, not state: updating them must not
  // schedule another render on top of the one already in flight.
  const morphFromRef = useRef(0)
  const paintedWidthRef = useRef(0)
  const lastKindRef = useRef<TabStatusKind | null>(null)

  // The shared clock's time base restarts whenever it goes idle, so it
  // drives phase only. Age of the current state comes from the wall clock.
  const elapsedMs = Date.now() - status.since
  const [, time] = useAnimationFrame(notchIntervalMs(status.kind, elapsedMs))

  if (lastKindRef.current !== status.kind) {
    lastKindRef.current = status.kind
    morphFromRef.current = paintedWidthRef.current
  }

  const frame = buildNotchFrame({
    kind: status.kind,
    waitingFor: status.waitingFor,
    elapsedMs,
    time,
    columns,
    fromWidth: morphFromRef.current,
  })
  paintedWidthRef.current = frame.pillWidth
  return frame
}

/**
 * Fullscreen variant: an ordinary flex row at the top of the layout.
 * Memoized with no props so FullscreenLayout re-rendering never costs a
 * repaint here — it wakes only for its own store subscription, its clock
 * ticks, and terminal resizes.
 */
const NotchRow = memo(function NotchRow(): React.ReactNode {
  const { columns } = useTerminalSize()
  const frame = useNotchFrame(columns)
  if (frame.segments.length === 0) return null
  return (
    <Box flexShrink={0} width="100%">
      {frame.segments.map((segment, index) => (
        <Text
          // Positional runs of a single row — the index is their identity.
          key={index}
          color={segment.color}
          backgroundColor={segment.backgroundColor}
        >
          {segment.text}
        </Text>
      ))}
    </Box>
  )
})

/**
 * Inline variant: renders nothing into Ink's tree and instead paints the
 * terminal row that DECSTBM has excluded from scrolling. Taking the row out
 * of the flex layout is the whole point — Ink's block must keep its full
 * height, and the reserved row is not Ink's to lay out.
 */
const NotchTopLine = memo(function NotchTopLine(): null {
  const { columns, rows } = useTerminalSize()
  const [themeName] = useTheme()
  const writeRaw = useContext(TerminalWriteContext)
  const frame = useNotchFrame(columns)

  // Hold the reservation for as long as we are mounted, and re-assert it
  // on resize — a terminal that grew taller would otherwise keep scrolling
  // inside the old, shorter region.
  useEffect(() => {
    if (!writeRaw) return
    const reserve = reserveTopRowSequence(rows)
    if (!reserve) return
    writeRaw(reserve)
    markTopRowReserved(true)
    return () => {
      writeRaw(RELEASE_TOP_ROW_SEQUENCE)
      markTopRowReserved(false)
    }
  }, [writeRaw, rows])

  const line =
    frame.segments.length === 0
      ? ''
      : segmentsToAnsi(frame.segments, (c, type) => color(c, themeName, type))

  useEffect(() => {
    if (!writeRaw || !line || !isTopRowReserved()) return
    writeRaw(paintTopRowSequence(line))
  }, [writeRaw, line])

  return null
})

/**
 * One-row status notch pinned to the top of the terminal: is Claude still
 * working, or is it waiting for me?
 *
 * Deliberately unmemoized so the display gate is re-read when the layout
 * around it re-renders (e.g. after /config toggles it); the memoized
 * variants above absorb that without repainting.
 */
export function StatusNotch(): React.ReactNode {
  if (!statusNotchShouldDisplay()) return null
  return isFullscreenEnvEnabled() ? <NotchRow /> : <NotchTopLine />
}
