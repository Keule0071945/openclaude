// OpenAI-compatible speech-to-text client for push-to-talk.
//
// Provider-neutral alternative to the Anthropic voice_stream client in
// voiceStreamSTT.ts. Works with any server that implements
// `POST {baseURL}/audio/transcriptions` (OpenAI, Groq, whisper.cpp server,
// speaches / faster-whisper-server, LocalAI, ...).
//
// The endpoint is request/response rather than streaming, so the
// connection buffers PCM while the key is held and uploads a single WAV
// file on finalize(). It exposes the same VoiceStreamConnection shape as
// the streaming client so useVoice.ts drives both identically; the only
// visible difference is that no interim transcript is shown while
// recording.

import { logForDebugging } from '../utils/debug.js'
import { fetchWithProxyRetry, type ProxyRetryFetcher } from './api/fetchWithProxyRetry.js'
import type {
  FinalizeSource,
  VoiceStreamCallbacks,
  VoiceStreamConnection,
} from './voiceStreamSTT.js'

// ─── Constants ───────────────────────────────────────────────────────

// Must match RECORDING_SAMPLE_RATE / RECORDING_CHANNELS in voice.ts.
const SAMPLE_RATE = 16_000
const CHANNELS = 1
const BITS_PER_SAMPLE = 16

// OpenAI rejects uploads above 25 MB. 16 kHz mono 16-bit PCM is 32 KB/s,
// so this is roughly 12 minutes of audio — far beyond a push-to-talk turn.
const MAX_AUDIO_BYTES = 24 * 1024 * 1024

// Whisper's `prompt` parameter is limited to 224 tokens; keep the
// vocabulary hint comfortably below that.
const MAX_PROMPT_CHARS = 600

export const TRANSCRIPTION_TIMEOUT_MS = 30_000

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
const OPENAI_BASE_URL = 'https://api.openai.com/v1'

// ─── Configuration ───────────────────────────────────────────────────

export type TranscriptionConfig = {
  baseURL: string
  apiKey?: string
  model: string
  // Human-readable backend label shown in /voice output.
  label: string
}

type EnvLike = Record<string, string | undefined>

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function hostnameOf(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  try {
    return new URL(raw).hostname
  } catch {
    return ''
  }
}

/**
 * Resolves the OpenAI-compatible transcription endpoint from the
 * environment. Returns null when nothing is configured.
 *
 * Precedence:
 *   1. OPENCLAUDE_STT_BASE_URL (+ optional OPENCLAUDE_STT_API_KEY / _MODEL)
 *      — any OpenAI-compatible server, including local ones without a key.
 *   2. GROQ_API_KEY → Groq whisper-large-v3-turbo.
 *   3. OPENAI_API_KEY, only when OPENAI_BASE_URL is unset or points at
 *      api.openai.com (or Groq). A key for another OpenAI-compatible
 *      provider (DeepSeek, OpenRouter, ...) must never be sent to OpenAI.
 */
export function resolveTranscriptionConfig(
  env: EnvLike = process.env,
): TranscriptionConfig | null {
  const modelOverride = nonEmpty(env.OPENCLAUDE_STT_MODEL)

  const explicitBaseURL = nonEmpty(env.OPENCLAUDE_STT_BASE_URL)
  if (explicitBaseURL) {
    let host = explicitBaseURL
    try {
      host = new URL(explicitBaseURL).host
    } catch {
      // Keep the raw value as the label; the request will surface the error.
    }
    return {
      baseURL: explicitBaseURL,
      apiKey: nonEmpty(env.OPENCLAUDE_STT_API_KEY),
      model: modelOverride ?? 'whisper-1',
      label: host,
    }
  }

  const openaiKey = nonEmpty(env.OPENAI_API_KEY)
  const openaiHost = hostnameOf(nonEmpty(env.OPENAI_BASE_URL ?? env.OPENAI_API_BASE))
  const groqKey =
    nonEmpty(env.GROQ_API_KEY) ??
    (openaiHost === 'api.groq.com' ? openaiKey : undefined)
  if (groqKey) {
    return {
      baseURL: GROQ_BASE_URL,
      apiKey: groqKey,
      model: modelOverride ?? 'whisper-large-v3-turbo',
      label: 'Groq',
    }
  }

  if (openaiKey && (openaiHost === undefined || openaiHost === 'api.openai.com')) {
    return {
      baseURL: OPENAI_BASE_URL,
      apiKey: openaiKey,
      model: modelOverride ?? 'gpt-4o-mini-transcribe',
      label: 'OpenAI',
    }
  }

  return null
}

export function isTranscriptionAvailable(env: EnvLike = process.env): boolean {
  return resolveTranscriptionConfig(env) !== null
}

// ─── WAV encoding ────────────────────────────────────────────────────

/**
 * Wraps raw 16-bit little-endian mono PCM in a canonical 44-byte WAV
 * header so transcription servers can decode it without extra metadata.
 */
export function encodeWav(
  pcm: Buffer,
  sampleRate = SAMPLE_RATE,
  channels = CHANNELS,
): Buffer {
  const blockAlign = channels * (BITS_PER_SAMPLE / 8)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16) // fmt chunk size
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * blockAlign, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(BITS_PER_SAMPLE, 34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

/**
 * Builds Whisper's optional `prompt` from project keyterms. The prompt
 * biases recognition toward identifiers like file and function names.
 */
export function buildVocabularyPrompt(keyterms: string[] | undefined): string {
  if (!keyterms?.length) return ''
  let prompt = ''
  for (const term of keyterms) {
    const next = prompt ? `${prompt}, ${term}` : term
    if (next.length > MAX_PROMPT_CHARS) break
    prompt = next
  }
  return prompt
}

function transcriptionUrl(baseURL: string): string {
  return `${baseURL.replace(/\/+$/, '')}/audio/transcriptions`
}

function describeHttpError(status: number, body: string): string {
  let detail = body.trim()
  try {
    const parsed = JSON.parse(detail) as { error?: { message?: string } | string }
    if (typeof parsed.error === 'string') detail = parsed.error
    else if (parsed.error?.message) detail = parsed.error.message
  } catch {
    // Non-JSON body; use as-is.
  }
  if (detail.length > 200) detail = `${detail.slice(0, 200)}…`
  return detail ? `HTTP ${status}: ${detail}` : `HTTP ${status}`
}

// ─── Connection ──────────────────────────────────────────────────────

export type TranscriptionConnectOptions = {
  language?: string
  keyterms?: string[]
  // Test seams.
  config?: TranscriptionConfig | null
  fetcher?: ProxyRetryFetcher
  timeoutMs?: number
}

export async function connectTranscription(
  callbacks: VoiceStreamCallbacks,
  options?: TranscriptionConnectOptions,
): Promise<VoiceStreamConnection | null> {
  const config =
    options?.config !== undefined ? options.config : resolveTranscriptionConfig()
  if (!config) {
    logForDebugging('[voice_stt] No OpenAI-compatible transcription endpoint configured')
    return null
  }
  const cfg = config

  const chunks: Buffer[] = []
  let totalBytes = 0
  let closed = false
  let finalizing: Promise<FinalizeSource> | null = null
  const controller = new AbortController()

  async function transcribe(): Promise<FinalizeSource> {
    if (totalBytes === 0) {
      return 'no_data_timeout'
    }
    if (totalBytes > MAX_AUDIO_BYTES) {
      callbacks.onError('Recording is too long to transcribe. Keep voice input under ten minutes.', {
        fatal: true,
      })
      return 'ws_close'
    }

    const wav = encodeWav(Buffer.concat(chunks, totalBytes))
    chunks.length = 0
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'speech.wav')
    form.append('model', cfg.model)
    form.append('response_format', 'json')
    if (options?.language) form.append('language', options.language)
    const prompt = buildVocabularyPrompt(options?.keyterms)
    if (prompt) form.append('prompt', prompt)

    const headers: Record<string, string> = {}
    if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`

    const timeoutMs = options?.timeoutMs ?? TRANSCRIPTION_TIMEOUT_MS
    const timer = setTimeout(c => c.abort(), timeoutMs, controller)
    const startedAt = Date.now()
    try {
      const response = await fetchWithProxyRetry(
        transcriptionUrl(cfg.baseURL),
        { method: 'POST', headers, body: form, signal: controller.signal },
        { fetcher: options?.fetcher },
      )
      if (!response.ok) {
        const body = await response.text().catch(() => '')
        const fatal = response.status === 401 || response.status === 403 || response.status === 404
        callbacks.onError(
          `Transcription failed (${cfg.label}): ${describeHttpError(response.status, body)}`,
          { fatal },
        )
        return 'ws_close'
      }
      const payload = (await response.json()) as { text?: unknown }
      const text = typeof payload.text === 'string' ? payload.text.trim() : ''
      logForDebugging(
        `[voice_stt] ${cfg.label} transcribed ${String(wav.length)} bytes in ${String(Date.now() - startedAt)}ms (${String(text.length)} chars)`,
      )
      if (closed) return 'ws_close'
      if (text) callbacks.onTranscript(text, true)
      // The server answered, so an empty transcript means "no speech", not
      // the streaming backend's silent-drop signature — never report
      // no_data_timeout here or useVoice would replay the audio.
      return 'post_closestream_endpoint'
    } catch (error) {
      if (closed) return 'ws_already_closed'
      const timedOut = controller.signal.aborted
      const message = timedOut
        ? `Transcription timed out after ${String(Math.round(timeoutMs / 1000))}s (${cfg.label}).`
        : `Transcription request failed (${cfg.label}): ${error instanceof Error ? error.message : String(error)}`
      callbacks.onError(message, { fatal: true })
      return timedOut ? 'safety_timeout' : 'ws_close'
    } finally {
      clearTimeout(timer)
    }
  }

  const connection: VoiceStreamConnection = {
    send(audioChunk: Buffer) {
      if (closed || finalizing) return
      chunks.push(Buffer.from(audioChunk))
      totalBytes += audioChunk.length
    },
    finalize() {
      finalizing ??= transcribe()
      return finalizing
    },
    close() {
      if (closed) return
      closed = true
      chunks.length = 0
      controller.abort()
      callbacks.onClose()
    },
    isConnected() {
      return !closed
    },
  }

  // There is no handshake: the connection is usable immediately. Defer
  // onReady to a microtask so callers observe the same ordering as the
  // streaming client (connect() resolves, then onReady flushes buffered
  // audio).
  queueMicrotask(() => {
    if (!closed) callbacks.onReady(connection)
  })
  return connection
}
