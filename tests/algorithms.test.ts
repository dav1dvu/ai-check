/**
 * Automated Test Suite: Layer 1 Algorithmic & Linguistic Engine
 * Tests Burstiness (σ² & False-Positive Guardrail), Winnowing Fingerprinting,
 * and Heuristic AI Slop Regex Markers (Unicode boundaries & categorization).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBurstiness,
  calculateLexicalDiversity,
} from '../src/lib/algorithms/burstiness';
import {
  extractWinnowingFingerprints,
  calculateFingerprintSimilarity,
} from '../src/lib/algorithms/winnowing';
import {
  scanHeuristicMarkers,
  AI_MARKER_PATTERNS,
} from '../src/lib/algorithms/regex-markers';
import {
  runFastAlgorithmicEvaluation,
} from '../src/lib/algorithms';

describe('Layer 1 Algorithmic Engine Tests', () => {
  // ---------------------------------------------------------------------------
  // 1. Burstiness & Sentence Length Variance
  // ---------------------------------------------------------------------------
  describe('Burstiness & Variance Analysis', () => {
    test('monotonous AI sentence length patterns (low variance σ² < 40) produce high AI score', () => {
      // Sentences of virtually identical lengths (approx 20 words each)
      const aiCadenceText = `
        Công nghệ trí tuệ nhân tạo đang phát triển nhanh chóng và mang lại nhiều cơ hội mới cho mọi ngành nghề trong xã hội.
        Hệ thống học sâu giúp tối ưu hóa quy trình làm việc và nâng cao hiệu suất làm việc của toàn thể các thành viên.
        Các mô hình ngôn ngữ lớn liên tục mở rộng khả năng tiếp cận tri thức và xử lý thông tin phức tạp cho con người.
        Mọi tổ chức kinh doanh đều cần chuẩn bị nguồn lực kỹ lưỡng để chủ động nắm bắt làn sóng chuyển dịch công nghệ này.
      `;

      const metrics = calculateBurstiness(aiCadenceText);

      assert.ok(metrics.sentenceCount >= 4, 'Should identify at least 4 sentences');
      assert.ok(metrics.variance < 40, `Variance should be low (< 40), got ${metrics.variance}`);
      assert.ok(
        metrics.score >= 75,
        `Score should reflect artificial monotony (>= 75), got ${metrics.score}`
      );
    });

    test('natural human burstiness (high variance σ² > 120) produces low AI score', () => {
      // Human text: extreme contrast between punchy 3-word sentences and long complex clauses
      const humanBurstyText = `
        Đúng vậy.
        Mặc dù ban đầu toàn bộ đội ngũ kỹ sư còn rất nhiều hoài nghi về tính khả thi của dự án chuyển đổi hạ tầng đám mây phân tán sang kiến trúc microservices trên Kubernetes, nhưng sau hơn bốn tháng làm việc không ngừng nghỉ xuyên suốt các kỳ nghỉ cuối tuần và giải quyết hàng trăm sự cố nghẽn cổ chai mạng, chúng tôi đã hoàn thành mục tiêu đề ra trước thời hạn ba tuần.
        Tuyệt vời!
        Tuy nhiên chúng tôi vẫn phải theo dõi sát sao chỉ số CPU và mức tiêu thụ RAM trong đợt tải cao điểm sắp tới.
      `;

      const metrics = calculateBurstiness(humanBurstyText);

      assert.ok(metrics.variance > 120, `Variance should be high (> 120), got ${metrics.variance}`);
      assert.ok(
        metrics.score <= 25,
        `Bursty human text should have low AI score (<= 25), got ${metrics.score}`
      );
    });

    test('false-positive mitigation: authentic human short sentences (mean length < 10) are NOT penalized', () => {
      // Human short dialogue / quick notes: variance is mathematically low, but it's human
      const shortHumanDialogue = `
        Anh có ở văn phòng không?
        Tôi đang trên đường tới.
        Hẹn gặp ở sảnh nhé.
        Ok, gặp sau.
        Mang theo tài liệu luôn.
      `;

      const metrics = calculateBurstiness(shortHumanDialogue);

      assert.ok(
        metrics.meanLength < 10,
        `Mean length should be < 10 words, got ${metrics.meanLength}`
      );
      assert.ok(
        metrics.score <= 35,
        `False-positive mitigation must cap short text score <= 35, got ${metrics.score}`
      );
    });

    test('edge case: insufficient sample size (< 3 sentences) returns neutral prior 50', () => {
      const shortText = 'Chỉ có một câu duy nhất ở đây.';
      const metrics = calculateBurstiness(shortText);

      assert.equal(metrics.sentenceCount, 1);
      assert.equal(metrics.score, 50, 'Insufficient sample size should yield neutral 50');
    });

    test('edge case: empty input returns 0 count and score 50', () => {
      const metrics = calculateBurstiness('');

      assert.equal(metrics.sentenceCount, 0);
      assert.equal(metrics.variance, 0);
      assert.equal(metrics.score, 50);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Lexical Diversity (STTR & Normalized TTR)
  // ---------------------------------------------------------------------------
  describe('Lexical Diversity & Repetition', () => {
    test('computes Segmented TTR (normalizedTTR) accurately on 50+ token text', () => {
      const text = `
        Trí tuệ nhân tạo và học máy là hai lĩnh vực cốt lõi định hình tương lai công nghệ số.
        Các mô hình ngôn ngữ lớn như GPT và Claude đã chứng minh năng lực vượt trội trong việc
        xử lý ngữ nghĩa tự nhiên, lập trình phần mềm, phân tích dữ liệu và tự động hóa quy trình.
        Tuy nhiên việc triển khai thực tế đòi hỏi sự cẩn trọng về an toàn thông tin, bảo mật dữ liệu,
        và tính trung thực học thuật trong từng văn bản được tạo ra.
      `;

      const metrics = calculateLexicalDiversity(text);

      assert.ok(metrics.totalTokens >= 50, 'Tokens should be at least 50');
      assert.ok(metrics.uniqueTokens > 0);
      assert.ok(metrics.normalizedTTR > 0 && metrics.normalizedTTR <= 1);
      assert.ok(metrics.typeTokenRatio > 0 && metrics.typeTokenRatio <= 1);
    });

    test('calculates bigram repetition rate correctly for repetitive content', () => {
      const repetitiveText = 'lặp lại lặp lại lặp lại lặp lại lặp lại lặp lại lặp lại lặp lại';
      const metrics = calculateLexicalDiversity(repetitiveText);

      assert.ok(
        metrics.repetitionRate > 0.5,
        `Repetition rate should be high (> 0.5), got ${metrics.repetitionRate}`
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Winnowing Fingerprinting Algorithm
  // ---------------------------------------------------------------------------
  describe('Winnowing Fingerprinting Algorithm', () => {
    test('extracts consistent k-grams and sliding window fingerprints', () => {
      const text = 'Thuật toán Winnowing trích xuất dấu vân tay tài liệu để phát hiện trùng lặp cục bộ.';
      const result = extractWinnowingFingerprints(text, 25, 10);

      assert.equal(result.kGramSize, 25);
      assert.equal(result.windowSize, 10);
      assert.ok(result.fingerprintsCount > 0);
      assert.ok(result.sampledFingerprints.length > 0);
      assert.ok(result.sampledFingerprints.length <= 50);
    });

    test('handles input shorter than k-gram size gracefully', () => {
      const shortText = 'Quá ngắn';
      const result = extractWinnowingFingerprints(shortText, 25, 10);

      assert.equal(result.fingerprintsCount, 0);
      assert.deepEqual(result.sampledFingerprints, []);
    });

    test('calculates Jaccard fingerprint similarity accurately', () => {
      const textA = 'Nghiên cứu về giải thuật Winnowing trong việc phát hiện đạo văn học thuật.';
      const textB = 'Nghiên cứu về giải thuật Winnowing trong việc phát hiện đạo văn học thuật.';
      const textC = 'Món bún chả Hà Nội là một nét văn hóa ẩm thực truyền thống rất nổi tiếng.';

      const fpA = extractWinnowingFingerprints(textA).sampledFingerprints;
      const fpB = extractWinnowingFingerprints(textB).sampledFingerprints;
      const fpC = extractWinnowingFingerprints(textC).sampledFingerprints;

      const identicalSim = calculateFingerprintSimilarity(fpA, fpB);
      assert.equal(identicalSim, 1.0, 'Identical texts must have similarity 1.0');

      const disjointSim = calculateFingerprintSimilarity(fpA, fpC);
      assert.equal(disjointSim, 0.0, 'Completely different texts must have similarity 0.0');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Heuristic AI Slop Marker Patterns (Regex & Unicode Diacritics)
  // ---------------------------------------------------------------------------
  describe('Heuristic AI Slop Regex Markers', () => {
    test('detects all 8 required Vietnamese AI cliché markers with Unicode boundaries', () => {
      const sampleVi = `
        Trong thời đại số 4.0 hiện nay, công nghệ đóng vai trò quan trọng trong cuộc sống.
        Không thể không nhắc đến những đột phá mang tính thời đại.
        Tuy nhiên nó cũng đặt ra một dấu hỏi lớn cho các nhà quản lý.
        Dự án này là bệ phóng vững chắc cho thế hệ trẻ.
        Bức tranh công nghệ như một bức tranh đa sắc màu rực rỡ.
        Đây là sự kết hợp hoàn hảo giữa con người và thuật toán.
        Sự kiện này tạo tiền đề cho sự phát triển trong tương lai.
        Hãy cùng điểm qua những điểm sáng đáng chú ý nhất.
      `;

      const { metrics, segments } = scanHeuristicMarkers(sampleVi, 'vi');

      assert.ok(metrics.markerCount >= 8, `Expected >= 8 markers, found ${metrics.markerCount}`);

      // Verify detection of all 8 specific required phrases
      const detectedTerms = metrics.detectedMarkers.map((m) => m.term);
      assert.ok(
        detectedTerms.some((t) => t.includes('không thể không nhắc đến')),
        'Missing: không thể không nhắc đến'
      );
      assert.ok(
        detectedTerms.some((t) => t.includes('đặt ra một dấu hỏi lớn')),
        'Missing: đặt ra một dấu hỏi lớn'
      );
      assert.ok(
        detectedTerms.some((t) => t.includes('bệ phóng vững chắc')),
        'Missing: bệ phóng vững chắc'
      );
      assert.ok(
        detectedTerms.some((t) => t.includes('bức tranh đa sắc màu')),
        'Missing: như một bức tranh đa sắc màu'
      );
      assert.ok(
        detectedTerms.some((t) => t.includes('sự kết hợp hoàn hảo giữa')),
        'Missing: sự kết hợp hoàn hảo giữa...'
      );
      assert.ok(
        detectedTerms.some((t) => t.includes('tạo tiền đề cho')),
        'Missing: tạo tiền đề cho...'
      );
      assert.ok(
        detectedTerms.some((t) => t.includes('hãy cùng điểm qua')),
        'Missing: hãy cùng điểm qua...'
      );
      assert.ok(
        detectedTerms.some((t) => t.includes('thời đại số')),
        'Missing: trong thời đại số'
      );

      // Verify Unicode boundary handles diacritics: start and end offsets are positive
      assert.ok(segments.every((s) => s.startOffset >= 0 && s.endOffset > s.startOffset));
    });

    test('detects all 8 required English AI cliché markers', () => {
      const sampleEn = `
        In today's fast-paced digital world, researchers delve into the intricacies of neural networks.
        This framework acts as a beacon of hope for edge computing.
        Leaders must foster a culture of cross-disciplinary innovation.
        Therefore, it is imperative that we implement strict safeguards.
        Navigating this ever-evolving landscape requires agility.
        The system stands as a testament to engineering excellence.
        Companies must harness the power of scalable cloud architecture.
      `;

      const { metrics, segments } = scanHeuristicMarkers(sampleEn, 'en');

      assert.ok(metrics.markerCount >= 7, `Expected >= 7 markers, found ${metrics.markerCount}`);
      assert.ok(segments.length >= 7, 'Segments count should match markers');

      const detectedTerms = metrics.detectedMarkers.map((m) => m.term);
      assert.ok(
        detectedTerms.some((t) => t.includes('delve into the intricacies')),
        'Missing: delve into the intricacies'
      );
      assert.ok(
        detectedTerms.some((t) => t.includes('beacon of hope')),
        'Missing: beacon of hope'
      );
      assert.ok(
        detectedTerms.some((t) => t.includes('foster a culture of')),
        'Missing: foster a culture of'
      );
      assert.ok(
        detectedTerms.some((t) => t.includes('it is imperative that')),
        'Missing: it is imperative that'
      );
      assert.ok(
        detectedTerms.some((t) => t.includes('ever-evolving landscape')),
        'Missing: ever-evolving landscape'
      );
      assert.ok(
        detectedTerms.some((t) => t.includes('testament to')),
        'Missing: testament to'
      );
      assert.ok(
        detectedTerms.some((t) => t.includes('harness the power of')),
        'Missing: harness the power of'
      );
      assert.ok(
        detectedTerms.some((t) => t.includes("today's fast-paced")),
        "Missing: in today's fast-paced digital world"
      );
    });

    test('marker dictionary classifies patterns into 4 standard categories', () => {
      const categories = new Set(AI_MARKER_PATTERNS.map((p) => p.category));
      assert.ok(categories.has('cliche'), 'Must include cliche');
      assert.ok(categories.has('filler'), 'Must include filler');
      assert.ok(categories.has('stilted_transition'), 'Must include stilted_transition');
      assert.ok(categories.has('hedging'), 'Must include hedging');
    });

    test('every pattern includes weights between 1-5 and bilingual suggestions', () => {
      for (const pattern of AI_MARKER_PATTERNS) {
        assert.ok(
          pattern.weight >= 1 && pattern.weight <= 5,
          `Invalid weight ${pattern.weight} for ${pattern.term}`
        );
        assert.ok(pattern.suggestionVi.length > 5, `Missing VI suggestion for ${pattern.term}`);
        assert.ok(pattern.suggestionEn.length > 5, `Missing EN suggestion for ${pattern.term}`);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Composite Fast Algorithmic Evaluation (< 15ms target)
  // ---------------------------------------------------------------------------
  describe('Composite Fast Algorithmic Pipeline', () => {
    test('executes in < 50ms and produces complete metric bundle', () => {
      const text = `
        Trong thời đại số 4.0 phát triển vượt bậc hiện nay, không thể phủ nhận rằng công nghệ trí tuệ nhân tạo đóng vai trò quan trọng và là chiếc cầu nối thiết yếu.
        Không thể không nhắc đến những đột phá mang tính cách mạng, tạo tiền đề cho sự chuyển dịch toàn diện của xã hội.
        Nó tựa như một bức tranh đa sắc màu, phản ánh sự kết hợp hoàn hảo giữa thuật toán hiện đại và năng lực sáng tạo vô tận.
        Dù vẫn còn đặt ra một dấu hỏi lớn về tính an toàn đạo đức, công nghệ vẫn đóng vai trò là một bệ phóng vững chắc cho tương lai.
      `;

      // Warm-up run to JIT compile regexes
      runFastAlgorithmicEvaluation(text, 'vi');

      const result = runFastAlgorithmicEvaluation(text, 'vi');

      assert.ok(result.metrics.computedInMs < 50, `Took ${result.metrics.computedInMs}ms`);
      assert.ok(result.metrics.heuristicAiScore > 50, 'Should flag heavy slop indicators');
      assert.ok(result.segments.length > 0, 'Should extract highlight segments');
      assert.ok(result.metrics.burstiness);
      assert.ok(result.metrics.lexical);
      assert.ok(result.metrics.fingerprint);
      assert.ok(result.metrics.heuristics);
    });
  });
});
