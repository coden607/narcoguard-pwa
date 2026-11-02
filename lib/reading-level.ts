// Plain-language scoring for safety copy (#302). Flesch-Kincaid grade level with a simple
// syllable counter: good enough to catch copy drifting into long words and long sentences.
// Target: grade 6 or lower for emergency copy (CDC Clear Communication Index; NIH/AMA plain
// language advice to write health material at or below a 6th-to-8th grade level).

/** Syllables in one English word, estimated from vowel groups. Never less than 1. */
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "")
  if (!w) return 0
  if (w.length <= 3) return 1
  const trimmed = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, "").replace(/^y/, "")
  return Math.max(1, (trimmed.match(/[aeiouy]{1,2}/g) ?? []).length)
}

/** Flesch-Kincaid grade for a block of text. Numbers and symbols are not counted as words. */
export function gradeLevel(text: string): number {
  const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) ?? []).length)
  const words = text.split(/\s+/).filter((token) => /[a-z]/i.test(token))
  if (!words.length) return 0
  const syllableCount = words.reduce((sum, word) => sum + syllables(word), 0)
  return 0.39 * (words.length / sentences) + 11.8 * (syllableCount / words.length) - 15.59
}

/** Grade level for a list of short lines (steps, tips). Each line counts as its own sentence. */
export function gradeLevelOfLines(lines: readonly string[]): number {
  return gradeLevel(lines.map((line) => (/[.!?…]$/.test(line.trim()) ? line.trim() : `${line.trim()}.`)).join(" "))
}
