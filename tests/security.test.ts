/**
 * Automated Security & Privacy Audit Test Suite
 * Adheres strictly to OWASP Top 10, CWE-79 (XSS), Secret Isolation,
 * and Zero Data Retention Privacy rules.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sanitizeUrl, isValidHttpUrl } from '../src/lib/security';
import { scanHeuristicMarkers } from '../src/lib/algorithms/regex-markers';

describe('Security & Privacy Audit Test Suite', () => {
  const srcDir = path.resolve(__dirname, '../src');

  function getAllFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        getAllFiles(fullPath, fileList);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  // ---------------------------------------------------------------------------
  // 1. XSS & Code Injection Prevention (CWE-79)
  // ---------------------------------------------------------------------------
  describe('XSS & Code Injection Prevention', () => {
    test('strictly forbids dangerouslySetInnerHTML and innerHTML in all frontend components', () => {
      const allSrcFiles = getAllFiles(srcDir);

      for (const file of allSrcFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relPath = path.relative(srcDir, file);

        assert.ok(
          !content.includes('dangerouslySetInnerHTML'),
          `Forbidden 'dangerouslySetInnerHTML' found in ${relPath}`
        );
        assert.ok(
          !content.includes('.innerHTML'),
          `Forbidden '.innerHTML' manipulation found in ${relPath}`
        );
        assert.ok(
          !content.includes('document.write'),
          `Forbidden 'document.write' found in ${relPath}`
        );
        assert.ok(
          !content.includes('eval('),
          `Forbidden 'eval()' found in ${relPath}`
        );
      }
    });

    test('validates URL sanitizer blocks javascript: and data: schemes', () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'JAVASCRIPT:alert(document.cookie)',
        'javascript://%0aalert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox("xss")',
        '   javascript:alert(1)  ',
        'file:///etc/passwd',
      ];

      for (const url of maliciousUrls) {
        assert.equal(
          sanitizeUrl(url),
          null,
          `Failed to block dangerous protocol in: ${url}`
        );
        assert.equal(
          isValidHttpUrl(url),
          false,
          `isValidHttpUrl must return false for: ${url}`
        );
      }

      // Valid protocols permitted
      assert.equal(sanitizeUrl('https://example.com/article'), 'https://example.com/article');
      assert.equal(sanitizeUrl('http://sub.domain.org/path?q=1'), 'http://sub.domain.org/path?q=1');
      assert.equal(isValidHttpUrl('https://example.com'), true);
    });

    test('malicious script tags in user input are safely segmented as plain text strings', () => {
      const xssInput = `
        <script>alert('XSS_ATTACK');</script>
        Trong thời đại số 4.0 phát triển vượt bậc hiện nay, <img src=x onerror=alert(1)> là chiếc cầu nối.
        <svg/onload=alert('svg')>
      `;

      const { segments } = scanHeuristicMarkers(xssInput, 'vi');

      // The algorithmic scanner operates strictly on character indices and string slices.
      // Slices never parse or execute HTML.
      assert.ok(segments.length > 0);
      for (const seg of segments) {
        assert.ok(typeof seg.textSnippet === 'string');
        assert.ok(seg.startOffset >= 0);
        assert.ok(seg.endOffset <= xssInput.length);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Secret Isolation Audit (Zero Client-Side Leaks)
  // ---------------------------------------------------------------------------
  describe('Secret Isolation Audit', () => {
    test('guarantees client bundle (src/components/ and src/lib/parsers/) NEVER accesses GEMINI_API_KEY', () => {
      const clientDirs = [
        path.join(srcDir, 'components'),
        path.join(srcDir, 'lib/parsers'),
      ];

      for (const dir of clientDirs) {
        const files = getAllFiles(dir);
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8');
          const relPath = path.relative(srcDir, file);

          assert.ok(
            !content.includes('GEMINI_API_KEY'),
            `Security Breach: GEMINI_API_KEY detected in client file: ${relPath}`
          );
        }
      }
    });

    test('guarantees NO file in src/ uses NEXT_PUBLIC_ for API secrets', () => {
      const allSrcFiles = getAllFiles(srcDir);

      for (const file of allSrcFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relPath = path.relative(srcDir, file);

        assert.ok(
          !content.includes('NEXT_PUBLIC_GEMINI'),
          `Security Breach: NEXT_PUBLIC_GEMINI found in ${relPath}`
        );
        assert.ok(
          !content.includes('NEXT_PUBLIC_API_KEY'),
          `Security Breach: NEXT_PUBLIC_API_KEY found in ${relPath}`
        );
      }
    });

    test('verifies GEMINI_API_KEY is isolated strictly to server-side AI service', () => {
      const allSrcFiles = getAllFiles(srcDir);
      const filesWithApiKey: string[] = [];

      for (const file of allSrcFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('GEMINI_API_KEY')) {
          filesWithApiKey.push(path.relative(srcDir, file).replace(/\\/g, '/'));
        }
      }

      // GEMINI_API_KEY should ONLY exist in src/lib/ai/gemini-service.ts
      assert.deepEqual(
        filesWithApiKey,
        ['lib/ai/gemini-service.ts'],
        'GEMINI_API_KEY must ONLY be referenced in server-side gemini-service.ts'
      );
    });

    test('.env.example does not contain live credentials', () => {
      const envExamplePath = path.resolve(__dirname, '../.env.example');
      const content = fs.readFileSync(envExamplePath, 'utf-8');

      assert.ok(!content.includes('AIza') && !content.includes('AQ' + '.'), 'Live API key found in .env.example!');
      assert.ok(content.includes('your_gemini_api_key_here') || content.includes('your-gemini-api-key-here'));
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Privacy & Stateless Execution Audit (Zero Data Retention)
  // ---------------------------------------------------------------------------
  describe('Privacy & Stateless Storage Audit', () => {
    test('confirms zero client-side persistent storage of user documents', () => {
      const allSrcFiles = getAllFiles(srcDir);

      for (const file of allSrcFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relPath = path.relative(srcDir, file);

        assert.ok(
          !content.includes('localStorage'),
          `Privacy Violation: localStorage found in ${relPath}`
        );
        assert.ok(
          !content.includes('sessionStorage'),
          `Privacy Violation: sessionStorage found in ${relPath}`
        );
        assert.ok(
          !content.includes('document.cookie'),
          `Privacy Violation: document.cookie found in ${relPath}`
        );
        assert.ok(
          !content.includes('indexedDB'),
          `Privacy Violation: indexedDB found in ${relPath}`
        );
      }
    });

    test('confirms no database client dependencies or server persistence in route handler', () => {
      const routePath = path.join(srcDir, 'app/api/analyze/route.ts');
      const content = fs.readFileSync(routePath, 'utf-8');

      assert.ok(!content.includes('prisma'), 'Database client (prisma) forbidden');
      assert.ok(!content.includes('mongoose'), 'Database client (mongoose) forbidden');
      assert.ok(!content.includes('drizzle'), 'Database client (drizzle) forbidden');
      assert.ok(!content.includes('fs.writeFile'), 'Server file persistence forbidden');
    });
  });
});
