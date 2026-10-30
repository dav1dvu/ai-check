/**
 * Sprint 3 Test Suite: Verification of Algorithmic Tuning & Marker Enrichment
 * Runs unit verifications for:
 * 1. Rich AI Slop Regex Dictionary (VI & EN with 4 categories, weights, suggestions)
 * 2. Mathematical Burstiness & Variance Calibration (AI Uniform vs Human Bursty vs Short Sentences)
 * 3. Length-Normalized Type-Token Ratio (STTR / MSTTR)
 * 4. Fast Algorithmic Evaluation Execution & Telemetry
 */

import {
  scanHeuristicMarkers,
  calculateBurstiness,
  calculateLexicalDiversity,
  runFastAlgorithmicEvaluation,
} from '../src/lib/algorithms';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('=================================================================');
console.log('🧪 SPRINT 3 ALGORITHMIC & HEURISTIC ENGINE VERIFICATION');
console.log('=================================================================\n');

// -------------------------------------------------------------------------
// TEST 1: VIETNAMESE AI MARKERS (VietAIDetector enrichment)
// -------------------------------------------------------------------------
console.log('--- TEST 1: Vietnamese AI Markers Detection ---');
const viSample = `
Trong kỷ nguyên số 4.0 phát triển vượt bậc hiện nay, công nghệ trí tuệ nhân tạo đóng vai trò quan trọng và là chiếc cầu nối thiết yếu. 
Không thể không nhắc đến những đóng góp tạo tiền đề cho sự phát triển trong tương lai.
Hãy cùng điểm qua bức tranh đa sắc màu của công nghệ: đây là sự kết hợp hoàn hảo giữa thuật toán và sáng tạo.
Dù vẫn đặt ra một dấu hỏi lớn về an toàn dữ liệu, công nghệ này vẫn là bệ phóng vững chắc cho thế hệ trẻ.
`;

const viScan = scanHeuristicMarkers(viSample, 'vi');
console.log(`Detected markers in VI sample: ${viScan.metrics.markerCount}`);
viScan.metrics.detectedMarkers.forEach((m) => {
  console.log(`  - [${m.category.toUpperCase()}] "${m.term}" (Hits: ${m.count})`);
  console.log(`    💡 Suggestion: ${m.suggestion}`);
});

assert(viScan.metrics.markerCount >= 8, 'Must detect at least 8 distinct markers in VI slop text');
const viTerms = viScan.metrics.detectedMarkers.map((m) => m.term);
assert(viTerms.some((t) => t.includes('cầu nối')), 'Detected "đóng vai trò như một chiếc cầu nối"');
assert(viTerms.some((t) => t.includes('không thể không nhắc đến')), 'Detected "không thể không nhắc đến"');
assert(viTerms.some((t) => t.includes('dấu hỏi lớn')), 'Detected "đặt ra một dấu hỏi lớn"');
assert(viTerms.some((t) => t.includes('bệ phóng vững chắc')), 'Detected "bệ phóng vững chắc"');
assert(viTerms.some((t) => t.includes('bức tranh đa sắc màu')), 'Detected "như một bức tranh đa sắc màu"');
assert(viTerms.some((t) => t.includes('sự kết hợp hoàn hảo giữa')), 'Detected "sự kết hợp hoàn hảo giữa..."');
assert(viTerms.some((t) => t.includes('tạo tiền đề cho')), 'Detected "tạo tiền đề cho..."');
assert(viTerms.some((t) => t.includes('hãy cùng điểm qua')), 'Detected "hãy cùng điểm qua..."');

// Check 4 categories presence
const viCategories = new Set(viScan.metrics.detectedMarkers.map((m) => m.category));
assert(viCategories.has('cliche'), 'VI markers include "cliche"');
assert(viCategories.has('filler'), 'VI markers include "filler"');
assert(viCategories.has('stilted_transition'), 'VI markers include "stilted_transition"');
assert(viCategories.has('hedging'), 'VI markers include "hedging"');
console.log('✅ Vietnamese marker enrichment verified successfully!\n');

// -------------------------------------------------------------------------
// TEST 2: ENGLISH AI MARKERS (houtini-ai/ai-detect enrichment)
// -------------------------------------------------------------------------
console.log('--- TEST 2: English AI Markers Detection ---');
const enSample = `
Without further ado, in today's fast-paced digital world, it is imperative that researchers delve into the intricacies of neural architectures.
This achievement stands as a testament to human perseverance and serves as a beacon of hope for medical science.
By fostering a culture of innovation, companies can harness the power of artificial intelligence across an ever-evolving landscape.
Ultimately, this produces a rich tapestry of methodologies that could potentially be argued to reshape modern industry.
`;

const enScan = scanHeuristicMarkers(enSample, 'en');
console.log(`Detected markers in EN sample: ${enScan.metrics.markerCount}`);
enScan.metrics.detectedMarkers.forEach((m) => {
  console.log(`  - [${m.category.toUpperCase()}] "${m.term}" (Hits: ${m.count})`);
  console.log(`    💡 Suggestion: ${m.suggestion}`);
});

assert(enScan.metrics.markerCount >= 8, 'Must detect at least 8 distinct markers in EN slop text');
const enTerms = enScan.metrics.detectedMarkers.map((m) => m.term);
assert(enTerms.some((t) => t.includes('delve into')), 'Detected "delve into the intricacies"');
assert(enTerms.some((t) => t.includes('tapestry')), 'Detected "a tapestry of"');
assert(enTerms.some((t) => t.includes('beacon of hope')), 'Detected "beacon of hope"');
assert(enTerms.some((t) => t.includes('foster a culture of')), 'Detected "foster a culture of"');
assert(enTerms.some((t) => t.includes('imperative that')), 'Detected "it is imperative that"');
assert(enTerms.some((t) => t.includes('landscape')), 'Detected "ever-evolving landscape"');
assert(enTerms.some((t) => t.includes('testament to')), 'Detected "testament to"');
assert(enTerms.some((t) => t.includes('harness the power of')), 'Detected "harness the power of"');

const enCategories = new Set(enScan.metrics.detectedMarkers.map((m) => m.category));
assert(enCategories.has('cliche'), 'EN markers include "cliche"');
assert(enCategories.has('filler'), 'EN markers include "filler"');
assert(enCategories.has('stilted_transition'), 'EN markers include "stilted_transition"');
assert(enCategories.has('hedging'), 'EN markers include "hedging"');
console.log('✅ English marker enrichment verified successfully!\n');

// -------------------------------------------------------------------------
// TEST 3: BURSTINESS & SENTENCE LENGTH VARIANCE CALIBRATION
// -------------------------------------------------------------------------
console.log('--- TEST 3: Burstiness & Variance Mathematical Calibration ---');

// Case A: AI Uniform Monotony (Mean: 21 words, Variance: 2.2 -> Low variance)
const aiUniformText = `
Trí tuệ nhân tạo hiện đại đang tái định hình phương thức tương tác giữa các doanh nghiệp và khách hàng trong thời đại số.
Các hệ thống tự động hóa mang lại hiệu quả vượt bậc trong việc phân tích khối lượng dữ liệu khổng lồ với tốc độ cực nhanh.
Nhiều tổ chức trên toàn cầu đang tích cực triển khai các mô hình học máy tiên tiến để tối ưu hóa quy trình vận hành phức tạp.
Việc đầu tư bài bản vào cơ sở hạ tầng công nghệ thông tin là yếu tố tiên quyết nhằm duy trì năng lực cạnh tranh bền vững.
`;

const aiBurstiness = calculateBurstiness(aiUniformText);
console.log('AI Uniform Monotony metrics:', aiBurstiness);
assert(aiBurstiness.variance < 40, 'AI uniform text must have variance σ² < 40');
assert(aiBurstiness.score >= 75, `AI uniform score must be high (got ${aiBurstiness.score})`);

// Case B: Human Bursty Text (Short punchy phrases mixed with long compound sentences, σ² > 120)
const humanBurstyText = `
Không hẳn.
Chúng tôi đã mất gần sáu tháng ròng rã kiểm thử từng mô-đun giải thuật trên cụm máy chủ gồm mười hai nút tính toán phân tán đặt tại phòng thí nghiệm trọng điểm của viện công nghệ, nhưng tỷ lệ hội tụ của mô hình vẫn không đạt mức kỳ vọng ban đầu do dữ liệu nhiễu quá nặng.
Thất vọng tràn trề.
Tuy nhiên, khi cả nhóm quyết định đổi sang bộ lọc nhiễu thích ứng và cấu hình lại toàn bộ siêu tham số vào lúc nửa đêm, độ chính xác bất ngờ vọt lên 94.8% trong sự vỡ òa của tất cả anh em kỹ sư.
Thật không thể tin nổi!
`;

const humanBurstiness = calculateBurstiness(humanBurstyText);
console.log('Human Bursty metrics:', humanBurstiness);
assert(humanBurstiness.variance > 120, `Human text variance σ² must be > 120 (got ${humanBurstiness.variance})`);
assert(humanBurstiness.score <= 25, `Human bursty score must be low (got ${humanBurstiness.score})`);

// Case C: False Positive Guardrail (Concise human sentences with mean < 10)
const humanConciseText = `
Hôm nay trời nắng đẹp.
Chúng tôi đi dạo ở công viên.
Gió thổi nhè nhẹ rất dễ chịu.
Mọi người cùng ngồi uống cà phê.
Cảm giác thật bình yên.
`;

const humanConciseBurstiness = calculateBurstiness(humanConciseText);
console.log('Human Concise Dialogue metrics:', humanConciseBurstiness);
assert(humanConciseBurstiness.meanLength < 10, 'Mean length must be < 10 words');
assert(humanConciseBurstiness.score <= 40, `Concise human sentences must NOT be flagged as AI slop (got ${humanConciseBurstiness.score})`);
console.log('✅ Burstiness variance and false positive calibration verified successfully!\n');

// -------------------------------------------------------------------------
// TEST 4: LEXICAL DIVERSITY & NORMALIZED TTR
// -------------------------------------------------------------------------
console.log('--- TEST 4: Normalized TTR (STTR / MSTTR) ---');
const longText = `
Học máy là một phân ngành của trí tuệ nhân tạo tập trung vào việc xây dựng các hệ thống có khả năng học hỏi từ dữ liệu. 
Thay vì lập trình các quy tắc rõ ràng, máy học sử dụng các thuật toán thống kê để xác định các mẫu hình trong dữ liệu lớn. 
Các ứng dụng phổ biến bao gồm nhận dạng giọng nói, thị giác máy tính, và xử lý ngôn ngữ tự nhiên. 
Khi lượng dữ liệu tăng lên, mô hình học máy ngày càng trở nên chính xác hơn và có khả năng giải quyết các bài toán phức tạp trong thế giới thực một cách tự động và linh hoạt.
`;

const lexical = calculateLexicalDiversity(longText);
console.log('Lexical Diversity metrics:', lexical);
assert(lexical.normalizedTTR > 0 && lexical.normalizedTTR <= 1.0, 'Normalized TTR must be in [0, 1]');
assert(typeof lexical.normalizedTTR === 'number', 'Normalized TTR must be a valid number');
console.log('✅ Normalized TTR computation verified successfully!\n');

// -------------------------------------------------------------------------
// TEST 5: FAST ALGORITHMIC EVALUATION COMPOSITE
// -------------------------------------------------------------------------
console.log('--- TEST 5: Composite Algorithmic Pipeline & Performance ---');
const compositeStart = performance.now();
const evalResult = runFastAlgorithmicEvaluation(viSample, 'vi');
const elapsed = performance.now() - compositeStart;

console.log(`Fast evaluation completed in ${elapsed.toFixed(2)}ms (telemetry: ${evalResult.metrics.computedInMs}ms)`);
console.log('Metrics detail:', JSON.stringify(evalResult.metrics, null, 2));
console.log('Heuristic AI Score:', evalResult.metrics.heuristicAiScore);
assert(elapsed < 20, `Execution must complete in < 20ms (took ${elapsed.toFixed(2)}ms)`);
assert(evalResult.metrics.heuristicAiScore >= 70, 'Heuristic AI score should reflect strong slop indicators');
assert(evalResult.segments.length > 0, 'Segments must be extracted for UI highlighting');
console.log('✅ Fast Algorithmic Pipeline verified successfully!\n');

console.log('=================================================================');
console.log('🎉 ALL SPRINT 3 ALGORITHMIC TESTS PASSED WITH 100% SUCCESS!');
console.log('=================================================================');
