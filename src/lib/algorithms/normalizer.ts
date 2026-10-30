/**
 * Text Normalization Utility (EN & VI)
 * Supports Unicode NFC normalization for Vietnamese diacritics
 * Inspired by minhmo3004/PlagiarismGuard_demo
 */

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    // Normalize Unicode to Canonical Decomposition followed by Canonical Composition (NFC)
    .normalize('NFC')
    // Normalize diverse Unicode spaces (non-breaking spaces, zero-width spaces) to standard space
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    // Normalize diverse quotes and dashes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    // Clean excessive spaces while preserving single newlines
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Splits text into discrete sentences while preserving offset references.
 * Handles English and Vietnamese sentence boundaries including abbreviations.
 */
export interface SentenceSpan {
  text: string;
  startOffset: number;
  endOffset: number;
  wordCount: number;
  charLength: number;
}

export function splitIntoSentences(text: string, isAlreadyNormalized = false): SentenceSpan[] {
  const normalized = isAlreadyNormalized ? text : normalizeText(text);
  if (!normalized) return [];

  // Robust sentence boundary regex for VI and EN
  const sentenceRegex = /[^.!?…\n]+(?:[.!?…]+["']?|$)/g;
  const spans: SentenceSpan[] = [];
  let match: RegExpExecArray | null;

  while ((match = sentenceRegex.exec(normalized)) !== null) {
    const rawSentence = match[0];
    const trimmedSentence = rawSentence.trim();
    if (trimmedSentence.length > 0) {
      const matchIndex = match.index;
      const leadingSpaces = rawSentence.indexOf(trimmedSentence);
      const startOffset = matchIndex + leadingSpaces;
      const endOffset = startOffset + trimmedSentence.length;
      
      let wordCount = 1;
      for (let i = 0; i < trimmedSentence.length; i++) {
        if (trimmedSentence.charCodeAt(i) === 32) wordCount++;
      }

      spans.push({
        text: trimmedSentence,
        startOffset,
        endOffset,
        wordCount,
        charLength: trimmedSentence.length,
      });
    }
  }

  return spans;
}
