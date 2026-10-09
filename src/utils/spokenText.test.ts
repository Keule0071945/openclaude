import { describe, expect, test } from 'bun:test'
import { toSpokenProse, toSpokenText } from './spokenText.js'

describe('toSpokenProse', () => {
  test('drops fenced code blocks, tables and URLs', () => {
    const markdown = [
      'Done. I made `fetchUser` async.',
      '',
      '```ts',
      'export async function fetchUser() {}',
      '```',
      '',
      '| File | Change |',
      '| --- | --- |',
      '| a.ts | async |',
      '',
      'See https://example.com/docs for details.',
    ].join('\n')

    expect(toSpokenProse(markdown)).toBe(
      'Done. I made fetchUser async. See for details.',
    )
  })

  test('drops an unterminated trailing code fence', () => {
    expect(toSpokenProse('Here it is:\n```bash\nrm -rf build')).toBe(
      'Here it is:',
    )
  })

  test('turns headings and list items into sentences', () => {
    const markdown = '## Summary\n- Fixed the parser\n- Added **two** tests\n1. Ran the suite'
    expect(toSpokenProse(markdown)).toBe(
      'Summary. Fixed the parser. Added two tests. Ran the suite.',
    )
  })

  test('speaks only file names for paths but keeps prose slashes', () => {
    expect(
      toSpokenProse('Updated src/services/voice.ts and/or ./docs/voice.md.'),
    ).toBe('Updated voice.ts and/or voice.md.')
  })

  test('keeps short inline code and drops long snippets', () => {
    expect(
      toSpokenProse(
        'Run `bun test` or `bun run build && node bin/openclaude --version --verbose`.',
      ),
    ).toBe('Run bun test or.')
  })

  test('keeps link labels', () => {
    expect(toSpokenProse('Opened [the PR](https://github.com/x/y/pull/1).')).toBe(
      'Opened the PR.',
    )
  })

  test('returns empty string when only code remains', () => {
    expect(toSpokenProse('```\nconst a = 1\n```')).toBe('')
  })
})

describe('toSpokenText', () => {
  test('keeps whole sentences up to the word budget', () => {
    const text =
      'Fixed the bug. Three tests were failing because of a race. I added a lock around the cache and reran everything twice.'
    expect(toSpokenText(text, 11)).toBe(
      'Fixed the bug. Three tests were failing because of a race.',
    )
  })

  test('does not split on decimals or file extensions', () => {
    expect(toSpokenText('Bumped to 1.5 in index.ts today. Next step.', 7)).toBe(
      'Bumped to 1.5 in index.ts today.',
    )
  })

  test('truncates an overlong first sentence', () => {
    expect(toSpokenText('one two three four five six', 3)).toBe(
      'one two three…',
    )
  })

  test('appends the closing question so the user hears what to answer', () => {
    const text =
      'I refactored the module. It now has a smaller API surface and fewer side effects. Tests pass. Should I commit this?'
    expect(toSpokenText(text, 6)).toBe(
      'I refactored the module. Should I commit this?',
    )
  })

  test('does not repeat a question that already fits', () => {
    expect(toSpokenText('Done. Commit?', 40)).toBe('Done. Commit?')
  })

  test('returns empty string for unspeakable replies', () => {
    expect(toSpokenText('```\nls\n```')).toBe('')
  })
})
