import { PassThrough } from 'node:stream'
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { createRoot } from '../../ink.js'
import {
  getSessionStatus,
  resetSessionStatus,
  setSessionStatus,
} from '../../state/sessionStatusStore.js'
import { DEFAULT_GLOBAL_CONFIG } from '../../utils/config.js'
import { isTopRowReserved, markTopRowReserved } from '../../utils/topRow.js'
import { StatusNotch, statusNotchShouldDisplay } from './index.js'
import { notchIntervalMs } from './notchFrame.js'

const originalNoFlicker = process.env.CLAUDE_CODE_NO_FLICKER

beforeEach(() => {
  resetSessionStatus()
})

afterEach(() => {
  if (originalNoFlicker === undefined) delete process.env.CLAUDE_CODE_NO_FLICKER
  else process.env.CLAUDE_CODE_NO_FLICKER = originalNoFlicker
  resetSessionStatus()
  markTopRowReserved(false)
})

/**
 * Mount the notch against a fake terminal. `isTTY` is set on the stream
 * because Ink and the display gate both look at it, and bun's own stdout
 * is not a TTY under test.
 */
async function paint(
  { fullscreen = true, columns = 80, rows = 40 } = {},
): Promise<string> {
  process.env.CLAUDE_CODE_NO_FLICKER = fullscreen ? '1' : '0'
  const stdout = new PassThrough()
  Object.assign(stdout, { columns, rows, isTTY: true })
  let output = ''
  stdout.on('data', chunk => {
    output += String(chunk)
  })
  const root = await createRoot({
    stdout: stdout as unknown as NodeJS.WriteStream,
    patchConsole: false,
  })
  root.render(<StatusNotch />)
  await Bun.sleep(60)
  root.unmount()
  await Bun.sleep(10)
  return output
}

/**
 * Ink emits runs of spaces as cursor-forward (CSI n C) rather than literal
 * blanks, so put them back before asserting on what the user would read.
 */
function visible(output: string): string {
  return output.replace(/\x1b\[(\d+)C/g, (_, n) => ' '.repeat(Number(n)))
}

test('fullscreen: paints the working state with its elapsed timer', async () => {
  setSessionStatus('busy', undefined, Date.now() - 64_000)
  const output = visible(await paint())
  expect(output).toContain('WORKING  1:04')
})

test('fullscreen: paints what it is waiting for', async () => {
  setSessionStatus('waiting', 'approve Bash', Date.now())
  const output = visible(await paint())
  expect(output).toContain('NEEDS YOU')
  expect(output).toContain('approve Bash')
})

test('fullscreen: paints the settled ready state', async () => {
  setSessionStatus('idle', undefined, Date.now() - 10_000)
  const output = await paint()
  expect(output).toContain('READY')
})

test('inline: reserves the top row and paints into it', async () => {
  setSessionStatus('busy', undefined, Date.now() - 5_000)
  const output = await paint({ fullscreen: false, rows: 40 })
  // Scrolling region shrunk to rows 2..40, leaving row 1 frozen.
  expect(output).toContain('\x1b[2;40r')
  // Painted at row 1, between a cursor save and restore.
  expect(output).toContain('\x1b[1;1H')
  expect(output).toContain('WORKING')
})

test('inline: hands the row back on unmount', async () => {
  setSessionStatus('busy', undefined, Date.now())
  const output = await paint({ fullscreen: false })
  // CSI r — full-screen scrolling region restored.
  expect(output).toContain('\x1b[r')
  expect(isTopRowReserved()).toBe(false)
})

test('inline: a terminal too short to spare a row is left alone', async () => {
  setSessionStatus('busy', undefined, Date.now())
  const output = await paint({ fullscreen: false, rows: 3 })
  expect(output).not.toContain('\x1b[2;3r')
  expect(isTopRowReserved()).toBe(false)
})

test('a settled idle session asks for no animation frames', () => {
  // The whole cost argument for an always-on notch rests on this: once the
  // finish flash has burned down, nothing moves and nothing ticks.
  setSessionStatus('busy', undefined, Date.now() - 10_000)
  setSessionStatus('idle', undefined, Date.now() - 10_000)
  const { kind, since } = getSessionStatus()
  expect(notchIntervalMs(kind, Date.now() - since)).toBeNull()
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
