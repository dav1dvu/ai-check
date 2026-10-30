/**
 * Automated Test Suite: Scientific Benchmark & Accuracy Verification
 * 
 * Verifies core empirical and scientific criteria:
 * 1. False Positive Rate (FPR) on Human & ESL writing is <= 2.0% (Zero-tolerance on ESL bias).
 * 2. Recall on Pure AI Slop is >= 95.0%.
 * 3. Layer 1 execution latency for 10,000 words is strictly < 50ms.
 * 4. Hybrid texts reliably trigger slop trajectory warnings.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GOLDEN_DATASET } from './fixtures/golden-dataset';
import { runFastAlgorithmicEvaluation } from '../src/lib/algorithms';

describe('Scientific Accuracy & Benchmark Test Suite', () => {
  // ---------------------------------------------------------------------------
  // 1. False Positive Rate (FPR) on Human & ESL Cohorts
  // ---------------------------------------------------------------------------
  describe('False Positive Rate (FPR) Verification', () => {
    test('guarantees FPR <= 2.0% across combined Human and ESL cohorts (16 samples)', () => {
      const humanCohort = GOLDEN_DATASET.filter(
        (s) => s.category === 'human' || s.category === 'human_esl'
      );
      assert.equal(humanCohort.length, 16, 'Should contain exactly 16 human & ESL samples');

      let falsePositives = 0;
      let trueNegatives = 0;

      for (const sample of humanCohort) {
        const result = runFastAlgorithmicEvaluation(sample.text, sample.language);
        const score = result.metrics.heuristicAiScore;

        // An AI classification threshold of >= 50
        if (score >= 50) {
          falsePositives++;
        } else {
          trueNegatives++;
        }

        // None of the human/ESL samples should be flagged as likely_ai or highly_synthetic
        assert.ok(
          score < 35,
          `Human sample "${sample.id}" received an unexpectedly high AI score: ${score}`
        );
      }

      const totalNegatives = falsePositives + trueNegatives;
      const fpr = falsePositives / totalNegatives;

      assert.equal(falsePositives, 0, 'Must have zero false positives');
      assert.ok(
        fpr <= 0.02,
        `False Positive Rate must be <= 2.0%, but was ${(fpr * 100).toFixed(2)}%`
      );
    });

    test('specifically validates 0% FPR on non-native ESL/EFL student writing (Stanford Guardrail)', () => {
      const eslCohort = GOLDEN_DATASET.filter((s) => s.category === 'human_esl');
      assert.equal(eslCohort.length, 8, 'Should contain 8 ESL/EFL student samples');

      for (const sample of eslCohort) {
        const result = runFastAlgorithmicEvaluation(sample.text, sample.language);
        const score = result.metrics.heuristicAiScore;

        // ESL texts should never trigger AI clichés (markerCount === 0)
        assert.equal(
          result.metrics.heuristics.markerCount,
          0,
          `ESL text "${sample.id}" unexpectedly triggered AI heuristic markers`
        );

        // Score must stay comfortably within human territory (< 30)
        assert.ok(
          score < 30,
          `ESL student text "${sample.id}" flagged too high: ${score} (must be < 30)`
        );
      }
    });

    test('specifically validates 0% FPR on pure human journalism and literature', () => {
      const pureHuman = GOLDEN_DATASET.filter((s) => s.category === 'human');
      assert.equal(pureHuman.length, 8);

      for (const sample of pureHuman) {
        const result = runFastAlgorithmicEvaluation(sample.text, sample.language);
        assert.ok(
          result.metrics.heuristicAiScore < 30,
          `Pure human sample "${sample.id}" scored too high: ${result.metrics.heuristicAiScore}`
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Recall & Sensitivity on Pure AI Slop
  // ---------------------------------------------------------------------------
  describe('Recall & Sensitivity on Pure AI Slop', () => {
    test('guarantees Recall >= 95.0% on pure AI Slop cohort (8 samples)', () => {
      const aiCohort = GOLDEN_DATASET.filter((s) => s.category === 'ai_slop');
      assert.equal(aiCohort.length, 8, 'Should contain 8 AI slop samples');

      let truePositives = 0;
      let falseNegatives = 0;

      for (const sample of aiCohort) {
        const result = runFastAlgorithmicEvaluation(sample.text, sample.language);
        const score = result.metrics.heuristicAiScore;

        if (score >= 60) {
          truePositives++;
        } else {
          falseNegatives++;
        }

        // Each AI Slop text must trigger at least 5 heuristic markers
        assert.ok(
          result.metrics.heuristics.markerCount >= 5,
          `AI sample "${sample.id}" failed to detect sufficient markers (got ${result.metrics.heuristics.markerCount})`
        );

        // Score must be clearly in the AI territory (>= 70)
        assert.ok(
          score >= 70,
          `AI sample "${sample.id}" scored too low: ${score} (must be >= 70)`
        );
      }

      const recall = truePositives / (truePositives + falseNegatives);
      assert.equal(falseNegatives, 0, 'Must have zero false negatives on pure slop');
      assert.ok(
        recall >= 0.95,
        `Recall must be >= 95.0%, but was ${(recall * 100).toFixed(2)}%`
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Hybrid Slop Trajectory Sensitivity
  // ---------------------------------------------------------------------------
  describe('Hybrid Slop Trajectory Sensitivity', () => {
    test('accurately identifies AI markers in hybrid texts and flags them as mixed/ai (>= 50)', () => {
      const hybridCohort = GOLDEN_DATASET.filter((s) => s.category === 'hybrid');
      assert.equal(hybridCohort.length, 4, 'Should contain 4 hybrid samples');

      for (const sample of hybridCohort) {
        const result = runFastAlgorithmicEvaluation(sample.text, sample.language);
        const score = result.metrics.heuristicAiScore;

        // Must detect the formulaic hooks and summaries (at least 3 markers)
        assert.ok(
          result.metrics.heuristics.markerCount >= 3,
          `Hybrid text "${sample.id}" missed boundary markers (got ${result.metrics.heuristics.markerCount})`
        );

        // Score must reflect the presence of synthetic parts (>= 50)
        assert.ok(
          score >= 50,
          `Hybrid text "${sample.id}" was not flagged as mixed/synthetic (score: ${score})`
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Latency Verification for Large Documents (10,000 Words)
  // ---------------------------------------------------------------------------
  describe('Large Document Latency Verification', () => {
    test('guarantees Layer 1 execution time for 10,000 words is strictly < 50ms', () => {
      const seedParagraph = `Trong thời đại số 4.0 phát triển vượt bậc hiện nay, công nghệ trí tuệ nhân tạo đóng vai trò quan trọng và là chiếc cầu nối thiết yếu giữa con người và tri thức. Không thể không nhắc đến những đột phá mang tính cách mạng, tạo tiền đề cho sự chuyển dịch toàn diện của xã hội. Bức tranh chuyển đổi số tựa như một bức tranh đa sắc màu, phản ánh sự kết hợp hoàn hảo giữa thuật toán hiện đại và con người. Dù vẫn còn đặt ra một dấu hỏi lớn, công nghệ này vẫn là bệ phóng vững chắc. `;

      // Repeat to create a document of approximately 10,000 words
      const text10k = seedParagraph.repeat(97);
      const wordCount = text10k.split(/\s+/).filter(Boolean).length;
      assert.ok(wordCount >= 9500 && wordCount <= 10500, `Word count should be ~10k, got ${wordCount}`);

      // Warm-up runs to ensure V8 TurboFan optimization
      for (let i = 0; i < 2; i++) {
        runFastAlgorithmicEvaluation(text10k, 'vi');
      }

      // Benchmark timed run (best of 3 to eliminate CI/concurrent worker scheduler noise)
      let minElapsedMs = Infinity;
      let result: ReturnType<typeof runFastAlgorithmicEvaluation> | null = null;
      for (let i = 0; i < 3; i++) {
        const startTime = performance.now();
        const res = runFastAlgorithmicEvaluation(text10k, 'vi');
        const elapsedMs = performance.now() - startTime;
        if (elapsedMs < minElapsedMs) {
          minElapsedMs = elapsedMs;
          result = res;
        }
      }

      assert.ok(
        minElapsedMs < 50,
        `10,000-word Layer 1 processing must complete in < 50ms, took ${minElapsedMs.toFixed(2)}ms`
      );
      assert.ok(result!.metrics.computedInMs < 50);
      assert.ok(result!.metrics.burstiness.sentenceCount > 200);
      assert.ok(result!.metrics.fingerprint.fingerprintsCount > 100);
      assert.ok(result!.metrics.heuristics.markerCount > 0);
    });
  });
});
