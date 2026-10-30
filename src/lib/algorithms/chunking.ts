/**
 * Sliding Window Chunking & Slop Trajectory Engine
 * Clean Architecture: Domain Service (Layer 1 Algorithmic Core)
 * 
 * Solves the "Hybrid Text" problem (Văn bản lai) where partial AI generation
 * is obscured by arithmetic averaging over long documents (800 - 15,000+ words).
 * 
 * Features:
 * - Activation threshold: >= 800 words (or >= 4,000 chars).
 * - Sliding Window: ~400-600 words per chunk with 10% overlap across sentence boundaries.
 * - Independent chunk telemetry: aiScore, dominantTone, burstiness, topViolations.
 * - Weighted Composite Scoring: Prioritizes high-risk sections to detect concentrated AI slop.
 * - High performance: O(N) execution < 50ms for 10,000+ words, zero regex backtracking.
 */

import { ChunkTrajectoryItem } from '@/types/analysis';
import { normalizeText, splitIntoSentences } from './normalizer';
import { calculateBurstinessFromLengths } from './burstiness';
import { scanHeuristicMarkers } from './regex-markers';
import { calculateStylometry, evaluateEslGuardrail } from './stylometry';
import { runFastAlgorithmicEvaluation } from './index';

export interface ChunkingOptions {
  targetChunkWords?: number; // Target window size in words (default 500)
  overlapRatio?: number;     // Overlap ratio (default 0.10 -> 10%)
  minWordsToChunk?: number;  // Activation threshold in words (default 800)
  minCharsToChunk?: number;  // Activation threshold in characters (default 4000)
}

export interface ChunkingResult {
  isChunked: boolean;
  totalWords: number;
  totalSentences: number;
  chunks: ChunkTrajectoryItem[];
  weightedAiScore: number;
  computedInMs: number;
}

const DEFAULT_TARGET_WORDS = 500;
const DEFAULT_OVERLAP_RATIO = 0.10;
const DEFAULT_MIN_WORDS = 800;
const DEFAULT_MIN_CHARS = 4000;

/**
 * High-speed chunk evaluation in O(N) without redundant winnowing, sentence re-splitting, or regex normalizations
 */
function evaluateChunkFast(
  chunkText: string,
  language: 'vi' | 'en',
  sentenceLengths: number[]
): {
  aiScore: number;
  burstinessVariance: number;
  hapaxRatio: number;
  topViolations: string[];
} {
  const burstiness = calculateBurstinessFromLengths(sentenceLengths);
  const stylometry = calculateStylometry(chunkText);
  const { metrics: heuristics } = scanHeuristicMarkers(chunkText, language);

  const eslGuardrail = evaluateEslGuardrail(chunkText, {
    markerCount: heuristics.markerCount,
    totalMarkerWeight: heuristics.totalMarkerWeight,
    hapaxRatio: stylometry.hapaxRatio,
    language,
  });

  let score = 0;
  score += burstiness.score * 0.35;
  const markerSignal = heuristics.markerDensity * 12 + heuristics.totalMarkerWeight * 0.7;
  score += Math.min(markerSignal, 55);

  if (stylometry.hapaxRatio < 0.28) {
    score += 8;
  } else if (stylometry.hapaxRatio > 0.48 && stylometry.hasExpressivePunctuation) {
    score -= 8;
  }

  if (stylometry.punctuationCount >= 4) {
    if (stylometry.hasExpressivePunctuation && stylometry.punctuationEntropy > 1.8) {
      score -= 5;
    } else if (
      !stylometry.hasExpressivePunctuation &&
      stylometry.punctuationEntropy < 1.05 &&
      heuristics.markerCount > 0
    ) {
      score += 5;
    }
  }

  if (eslGuardrail.mitigationApplied) {
    score = score * 0.5;
  }

  const aiScore = Math.min(Math.max(Math.round(score), 0), 100);

  const topViolations: string[] = heuristics.detectedMarkers
    .slice(0, 3)
    .map((m) => m.term);

  if (topViolations.length === 0) {
    if (burstiness.variance < 30) {
      topViolations.push(
        language === 'vi'
          ? 'Nhịp điệu câu đều bất thường (Low variance)'
          : 'Monotonous sentence rhythm'
      );
    } else {
      topViolations.push(language === 'vi' ? 'Tự nhiên / Cân bằng' : 'Natural / Balanced');
    }
  }

  return {
    aiScore,
    burstinessVariance: burstiness.variance,
    hapaxRatio: stylometry.hapaxRatio,
    topViolations,
  };
}

/**
 * Executes Sliding Window Chunking & Slop Trajectory measurement
 */
export function analyzeDocumentTrajectory(
  rawText: string,
  language: 'vi' | 'en' = 'vi',
  options?: ChunkingOptions
): ChunkingResult {
  const startTime = performance.now();
  const normalized = normalizeText(rawText);

  const targetWords = options?.targetChunkWords ?? DEFAULT_TARGET_WORDS;
  const overlapRatio = options?.overlapRatio ?? DEFAULT_OVERLAP_RATIO;
  const minWords = options?.minWordsToChunk ?? DEFAULT_MIN_WORDS;
  const minChars = options?.minCharsToChunk ?? DEFAULT_MIN_CHARS;

  if (!normalized || normalized.length === 0) {
    return {
      isChunked: false,
      totalWords: 0,
      totalSentences: 0,
      chunks: [],
      weightedAiScore: 0,
      computedInMs: 0,
    };
  }

  // Split into sentences preserving character offsets O(N)
  const sentences = splitIntoSentences(normalized, true);
  const totalWords = sentences.reduce((acc, s) => acc + s.wordCount, 0);

  // 1. Check activation threshold: If text < 800 words and < 4000 chars, treat as single chunk
  const shouldChunk = totalWords >= minWords || normalized.length >= minChars;

  if (!shouldChunk || sentences.length <= 1) {
    const singleEval = runFastAlgorithmicEvaluation(normalized, language);
    const aiScore = singleEval.metrics.heuristicAiScore;

    const dominantTone: 'likely_ai' | 'mixed' | 'likely_human' =
      aiScore >= 60 ? 'likely_ai' : aiScore < 35 ? 'likely_human' : 'mixed';

    const topViolations = singleEval.metrics.heuristics.detectedMarkers
      .slice(0, 3)
      .map((m) => m.term);

    const singleChunk: ChunkTrajectoryItem = {
      chunkIndex: 0,
      startChar: 0,
      endChar: normalized.length,
      wordCount: totalWords,
      aiScore,
      plagiarismScore: 0,
      dominantTone,
      topViolations: topViolations.length > 0 ? topViolations : ['Tự nhiên / Cân bằng'],
      burstinessVariance: singleEval.metrics.burstiness.variance,
      hapaxRatio: singleEval.metrics.hapaxRatio,
    };

    const computedInMs = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      isChunked: false,
      totalWords,
      totalSentences: sentences.length,
      chunks: [singleChunk],
      weightedAiScore: aiScore,
      computedInMs,
    };
  }

  // 2. Sliding Window Partitioning over sentence boundaries
  const sentenceLengths = sentences.map((s) => s.wordCount);
  const chunkStartIndices: number[] = [];
  const chunks: ChunkTrajectoryItem[] = [];
  const stepWords = Math.max(1, Math.round(targetWords * (1 - overlapRatio))); // e.g. 500 * 0.9 = 450 words
  let startIdx = 0;
  let chunkCounter = 0;

  while (startIdx < sentences.length) {
    let accumulatedWords = 0;
    let endIdx = startIdx;

    // Expand window until target words reached or text ends
    while (endIdx < sentences.length) {
      accumulatedWords += sentenceLengths[endIdx];
      if (accumulatedWords >= targetWords && endIdx > startIdx) {
        break;
      }
      if (endIdx < sentences.length - 1) {
        endIdx++;
      } else {
        break; // reached end of text
      }
    }

    const startChar = sentences[startIdx].startOffset;
    const endChar = sentences[endIdx].endOffset;
    const chunkText = normalized.substring(startChar, endChar);
    const chunkLengths = sentenceLengths.slice(startIdx, endIdx + 1);

    // Evaluate chunk independently with high-speed evaluator
    const chunkEval = evaluateChunkFast(chunkText, language, chunkLengths);
    const aiScore = chunkEval.aiScore;

    const dominantTone: 'likely_ai' | 'mixed' | 'likely_human' =
      aiScore >= 60 ? 'likely_ai' : aiScore < 35 ? 'likely_human' : 'mixed';

    chunkStartIndices.push(startIdx);
    chunks.push({
      chunkIndex: chunkCounter++,
      startChar,
      endChar,
      wordCount: accumulatedWords,
      aiScore,
      plagiarismScore: 0,
      dominantTone,
      topViolations: chunkEval.topViolations,
      burstinessVariance: chunkEval.burstinessVariance,
      hapaxRatio: chunkEval.hapaxRatio,
    });

    // If we've reached or covered the last sentence, stop
    if (endIdx >= sentences.length - 1) {
      break;
    }

    // Advance startIdx by stepWords (~90% window)
    let advanceWords = 0;
    let nextStartIdx = startIdx;
    while (nextStartIdx < endIdx) {
      advanceWords += sentenceLengths[nextStartIdx];
      nextStartIdx++;
      if (advanceWords >= stepWords) {
        break;
      }
    }

    // Safety guard: Must advance by at least 1 sentence
    if (nextStartIdx <= startIdx) {
      nextStartIdx = startIdx + 1;
    }

    // If remaining sentences after this chunk represent less than 150 words, merge with previous or stop
    let remainingWords = 0;
    for (let i = nextStartIdx; i < sentences.length; i++) {
      remainingWords += sentenceLengths[i];
    }

    if (remainingWords < 120 && chunks.length > 0) {
      // Extend the current chunk to include the end
      const lastChunk = chunks[chunks.length - 1];
      const lastStartIdx = chunkStartIndices[chunks.length - 1];
      const finalEndChar = sentences[sentences.length - 1].endOffset;
      const extendedText = normalized.substring(lastChunk.startChar, finalEndChar);
      const extendedLengths = sentenceLengths.slice(lastStartIdx, sentences.length);
      const extendedEval = evaluateChunkFast(extendedText, language, extendedLengths);

      lastChunk.endChar = finalEndChar;
      lastChunk.wordCount += remainingWords;
      lastChunk.aiScore = extendedEval.aiScore;
      lastChunk.dominantTone =
        lastChunk.aiScore >= 60 ? 'likely_ai' : lastChunk.aiScore < 35 ? 'likely_human' : 'mixed';
      lastChunk.topViolations = extendedEval.topViolations;
      lastChunk.burstinessVariance = extendedEval.burstinessVariance;
      lastChunk.hapaxRatio = extendedEval.hapaxRatio;
      break;
    }

    startIdx = nextStartIdx;
  }

  // 3. Weighted Composite Scoring for Hybrid Texts
  const weightedAiScore = computeWeightedCompositeScore(chunks);
  const computedInMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    isChunked: chunks.length > 1,
    totalWords,
    totalSentences: sentences.length,
    chunks,
    weightedAiScore,
    computedInMs,
  };
}

/**
 * Computes a weighted composite score that penalizes concentrated AI slop sections
 * ensuring hybrid documents (part human, part ChatGPT) are not overlooked.
 */
export function computeWeightedCompositeScore(chunks: ChunkTrajectoryItem[]): number {
  if (!chunks || chunks.length === 0) return 0;
  if (chunks.length === 1) return chunks[0].aiScore;

  const scores = chunks.map((c) => c.aiScore);
  const sorted = [...scores].sort((a, b) => b - a);
  const maxScore = sorted[0] || 0;
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  // Average of top 25% worst chunks (at least 1 chunk)
  const topCount = Math.max(1, Math.round(chunks.length * 0.25));
  const topQuartile = sorted.slice(0, topCount).reduce((sum, s) => sum + s, 0) / topCount;

  let composite: number;

  if (maxScore >= 70) {
    // Severe AI slop in at least one section: heavily weight worst sections
    composite = 0.50 * topQuartile + 0.30 * maxScore + 0.20 * avgScore;
  } else if (maxScore >= 50) {
    // Moderate slop observed: balanced weighting
    composite = 0.40 * topQuartile + 0.35 * avgScore + 0.25 * maxScore;
  } else {
    // Mostly human with subtle slop
    composite = 0.60 * avgScore + 0.40 * topQuartile;
  }

  return Math.min(Math.max(Math.round(composite), 0), 100);
}
