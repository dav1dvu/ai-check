/**
 * Automated Test Suite: One-Click De-slop & Multi-Tone Rewriter (/api/rewrite)
 * Tests all core scenarios and edge cases:
 * - Serverless Configuration (maxDuration = 15, dynamic = 'force-dynamic')
 * - Normal Rewrite (VI & EN) -> HTTP 200 with 3 distinct tones (concise, narrative, academic)
 * - Validation: Sentence too short (< 5 chars) -> HTTP 400 (SENTENCE_TOO_SHORT)
 * - Validation: Sentence too long (> 1,000 chars) -> HTTP 400 (SENTENCE_TOO_LONG)
 * - Validation: Empty or invalid input types -> HTTP 400 (INVALID_INPUT)
 * - Direct unit tests for heuristic de-slop transforms
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST, maxDuration, dynamic } from '../src/app/api/rewrite/route';
import { RewriteResponseDto } from '../src/types/analysis';
import { generateHeuristicRewrites } from '../src/lib/ai/gemini-service';

describe('Route Handler /api/rewrite Integration Tests', () => {
  // ---------------------------------------------------------------------------
  // 1. Vercel Serverless Configuration
  // ---------------------------------------------------------------------------
  describe('Serverless Deployment Configuration', () => {
    test('declares maxDuration = 15 for Vercel Serverless runtime', () => {
      assert.equal(maxDuration, 15, 'maxDuration must be set to 15 seconds');
    });

    test('declares dynamic = "force-dynamic" to prevent static caching', () => {
      assert.equal(dynamic, 'force-dynamic', 'Route must be force-dynamic');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Normal Rewrite (VI & EN) -> HTTP 200 & 3 Distinct Tones
  // ---------------------------------------------------------------------------
  describe('Normal Multi-Tone Rewrites (VI & EN)', () => {
    test('rewrites Vietnamese cliché sentence and returns 3 distinct tones', async () => {
      const sentence = 'Trong thời đại số 4.0, công nghệ đóng vai trò quan trọng then chốt và là chiếc cầu nối giữa con người và máy móc.';

      const req = new NextRequest('http://localhost:3000/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence,
          context: 'Đoạn văn giới thiệu về bước tiến của trí tuệ nhân tạo.',
          language: 'vi',
          violationReason: 'Sáo ngữ AI mở đầu và cụm từ hoa mỹ rập khuôn',
        }),
      });

      const res = await POST(req);
      assert.equal(res.status, 200, 'Expected HTTP 200');

      const data: RewriteResponseDto = await res.json();
      assert.equal(data.success, true, 'Expected success = true');
      assert.ok(Array.isArray(data.options), 'Expected options array');
      assert.equal(data.options.length, 3, 'Must return exactly 3 options');

      const tones = data.options.map((o) => o.tone);
      assert.ok(tones.includes('concise'), 'Must contain concise tone');
      assert.ok(tones.includes('narrative'), 'Must contain narrative tone');
      assert.ok(tones.includes('academic'), 'Must contain academic tone');

      for (const opt of data.options) {
        assert.ok(opt.toneLabel && opt.toneLabel.length > 0, 'toneLabel must not be empty');
        assert.ok(opt.rewrittenText && opt.rewrittenText.length > 0, 'rewrittenText must not be empty');
        assert.ok(opt.rationale && opt.rationale.length > 0, 'rationale must not be empty');
        // Ensure no leftover "trong thời đại số"
        assert.ok(!opt.rewrittenText.toLowerCase().includes('trong thời đại số'), 'Must strip AI cliché');
      }
    });

    test('rewrites English cliché sentence and returns 3 distinct tones', async () => {
      const sentence = "In today's fast-paced digital world, it is crucial to delve into artificial intelligence as a testament to human ingenuity.";

      const req = new NextRequest('http://localhost:3000/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence,
          context: 'An article explaining recent advancements in modern LLMs.',
          language: 'en',
          violationReason: 'Formulaic AI introduction and overused marker words',
        }),
      });

      const res = await POST(req);
      assert.equal(res.status, 200, 'Expected HTTP 200');

      const data: RewriteResponseDto = await res.json();
      assert.equal(data.success, true, 'Expected success = true');
      assert.ok(Array.isArray(data.options), 'Expected options array');
      assert.equal(data.options.length, 3, 'Must return exactly 3 options');

      for (const opt of data.options) {
        assert.ok(opt.rewrittenText && opt.rewrittenText.length > 0);
        // Ensure cliché phrases are removed
        assert.ok(!opt.rewrittenText.toLowerCase().includes("in today's"), 'Must eliminate introductory fluff');
        assert.ok(!opt.rewrittenText.toLowerCase().includes('delve into'), 'Must eliminate delve into');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Validation & Edge Cases (HTTP 400)
  // ---------------------------------------------------------------------------
  describe('Input Validation & Edge Cases', () => {
    test('returns HTTP 400 SENTENCE_TOO_SHORT when sentence is < 5 characters', async () => {
      const req = new NextRequest('http://localhost:3000/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: 'AI.', language: 'en' }),
      });

      const res = await POST(req);
      assert.equal(res.status, 400, 'Expected HTTP 400');
      const data: RewriteResponseDto = await res.json();
      assert.equal(data.success, false);
      assert.equal(data.error?.code, 'SENTENCE_TOO_SHORT');
    });

    test('returns HTTP 400 SENTENCE_TOO_LONG when sentence exceeds 1,000 characters', async () => {
      const longSentence = 'A'.repeat(1001);
      const req = new NextRequest('http://localhost:3000/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: longSentence, language: 'en' }),
      });

      const res = await POST(req);
      assert.equal(res.status, 400, 'Expected HTTP 400');
      const data: RewriteResponseDto = await res.json();
      assert.equal(data.success, false);
      assert.equal(data.error?.code, 'SENTENCE_TOO_LONG');
    });

    test('returns HTTP 400 INVALID_INPUT when sentence is empty or missing', async () => {
      const reqEmpty = new NextRequest('http://localhost:3000/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: '   ' }),
      });

      const resEmpty = await POST(reqEmpty);
      assert.equal(resEmpty.status, 400);
      const dataEmpty: RewriteResponseDto = await resEmpty.json();
      assert.equal(dataEmpty.error?.code, 'INVALID_INPUT');

      const reqMissing = new NextRequest('http://localhost:3000/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'vi' }),
      });

      const resMissing = await POST(reqMissing);
      assert.equal(resMissing.status, 400);
      const dataMissing: RewriteResponseDto = await resMissing.json();
      assert.equal(dataMissing.error?.code, 'INVALID_INPUT');
    });

    test('returns HTTP 400 INVALID_INPUT for non-string sentence type or malformed body', async () => {
      const reqWrongType = new NextRequest('http://localhost:3000/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: 99999 }),
      });

      const resWrongType = await POST(reqWrongType);
      assert.equal(resWrongType.status, 400);
      const dataWrongType: RewriteResponseDto = await resWrongType.json();
      assert.equal(dataWrongType.error?.code, 'INVALID_INPUT');

      const reqMalformed = new NextRequest('http://localhost:3000/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not valid json',
      });

      const resMalformed = await POST(reqMalformed);
      assert.equal(resMalformed.status, 400);
      const dataMalformed: RewriteResponseDto = await resMalformed.json();
      assert.equal(dataMalformed.error?.code, 'INVALID_INPUT');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Unit Test: Heuristic Rule-Based Generator
  // ---------------------------------------------------------------------------
  describe('Unit Test: Heuristic Rule-Based Generator', () => {
    test('generates 3 valid tones for Vietnamese clichés', () => {
      const options = generateHeuristicRewrites({
        sentence: 'Trong thời đại số 4.0, không thể phủ nhận rằng công nghệ đóng vai trò quan trọng và là một bức tranh đa sắc màu.',
        language: 'vi',
      });

      assert.equal(options.length, 3);
      assert.equal(options[0].tone, 'concise');
      assert.equal(options[1].tone, 'narrative');
      assert.equal(options[2].tone, 'academic');

      assert.ok(!options[0].rewrittenText.includes('Trong thời đại số'));
      assert.ok(!options[0].rewrittenText.includes('không thể phủ nhận rằng'));
    });

    test('generates 3 valid tones for English clichés', () => {
      const options = generateHeuristicRewrites({
        sentence: "In today's digital world, it is crucial to delve into the rich tapestry of innovations.",
        language: 'en',
      });

      assert.equal(options.length, 3);
      assert.equal(options[0].tone, 'concise');
      assert.equal(options[1].tone, 'narrative');
      assert.equal(options[2].tone, 'academic');

      assert.ok(!options[0].rewrittenText.includes("In today's digital world"));
      assert.ok(!options[0].rewrittenText.includes('delve into'));
    });
  });
});
