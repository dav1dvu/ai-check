/**
 * Automated Test Suite: API Route Handler (/api/analyze)
 * Tests all 4 core scenarios and edge cases:
 * - Ca 1: Normal text (VI & EN) -> HTTP 200, full DTO schema
 * - Ca 2: Text too short (< 30 chars) -> HTTP 400 (TEXT_TOO_SHORT)
 * - Ca 3: Text too long (> 50,000 chars) -> HTTP 400 (TEXT_TOO_LONG)
 * - Ca 4: Empty input or invalid types -> HTTP 400 (INVALID_INPUT)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST, maxDuration, dynamic } from '../src/app/api/analyze/route';
import { AnalyzeResponseDto } from '../src/types/analysis';

describe('Route Handler /api/analyze Integration Tests', () => {
  // ---------------------------------------------------------------------------
  // Vercel Serverless Configuration Checks
  // ---------------------------------------------------------------------------
  describe('Serverless Deployment Configuration', () => {
    test('declares maxDuration = 60 for Vercel Serverless runtime', () => {
      assert.equal(maxDuration, 60, 'maxDuration must be explicitly set to 60 seconds');
    });

    test('declares dynamic = "force-dynamic" to prevent static caching', () => {
      assert.equal(dynamic, 'force-dynamic', 'Route must be force-dynamic');
    });
  });

  // ---------------------------------------------------------------------------
  // Ca 1: Normal Text (VI & EN) -> HTTP 200 & Complete DTO
  // ---------------------------------------------------------------------------
  describe('Ca 1: Normal Text Analysis (VI & EN)', () => {
    test('processes Vietnamese normal text and returns HTTP 200 with complete DTO fields', async () => {
      const viText = `Trong kỷ nguyên số hóa 4.0 phát triển vượt bậc hiện nay, không thể phủ nhận rằng công nghệ trí tuệ nhân tạo đóng vai trò quan trọng và là chiếc cầu nối thiết yếu giữa con người và tri thức. Không thể không nhắc đến những đột phá mang tính cách mạng, tạo tiền đề cho sự chuyển dịch toàn diện của xã hội.`;

      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: viText,
          language: 'vi',
          options: {
            checkAiSlop: true,
            checkPlagiarism: true,
            enableGrounding: false, // Layer 1 fast evaluation guaranteed
          },
        }),
      });

      const res = await POST(req);
      assert.equal(res.status, 200);

      const json = (await res.json()) as AnalyzeResponseDto;
      assert.equal(json.success, true);
      assert.ok(json.data, 'Data object must exist');

      const data = json.data;
      assert.ok(data.id, 'Must contain unique ID');
      assert.equal(data.language, 'vi');
      assert.ok(data.wordCount > 0);
      assert.ok(data.characterCount > 0);
      assert.ok(data.sentenceCount > 0);
      assert.ok(typeof data.aiSlopScore === 'number');
      assert.ok(typeof data.plagiarismScore === 'number');
      assert.ok(typeof data.humanAuthenticityScore === 'number');
      assert.ok(['highly_synthetic', 'likely_ai', 'mixed_or_edited', 'likely_human'].includes(data.aiVerdict));
      assert.ok(['heavy_plagiarism', 'moderate_plagiarism', 'minor_overlaps', 'original'].includes(data.plagiarismVerdict));
      assert.ok(data.breakdown.rhythmAndEntropy);
      assert.ok(data.breakdown.fluffAndFormulas);
      assert.ok(data.breakdown.reasoningDepth);
      assert.ok(data.breakdown.attributionIntegrity);
      assert.ok(Array.isArray(data.segments));
      assert.ok(data.timing.totalMs >= 0);
      assert.ok(data.timing.layer1Ms >= 0);
    });

    test('processes English normal text and returns HTTP 200 with complete DTO fields', async () => {
      const enText = `In today's fast-paced digital landscape, it is imperative that we delve into the intricacies of generative artificial intelligence. This paradigm shift stands as a testament to relentless technological innovation, acting as a beacon of hope for solving complex global challenges.`;

      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: enText,
          language: 'en',
          options: {
            enableGrounding: false,
          },
        }),
      });

      const res = await POST(req);
      assert.equal(res.status, 200);

      const json = (await res.json()) as AnalyzeResponseDto;
      assert.equal(json.success, true);
      assert.ok(json.data);
      assert.equal(json.data.language, 'en');
      assert.ok(json.data.wordCount > 0);
      assert.ok(json.data.sentenceCount > 0);
      assert.ok(json.data.segments.length > 0, 'Should detect heuristic markers in EN slop sample');
    });
  });

  // ---------------------------------------------------------------------------
  // Ca 2: Text Too Short (< 30 characters) -> HTTP 400 (TEXT_TOO_SHORT)
  // ---------------------------------------------------------------------------
  describe('Ca 2: Text Too Short Validation', () => {
    test('returns HTTP 400 TEXT_TOO_SHORT when text length is < 30 characters', async () => {
      const shortText = 'Văn bản quá ngắn.'; // 17 characters

      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: shortText,
        }),
      });

      const res = await POST(req);
      assert.equal(res.status, 400);

      const json = (await res.json()) as AnalyzeResponseDto;
      assert.equal(json.success, false);
      assert.equal(json.error?.code, 'TEXT_TOO_SHORT');
      assert.ok(json.error?.message.includes('30 ký tự'));
    });

    test('returns HTTP 400 TEXT_TOO_SHORT on boundary: 29 characters', async () => {
      const boundaryText = '12345678901234567890123456789'; // exactly 29 characters

      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: boundaryText,
        }),
      });

      const res = await POST(req);
      assert.equal(res.status, 400);

      const json = (await res.json()) as AnalyzeResponseDto;
      assert.equal(json.error?.code, 'TEXT_TOO_SHORT');
    });
  });

  // ---------------------------------------------------------------------------
  // Ca 3: Text Too Long (> 50,000 characters) -> HTTP 400 (TEXT_TOO_LONG)
  // ---------------------------------------------------------------------------
  describe('Ca 3: Text Too Long Validation', () => {
    test('returns HTTP 400 TEXT_TOO_LONG when text length exceeds 50,000 characters', async () => {
      const hugeText = 'a'.repeat(50001);

      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: hugeText,
        }),
      });

      const res = await POST(req);
      assert.equal(res.status, 400);

      const json = (await res.json()) as AnalyzeResponseDto;
      assert.equal(json.success, false);
      assert.equal(json.error?.code, 'TEXT_TOO_LONG');
      assert.ok(json.error?.message.includes('50,000 ký tự'));
    });
  });

  // ---------------------------------------------------------------------------
  // Ca 4: Empty Input or Invalid Data Type -> HTTP 400 (INVALID_INPUT)
  // ---------------------------------------------------------------------------
  describe('Ca 4: Empty Input or Wrong Data Type Validation', () => {
    test('returns HTTP 400 INVALID_INPUT when text field is an empty string', async () => {
      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '',
        }),
      });

      const res = await POST(req);
      assert.equal(res.status, 400);

      const json = (await res.json()) as AnalyzeResponseDto;
      assert.equal(json.success, false);
      assert.equal(json.error?.code, 'INVALID_INPUT');
    });

    test('returns HTTP 400 INVALID_INPUT when text field is whitespace-only', async () => {
      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '                     ',
        }),
      });

      const res = await POST(req);
      assert.equal(res.status, 400);

      const json = (await res.json()) as AnalyzeResponseDto;
      assert.equal(json.success, false);
      assert.equal(json.error?.code, 'INVALID_INPUT');
    });

    test('returns HTTP 400 INVALID_INPUT when text is a non-string type (number/boolean/array)', async () => {
      const reqNumber = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 123456789,
        }),
      });

      const resNumber = await POST(reqNumber);
      assert.equal(resNumber.status, 400);

      const jsonNumber = (await resNumber.json()) as AnalyzeResponseDto;
      assert.equal(jsonNumber.error?.code, 'INVALID_INPUT');

      const reqArray = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ['không', 'hợp', 'lệ'],
        }),
      });

      const resArray = await POST(reqArray);
      assert.equal(resArray.status, 400);
      const jsonArray = (await resArray.json()) as AnalyzeResponseDto;
      assert.equal(jsonArray.error?.code, 'INVALID_INPUT');
    });

    test('returns HTTP 400 INVALID_INPUT when body is empty object or missing text property', async () => {
      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      assert.equal(res.status, 400);

      const json = (await res.json()) as AnalyzeResponseDto;
      assert.equal(json.success, false);
      assert.equal(json.error?.code, 'INVALID_INPUT');
    });

    test('returns HTTP 400 INVALID_INPUT when request body contains malformed JSON syntax', async () => {
      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ malformed json: true, ',
      });

      const res = await POST(req);
      assert.equal(res.status, 400);

      const json = (await res.json()) as AnalyzeResponseDto;
      assert.equal(json.success, false);
      assert.equal(json.error?.code, 'INVALID_INPUT');
    });
  });
});
