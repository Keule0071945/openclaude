import { describe, expect, test } from 'bun:test'
import type { ProxyRetryFetcher } from './api/fetchWithProxyRetry.js'
import {
  buildVocabularyPrompt,
  connectTranscription,
  encodeWav,
  resolveTranscriptionConfig,
  type TranscriptionConfig,
} from './voiceTranscriptionSTT.js'
import type { VoiceStreamCallbacks } from './voiceStreamSTT.js'

describe('resolveTranscriptionConfig', () => {
  test('returns null when nothing is configured', () => {
    expect(resolveTranscriptionConfig({})).toBeNull()
  })

  test('explicit base URL wins and works without an API key', () => {
    expect(
      resolveTranscriptionConfig({
        OPENCLAUDE_STT_BASE_URL: 'http://localhost:8080/v1',
        GROQ_API_KEY: 'gsk',
        OPENAI_API_KEY: 'sk',
      }),
    ).toEqual({
      baseURL: 'http://localhost:8080/v1',
      apiKey: undefined,
      model: 'whisper-1',
      label: 'localhost:8080',
    })
  })

  test('uses Groq when GROQ_API_KEY is set', () => {
    expect(resolveTranscriptionConfig({ GROQ_API_KEY: 'gsk' })).toMatchObject({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: 'gsk',
      model: 'whisper-large-v3-turbo',
      label: 'Groq',
    })
  })

  test('uses OpenAI only when OPENAI_BASE_URL targets OpenAI', () => {
    expect(resolveTranscriptionConfig({ OPENAI_API_KEY: 'sk' })).toMatchObject({
      baseURL: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini-transcribe',
    })
    expect(
      resolveTranscriptionConfig({
        OPENAI_API_KEY: 'sk',
        OPENAI_BASE_URL: 'https://api.openai.com/v1',
      }),
    ).not.toBeNull()
  })

  test('reuses OPENAI_API_KEY when OPENAI_BASE_URL already targets Groq', () => {
    expect(
      resolveTranscriptionConfig({
        OPENAI_API_KEY: 'gsk-via-openai',
        OPENAI_BASE_URL: 'https://api.groq.com/openai/v1',
      }),
    ).toMatchObject({ label: 'Groq', apiKey: 'gsk-via-openai' })
  })

  test('never sends a third-party OpenAI-compatible key to OpenAI', () => {
    expect(
      resolveTranscriptionConfig({
        OPENAI_API_KEY: 'sk-deepseek',
        OPENAI_BASE_URL: 'https://api.deepseek.com/v1',
      }),
    ).toBeNull()
    expect(
      resolveTranscriptionConfig({
        OPENAI_API_KEY: 'sk-or',
        OPENAI_API_BASE: 'https://openrouter.ai/api/v1',
      }),
    ).toBeNull()
  })

  test('OPENCLAUDE_STT_MODEL overrides the default model', () => {
    expect(
      resolveTranscriptionConfig({
        GROQ_API_KEY: 'gsk',
        OPENCLAUDE_STT_MODEL: 'distil-whisper-large-v3-en',
      })?.model,
    ).toBe('distil-whisper-large-v3-en')
  })
})

describe('encodeWav', () => {
  test('writes a 44-byte PCM header for 16 kHz mono 16-bit audio', () => {
    const pcm = Buffer.alloc(320)
    const wav = encodeWav(pcm)
    expect(wav.length).toBe(364)
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
    expect(wav.readUInt32LE(4)).toBe(356)
    expect(wav.toString('ascii', 8, 16)).toBe('WAVEfmt ')
    expect(wav.readUInt16LE(20)).toBe(1)
    expect(wav.readUInt16LE(22)).toBe(1)
    expect(wav.readUInt32LE(24)).toBe(16_000)
    expect(wav.readUInt32LE(28)).toBe(32_000)
    expect(wav.readUInt16LE(32)).toBe(2)
    expect(wav.readUInt16LE(34)).toBe(16)
    expect(wav.toString('ascii', 36, 40)).toBe('data')
    expect(wav.readUInt32LE(40)).toBe(320)
  })
})

describe('buildVocabularyPrompt', () => {
  test('joins keyterms and stays within the prompt budget', () => {
    expect(buildVocabularyPrompt(['useVoice', 'fetchUser'])).toBe(
      'useVoice, fetchUser',
    )
    expect(buildVocabularyPrompt(undefined)).toBe('')
    const many = Array.from({ length: 200 }, (_, i) => `identifier${i}`)
    const prompt = buildVocabularyPrompt(many)
    expect(prompt.length).toBeLessThanOrEqual(600)
    expect(prompt.startsWith('identifier0, identifier1')).toBe(true)
  })
})

const CONFIG: TranscriptionConfig = {
  baseURL: 'https://stt.example/v1/',
  apiKey: 'secret',
  model: 'whisper-test',
  label: 'Test',
}

type Recorded = {
  transcripts: Array<[string, boolean]>
  errors: Array<[string, boolean | undefined]>
  ready: number
  closed: number
}

function recordingCallbacks(): { callbacks: VoiceStreamCallbacks; seen: Recorded } {
  const seen: Recorded = { transcripts: [], errors: [], ready: 0, closed: 0 }
  return {
    seen,
    callbacks: {
      onTranscript: (text, isFinal) => seen.transcripts.push([text, isFinal]),
      onError: (error, opts) => seen.errors.push([error, opts?.fatal]),
      onClose: () => {
        seen.closed++
      },
      onReady: () => {
        seen.ready++
      },
    },
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('connectTranscription', () => {
  test('returns null without a configured endpoint', async () => {
    const { callbacks } = recordingCallbacks()
    expect(await connectTranscription(callbacks, { config: null })).toBeNull()
  })

  test('fires onReady and uploads buffered audio as WAV on finalize', async () => {
    let requestUrl = ''
    let requestInit: RequestInit | undefined
    const fetcher: ProxyRetryFetcher = async (input, init) => {
      requestUrl = String(input)
      requestInit = init
      return jsonResponse(200, { text: ' Mach die Funktion async. ' })
    }
    const { callbacks, seen } = recordingCallbacks()
    const conn = await connectTranscription(callbacks, {
      config: CONFIG,
      fetcher,
      language: 'de',
      keyterms: ['fetchUser'],
    })
    expect(conn).not.toBeNull()
    await Promise.resolve()
    expect(seen.ready).toBe(1)

    conn!.send(Buffer.alloc(640, 1))
    conn!.send(Buffer.alloc(640, 2))
    expect(await conn!.finalize()).toBe('post_closestream_endpoint')

    expect(requestUrl).toBe('https://stt.example/v1/audio/transcriptions')
    expect(requestInit?.method).toBe('POST')
    expect((requestInit?.headers as Record<string, string>).Authorization).toBe(
      'Bearer secret',
    )
    const form = requestInit?.body as FormData
    expect(form.get('model')).toBe('whisper-test')
    expect(form.get('language')).toBe('de')
    expect(form.get('prompt')).toBe('fetchUser')
    const file = form.get('file') as File
    expect(file.type).toBe('audio/wav')
    expect(file.size).toBe(44 + 1280)
    expect(seen.transcripts).toEqual([['Mach die Funktion async.', true]])
    expect(seen.errors).toEqual([])
  })

  test('omits language and prompt when not provided', async () => {
    let form: FormData | undefined
    const fetcher: ProxyRetryFetcher = async (_input, init) => {
      form = init?.body as FormData
      return jsonResponse(200, { text: 'hello' })
    }
    const { callbacks } = recordingCallbacks()
    const conn = await connectTranscription(callbacks, {
      config: { ...CONFIG, apiKey: undefined },
      fetcher,
    })
    conn!.send(Buffer.alloc(64))
    await conn!.finalize()
    expect(form?.has('language')).toBe(false)
    expect(form?.has('prompt')).toBe(false)
  })

  test('does not call the server when no audio was captured', async () => {
    let calls = 0
    const fetcher: ProxyRetryFetcher = async () => {
      calls++
      return jsonResponse(200, { text: 'x' })
    }
    const { callbacks, seen } = recordingCallbacks()
    const conn = await connectTranscription(callbacks, { config: CONFIG, fetcher })
    expect(await conn!.finalize()).toBe('no_data_timeout')
    expect(calls).toBe(0)
    expect(seen.transcripts).toEqual([])
  })

  test('an empty transcript is not reported as a silent drop', async () => {
    const fetcher: ProxyRetryFetcher = async () => jsonResponse(200, { text: '' })
    const { callbacks, seen } = recordingCallbacks()
    const conn = await connectTranscription(callbacks, { config: CONFIG, fetcher })
    conn!.send(Buffer.alloc(64))
    expect(await conn!.finalize()).toBe('post_closestream_endpoint')
    expect(seen.transcripts).toEqual([])
  })

  test('surfaces HTTP errors with the server message', async () => {
    const fetcher: ProxyRetryFetcher = async () =>
      jsonResponse(401, { error: { message: 'Invalid API Key' } })
    const { callbacks, seen } = recordingCallbacks()
    const conn = await connectTranscription(callbacks, { config: CONFIG, fetcher })
    conn!.send(Buffer.alloc(64))
    await conn!.finalize()
    expect(seen.errors).toEqual([
      ['Transcription failed (Test): HTTP 401: Invalid API Key', true],
    ])
  })

  test('times out a hanging request', async () => {
    const fetcher: ProxyRetryFetcher = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
        )
      })
    const { callbacks, seen } = recordingCallbacks()
    const conn = await connectTranscription(callbacks, {
      config: CONFIG,
      fetcher,
      timeoutMs: 10,
    })
    conn!.send(Buffer.alloc(64))
    expect(await conn!.finalize()).toBe('safety_timeout')
    expect(seen.errors[0]?.[0]).toContain('timed out')
  })

  test('close() aborts an in-flight request without reporting an error', async () => {
    let started!: () => void
    const requestStarted = new Promise<void>(resolve => {
      started = resolve
    })
    const fetcher: ProxyRetryFetcher = (_input, init) =>
      new Promise((_resolve, reject) => {
        started()
        init?.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
        )
      })
    const { callbacks, seen } = recordingCallbacks()
    const conn = await connectTranscription(callbacks, { config: CONFIG, fetcher })
    conn!.send(Buffer.alloc(64))
    const finalized = conn!.finalize()
    await requestStarted
    conn!.close()
    expect(await finalized).toBe('ws_already_closed')
    expect(seen.errors).toEqual([])
    expect(seen.closed).toBe(1)
    expect(conn!.isConnected()).toBe(false)
  })
})
