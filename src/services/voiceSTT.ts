// Speech-to-text backend selection for push-to-talk.
//
// OpenClaude users run many providers, so voice input must not depend on a
// claude.ai login. This module picks the transcription backend and gives
// useVoice.ts a single connect/availability API:
//
//   - 'openai-compatible' (voiceTranscriptionSTT.ts): any server with
//     POST /audio/transcriptions — Groq, OpenAI, or a local whisper server.
//   - 'anthropic' (voiceStreamSTT.ts): the claude.ai voice_stream WebSocket,
//     available with Anthropic OAuth. Streams interim transcripts.
//
// OPENCLAUDE_STT_PROVIDER forces one backend ('anthropic' or
// 'openai-compatible'). Otherwise an explicit OPENCLAUDE_STT_BASE_URL wins,
// then Anthropic OAuth (streaming is the nicer experience), then
// GROQ_API_KEY / OPENAI_API_KEY.

import {
  connectTranscription,
  resolveTranscriptionConfig,
} from './voiceTranscriptionSTT.js'
import {
  connectVoiceStream,
  isVoiceStreamAvailable,
  type VoiceStreamCallbacks,
  type VoiceStreamConnection,
} from './voiceStreamSTT.js'

export type SttBackendId = 'anthropic' | 'openai-compatible'

export type SttBackend = {
  id: SttBackendId
  // Shown to the user so they know where their audio is sent.
  label: string
  // True when the backend emits interim (non-final) transcripts.
  streaming: boolean
}

type EnvLike = Record<string, string | undefined>

export function resolveSttBackend(
  env: EnvLike = process.env,
  anthropicAvailable: () => boolean = isVoiceStreamAvailable,
): SttBackend | null {
  const forced = env.OPENCLAUDE_STT_PROVIDER?.trim().toLowerCase()
  const transcription = resolveTranscriptionConfig(env)
  const openaiBackend: SttBackend | null = transcription
    ? {
        id: 'openai-compatible',
        label: `${transcription.label} (${transcription.model})`,
        streaming: false,
      }
    : null
  const anthropicBackend = (): SttBackend | null =>
    anthropicAvailable()
      ? { id: 'anthropic', label: 'Anthropic voice_stream', streaming: true }
      : null

  if (forced === 'anthropic') return anthropicBackend()
  if (forced === 'openai-compatible' || forced === 'openai') {
    return openaiBackend
  }

  if (openaiBackend && env.OPENCLAUDE_STT_BASE_URL?.trim()) {
    return openaiBackend
  }
  return anthropicBackend() ?? openaiBackend
}

export function isVoiceSttAvailable(): boolean {
  return resolveSttBackend() !== null
}

export type VoiceSttConnectOptions = {
  // BCP-47 / ISO-639-1 language code.
  language?: string
  // False when the language is a fallback rather than the user's choice;
  // Whisper-style backends then auto-detect instead of forcing it.
  languageIsExplicit?: boolean
  keyterms?: string[]
}

export async function connectVoiceSTT(
  callbacks: VoiceStreamCallbacks,
  options?: VoiceSttConnectOptions,
): Promise<VoiceStreamConnection | null> {
  const backend = resolveSttBackend()
  if (!backend) return null
  if (backend.id === 'anthropic') {
    return connectVoiceStream(callbacks, {
      language: options?.language,
      keyterms: options?.keyterms,
    })
  }
  return connectTranscription(callbacks, {
    language:
      options?.languageIsExplicit === false ? undefined : options?.language,
    keyterms: options?.keyterms,
  })
}
