import { PassThrough } from 'node:stream'
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { createRoot } from '../../ink.js'
import { DEFAULT_GLOBAL_CONFIG } from '../../utils/config.js'
import {
  getSessionStatus,
  resetSessionStatus,
  setSessionStatus,
} from '../../state/sessionStatusStore.js'
import { StatusNotch, statusNotchShouldDisplay } from './index.js'
import { notchIntervalMs } from './notchFrame.js'

const originalNoFlicker = process.env.CLAUDE_CODE_NO_FLICKER

beforeEach(() => {
  // The notch is fullscreen-only; force the mode on rather than depending
  // on whatever the ambient config says.
  process.env.CLAUDE_CODE_NO_FLICKER = '1'
  resetSessionStatus()
})

afterEach(() => {
  if (originalNoFlicker === undefined) delete process.env.CLAUDE_CODE_NO_FLICKER
  else process.env.CLAUDE_CODE_NO_FLICKER = originalNoFlicker
  resetSessionStatus()
})

async function paint(columns = 80): Promise<string> {
  const stdout = new PassThrough()
  ;(stdout as unknown as { columns: number }).columns = columns
  let output = ''
  stdout.on('data', chunk => {
    output += String(chunk)
  })
  const root = await createRoot({
    stdout: stdout as unknown as NodeJS.WriteStream,
    patchConsole: false,
  })
  root.render(<StatusNotch />)
  await Bun.sleep(40)
  root.unmount()
  return output
}

test('paints the working state with its elapsed timer', async () => {
  setSessionStatus('busy', undefined, Date.now() - 64_000)
  const output = await paint()
  expect(output).toContain('WORKING')
  expect(output).toContain('1:04')
})

test('paints what it is waiting for', async () => {
  setSessionStatus('waiting', 'approve Bash', Date.now())
  const output = await paint()
  expect(output).toContain('NEEDS YOU')
  expect(output).toContain('approve Bash')
})

test('paints the settled ready state', async () => {
  setSessionStatus('busy', undefined, Date.now() - 10_000)
  setSessionStatus('idle', undefined, Date.now() - 10_000)
  const output = await paint()
  expect(output).toContain('READY')
})

test('a settled idle session asks for no animation frames', () => {
  // The whole cost argument for an always-on notch rests on this: once the
  // finish flash has burned down, nothing moves and nothing ticks.
  setSessionStatus('busy', undefined, Date.now() - 10_000)
  setSessionStatus('idle', undefined, Date.now() - 10_000)
  const { kind, since } = getSessionStatus()
  expect(notchIntervalMs(kind, Date.now() - since)).toBeNull()
})

test('paints nothing outside fullscreen mode', async () => {
  process.env.CLAUDE_CODE_NO_FLICKER = '0'
  expect(statusNotchShouldDisplay()).toBe(false)
  setSessionStatus('busy', undefined, Date.now())
  const output = await paint()
  expect(output).not.toContain('WORKING')
})

test('respects the config toggle', () => {
  expect(
    statusNotchShouldDisplay({
      ...DEFAULT_GLOBAL_CONFIG,
      statusNotchEnabled: false,
    }),
  ).toBe(false)
  expect(
    statusNotchShouldDisplay({
      ...DEFAULT_GLOBAL_CONFIG,
      statusNotchEnabled: true,
    }),
  ).toBe(true)
})
