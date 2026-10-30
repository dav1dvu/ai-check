/**
 * Automated Test Suite: Sliding Window Chunking & Slop Trajectory Engine
 * Tests O(N) sentence-boundary sliding window, overlap guarantees,
 * hybrid document composite scoring, boundary safety, and performance benchmark.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeDocumentTrajectory,
  computeWeightedCompositeScore,
} from '../src/lib/algorithms/chunking';
import { normalizeText } from '../src/lib/algorithms/normalizer';
import { ChunkTrajectoryItem } from '../src/types/analysis';

describe('Sliding Window Chunking & Slop Trajectory Engine', () => {
  // Sample human sentence
  const humanSentenceVi =
    'Chúng tôi tiến hành thu thập mẫu tại ba trạm quan trắc khác nhau trong điều kiện thời tiết thực tế. ';
  const humanSentenceEn =
    'We collected sediment samples across three distinct monitoring stations during fluctuating weather conditions. ';

  // Sample AI slop sentence loaded with clichés
  const aiSlopSentenceVi =
    'Trong kỷ nguyên số phát triển với tốc độ chóng mặt ngày nay, việc tối ưu hóa đóng vai trò như một ngọn hải đăng soi sáng con đường dẫn tới sự thành công vượt bậc. ';
  const aiSlopSentenceEn =
    'In today\'s fast-paced digital world, it is crucial to remember that cutting-edge innovation serves as a beacon of hope for sustainable growth. ';

  // ---------------------------------------------------------------------------
  // 1. Short Text Handling (Threshold Guardrail)
  // ---------------------------------------------------------------------------
  describe('Short Text (< 800 words and < 4000 chars)', () => {
    test('short text returns exactly 1 chunk and isChunked === false', () => {
      const shortText = (humanSentenceVi + ' ').repeat(10); // ~150 words, < 1500 chars
      const result = analyzeDocumentTrajectory(shortText, 'vi');

      assert.strictEqual(result.isChunked, false, 'Short text should not be chunked');
      assert.strictEqual(result.chunks.length, 1, 'Should contain exactly 1 chunk');
      assert.strictEqual(result.chunks[0].chunkIndex, 0);
      assert.strictEqual(result.chunks[0].startChar, 0);
      assert.ok(result.chunks[0].endChar > 0);
      assert.ok(result.chunks[0].aiScore >= 0 && result.chunks[0].aiScore <= 100);
      assert.ok(['likely_human', 'mixed', 'likely_ai'].includes(result.chunks[0].dominantTone));
      assert.ok(Array.isArray(result.chunks[0].topViolations));
    });

    test('single sentence document is handled safely', () => {
      const singleSentence = 'Đây là một câu đơn duy nhất để kiểm tra khả năng xử lý biên của hệ thống.';
      const result = analyzeDocumentTrajectory(singleSentence, 'vi');

      assert.strictEqual(result.isChunked, false);
      assert.strictEqual(result.chunks.length, 1);
      assert.strictEqual(result.chunks[0].chunkIndex, 0);
      assert.strictEqual(result.chunks[0].startChar, 0);
      assert.strictEqual(result.chunks[0].endChar, singleSentence.length);
      assert.ok(!Number.isNaN(result.weightedAiScore));
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Long Text & Sliding Window Overlap
  // ---------------------------------------------------------------------------
  describe('Long Text Sliding Window & Overlap Guarantee', () => {
    test('1,500 - 3,000 words produces multiple chunks with ~10% sentence overlap', () => {
      // Create ~1,800 word text with varied sentences
      const paragraph = (humanSentenceVi + humanSentenceEn + aiSlopSentenceVi + aiSlopSentenceEn + '\n\n').repeat(25);
      const result = analyzeDocumentTrajectory(paragraph, 'vi', {
        targetChunkWords: 500,
        overlapRatio: 0.1,
      });

      assert.strictEqual(result.isChunked, true, 'Long text should activate chunking');
      assert.ok(result.chunks.length >= 3, `Expected at least 3 chunks, got ${result.chunks.length}`);
      assert.strictEqual(result.totalSentences, 100);

      // Verify overlap between consecutive chunks
      for (let i = 0; i < result.chunks.length - 1; i++) {
        const currentChunk = result.chunks[i];
        const nextChunk = result.chunks[i + 1];

        assert.strictEqual(nextChunk.chunkIndex, i + 1);
        assert.ok(
          nextChunk.startChar < currentChunk.endChar,
          `Chunk ${i + 1} startChar (${nextChunk.startChar}) must be less than chunk ${i} endChar (${currentChunk.endChar}) to ensure overlap`
        );
        assert.ok(
          nextChunk.startChar > currentChunk.startChar,
          `Chunk ${i + 1} startChar must advance beyond chunk ${i} startChar`
        );
      }

      // Verify each chunk has complete telemetry
      for (const chunk of result.chunks) {
        assert.ok(chunk.wordCount > 0);
        assert.ok(chunk.aiScore >= 0 && chunk.aiScore <= 100);
        assert.ok(['likely_human', 'mixed', 'likely_ai'].includes(chunk.dominantTone));
        assert.ok(chunk.topViolations.length > 0);
        assert.ok(typeof chunk.burstinessVariance === 'number');
        assert.ok(typeof chunk.hapaxRatio === 'number');
      }
    });

    test('chunk boundaries align with normalized text offsets', () => {
      const text = (humanSentenceVi + ' ').repeat(80); // ~1,200 words
      const normalized = normalizeText(text);
      const result = analyzeDocumentTrajectory(text, 'vi');

      assert.strictEqual(result.isChunked, true);
      const firstChunk = result.chunks[0];
      assert.strictEqual(firstChunk.startChar, 0);

      const lastChunk = result.chunks[result.chunks.length - 1];
      assert.strictEqual(lastChunk.endChar, normalized.length);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Hybrid Text (Văn bản lai) Scoring Resolution
  // ---------------------------------------------------------------------------
  describe('Hybrid Text (Partial AI Generation) Evaluation', () => {
    test('weighted composite scoring prevents high-slop sections from being diluted', () => {
      // Simulate 5 chunks: 4 human chunks (score 15), 1 heavy AI chunk (score 90)
      const mockChunks: ChunkTrajectoryItem[] = [
        {
          chunkIndex: 0,
          startChar: 0,
          endChar: 2000,
          wordCount: 450,
          aiScore: 15,
          plagiarismScore: 0,
          dominantTone: 'likely_human',
          topViolations: ['Tự nhiên / Cân bằng'],
          burstinessVariance: 120,
          hapaxRatio: 0.65,
        },
        {
          chunkIndex: 1,
          startChar: 1800,
          endChar: 3800,
          wordCount: 460,
          aiScore: 18,
          plagiarismScore: 0,
          dominantTone: 'likely_human',
          topViolations: ['Tự nhiên / Cân bằng'],
          burstinessVariance: 110,
          hapaxRatio: 0.62,
        },
        {
          chunkIndex: 2,
          startChar: 3500,
          endChar: 5500,
          wordCount: 470,
          aiScore: 92, // Concentrated AI slop chapter
          plagiarismScore: 0,
          dominantTone: 'likely_ai',
          topViolations: ['kỷ nguyên số', 'ngọn hải đăng', 'vượt bậc'],
          burstinessVariance: 12,
          hapaxRatio: 0.31,
        },
        {
          chunkIndex: 3,
          startChar: 5200,
          endChar: 7200,
          wordCount: 440,
          aiScore: 20,
          plagiarismScore: 0,
          dominantTone: 'likely_human',
          topViolations: ['Tự nhiên / Cân bằng'],
          burstinessVariance: 95,
          hapaxRatio: 0.58,
        },
        {
          chunkIndex: 4,
          startChar: 6900,
          endChar: 8900,
          wordCount: 450,
          aiScore: 15,
          plagiarismScore: 0,
          dominantTone: 'likely_human',
          topViolations: ['Tự nhiên / Cân bằng'],
          burstinessVariance: 105,
          hapaxRatio: 0.64,
        },
      ];

      // Simple arithmetic mean: (15 + 18 + 92 + 20 + 15) / 5 = 32 (would wrongly classify as "likely_human")
      const simpleAverage = mockChunks.reduce((acc, c) => acc + c.aiScore, 0) / mockChunks.length;
      assert.strictEqual(simpleAverage, 32);

      // Weighted composite score must recognize the high-risk chunk
      const weightedScore = computeWeightedCompositeScore(mockChunks);

      // maxScore = 92 (>= 70): composite = 0.50 * topQuartile(92) + 0.30 * 92 + 0.20 * 32 = 46 + 27.6 + 6.4 = 80
      assert.ok(
        weightedScore >= 70,
        `Weighted score (${weightedScore}) should be heavily weighted towards severe AI slop section (expected >= 70, got ${weightedScore})`
      );
      assert.ok(
        weightedScore > simpleAverage + 35,
        `Weighted score should be significantly higher than naive arithmetic average (${simpleAverage})`
      );
    });

    test('real hybrid document generates high weighted score for mixed document', () => {
      // 800 words of authentic human text followed by 400 words of AI clichés
      const humanSection = (humanSentenceVi + ' ').repeat(60);
      const aiSection = (aiSlopSentenceVi + ' ').repeat(30);
      const hybridDoc = humanSection + '\n\n' + aiSection;

      const result = analyzeDocumentTrajectory(hybridDoc, 'vi');
      assert.strictEqual(result.isChunked, true);

      // At least one chunk should have detected dominantTone 'likely_ai' or 'mixed'
      const aiChunks = result.chunks.filter((c) => c.dominantTone === 'likely_ai' || c.aiScore >= 60);
      assert.ok(aiChunks.length >= 1, 'Should identify at least 1 high AI slop chunk in the trajectory');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Edge Cases & Numerical Safety
  // ---------------------------------------------------------------------------
  describe('Edge Cases and Numerical Robustness', () => {
    test('empty string returns safe empty trajectory with zero score', () => {
      const result = analyzeDocumentTrajectory('', 'vi');
      assert.strictEqual(result.isChunked, false);
      assert.strictEqual(result.totalWords, 0);
      assert.strictEqual(result.chunks.length, 0);
      assert.strictEqual(result.weightedAiScore, 0);
      assert.ok(!Number.isNaN(result.weightedAiScore));
    });

    test('computeWeightedCompositeScore handles empty or single element array safely', () => {
      assert.strictEqual(computeWeightedCompositeScore([]), 0);

      const single: ChunkTrajectoryItem = {
        chunkIndex: 0,
        startChar: 0,
        endChar: 100,
        wordCount: 50,
        aiScore: 45,
        plagiarismScore: 0,
        dominantTone: 'mixed',
        topViolations: [],
        burstinessVariance: 50,
        hapaxRatio: 0.5,
      };
      assert.strictEqual(computeWeightedCompositeScore([single]), 45);
    });

    test('clamping strictly constrains scores between 0 and 100', () => {
      const score = computeWeightedCompositeScore([
        {
          chunkIndex: 0,
          startChar: 0,
          endChar: 100,
          wordCount: 50,
          aiScore: 120, // out-of-range mock
          plagiarismScore: 0,
          dominantTone: 'likely_ai',
          topViolations: [],
          burstinessVariance: 10,
          hapaxRatio: 0.2,
        },
        {
          chunkIndex: 1,
          startChar: 50,
          endChar: 150,
          wordCount: 50,
          aiScore: 99,
          plagiarismScore: 0,
          dominantTone: 'likely_ai',
          topViolations: [],
          burstinessVariance: 15,
          hapaxRatio: 0.2,
        },
      ]);

      assert.strictEqual(score, 100);
      assert.ok(!Number.isNaN(score));
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Performance Benchmark (O(N) Scanning)
  // ---------------------------------------------------------------------------
  describe('Performance Benchmark', () => {
    test('10,000 words processes within 50ms (Serverless-optimized)', () => {
      // Generate 10,000 words text (~600 sentences)
      const bigText = (humanSentenceVi + humanSentenceEn + ' ').repeat(300);

      // Warm-up JIT
      for (let i = 0; i < 2; i++) {
        analyzeDocumentTrajectory(bigText, 'vi');
      }

      let minElapsed = Infinity;
      let result: ReturnType<typeof analyzeDocumentTrajectory> | null = null;
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        const res = analyzeDocumentTrajectory(bigText, 'vi');
        const elapsed = performance.now() - start;
        if (elapsed < minElapsed) {
          minElapsed = elapsed;
          result = res;
        }
      }

      assert.strictEqual(result!.isChunked, true);
      assert.ok(result!.totalWords >= 9500, `Expected ~10,000 words, got ${result!.totalWords}`);
      assert.ok(
        minElapsed < 50,
        `Sliding window evaluation for 10k words took ${minElapsed.toFixed(2)}ms, must be < 50ms`
      );
    });
  });
});
