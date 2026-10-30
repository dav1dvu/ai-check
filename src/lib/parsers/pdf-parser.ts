/**
 * Client-side PDF Parser
 * Extracts text page-by-page directly in the browser via pdfjs-dist.
 * 100% Client-side execution protects user privacy and prevents Vercel payload limit issues.
 */

import { ParsedDocument } from '@/types/analysis';
import { normalizeText } from '@/lib/algorithms/normalizer';

export async function parsePdfFile(file: File): Promise<ParsedDocument> {
  if (typeof window === 'undefined') {
    throw new Error('PDF parsing is only supported in client-side browser environments.');
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Dynamically import pdfjs-dist in the browser to avoid SSR evaluation issues
    const pdfjs = await import('pdfjs-dist');

    // Configure workerSrc using matching version from CDN
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const textPieces: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item) => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .join(' ');

      if (pageText.trim()) {
        textPieces.push(pageText.trim());
      }
    }

    const rawText = textPieces.join('\n\n');
    const cleanedText = normalizeText(rawText);
    const words = cleanedText.split(/\s+/).filter(Boolean);

    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'pdf',
      rawText,
      cleanedText,
      wordCount: words.length,
      charCount: cleanedText.length,
      extractedAt: new Date().toISOString(),
      warnings: textPieces.length === 0 ? ['No extractable text found in PDF. It might be scanned/image-only.'] : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse PDF file';
    throw new Error(`PDF Parser Error: ${message}`);
  }
}
