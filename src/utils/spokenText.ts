// Turns a Markdown assistant reply into a short text that sounds natural
// when read aloud. The screen keeps the details; speech is the summary:
// code blocks, tables, URLs and long paths are dropped, Markdown syntax is
// stripped, and the result is cut to a few sentences.

export const DEFAULT_MAX_SPOKEN_WORDS = 40

// Inline code longer than this is almost always a command or expression
// that sounds like noise when spoken; shorter spans (identifiers) are kept.
const MAX_SPOKEN_INLINE_CODE_CHARS = 32

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

function stripInlineMarkdown(line: string): string {
  return (
    line
      // Images and links: keep the label.
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      // Bare URLs.
      .replace(/\bhttps?:\/\/\S+/g, '')
      // Inline code: keep short identifiers, drop long snippets.
      .replace(/`([^`]*)`/g, (_m, code: string) =>
        code.length <= MAX_SPOKEN_INLINE_CODE_CHARS ? code : '',
      )
      // File paths: speak only the file name (src/a/b.ts → b.ts). A single
      // slash only counts as a path when the last segment has an extension,
      // so prose like "and/or" survives.
      .replace(/\/?(?:[\w.@~-]+\/){2,}([\w.@-]+)/g, '$1')
      .replace(/\/?(?:[\w.@~-]+\/)+([\w@-]+\.[A-Za-z0-9]{1,8})\b/g, '$1')
      // Emphasis and strikethrough markers.
      .replace(/(\*\*|__|~~)(.+?)\1/g, '$2')
      .replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=[\s).,!?:;]|$)/g, '$1$2')
      // HTML tags.
      .replace(/<[^>]+>/g, '')
  )
}

/**
 * Splits text into sentences while keeping terminal punctuation. Decimal
 * numbers and file extensions ("1.5", "index.ts") are not boundaries
 * because a boundary needs whitespace after the punctuation.
 */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map(s => s.trim())
    .filter(Boolean)
}

function clauseOf(line: string): string {
  const trimmed = line.trim()
  if (!trimmed) return ''
  return /[.!?…:;,]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

/**
 * Converts Markdown into plain prose suitable for text-to-speech.
 * Returns '' when nothing speakable remains (e.g. a reply that is only a
 * code block).
 */
export function toSpokenProse(markdown: string): string {
  const withoutFences = markdown
    // Fenced code blocks (``` or ~~~), including an unterminated trailing one.
    .replace(/(^|\n)\s*(```|~~~)[^\n]*\n[\s\S]*?(?:\n\s*\2[^\n]*(?=\n|$)|$)/g, '\n')

  const clauses: string[] = []
  for (const rawLine of withoutFences.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    // Tables and horizontal rules.
    if (line.startsWith('|') || /^([-*_=]\s*){3,}$/.test(line)) continue
    // Indented code blocks.
    if (/^( {4}|\t)/.test(rawLine) && !/^\s*([-*+]|\d+[.)])\s/.test(rawLine)) {
      continue
    }
    const content = stripInlineMarkdown(
      line
        .replace(/^#{1,6}\s+/, '') // headings
        .replace(/^>\s?/, '') // blockquotes
        .replace(/^([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/, ''), // list items
    )
      .replace(/\s+/g, ' ')
      .trim()
    const clause = clauseOf(content)
    if (clause && /[\p{L}\p{N}]/u.test(clause)) clauses.push(clause)
  }
  return clauses.join(' ').replace(/\s+([.,!?;:])/g, '$1').trim()
}

/**
 * Builds the short spoken version of an assistant reply: the first
 * sentences up to `maxWords`, plus the closing question if the reply ends
 * by asking the user something (so a voice user hears what they must
 * answer).
 */
export function toSpokenText(
  markdown: string,
  maxWords: number = DEFAULT_MAX_SPOKEN_WORDS,
): string {
  const sentences = splitSentences(toSpokenProse(markdown))
  if (sentences.length === 0) return ''

  const picked: string[] = []
  let words = 0
  for (const sentence of sentences) {
    const count = wordCount(sentence)
    if (picked.length > 0 && words + count > maxWords) break
    if (picked.length === 0 && count > maxWords) {
      picked.push(
        `${sentence.split(/\s+/).slice(0, maxWords).join(' ').replace(/[,;:]$/, '')}…`,
      )
      words = maxWords
      break
    }
    picked.push(sentence)
    words += count
  }

  const last = sentences[sentences.length - 1]!
  if (
    last.endsWith('?') &&
    !picked.includes(last) &&
    wordCount(last) <= maxWords
  ) {
    picked.push(last)
  }
  return picked.join(' ')
}
