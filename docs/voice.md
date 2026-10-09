# Voice Mode — Dictation and Spoken Replies

Voice mode lets you talk to OpenClaude instead of typing, and hear a short spoken summary of the answer. It works with every model provider: transcription uses its own speech-to-text backend, independent of the model you chat with.

- **Dictation:** hold the push-to-talk key (default: `Space`), speak, and release. The transcript is inserted into the prompt so you can edit it before pressing Enter.
- **Spoken replies:** when a turn was dictated, OpenClaude reads a short version of the final reply aloud. Code blocks, tables, URLs and long paths are skipped, and the closing question is always read, so you know what to answer. Typed turns stay silent.
- **Barge-in:** start talking and the reply being read stops immediately.

## Quick start

1. Configure a speech-to-text backend (see below). The fastest option is a [Groq](https://console.groq.com) key:

   ```bash
   export GROQ_API_KEY=gsk_...
   ```

2. Make sure a recording tool is installed: SoX on macOS (`brew install sox`), `arecord` (alsa-utils) or SoX on Linux.
3. Run `/voice` in OpenClaude. It checks your microphone and backends and prints where your audio goes, for example:

   ```text
   Voice mode enabled. Hold Space to record. Speech-to-text: Groq (whisper-large-v3-turbo).
   Spoken replies: say (/voice replies off to mute).
   ```

## Speech-to-text backends

OpenClaude picks the first match:

| Order | Configuration | Backend |
| --- | --- | --- |
| 1 | `OPENCLAUDE_STT_BASE_URL` (optional `OPENCLAUDE_STT_API_KEY`, `OPENCLAUDE_STT_MODEL`, default `whisper-1`) | Any OpenAI-compatible `/audio/transcriptions` server |
| 2 | Claude.ai login (`/login`) | Anthropic `voice_stream` (streams live interim text) |
| 3 | `GROQ_API_KEY`, or `OPENAI_API_KEY` with `OPENAI_BASE_URL` on `api.groq.com` | Groq `whisper-large-v3-turbo` |
| 4 | `OPENAI_API_KEY` with `OPENAI_BASE_URL` unset or `api.openai.com` | OpenAI `gpt-4o-mini-transcribe` |

`OPENCLAUDE_STT_PROVIDER=anthropic` or `OPENCLAUDE_STT_PROVIDER=openai-compatible` forces one backend.

An `OPENAI_API_KEY` that belongs to another OpenAI-compatible provider (for example DeepSeek or OpenRouter via `OPENAI_BASE_URL`) is never sent to OpenAI for transcription.

### Fully local dictation

Run any OpenAI-compatible Whisper server, for example [whisper.cpp](https://github.com/ggml-org/whisper.cpp)'s `whisper-server` or [speaches](https://github.com/speaches-ai/speaches), and point OpenClaude at it:

```bash
export OPENCLAUDE_STT_BASE_URL=http://127.0.0.1:8000/v1
export OPENCLAUDE_STT_MODEL=Systran/faster-whisper-small   # whatever your server expects
```

No API key is needed for local servers. Audio never leaves your machine.

### Language and vocabulary

- Set your language with `/config` (`language`). With an OpenAI-compatible backend and no language set, the language is auto-detected.
- Project vocabulary such as file and function names is sent as Whisper's `prompt`, so identifiers like `useEffect` are recognized correctly.

### Differences between backends

OpenAI-compatible servers transcribe after you release the key, so no live text is shown while you speak; the indicator shows processing until the transcript arrives. With Groq this usually takes well under a second for a spoken sentence. Recordings are limited to about ten minutes.

## Spoken replies

Spoken replies are on by default while voice mode is enabled.

```text
/voice replies off   # mute
/voice replies on    # unmute
/voice replies       # show status and the speech engine in use
```

The text-to-speech engine is picked automatically:

| Platform | Engine |
| --- | --- |
| macOS | `say` (built in) |
| Windows | System.Speech via PowerShell (built in) |
| Linux | `espeak-ng`, `espeak` or `spd-say`, whichever is installed (`sudo apt-get install espeak-ng`) |

For nicer voices, use an OpenAI-compatible `/audio/speech` server, either OpenAI itself or a local one like [Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI):

```bash
export OPENCLAUDE_TTS_BASE_URL=http://127.0.0.1:8880/v1
export OPENCLAUDE_TTS_MODEL=kokoro
export OPENCLAUDE_TTS_VOICE=af_heart
# export OPENCLAUDE_TTS_API_KEY=...   # needed for hosted services such as OpenAI
```

Playback uses `afplay` (macOS), PowerShell (Windows), or `paplay` / `aplay` / `ffplay` (Linux).

| Variable | Effect |
| --- | --- |
| `OPENCLAUDE_TTS=off` | Never speak, regardless of the setting |
| `OPENCLAUDE_TTS=system` | Use the OS engine even if `OPENCLAUDE_TTS_BASE_URL` is set |
| `OPENCLAUDE_TTS_VOICE` | Voice name (`say -v`, espeak voice, SAPI voice, or server voice) |
| `OPENCLAUDE_TTS_MAX_WORDS` | Length budget of the spoken summary (default `40`) |

## Privacy

- Audio is sent only to the speech-to-text backend shown by `/voice`, and only while the push-to-talk key is held.
- Recordings and synthesized speech are not stored; temporary WAV files are deleted after playback.
- For a fully offline setup, combine a local Whisper server with the OS speech engine or a local TTS server.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `No speech-to-text backend is configured` | Set `GROQ_API_KEY` or `OPENCLAUDE_STT_BASE_URL`, or `/login` with Claude.ai |
| `Voice mode requires SoX for audio recording` | Install SoX (`brew install sox`, `sudo apt-get install sox`) |
| `Transcription failed (…): HTTP 401` | Check the API key for the backend shown in the message |
| Replies are not spoken | Run `/voice replies` to see the engine; on Linux install `espeak-ng` |
| Windows: recording unavailable | The native audio module is not part of the open build, and Windows has no SoX fallback yet |
