import * as React from 'react';
import { useRef } from 'react';
import { useSettings } from '../../hooks/useSettings.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
import { BaseText, Box, useAnimationFrame, useTheme } from '../../ink.js';
import { getGlobalConfig } from '../../utils/config.js';
import { advanceNotchState, bodyWidthFor, buildNotchFrame, DARK_PALETTE, initialNotchState, LIGHT_PALETTE, type NotchCell, type NotchPhase, type NotchState, type NotchStatus, notchContent } from './notchFrame.js';

// ~30fps while something moves; the shared clock pauses entirely when idle.
const FRAME_MS = 33;
// Below these widths the wings, then the whole notch, give way to content.
const MIN_COLUMNS_FOR_WINGS = 64;
const MIN_COLUMNS = 30;

type Props = {
  status: NotchStatus;
  /** What the session is waiting on (e.g. "approve Bash"), shown in the
   *  `waiting` phase. */
  waitingFor?: string;
  loadingStartTimeRef: React.RefObject<number>;
  totalPausedMsRef: React.RefObject<number>;
  pauseStartTimeRef: React.RefObject<number | null>;
};

/**
 * A flat, animated "hardware notch" hanging from the top edge of the
 * fullscreen layout. It morphs between three looks so you can tell from
 * across the room whether Claude is still working:
 *
 * - Working   — orange spinner, shimmering label, a light sweep gliding
 *               under the notch and comets running off its glowing wings.
 * - Done      — the notch snaps to green with a ripple, then settles to
 *               "Ready" with a slow breathing dot.
 * - Needs you — amber, pulsing, naming what it is waiting on.
 *
 * Width changes animate with a small spring overshoot; content cross-fades
 * in after each morph. Honors `prefersReducedMotion`.
 */
export function StatusNotch({
  status,
  waitingFor,
  loadingStartTimeRef,
  totalPausedMsRef,
  pauseStartTimeRef
}: Props): React.ReactNode {
  const settings = useSettings();
  const reducedMotion = settings?.prefersReducedMotion === true;
  const [themeName] = useTheme();
  const {
    columns
  } = useTerminalSize();
  const enabled = getGlobalConfig().statusNotchEnabled !== false && columns >= MIN_COLUMNS;
  const now = Date.now();
  const pauseStart = pauseStartTimeRef.current;
  const turnElapsedMs = loadingStartTimeRef.current > 0 ? now - loadingStartTimeRef.current - totalPausedMsRef.current - (pauseStart != null ? now - pauseStart : 0) : 0;
  const detail = status === 'waiting' ? waitingFor : undefined;
  const targetWidth = (phase: NotchPhase, doneDurationMs: number): number => bodyWidthFor(notchContent(phase, {
    now,
    turnElapsedMs,
    doneDurationMs,
    detail
  }));
  const stateRef = useRef<NotchState | null>(null);
  stateRef.current = stateRef.current ? advanceNotchState(stateRef.current, status, now, turnElapsedMs, targetWidth) : initialNotchState(status, now, targetWidth(status, 0));
  const frame = enabled ? buildNotchFrame({
    state: stateRef.current,
    now,
    turnElapsedMs,
    detail,
    palette: themeName.startsWith('light') ? LIGHT_PALETTE : DARK_PALETTE,
    reducedMotion,
    showWings: columns >= MIN_COLUMNS_FOR_WINGS
  }) : null;

  // The returned time is unused: every frame is derived from Date.now() so
  // phase timing stays consistent with the REPL's loading refs. Subscribing
  // only while something moves lets an idle session stop ticking.
  const [ref] = useAnimationFrame(frame?.animating ? FRAME_MS : null);
  if (!frame) return null;
  return <Box ref={ref} flexShrink={0} opaque={true}>
      {groupRuns(frame.cells).map((run, i) => <BaseText key={i} color={run.color} backgroundColor={run.backgroundColor} bold={run.bold}>
          {run.char}
        </BaseText>)}
    </Box>;
}

/** Merge adjacent cells with identical styling into one <Text> run. */
function groupRuns(cells: NotchCell[]): NotchCell[] {
  const runs: NotchCell[] = [];
  for (const cell of cells) {
    const last = runs[runs.length - 1];
    if (last && last.color === cell.color && last.backgroundColor === cell.backgroundColor && last.bold === cell.bold) {
      last.char += cell.char;
    } else {
      runs.push({
        ...cell
      });
    }
  }
  return runs;
}
