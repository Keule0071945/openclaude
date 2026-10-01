import * as React from 'react'
import { memo, useRef, useSyncExternalStore } from 'react'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import type { TabStatusKind } from '../../ink/hooks/use-tab-status.js'
import { Box, Text, useAnimationFrame } from '../../ink.js'
import {
  getSessionStatus,
  subscribeSessionStatus,
} from '../../state/sessionStatusStore.js'
import { getGlobalConfig } from '../../utils/config.js'
import { isFullscreenEnvEnabled } from '../../utils/fullscreen.js'
import { buildNotchFrame, notchIntervalMs } from './notchFrame.js'

/**
 * Whether to paint the notch at all.
 *
 * Fullscreen-only by construction: outside alt-screen mode the transcript
 * scrolls the terminal, so there is no row that stays at the top to pin it
 * to. Inline sessions keep the tab indicator (OSC 21337) instead.
 */
export function statusNotchShouldDisplay(config = getGlobalConfig()): boolean {
  if (!isFullscreenEnvEnabled()) return false
  return config.statusNotchEnabled ?? true
}

/**
 * The animated half. Memoized with no props so FullscreenLayout re-rendering
 * never costs a repaint here — this component wakes only for its own store
 * subscription, its clock ticks, and terminal resizes.
 */
const NotchRow = memo(function NotchRow(): React.ReactNode {
  const status = useSyncExternalStore(subscribeSessionStatus, getSessionStatus)
  const { columns } = useTerminalSize()
  // Width to ease the morph from, frozen at the moment the state changed,
  // and the width we last painted. Refs, not state: updating them must not
  // schedule another render on top of the one already in flight.
  const morphFromRef = useRef(0)
  const paintedWidthRef = useRef(0)
  const lastKindRef = useRef<TabStatusKind | null>(null)

  // The shared clock's time base restarts whenever it goes idle, so it
  // drives phase only. Age of the current state comes from the wall clock.
  const elapsedMs = Date.now() - status.since
  const [ref, time] = useAnimationFrame(
    notchIntervalMs(status.kind, elapsedMs),
  )

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

  if (frame.segments.length === 0) return null
  return (
    <Box ref={ref} flexShrink={0} width="100%">
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
 * One-row status notch pinned to the top of the fullscreen layout: is Claude
 * still working, or is it waiting for me?
 *
 * Deliberately unmemoized so the display gate is re-read when the layout
 * around it re-renders (e.g. after /config toggles it); the memoized
 * NotchRow above absorbs that without repainting.
 */
export function StatusNotch(): React.ReactNode {
  if (!statusNotchShouldDisplay()) return null
  return <NotchRow />
}
