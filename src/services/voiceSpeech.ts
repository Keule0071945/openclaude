// Text-to-speech for spoken voice-mode replies.
//
// Two backends:
//   - 'system': the OS speech engine — `say` on macOS, espeak-ng / espeak /
//     spd-say on Linux, System.Speech via PowerShell on Windows. No setup,
//     nothing leaves the machine.
//   - 'openai-compatible': POST {baseURL}/audio/speech (OpenAI, or a local
//     Kokoro / Piper / speaches server), played with the platform's audio
//     player. Enabled with OPENCLAUDE_TTS_BASE_URL.
//
// Only one utterance plays at a time. stopSpeaking() cuts playback off
// immediately; useVoice calls it when the user starts talking (barge-in).

import { type ChildProcess, spawn, spawnSync } from 'child_process'
import { randomUUID } from 'crypto'
import { unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { registerCleanup } from '../utils/cleanupRegistry.js'
import { logForDebugging } from '../utils/debug.js'
import { fetchWithProxyRetry, type ProxyRetryFetcher } from './api/fetchWithProxyRetry.js'

type EnvLike = Record<string, string | undefined>

export const SPEECH_REQUEST_TIMEOUT_MS = 20_000

// ─── Backend selection ───────────────────────────────────────────────

export type SystemSpeechEngine = 'say' | 'espeak-ng' | 'espeak' | 'spd-say' | 'powershell'

export type TtsBackend =
  | { id: 'system'; engine: SystemSpeechEngine; voice?: string }
  | {
      id: 'openai-compatible'
      baseURL: string
      apiKey?: string
      model: string
      voice: string
      label: string
    }

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function commandExists(cmd: string): boolean {
  // Spawn the binary directly instead of `which` (absent on Termux; see
  // hasCommand in voice.ts). spawn errors iff the binary cannot be run.
  return (
    spawnSync(cmd, ['--version'], { stdio: 'ignore', timeout: 3000 }).error ===
    undefined
  )
}

const commandExistsMemo = new Map<string, boolean>()
function hasCommandMemo(cmd: string): boolean {
  let found = commandExistsMemo.get(cmd)
  if (found === undefined) {
    found = commandExists(cmd)
    commandExistsMemo.set(cmd, found)
  }
  return found
}

export function _resetSpeechCommandCacheForTesting(): void {
  commandExistsMemo.clear()
}

/**
 * Picks the text-to-speech backend. Returns null when replies are disabled
 * (OPENCLAUDE_TTS=off) or no engine is installed.
 */
export function resolveTtsBackend(
  env: EnvLike = process.env,
  platform: NodeJS.Platform = process.platform,
  hasCommand: (cmd: string) => boolean = hasCommandMemo,
): TtsBackend | null {
  const mode = env.OPENCLAUDE_TTS?.trim().toLowerCase()
  if (mode === 'off' || mode === '0' || mode === 'false' || mode === 'none') {
    return null
  }
  const voice = nonEmpty(env.OPENCLAUDE_TTS_VOICE)

  const baseURL = nonEmpty(env.OPENCLAUDE_TTS_BASE_URL)
  if (baseURL && mode !== 'system') {
    let label = baseURL
    try {
      label = new URL(baseURL).host
    } catch {
      // Keep the raw value; the request will surface the error.
    }
    return {
      id: 'openai-compatible',
      baseURL,
      apiKey: nonEmpty(env.OPENCLAUDE_TTS_API_KEY),
      model: nonEmpty(env.OPENCLAUDE_TTS_MODEL) ?? 'gpt-4o-mini-tts',
      voice: voice ?? 'alloy',
      label,
    }
  }

  // `say` ships with every macOS install; probing it with --version is not
  // safe because unknown arguments may be spoken.
  if (platform === 'darwin') {
    return { id: 'system', engine: 'say', voice }
  }
  if (platform === 'win32') {
    return { id: 'system', engine: 'powershell', voice }
  }
  for (const engine of ['espeak-ng', 'espeak', 'spd-say'] as const) {
    if (hasCommand(engine)) return { id: 'system', engine, voice }
  }
  return null
}

export function describeTtsBackend(backend: TtsBackend): string {
  return backend.id === 'system'
    ? `${backend.engine}${backend.voice ? ` (${backend.voice})` : ''}`
    : `${backend.label} (${backend.model}, ${backend.voice})`
}

// ─── Command construction ────────────────────────────────────────────

export type SpawnSpec = {
  cmd: string
  args: string[]
  // Text written to the child's stdin. Text is never passed as an argument
  // so a reply starting with "-" cannot be read as an option.
  stdin?: string
}

// PowerShell reads the text from stdin; the voice name arrives through an
// environment variable, never interpolated into the script.
const POWERSHELL_SPEAK_SCRIPT = [
  '[Console]::InputEncoding = [System.Text.Encoding]::UTF8',
  'Add-Type -AssemblyName System.Speech',
  '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
  'if ($env:OPENCLAUDE_TTS_VOICE) { try { $s.SelectVoice($env:OPENCLAUDE_TTS_VOICE) } catch {} }',
  '$s.Speak([Console]::In.ReadToEnd())',
].join('; ')

/**
 * Builds the command that speaks `text` with an OS speech engine.
 * `language` (ISO-639-1) selects an espeak voice when no voice is set.
 */
export function buildSystemSpeechCommand(
  engine: SystemSpeechEngine,
  text: string,
  options: { voice?: string; language?: string } = {},
): SpawnSpec {
  const voice = options.voice ?? options.language
  switch (engine) {
    case 'say':
      return {
        cmd: 'say',
        args: [...(options.voice ? ['-v', options.voice] : []), '-f', '-'],
        stdin: text,
      }
    case 'espeak-ng':
    case 'espeak':
      return {
        cmd: engine,
        args: [...(voice ? ['-v', voice] : []), '--stdin'],
        stdin: text,
      }
    case 'spd-say':
      return {
        cmd: 'spd-say',
        args: [
          '--wait',
          ...(options.voice
            ? ['--synthesis-voice', options.voice]
            : options.language
              ? ['--language', options.language]
              : []),
          '--pipe-mode',
        ],
        stdin: text,
      }
    case 'powershell':
      return {
        cmd: 'powershell.exe',
        args: ['-NoProfile', '-NonInteractive', '-Command', POWERSHELL_SPEAK_SCRIPT],
        stdin: text,
      }
  }
}

/** Command that plays a WAV file, or null when no player is available. */
export function buildAudioPlayerCommand(
  file: string,
  platform: NodeJS.Platform = process.platform,
  hasCommand: (cmd: string) => boolean = hasCommandMemo,
): SpawnSpec | null {
  if (platform === 'darwin') return { cmd: 'afplay', args: [file] }
  if (platform === 'win32') {
    return {
      cmd: 'powershell.exe',
      args: [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '(New-Object System.Media.SoundPlayer $env:OPENCLAUDE_TTS_FILE).PlaySync()',
      ],
    }
  }
  if (hasCommand('paplay')) return { cmd: 'paplay', args: [file] }
  if (hasCommand('aplay')) return { cmd: 'aplay', args: ['-q', file] }
  if (hasCommand('ffplay')) {
    return { cmd: 'ffplay', args: ['-nodisp', '-autoexit', '-loglevel', 'quiet', file] }
  }
  return null
}

// ─── Playback ────────────────────────────────────────────────────────

type PlaybackHandle = {
  child: ChildProcess | null
  controller: AbortController
  // spd-say hands text to the speech-dispatcher daemon, so killing the
  // client does not silence it; the queue must be cancelled explicitly.
  cancelDaemon: boolean
}

let current: PlaybackHandle | null = null
let exitCleanupRegistered = false

/** Stops the utterance in progress, if any. Safe to call at any time. */
export function stopSpeaking(): void {
  if (!current) return
  const { child, controller, cancelDaemon } = current
  current = null
  controller.abort()
  if (child && child.exitCode === null) child.kill()
  if (cancelDaemon) {
    const cancel = spawn('spd-say', ['--cancel'], { stdio: 'ignore' })
    cancel.once('error', () => {})
  }
}

function runToCompletion(
  spec: SpawnSpec,
  signal: AbortSignal,
  onSpawn: (child: ChildProcess) => void,
  extraEnv?: Record<string, string>,
): Promise<void> {
  return new Promise(resolve => {
    if (signal.aborted) {
      resolve()
      return
    }
    const child = spawn(spec.cmd, spec.args, {
      stdio: [spec.stdin === undefined ? 'ignore' : 'pipe', 'ignore', 'pipe'],
      env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
      windowsHide: true,
    })
    onSpawn(child)
    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderr.length < 500) stderr += chunk.toString()
    })
    child.once('error', error => {
      logForDebugging(`[voice_tts] ${spec.cmd} failed to start: ${error.message}`)
      resolve()
    })
    child.once('close', code => {
      if (code && !signal.aborted) {
        logForDebugging(`[voice_tts] ${spec.cmd} exited ${String(code)}: ${stderr.trim()}`)
      }
      resolve()
    })
    if (spec.stdin !== undefined && child.stdin) {
      // EPIPE if the engine exits early (or is killed) — nothing to do.
      child.stdin.on('error', () => {})
      child.stdin.end(spec.stdin)
    }
  })
}

async function synthesizeToFile(
  backend: Extract<TtsBackend, { id: 'openai-compatible' }>,
  text: string,
  signal: AbortSignal,
  fetcher?: ProxyRetryFetcher,
): Promise<string | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (backend.apiKey) headers.Authorization = `Bearer ${backend.apiKey}`
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  signal.addEventListener('abort', onAbort, { once: true })
  const timer = setTimeout(c => c.abort(), SPEECH_REQUEST_TIMEOUT_MS, controller)
  try {
    const response = await fetchWithProxyRetry(
      `${backend.baseURL.replace(/\/+$/, '')}/audio/speech`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: backend.model,
          voice: backend.voice,
          input: text,
          response_format: 'wav',
        }),
        signal: controller.signal,
      },
      { fetcher },
    )
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      logForDebugging(
        `[voice_tts] ${backend.label} returned HTTP ${String(response.status)}: ${body.slice(0, 200)}`,
      )
      return null
    }
    const audio = Buffer.from(await response.arrayBuffer())
    if (signal.aborted) return null
    const file = join(tmpdir(), `openclaude-tts-${randomUUID()}.wav`)
    await writeFile(file, audio)
    return file
  } catch (error) {
    if (!signal.aborted) {
      logForDebugging(
        `[voice_tts] ${backend.label} request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
    return null
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', onAbort)
  }
}

export type SpeakOptions = {
  backend?: TtsBackend | null
  // ISO-639-1 code; picks an espeak voice when no voice is configured.
  language?: string
  // Test seam for the openai-compatible backend.
  fetcher?: ProxyRetryFetcher
}

/**
 * Speaks `text`, replacing anything currently being spoken. Resolves when
 * playback finishes or is stopped. Never throws: speech is best-effort and
 * failures are only logged.
 */
export async function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  const backend = options.backend !== undefined ? options.backend : resolveTtsBackend()
  if (!backend) return

  stopSpeaking()
  if (!exitCleanupRegistered) {
    exitCleanupRegistered = true
    // Child processes outlive the CLI; don't keep talking after exit.
    registerCleanup(async () => stopSpeaking())
  }
  const controller = new AbortController()
  const handle: PlaybackHandle = {
    child: null,
    controller,
    cancelDaemon: backend.id === 'system' && backend.engine === 'spd-say',
  }
  current = handle
  const track = (child: ChildProcess) => {
    handle.child = child
  }

  try {
    if (backend.id === 'system') {
      await runToCompletion(
        buildSystemSpeechCommand(backend.engine, trimmed, {
          voice: backend.voice,
          language: options.language,
        }),
        controller.signal,
        track,
        backend.engine === 'powershell' && backend.voice
          ? { OPENCLAUDE_TTS_VOICE: backend.voice }
          : undefined,
      )
      return
    }

    const file = await synthesizeToFile(backend, trimmed, controller.signal, options.fetcher)
    if (!file) return
    try {
      const player = buildAudioPlayerCommand(file)
      if (!player) {
        logForDebugging('[voice_tts] No audio player found (install pulseaudio-utils, alsa-utils, or ffmpeg)')
        return
      }
      await runToCompletion(player, controller.signal, track, { OPENCLAUDE_TTS_FILE: file })
    } finally {
      await unlink(file).catch(() => {})
    }
  } finally {
    if (current === handle) current = null
  }
}
