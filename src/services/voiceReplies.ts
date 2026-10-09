// Spoken replies for voice mode.
//
// When a turn was started by dictation, read a short version of the final
// assistant reply aloud once the turn finishes, so the user can keep their
// eyes off the screen. Typed turns stay silent.
//
// useVoiceIntegration marks a turn as voice-driven when a transcript is
// inserted into the prompt; REPL calls onVoiceTurnComplete() when the
// query ends.

import { normalizeLanguageForSTT } from '../hooks/useVoice.js'
import type { Message } from '../types/message.js'
import { logForDebugging } from '../utils/debug.js'
import { getSystemLocaleLanguage } from '../utils/intl.js'
import { isHumanTurn } from '../utils/messagePredicates.js'
import {
  getAssistantMessageText,
  isToolUseResultMessage,
} from '../utils/messages.js'
import { getInitialSettings } from '../utils/settings/settings.js'
import { DEFAULT_MAX_SPOKEN_WORDS, toSpokenText } from '../utils/spokenText.js'
import { speak } from './voiceSpeech.js'

let voiceTurnPending = false

/** Records that the prompt being composed contains dictated text. */
export function markVoiceInput(): void {
  voiceTurnPending = true
}

export function _resetVoiceRepliesForTesting(): void {
  voiceTurnPending = false
}

/** True unless the user turned spoken replies off (settings or env). */
export function areVoiceRepliesEnabled(): boolean {
  const mode = process.env.OPENCLAUDE_TTS?.trim().toLowerCase()
  if (mode === 'off' || mode === '0' || mode === 'false' || mode === 'none') {
    return false
  }
  const settings = getInitialSettings()
  return settings.voiceEnabled === true && settings.voiceReplies !== false
}

/**
 * Returns the text of the last assistant message of the current turn, or
 * null if the turn produced no text. Stops at the user's prompt so a
 * text-free turn (tools only) never re-reads the previous turn's reply.
 */
export function getTurnReplyText(messages: readonly Message[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]!
    if (message.type === 'assistant') {
      const text = getAssistantMessageText(message)
      if (text) return text
      continue
    }
    if (isHumanTurn(message) && !isToolUseResultMessage(message)) {
      return null
    }
  }
  return null
}

function maxSpokenWords(): number {
  const parsed = Number.parseInt(process.env.OPENCLAUDE_TTS_MAX_WORDS ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_SPOKEN_WORDS
}

/**
 * Called when a REPL query finishes. Speaks the reply when the turn was
 * dictated and spoken replies are enabled. Fire-and-forget.
 */
export function onVoiceTurnComplete(
  messages: readonly Message[],
  { aborted }: { aborted: boolean },
): void {
  const wasVoiceTurn = voiceTurnPending
  voiceTurnPending = false
  if (!wasVoiceTurn || aborted || !areVoiceRepliesEnabled()) return

  const reply = getTurnReplyText(messages)
  if (!reply) return
  const spoken = toSpokenText(reply, maxSpokenWords())
  if (!spoken) return

  const rawLanguage = getInitialSettings().language
  const stt = normalizeLanguageForSTT(rawLanguage)
  // Without an explicit preference, fall back to the OS locale so espeak
  // does not read German text with an English voice.
  const language =
    rawLanguage?.trim() && stt.fellBackFrom === undefined
      ? stt.code
      : getSystemLocaleLanguage()

  logForDebugging(`[voice_tts] Speaking reply (${String(spoken.length)} chars)`)
  void speak(spoken, { language })
}
