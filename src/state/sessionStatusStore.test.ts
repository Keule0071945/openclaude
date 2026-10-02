import { afterEach, describe, expect, it } from 'bun:test'
import {
  getSessionStatus,
  resetSessionStatus,
  setSessionStatus,
  subscribeSessionStatus,
} from './sessionStatusStore.js'

afterEach(() => {
  resetSessionStatus()
})

describe('sessionStatusStore', () => {
  it('starts idle, stamped at startup rather than at zero', () => {
    const status = getSessionStatus()
    expect(status.kind).toBe('idle')
    // A zero stamp would read as "idle for 0ms" forever, keeping the notch's
    // finish flash alive and the animation clock subscribed at the prompt.
    expect(status.since).toBeGreaterThan(0)
    expect(Date.now() - status.since).toBeLessThan(60_000)
  })

  it('notifies subscribers on a real change', () => {
    let calls = 0
    subscribeSessionStatus(() => {
      calls++
    })
    setSessionStatus('busy', undefined, 1_000)
    expect(calls).toBe(1)
    expect(getSessionStatus()).toMatchObject({ kind: 'busy', since: 1_000 })
  })

  it('stays silent when nothing changed', () => {
    let calls = 0
    setSessionStatus('busy', undefined, 1_000)
    subscribeSessionStatus(() => {
      calls++
    })
    setSessionStatus('busy', undefined, 5_000)
    expect(calls).toBe(0)
    expect(getSessionStatus().since).toBe(1_000)
  })

  it('keeps the original timestamp when only the reason changes', () => {
    setSessionStatus('waiting', 'approve Bash', 1_000)
    setSessionStatus('waiting', 'approve Edit', 4_000)
    expect(getSessionStatus()).toMatchObject({
      waitingFor: 'approve Edit',
      since: 1_000,
    })
  })

  it('restamps on a kind change', () => {
    setSessionStatus('busy', undefined, 1_000)
    setSessionStatus('idle', undefined, 8_000)
    expect(getSessionStatus().since).toBe(8_000)
  })

  it('stops notifying after unsubscribe', () => {
    let calls = 0
    const unsubscribe = subscribeSessionStatus(() => {
      calls++
    })
    unsubscribe()
    setSessionStatus('busy', undefined, 1_000)
    expect(calls).toBe(0)
  })
})
