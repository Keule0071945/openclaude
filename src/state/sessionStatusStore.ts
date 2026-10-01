import type { TabStatusKind } from '../ink/hooks/use-tab-status.js'

/**
 * Module-level store for "what is the session doing right now".
 *
 * REPL already derives this for the terminal tab indicator (OSC 21337); the
 * status notch needs the same value but must not drag REPL into its 80ms
 * animation cadence. Publishing through a store instead of a prop keeps the
 * notch's re-renders entirely local — the same reason AnimatedTerminalTitle
 * owns its own tick.
 */
export type SessionStatus = {
  kind: TabStatusKind
  /** Short reason shown while waiting, e.g. "approve Bash". */
  waitingFor?: string
  /** Clock reading when the session entered `kind`. */
  since: number
}

/**
 * Stamped at module load, not left at 0.
 *
 * A session that opens at the prompt has genuinely been idle since startup,
 * and the notch derives "has the finish flash burned down yet" from this
 * age. Leaving it at 0 made the opening idle state look infinitely fresh,
 * so the notch kept asking for animation frames while nothing moved.
 */
const initial = (): SessionStatus => ({ kind: 'idle', since: Date.now() })

let current: SessionStatus = initial()
const listeners = new Set<() => void>()

export function getSessionStatus(): SessionStatus {
  return current
}

/**
 * Publish the current status. No-ops when nothing changed, so callers can
 * fire it from an effect on every render without waking subscribers.
 *
 * `since` only resets when `kind` changes — a waiting session that swaps
 * which tool it is asking about keeps its original timestamp.
 */
export function setSessionStatus(
  kind: TabStatusKind,
  waitingFor: string | undefined,
  now: number = Date.now(),
): void {
  if (current.kind === kind && current.waitingFor === waitingFor) return
  current = {
    kind,
    waitingFor,
    since: kind === current.kind ? current.since : now,
  }
  for (const listener of listeners) listener()
}

export function subscribeSessionStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Test seam — drops subscribers and returns to the mount-time value. */
export function resetSessionStatus(): void {
  current = initial()
  listeners.clear()
}
