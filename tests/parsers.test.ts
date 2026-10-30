/**
 * Automated Test Suite: Document Parsers (.txt, .md, .docx, .pdf)
 * Tests client-side file extractors for privacy and payload safety
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTextFile,
  parseDocxFile,
  parsePdfFile,
  parseDocumentFile,
  SUPPORTED_EXTENSIONS,
} from '../src/lib/parsers';

describe('Document Parsers Module Tests', () => {
  // ---------------------------------------------------------------------------
  // 1. Plain Text (.txt) Parser
  // ---------------------------------------------------------------------------
  describe('Plain Text (.txt) Parser', () => {
    test('successfully parses standard .txt file with word and char counts', async () => {
      const sampleContent = 'Trí tuệ nhân tạo đang thay đổi thế giới hiện đại từng ngày.';
      const file = new File([sampleContent], 'document.txt', { type: 'text/plain' });

      const parsed = await parseTextFile(file);

      assert.equal(parsed.fileName, 'document.txt');
      assert.equal(parsed.fileType, 'txt');
      assert.equal(parsed.rawText, sampleContent);
      assert.equal(parsed.cleanedText, sampleContent);
      assert.equal(parsed.wordCount, 13);
      assert.equal(parsed.charCount, sampleContent.length);
      assert.ok(parsed.extractedAt);
    });

    test('handles empty or whitespace-only .txt file gracefully', async () => {
      const file = new File(['   \n\t  '], 'empty.txt', { type: 'text/plain' });
      const parsed = await parseTextFile(file);

      assert.equal(parsed.wordCount, 0);
      assert.equal(parsed.cleanedText, '');
      assert.equal(parsed.charCount, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Markdown (.md) Parser
  // ---------------------------------------------------------------------------
  describe('Markdown (.md) Parser', () => {
    test('strips markdown syntax (headers, code blocks, links, images) for linguistic evaluation', async () => {
      const mdContent = `
# Tiêu đề nghiên cứu

Đây là đoạn mở đầu với **chữ đậm** và *chữ nghiêng*.

\`\`\`python
def execute_model():
    return "ignore code block"
\`\`\`

Xem chi tiết tại [Trang chủ](https://example.com) và ảnh ![Minh họa](https://example.com/img.png).
Inline code \`const x = 10\` cũng cần loại bỏ ký tự backtick.
      `;

      const file = new File([mdContent], 'article.md', { type: 'text/markdown' });
      const parsed = await parseTextFile(file);

      assert.equal(parsed.fileName, 'article.md');
      assert.equal(parsed.fileType, 'md');

      // Code block content inside ``` should be removed
      assert.ok(!parsed.cleanedText.includes('execute_model'));
      assert.ok(!parsed.cleanedText.includes('ignore code block'));

      // Markdown links: [Trang chủ](https://example.com) -> Trang chủ
      assert.ok(parsed.cleanedText.includes('Trang chủ'));
      assert.ok(!parsed.cleanedText.includes('https://example.com'));

      // Images ![Minh họa](...) should be completely removed
      assert.ok(!parsed.cleanedText.includes('Minh họa'));

      // Header hash marks should be removed
      assert.ok(!parsed.cleanedText.includes('# Tiêu đề'));
      assert.ok(parsed.cleanedText.includes('Tiêu đề nghiên cứu'));

      // Inline backticks should be stripped
      assert.ok(!parsed.cleanedText.includes('`'));
      assert.ok(parsed.cleanedText.includes('const x = 10'));
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Word (.docx) Parser
  // ---------------------------------------------------------------------------
  describe('Word (.docx) Parser', () => {
    test('throws structured error when parsing corrupt or non-docx binary data', async () => {
      const corruptData = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xff]);
      const file = new File([corruptData], 'corrupt.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      await assert.rejects(
        async () => {
          await parseDocxFile(file);
        },
        (err: Error) => {
          assert.match(err.message, /DOCX Parser Error:/);
          return true;
        }
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 4. PDF (.pdf) Parser
  // ---------------------------------------------------------------------------
  describe('PDF (.pdf) Parser', () => {
    test('enforces client-side browser execution boundary in non-browser runtime', async () => {
      const file = new File(['%PDF-1.4 dummy pdf'], 'report.pdf', {
        type: 'application/pdf',
      });

      // In Node.js environment without window object, it must reject with clean error
      await assert.rejects(
        async () => {
          await parsePdfFile(file);
        },
        (err: Error) => {
          assert.match(
            err.message,
            /PDF parsing is only supported in client-side browser environments/
          );
          return true;
        }
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Dispatcher & Extension Validation
  // ---------------------------------------------------------------------------
  describe('Dispatcher parseDocumentFile', () => {
    test('correctly routes .txt and .md files', async () => {
      const txtFile = new File(['Nội dung kiểm thử.'], 'sample.txt', { type: 'text/plain' });
      const doc = await parseDocumentFile(txtFile);
      assert.equal(doc.fileType, 'txt');
      assert.equal(doc.cleanedText, 'Nội dung kiểm thử.');

      const mdFile = new File(['# Tiêu đề MD'], 'notes.md', { type: 'text/markdown' });
      const mdDoc = await parseDocumentFile(mdFile);
      assert.equal(mdDoc.fileType, 'md');
      assert.equal(mdDoc.cleanedText, 'Tiêu đề MD');
    });

    test('rejects unsupported extensions with helpful error message', async () => {
      const exeFile = new File(['binary payload'], 'malware.exe', {
        type: 'application/octet-stream',
      });

      await assert.rejects(
        async () => {
          await parseDocumentFile(exeFile);
        },
        (err: Error) => {
          assert.match(err.message, /Unsupported file type: \.exe/);
          assert.ok(SUPPORTED_EXTENSIONS.every((ext) => err.message.includes(ext)));
          return true;
        }
      );
    });

    test('supported extensions array contains 4 specified formats', () => {
      assert.deepEqual(Array.from(SUPPORTED_EXTENSIONS), ['.docx', '.pdf', '.txt', '.md']);
    });
  });
});
