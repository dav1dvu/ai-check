/**
 * Client Document Parsers Dispatcher
 * Dispatches file parsing to client-side DOCX, PDF, TXT, or MD handlers.
 */

import { ParsedDocument } from '@/types/analysis';
import { parseDocxFile } from './docx-parser';
import { parsePdfFile } from './pdf-parser';
import { parseTextFile } from './text-parser';

export * from './docx-parser';
export * from './pdf-parser';
export * from './text-parser';

export const SUPPORTED_EXTENSIONS = ['.docx', '.pdf', '.txt', '.md'] as const;

export async function parseDocumentFile(file: File): Promise<ParsedDocument> {
  const extension = '.' + (file.name.split('.').pop()?.toLowerCase() || '');

  switch (extension) {
    case '.docx':
      return parseDocxFile(file);
    case '.pdf':
      return parsePdfFile(file);
    case '.txt':
    case '.md':
      return parseTextFile(file);
    default:
      throw new Error(
        `Unsupported file type: ${extension}. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`
      );
  }
}
