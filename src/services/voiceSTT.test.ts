import { describe, expect, test } from 'bun:test'
import { resolveSttBackend } from './voiceSTT.js'

const withAnthropic = () => true
const withoutAnthropic = () => false

describe('resolveSttBackend', () => {
  test('returns null when no backend is usable', () => {
    expect(resolveSttBackend({}, withoutAnthropic)).toBeNull()
  })

  test('prefers Anthropic streaming over an implicit API key', () => {
    expect(
      resolveSttBackend({ GROQ_API_KEY: 'gsk' }, withAnthropic),
    ).toMatchObject({ id: 'anthropic', streaming: true })
  })

  test('falls back to an OpenAI-compatible backend without Anthropic OAuth', () => {
    expect(
      resolveSttBackend({ GROQ_API_KEY: 'gsk' }, withoutAnthropic),
    ).toEqual({
      id: 'openai-compatible',
      label: 'Groq (whisper-large-v3-turbo)',
      streaming: false,
    })
  })

  test('an explicit OPENCLAUDE_STT_BASE_URL wins over Anthropic', () => {
    expect(
      resolveSttBackend(
        { OPENCLAUDE_STT_BASE_URL: 'http://127.0.0.1:9000/v1' },
        withAnthropic,
      ),
    ).toMatchObject({ id: 'openai-compatible', label: '127.0.0.1:9000 (whisper-1)' })
  })

  test('OPENCLAUDE_STT_PROVIDER forces a backend', () => {
    expect(
      resolveSttBackend(
        { OPENCLAUDE_STT_PROVIDER: 'anthropic', GROQ_API_KEY: 'gsk' },
        withoutAnthropic,
      ),
    ).toBeNull()
    expect(
      resolveSttBackend(
        { OPENCLAUDE_STT_PROVIDER: 'openai-compatible', GROQ_API_KEY: 'gsk' },
        withAnthropic,
      ),
    ).toMatchObject({ id: 'openai-compatible' })
  })
})
