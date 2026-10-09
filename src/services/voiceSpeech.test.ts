import { describe, expect, test } from 'bun:test'
import type { ProxyRetryFetcher } from './api/fetchWithProxyRetry.js'
import {
  buildAudioPlayerCommand,
  buildSystemSpeechCommand,
  resolveTtsBackend,
  speak,
  stopSpeaking,
  type TtsBackend,
} from './voiceSpeech.js'

const onlyHas =
  (...commands: string[]) =>
  (cmd: string) =>
    commands.includes(cmd)

describe('resolveTtsBackend', () => {
  test('OPENCLAUDE_TTS=off disables speech', () => {
    expect(resolveTtsBackend({ OPENCLAUDE_TTS: 'off' }, 'darwin')).toBeNull()
    expect(resolveTtsBackend({ OPENCLAUDE_TTS: '0' }, 'linux', () => true)).toBeNull()
  })

  test('uses say on macOS and PowerShell on Windows', () => {
    expect(resolveTtsBackend({}, 'darwin')).toEqual({
      id: 'system',
      engine: 'say',
      voice: undefined,
    })
    expect(resolveTtsBackend({ OPENCLAUDE_TTS_VOICE: 'Hedda' }, 'win32')).toEqual({
      id: 'system',
      engine: 'powershell',
      voice: 'Hedda',
    })
  })

  test('picks the first installed Linux engine', () => {
    expect(
      resolveTtsBackend({}, 'linux', onlyHas('espeak', 'spd-say')),
    ).toMatchObject({ engine: 'espeak' })
    expect(resolveTtsBackend({}, 'linux', onlyHas('spd-say'))).toMatchObject({
      engine: 'spd-say',
    })
    expect(resolveTtsBackend({}, 'linux', onlyHas())).toBeNull()
  })

  test('OPENCLAUDE_TTS_BASE_URL selects an OpenAI-compatible server', () => {
    expect(
      resolveTtsBackend(
        {
          OPENCLAUDE_TTS_BASE_URL: 'http://localhost:8880/v1',
          OPENCLAUDE_TTS_MODEL: 'kokoro',
          OPENCLAUDE_TTS_VOICE: 'af_heart',
        },
        'linux',
        onlyHas(),
      ),
    ).toEqual({
      id: 'openai-compatible',
      baseURL: 'http://localhost:8880/v1',
      apiKey: undefined,
      model: 'kokoro',
      voice: 'af_heart',
      label: 'localhost:8880',
    })
  })

  test('OPENCLAUDE_TTS=system keeps the OS engine despite a base URL', () => {
    expect(
      resolveTtsBackend(
        { OPENCLAUDE_TTS: 'system', OPENCLAUDE_TTS_BASE_URL: 'http://x/v1' },
        'darwin',
      ),
    ).toMatchObject({ id: 'system', engine: 'say' })
  })
})

describe('buildSystemSpeechCommand', () => {
  const text = '-v Evil text that starts with a dash'

  test('passes text on stdin, never as an argument', () => {
    for (const engine of ['say', 'espeak-ng', 'espeak', 'spd-say', 'powershell'] as const) {
      const spec = buildSystemSpeechCommand(engine, text)
      expect(spec.stdin).toBe(text)
      expect(spec.args.join(' ')).not.toContain('Evil')
    }
  })

  test('selects voices and languages', () => {
    expect(buildSystemSpeechCommand('say', 'hi', { voice: 'Anna' }).args).toEqual([
      '-v',
      'Anna',
      '-f',
      '-',
    ])
    expect(
      buildSystemSpeechCommand('espeak-ng', 'hi', { language: 'de' }).args,
    ).toEqual(['-v', 'de', '--stdin'])
    expect(
      buildSystemSpeechCommand('spd-say', 'hi', { language: 'de' }).args,
    ).toEqual(['--wait', '--language', 'de', '--pipe-mode'])
  })

  test('never interpolates the voice into the PowerShell script', () => {
    const spec = buildSystemSpeechCommand('powershell', 'hi', {
      voice: "x'; Remove-Item -Recurse C:\\; '",
    })
    expect(spec.args.join(' ')).not.toContain('Remove-Item')
  })
})

describe('buildAudioPlayerCommand', () => {
  test('chooses a player per platform', () => {
    expect(buildAudioPlayerCommand('/tmp/a.wav', 'darwin')).toEqual({
      cmd: 'afplay',
      args: ['/tmp/a.wav'],
    })
    expect(buildAudioPlayerCommand('/tmp/a.wav', 'linux', onlyHas('aplay'))).toEqual({
      cmd: 'aplay',
      args: ['-q', '/tmp/a.wav'],
    })
    expect(buildAudioPlayerCommand('/tmp/a.wav', 'linux', onlyHas())).toBeNull()
  })
})

describe('speak', () => {
  const backend: TtsBackend = {
    id: 'openai-compatible',
    baseURL: 'https://tts.example/v1',
    apiKey: 'secret',
    model: 'tts-test',
    voice: 'alloy',
    label: 'Test',
  }

  test('does nothing for empty text or without a backend', async () => {
    let calls = 0
    const fetcher: ProxyRetryFetcher = async () => {
      calls++
      return new Response('')
    }
    await speak('   ', { backend, fetcher })
    await speak('hello', { backend: null, fetcher })
    expect(calls).toBe(0)
  })

  test('requests WAV speech and survives server errors', async () => {
    let body: Record<string, unknown> = {}
    let url = ''
    const fetcher: ProxyRetryFetcher = async (input, init) => {
      url = String(input)
      body = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response('nope', { status: 500 })
    }
    await speak('Tests pass.', { backend, fetcher })
    expect(url).toBe('https://tts.example/v1/audio/speech')
    expect(body).toEqual({
      model: 'tts-test',
      voice: 'alloy',
      input: 'Tests pass.',
      response_format: 'wav',
    })
  })

  test('stopSpeaking() cancels a pending synthesis request', async () => {
    let aborted = false
    const fetcher: ProxyRetryFetcher = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          aborted = true
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        })
      })
    const done = speak('A long reply.', { backend, fetcher })
    await Promise.resolve()
    stopSpeaking()
    await done
    expect(aborted).toBe(true)
  })
})
