/**
 * Client-side Plain Text and Markdown Parser (.txt, .md)
 */

import { ParsedDocument } from '@/types/analysis';
import { normalizeText } from '@/lib/algorithms/normalizer';

export async function parseTextFile(file: File): Promise<ParsedDocument> {
  try {
    const rawText = await file.text();
    const extension = file.name.split('.').pop()?.toLowerCase();
    const fileType = extension === 'md' ? 'md' : 'txt';

    // Strip markdown formatting symbols for clean linguistic evaluation if it's md
    let cleaned = normalizeText(rawText);
    if (fileType === 'md') {
      // Remove code blocks, image links, headers syntax for plain linguistic metrics
      cleaned = cleaned
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
        .replace(/#{1,6}\s+/g, '')
        .trim();
      cleaned = normalizeText(cleaned);
    }

    const words = cleaned.split(/\s+/).filter(Boolean);

    return {
      fileName: file.name,
      fileSize: file.size,
      fileType,
      rawText,
      cleanedText: cleaned,
      wordCount: words.length,
      charCount: cleaned.length,
      extractedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse text file';
    throw new Error(`Text Parser Error: ${message}`);
  }
}
