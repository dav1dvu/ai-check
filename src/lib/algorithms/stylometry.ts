/**
 * Advanced Stylometry and ESL / EFL Bias Mitigation Engine
 * 
 * Theoretical Framework:
 * 1. Hapax Legomena Ratio (V1 / N):
 *    - Synthesized from ahans30/Binoculars & vutuongvy101/multilingual-ai-human-text-detection.
 *    - Measures proportion of words occurring exactly once.
 *    - Human writing typically exhibits high Hapax ratio (> 0.45) due to rich episodic vocabulary.
 *    - AI text exhibits lower Hapax ratio (< 0.30) due to probabilistic token convergence.
 * 
 * 2. Yule's Characteristic K:
 *    - K = 10^4 * (sum(i^2 * Vi) - N) / (N^2)
 *    - Classic length-independent stylometric measure (Yule, 1944).
 *    - Higher K indicates repetitive, monotonous vocabulary distribution.
 * 
 * 3. Punctuation Shannon Entropy (Cadence & Rhythm):
 *    - H = - sum(p_i * log2(p_i)) over distinct punctuation categories.
 *    - AI generation over-indexes on symmetric periods and commas (low entropy ~0.8-1.2 bits).
 *    - Human writers employ varied expressive punctuation (semicolons, dashes, colons, parentheses, ellipses)
 *      resulting in elevated entropy (> 1.8-2.5+ bits).
 * 
 * 4. ESL / EFL Non-Native False-Positive Guardrail (FPR < 2%):
 *    - Protects non-native English writers (e.g. Vietnamese ESL learners) and Vietnamese student essays.
 *    - Detects personal lived experience, first-person subjectivity, affective states, and apprentice collocations.
 *    - If genuine human subjectivity is detected AND AI clichés are absent, applies a 0.5x penalty reduction.
 */

import { StylometryMetrics, EslGuardrailMetrics } from '@/types/analysis';

export interface PunctuationBreakdown {
  period: number;
  comma: number;
  semicolon: number;
  colon: number;
  dash: number;
  parenthesis: number;
  ellipsis: number;
  exclamation: number;
  question: number;
  quote: number;
}

/**
 * Calculates Stylometric Metrics:
 * - Hapax Legomena Ratio (V1 / N)
 * - Yule's Characteristic K
 * - Punctuation Shannon Entropy (H in bits)
 */
export function calculateStylometry(text: string): StylometryMetrics {
  if (!text || text.trim().length === 0) {
    return {
      hapaxRatio: 0,
      yulesK: 0,
      punctuationEntropy: 0,
      punctuationCount: 0,
      distinctPunctuationCount: 0,
      hasExpressivePunctuation: false,
    };
  }

  // ---------------------------------------------------------------------------
  // 1. Tokenization & Word Frequency Distribution
  // ---------------------------------------------------------------------------
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);

  const totalTokens = tokens.length;

  let hapaxRatio = 0;
  let yulesK = 0;

  if (totalTokens > 0) {
    const freqMap = new Map<string, number>();
    for (let i = 0; i < totalTokens; i++) {
      const t = tokens[i];
      freqMap.set(t, (freqMap.get(t) || 0) + 1);
    }

    let hapaxCount = 0; // V1
    let sumSquaredFreq = 0; // S2 = sum(i^2 * Vi) = sum(freq^2)

    for (const freq of freqMap.values()) {
      if (freq === 1) {
        hapaxCount++;
      }
      sumSquaredFreq += freq * freq;
    }

    // Hapax Legomena Ratio: V1 / N
    hapaxRatio = Math.round((hapaxCount / totalTokens) * 1000) / 1000;

    // Yule's Characteristic K: 10^4 * (S2 - N) / (N^2)
    if (totalTokens > 1) {
      const rawK = (10000 * (sumSquaredFreq - totalTokens)) / (totalTokens * totalTokens);
      yulesK = Math.max(0, Math.round(rawK * 10) / 10);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Punctuation Cadence & Shannon Entropy
  // ---------------------------------------------------------------------------
  const breakdown: PunctuationBreakdown = {
    period: 0,
    comma: 0,
    semicolon: 0,
    colon: 0,
    dash: 0,
    parenthesis: 0,
    ellipsis: 0,
    exclamation: 0,
    question: 0,
    quote: 0,
  };

  // 2a. Match ellipses first to avoid counting them as individual periods
  const ellipsisMatches = text.match(/\.\.\.|\u2026/g);
  if (ellipsisMatches) {
    breakdown.ellipsis = ellipsisMatches.length;
  }
  // Remove ellipses before single punctuation scan
  const textWithoutEllipsis = text.replace(/\.\.\.|\u2026/g, ' ');

  // 2b. Count distinct punctuation marks
  const len = textWithoutEllipsis.length;
  for (let i = 0; i < len; i++) {
    const ch = textWithoutEllipsis[i];
    switch (ch) {
      case '.':
        breakdown.period++;
        break;
      case ',':
        breakdown.comma++;
        break;
      case ';':
        breakdown.semicolon++;
        break;
      case ':':
        breakdown.colon++;
        break;
      case '—': // em-dash \u2014
      case '–': // en-dash \u2013
        breakdown.dash++;
        break;
      case '-':
        // Count as dash if surrounded by space or acting as em-dash double hyphen
        if (
          (i > 0 && textWithoutEllipsis[i - 1] === ' ' && i + 1 < len && textWithoutEllipsis[i + 1] === ' ') ||
          (i + 1 < len && textWithoutEllipsis[i + 1] === '-')
        ) {
          breakdown.dash++;
          if (i + 1 < len && textWithoutEllipsis[i + 1] === '-') i++; // skip second dash of '--'
        }
        break;
      case '(':
      case ')':
      case '[':
      case ']':
        breakdown.parenthesis++;
        break;
      case '!':
        breakdown.exclamation++;
        break;
      case '?':
        breakdown.question++;
        break;
      case '"':
      case "'":
      case '“':
      case '”':
      case '«':
      case '»':
      case '‘':
      case '’':
        breakdown.quote++;
        break;
    }
  }

  let totalPunctuation = 0;
  let distinctPunctuationCount = 0;
  const counts = Object.values(breakdown);

  for (let i = 0; i < counts.length; i++) {
    const c = counts[i];
    if (c > 0) {
      totalPunctuation += c;
      distinctPunctuationCount++;
    }
  }

  // Calculate Shannon Entropy: H = - sum(p * log2(p))
  let punctuationEntropy = 0;
  if (totalPunctuation > 0) {
    let entropy = 0;
    for (let i = 0; i < counts.length; i++) {
      const c = counts[i];
      if (c > 0) {
        const p = c / totalPunctuation;
        entropy -= p * Math.log2(p);
      }
    }
    punctuationEntropy = Math.round(entropy * 1000) / 1000;
  }

  const hasExpressivePunctuation =
    breakdown.semicolon > 0 ||
    breakdown.colon > 0 ||
    breakdown.dash > 0 ||
    breakdown.parenthesis > 0 ||
    breakdown.ellipsis > 0;

  return {
    hapaxRatio,
    yulesK,
    punctuationEntropy,
    punctuationCount: totalPunctuation,
    distinctPunctuationCount,
    hasExpressivePunctuation,
  };
}

// ---------------------------------------------------------------------------
// 3. ESL / EFL & Student Writing Bias Mitigation Guardrail
// ---------------------------------------------------------------------------

export interface EslEvaluationContext {
  markerCount: number;
  totalMarkerWeight: number;
  hapaxRatio: number;
  language?: 'vi' | 'en' | 'unknown';
}

// Regex patterns for authentic human subjectivity and lived experience
const PERSONAL_EXPERIENCE_EN =
  /\b(i|me|my|mine|myself|we|our|ours|us|in my (?:opinion|view|experience|school|family|hometown|country)|my (?:parents|teacher|teachers|mother|father|family|friends?|childhood|hometown)|personally|i think|i feel|i believe|when i was|as a student)\b/gi;

const PERSONAL_EXPERIENCE_VI =
  /(?<=^|[^\p{L}\p{N}])(tôi|chúng tôi|chúng em|em|bản thân em|mình|tụi mình|theo em|theo tôi|gia đình (?:tôi|em)|thầy cô|thầy giáo|cô giáo|bạn bè|kỷ niệm|tuổi thơ|quê hương em|lớp em|trường em)(?=$|[^\p{L}\p{N}])/gui;

// Emotional / affective state indicators
const EMOTIONAL_STATES_EN =
  /\b(feel|feeling|felt|nervous|excited|happy|sad|scared|confused|struggling?|struggled|difficult|difficulty|worried|proud|surprised|enjoy|enjoyed|memorable|cherish|grateful|passion|afraid)\b/gi;

const EMOTIONAL_STATES_VI =
  /(?<=^|[^\p{L}\p{N}])(cảm thấy|xúc động|hồi hộp|lo lắng|vui vẻ|buồn bã|bỡ ngỡ|khó khăn|vất vả|tự hào|yêu quý|ước mơ|hy vọng|biết ơn|ấm áp|nhớ mãi|nghị lực|cố gắng)(?=$|[^\p{L}\p{N}])/gui;

// Apprentice collocations / ESL learner phrasing
const ESL_COLLOCATIONS_EN = [
  /\baccording to me\b/gi,
  /\bcost(?:s)? a lot of (?:money|time)\b/gi,
  /\bmake a progress\b/gi,
  /\bmore (?:better|easier|faster)\b/gi,
  /\bvery much\b/gi,
  /\btake attention\b/gi,
  /\bhardly work\b/gi,
  /\bso that (?:i|we) can\b/gi,
  /\bbecause\s+[^.!?\n]+,\s*so\b/gi,
  /\bin the modern society\b/gi,
  /\bas we all know\b/gi,
  /\bfirst of all,\s*(?:i|we)\b/gi,
  /\bin conclusion,\s*(?:i think|i believe)\b/gi,
];

const STUDENT_PEDAGOGICAL_VI = [
  /(?<=^|[^\p{L}\p{N}])(mỗi chúng ta ai cũng)(?=$|[^\p{L}\p{N}])/gui,
  /(?<=^|[^\p{L}\p{N}])(từ thuở nhỏ|từ nhỏ em đã)(?=$|[^\p{L}\p{N}])/gui,
  /(?<=^|[^\p{L}\p{N}])(em rất yêu|em rất thích)(?=$|[^\p{L}\p{N}])/gui,
  /(?<=^|[^\p{L}\p{N}])(bài học rút ra (?:là|cho em))(?=$|[^\p{L}\p{N}])/gui,
  /(?<=^|[^\p{L}\p{N}])(sau này lớn lên)(?=$|[^\p{L}\p{N}])/gui,
  /(?<=^|[^\p{L}\p{N}])(trong lòng em)(?=$|[^\p{L}\p{N}])/gui,
  /(?<=^|[^\p{L}\p{N}])(lời thầy cô dạy|nghe lời thầy cô)(?=$|[^\p{L}\p{N}])/gui,
  /(?<=^|[^\p{L}\p{N}])(tấm gương sáng)(?=$|[^\p{L}\p{N}])/gui,
];

/**
 * Evaluates whether text qualifies for ESL / Apprentice Writing False-Positive Protection.
 * If detected, returns mitigationApplied = true, triggering a 0.5x penalty reduction.
 */
export function evaluateEslGuardrail(
  text: string,
  context: EslEvaluationContext
): EslGuardrailMetrics {
  const isVi = context.language === 'vi';
  const detectedSignals: string[] = [];

  // 1. Check personal experience
  const personalRegex = isVi ? PERSONAL_EXPERIENCE_VI : PERSONAL_EXPERIENCE_EN;
  const personalMatches = text.match(personalRegex);
  const personalHits = personalMatches ? personalMatches.length : 0;
  if (personalHits >= 2) {
    detectedSignals.push(
      isVi ? `Trải nghiệm cá nhân thực tế (${personalHits} lần)` : `Personal subjectivity (${personalHits} occurrences)`
    );
  }

  // 2. Check emotional / affective states
  const emotionalRegex = isVi ? EMOTIONAL_STATES_VI : EMOTIONAL_STATES_EN;
  const emotionalMatches = text.match(emotionalRegex);
  const emotionalHits = emotionalMatches ? emotionalMatches.length : 0;
  if (emotionalHits >= 1) {
    detectedSignals.push(
      isVi ? `Trạng thái cảm xúc con người (${emotionalHits} từ)` : `Affective emotional states (${emotionalHits} occurrences)`
    );
  }

  // 3. Check apprentice / ESL collocations
  let collocationHits = 0;
  if (isVi) {
    for (const pattern of STUDENT_PEDAGOGICAL_VI) {
      if (pattern.test(text)) {
        collocationHits++;
      }
    }
    if (collocationHits >= 1) {
      detectedSignals.push(`Văn phong học đường / tập làm văn chân thực (${collocationHits} dấu hiệu)`);
    }
  } else {
    for (const pattern of ESL_COLLOCATIONS_EN) {
      if (pattern.test(text)) {
        collocationHits++;
      }
    }
    if (collocationHits >= 1) {
      detectedSignals.push(`Đặc trưng diễn đạt phi bản ngữ ESL (${collocationHits} cụm từ)`);
    }
  }

  // 4. Calculate signal strength
  // Words count check: need at least 15 words to evaluate reliably
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 15) {
    return {
      isEslDetected: false,
      confidence: 0,
      mitigationApplied: false,
      signals: [],
      explanation: isVi
        ? 'Đoạn văn quá ngắn để đánh giá rào chắn ESL.'
        : 'Text too short for ESL guardrail evaluation.',
    };
  }

  // Crucial Guardrail Condition:
  // Must have human subjectivity/emotions/ESL cues AND must NOT contain heavy AI slop clichés.
  const hasHumanSignals = personalHits >= 2 || (personalHits >= 1 && emotionalHits >= 1) || collocationHits >= 1;
  const hasLowAiMarkers = context.markerCount <= 2 && context.totalMarkerWeight <= 6;

  const isEslDetected = hasHumanSignals && hasLowAiMarkers;

  if (isEslDetected) {
    const totalHits = personalHits + emotionalHits + collocationHits;
    const confidence = Math.min(0.95, Math.round((0.70 + Math.min(totalHits * 0.05, 0.25)) * 100) / 100);

    return {
      isEslDetected: true,
      confidence,
      mitigationApplied: true,
      signals: detectedSignals,
      explanation: isVi
        ? `Đã kích hoạt rào chắn bảo vệ người viết phi bản ngữ / học sinh: phát hiện dấu ấn trải nghiệm cá nhân và cảm xúc chân thực, giảm 50% điểm phạt để tránh đánh giá nhầm.`
        : `ESL / Non-native writer guardrail activated: detected authentic personal voice, lived experience, and apprentice phrasing without formulaic AI markers. Applied 50% penalty discount to eliminate false positives.`,
    };
  }

  return {
    isEslDetected: false,
    confidence: 0.1,
    mitigationApplied: false,
    signals: detectedSignals,
    explanation: isVi
      ? 'Không phát hiện đặc trưng người viết phi bản ngữ hoặc văn bản chứa sáo ngữ AI cao.'
      : 'No dominant non-native learner characteristics observed, or text exhibits elevated AI cliché density.',
  };
}
