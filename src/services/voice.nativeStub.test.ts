import { afterEach, expect, mock, test } from 'bun:test'

// The open build replaces audio-capture-napi with a stub that has no named
// exports (scripts/build.ts). Voice must treat that as "no native audio"
// and fall back to SoX/arecord instead of throwing
// "mod.isNativeAudioAvailable is not a function".
mock.module('audio-capture-napi', () => ({ default: {}, __stub: true }))

const savedRemote = process.env.CLAUDE_CODE_REMOTE

afterEach(() => {
  if (savedRemote === undefined) delete process.env.CLAUDE_CODE_REMOTE
  else process.env.CLAUDE_CODE_REMOTE = savedRemote
})

test('a stubbed native audio module falls back instead of throwing', async () => {
  delete process.env.CLAUDE_CODE_REMOTE
  const voice = await import('./voice.js')

  const availability = await voice.checkRecordingAvailability()
  expect(typeof availability.available).toBe('boolean')

  const deps = await voice.checkVoiceDependencies()
  expect(typeof deps.available).toBe('boolean')
})
