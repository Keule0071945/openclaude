import { describe, expect, test } from 'bun:test'
import {
  createAssistantMessage,
  createUserMessage,
} from '../utils/messages.js'
import { getTurnReplyText } from './voiceReplies.js'

function assistantText(text: string) {
  return createAssistantMessage({
    content: [{ type: 'text', text, citations: [] }],
  })
}

function assistantToolUse() {
  return createAssistantMessage({
    content: [
      { type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'ls' } },
    ],
  })
}

function toolResult() {
  return createUserMessage({
    content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'ok' }],
    toolUseResult: { stdout: 'ok' },
  })
}

describe('getTurnReplyText', () => {
  test('returns the final assistant text of the turn', () => {
    const messages = [
      createUserMessage({ content: 'make it async' }),
      assistantText('Let me look.'),
      assistantToolUse(),
      toolResult(),
      assistantText('Done, fetchUser is async now.'),
    ]
    expect(getTurnReplyText(messages)).toBe('Done, fetchUser is async now.')
  })

  test('skips trailing meta and tool-only messages', () => {
    const messages = [
      createUserMessage({ content: 'run tests' }),
      assistantText('All green.'),
      assistantToolUse(),
      toolResult(),
      createUserMessage({ content: 'reminder', isMeta: true }),
    ]
    expect(getTurnReplyText(messages)).toBe('All green.')
  })

  test('never reads the previous turn when this turn had no text', () => {
    const messages = [
      createUserMessage({ content: 'first' }),
      assistantText('First answer.'),
      createUserMessage({ content: 'second' }),
      assistantToolUse(),
      toolResult(),
    ]
    expect(getTurnReplyText(messages)).toBeNull()
  })

  test('returns null for an empty transcript', () => {
    expect(getTurnReplyText([])).toBeNull()
  })
})
