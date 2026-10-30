/**
 * Client-side Word (.docx) Parser
 * Extracts raw textual content from DOCX files directly in the browser via mammoth.js.
 * Zero server uploads required, complying with Vercel 4.5MB payload limits and strict privacy.
 */

import { ParsedDocument } from '@/types/analysis';
import { normalizeText } from '@/lib/algorithms/normalizer';

export async function parseDocxFile(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ arrayBuffer });
    const rawText = result.value || '';
    const cleanedText = normalizeText(rawText);
    const words = cleanedText.split(/\s+/).filter(Boolean);

    const warnings = result.messages
      .filter((m) => m.type === 'warning' || m.type === 'error')
      .map((m) => m.message);

    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'docx',
      rawText,
      cleanedText,
      wordCount: words.length,
      charCount: cleanedText.length,
      extractedAt: new Date().toISOString(),
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse DOCX file';
    throw new Error(`DOCX Parser Error: ${message}`);
  }
}
