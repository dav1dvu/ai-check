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
  calculateStylometry,
  evaluateEslGuardrail,
} from '../src/lib/algorithms/stylometry';
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
  // 5. Advanced Stylometry (Hapax Legomena & Yule's Characteristic K)
  // ---------------------------------------------------------------------------
  describe('Advanced Stylometry & Vocabulary Richness', () => {
    test('computes Hapax Legomena Ratio (V1 / N) accurately (> 0.45 for diverse text, < 0.30 for repetitive text)', () => {
      // Diverse human text with unique, context-specific words
      const diverseHumanText = `
        Hôm qua, nhóm kỹ thuật tụi mình thức trắng đêm debug cụm Kubernetes ở trung tâm dữ liệu Viettel IDC Sóng Thần.
        Đúng 3h sáng, etcd bị mất quorum do lỗi đứt cáp quang nội bộ.
        Hậu quả là 40 service thanh toán bị nghẽn trong 18 phút.
        Cảm giác lúc đó thót tim thực sự, nhưng nhờ script failover tự động chuẩn bị từ tuần trước nên hệ thống kịp hồi phục hoàn toàn.
      `;

      const diverseMetrics = calculateStylometry(diverseHumanText);
      assert.ok(
        diverseMetrics.hapaxRatio >= 0.45,
        `Diverse human text should have hapax ratio >= 0.45, got ${diverseMetrics.hapaxRatio}`
      );

      // Repetitive AI converged text recycling same tokens
      const repetitiveText = `
        công nghệ công nghệ phát triển phát triển chuyển đổi chuyển đổi số số giải pháp giải pháp
        công nghệ công nghệ phát triển phát triển chuyển đổi chuyển đổi số số giải pháp giải pháp
        công nghệ công nghệ phát triển phát triển chuyển đổi chuyển đổi số số giải pháp giải pháp
      `;

      const repetitiveMetrics = calculateStylometry(repetitiveText);
      assert.ok(
        repetitiveMetrics.hapaxRatio < 0.30,
        `Repetitive text should have hapax ratio < 0.30, got ${repetitiveMetrics.hapaxRatio}`
      );
    });

    test('calculates Yule\'s Characteristic K accurately (low for diverse, high for repetitive)', () => {
      // Varied vocabulary: every word occurs once or twice
      const diverseText = 'The curious engineer investigated novel quantum computing algorithms across distributed clusters yesterday';
      const diverseMetrics = calculateStylometry(diverseText);
      assert.ok(
        diverseMetrics.yulesK < 100,
        `Diverse vocabulary should have low Yule's K (< 100), got ${diverseMetrics.yulesK}`
      );

      // Highly repetitive vocabulary: words repeated dozens of times
      const repetitiveText = 'data data data data model model model model test test test test pipeline pipeline pipeline pipeline';
      const repetitiveMetrics = calculateStylometry(repetitiveText);
      assert.ok(
        repetitiveMetrics.yulesK > 500,
        `Repetitive vocabulary should have high Yule's K (> 500), got ${repetitiveMetrics.yulesK}`
      );
    });

    test('handles empty and single-word inputs safely without division by zero', () => {
      const emptyMetrics = calculateStylometry('');
      assert.equal(emptyMetrics.hapaxRatio, 0);
      assert.equal(emptyMetrics.yulesK, 0);
      assert.equal(emptyMetrics.punctuationEntropy, 0);

      const singleWordMetrics = calculateStylometry('Hello');
      assert.equal(singleWordMetrics.hapaxRatio, 1.0);
      assert.equal(singleWordMetrics.yulesK, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Punctuation Cadence & Shannon Entropy
  // ---------------------------------------------------------------------------
  describe('Punctuation Cadence & Shannon Entropy', () => {
    test('identifies sterile AI punctuation distribution with low Shannon entropy (< 1.1 bits)', () => {
      // Sterile AI style: strictly alternating periods and commas with no expressive marks
      const sterileText = `
        Artificial intelligence is transforming industries. Modern organizations deploy neural models, optimizing throughput.
        Automated systems analyze data, enhancing productivity. Scalable infrastructure ensures stability, driving efficiency.
      `;

      const metrics = calculateStylometry(sterileText);
      assert.ok(metrics.punctuationCount >= 4, 'Should count punctuation marks');
      assert.equal(metrics.hasExpressivePunctuation, false, 'Should have no expressive marks');
      assert.ok(
        metrics.punctuationEntropy < 1.15,
        `Sterile AI punctuation should have low entropy (< 1.15 bits), got ${metrics.punctuationEntropy}`
      );
    });

    test('detects rich human expressive punctuation with high Shannon entropy (> 1.8 bits)', () => {
      // Rich human style: semicolons, em-dashes, colons, parentheses, ellipsis, quotes
      const expressiveText = `
        We analyzed the latency anomaly (observed around 03:00 UTC); the culprit was clear—a database lock deadlock.
        Did it affect checkout? Yes! Furthermore, "orphaned transactions" were accumulating...
      `;

      const metrics = calculateStylometry(expressiveText);
      assert.equal(metrics.hasExpressivePunctuation, true, 'Should detect expressive marks');
      assert.ok(
        metrics.distinctPunctuationCount >= 5,
        `Should detect at least 5 distinct punctuation categories, got ${metrics.distinctPunctuationCount}`
      );
      assert.ok(
        metrics.punctuationEntropy > 1.8,
        `Expressive human punctuation should have high entropy (> 1.8 bits), got ${metrics.punctuationEntropy}`
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 7. ESL / EFL Non-Native & Student Writing Bias Mitigation Guardrail (FPR < 2%)
  // ---------------------------------------------------------------------------
  describe('ESL / EFL & Student Writing Bias Mitigation Guardrail', () => {
    test('activates mitigation for authentic Vietnamese ESL learner writing in English with personal experience', () => {
      const eslStudentText = `
        When I was a high school student in Da Nang, English was very difficult for me.
        I felt very nervous whenever my teacher called my name in class.
        According to me, memorizing vocabulary costs a lot of time.
        However, my parents encouraged me every evening so that I could overcome my anxiety.
        Now, I feel much more confident and happy when communicating with foreign tourists.
      `;

      const result = evaluateEslGuardrail(eslStudentText, {
        markerCount: 0,
        totalMarkerWeight: 0,
        hapaxRatio: 0.62,
        language: 'en',
      });

      assert.equal(result.isEslDetected, true, 'Should detect authentic ESL student writing');
      assert.equal(result.mitigationApplied, true, 'Should apply 0.5x penalty mitigation');
      assert.ok(result.confidence >= 0.75, `Confidence should be >= 0.75, got ${result.confidence}`);
      assert.ok(result.signals.length >= 2, 'Should detect multiple human experiential signals');
    });

    test('activates mitigation for authentic Vietnamese student writing with school pedagogical cues', () => {
      const viStudentText = `
        Từ thuở nhỏ, em đã có ước mơ trở thành một bác sĩ giỏi để chữa bệnh giúp đỡ bà con quê mình.
        Mỗi lần nhìn thấy mẹ vất vả thức khuya chăm sóc em những lúc ốm đau, trong lòng em lại dâng trào niềm biết ơn sâu sắc.
        Lời thầy cô dạy bảo trên lớp luôn là tấm gương sáng soi đường cho em.
        Sau này lớn lên, em hứa sẽ nỗ lực học tập thật tốt để không phụ công ơn của gia đình và thầy cô.
      `;

      const result = evaluateEslGuardrail(viStudentText, {
        markerCount: 0,
        totalMarkerWeight: 0,
        hapaxRatio: 0.65,
        language: 'vi',
      });

      assert.equal(result.isEslDetected, true, 'Should detect authentic Vietnamese student writing');
      assert.equal(result.mitigationApplied, true, 'Should apply 0.5x penalty discount');
      assert.ok(result.signals.some((s) => s.includes('học đường') || s.includes('cá nhân')));
    });

    test('strictly refrains from mitigating text containing dense AI slop clichés', () => {
      const aiSlopWithFakePronouns = `
        In today's fast-paced digital world, it is imperative that we delve into the intricacies of artificial intelligence.
        This technological paradigm shift stands as a testament to human ingenuity and acts as a beacon of hope.
        By fostering a culture of innovation, we can harness the power of deep learning across an ever-evolving landscape.
      `;

      const result = evaluateEslGuardrail(aiSlopWithFakePronouns, {
        markerCount: 6,
        totalMarkerWeight: 26,
        hapaxRatio: 0.52,
        language: 'en',
      });

      assert.equal(result.isEslDetected, false, 'Must NOT mitigate texts saturated with AI slop clichés');
      assert.equal(result.mitigationApplied, false, 'Must NOT apply mitigation');
    });

    test('verifies ESL penalty mitigation discount factor (0.5x) is applied in composite pipeline', () => {
      // ESL learner writing: simple vocabulary, low variance, but authentic human experience
      const eslStudentText = `
        When I was a high school student in Da Nang, English was very difficult for me.
        I felt very nervous whenever my teacher called my name in class.
        According to me, memorizing vocabulary costs a lot of time.
        However, my parents encouraged me every evening so that I could overcome my anxiety.
        Now, I feel much more confident and happy when communicating with foreign tourists.
      `;

      const evalResult = runFastAlgorithmicEvaluation(eslStudentText, 'en');

      assert.equal(evalResult.metrics.eslGuardrail?.isEslDetected, true);
      assert.equal(evalResult.metrics.eslGuardrail?.mitigationApplied, true);
      assert.ok(
        evalResult.metrics.heuristicAiScore <= 30,
        `Heuristic AI score should be low with 0.5x mitigation (got ${evalResult.metrics.heuristicAiScore})`
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Composite Fast Algorithmic Evaluation (< 15ms target)
  // ---------------------------------------------------------------------------
  describe('Composite Fast Algorithmic Pipeline', () => {
    test('executes in < 50ms and produces complete metric bundle including stylometry and guardrails', () => {
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
      // New stylometric & guardrail assertions
      assert.ok(result.metrics.stylometry);
      assert.ok(typeof result.metrics.hapaxRatio === 'number');
      assert.ok(typeof result.metrics.yulesK === 'number');
      assert.ok(typeof result.metrics.punctuationEntropy === 'number');
      assert.ok(result.metrics.eslGuardrail);
    });
  });
});
