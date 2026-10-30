/**
 * Burstiness and Lexical Diversity Calculator
 * 
 * Core theoretical foundation:
 * - ahans30/Binoculars: Cross-entropy and sentence length entropy
 * - vutuongvy101/multilingual-ai-human-text-detection: Multilingual burstiness,
 *   sentence length variance σ², and normalized lexical diversity (STTR / Guiraud)
 * 
 * Key insights:
 * 1. Human writing exhibits high burstiness: wild fluctuations between short punchy sentences
 *    (3-8 words) and complex compound structures (30-50+ words), resulting in σ² > 120.
 * 2. LLMs generate sentences with remarkably uniform cadence (typically 18-25 words),
 *    resulting in low variance (σ² < 40) and low coefficient of variation (CV < 0.28).
 * 3. Crucial edge case: Natural human short sentences (dialogue, flash fiction, memo)
 *    must NOT be falsely flagged as AI slop despite low variance.
 */

import { splitIntoSentences } from './normalizer';
import { BurstinessMetrics, LexicalMetrics } from '@/types/analysis';

/**
 * Calculates sentence length variance and burstiness score calibrated for AI detection.
 * Score range: 0 to 100 (100 = extreme artificial uniformity, 0 = natural human burstiness)
 */
export function calculateBurstiness(text: string): BurstinessMetrics {
  const sentences = splitIntoSentences(text);
  const lengths = sentences.map((s) => s.wordCount);
  return calculateBurstinessFromLengths(lengths);
}

/**
 * High-performance burstiness calculation directly from pre-computed sentence lengths.
 * O(N) with zero string regex splitting.
 */
export function calculateBurstinessFromLengths(lengths: number[]): BurstinessMetrics {
  const sentenceCount = lengths.length;

  if (sentenceCount === 0) {
    return {
      sentenceCount: 0,
      meanLength: 0,
      variance: 0,
      standardDeviation: 0,
      score: 50,
    };
  }

  const sum = lengths.reduce((acc, curr) => acc + curr, 0);
  const mean = sum / sentenceCount;

  // Calculate Variance σ² and Standard Deviation σ
  const squareDiffs = lengths.map((len) => Math.pow(len - mean, 2));
  const variance = squareDiffs.reduce((acc, curr) => acc + curr, 0) / sentenceCount;
  const standardDeviation = Math.sqrt(variance);

  // Insufficient sample size for reliable variance heuristics
  if (sentenceCount < 3) {
    return {
      sentenceCount,
      meanLength: Math.round(mean * 10) / 10,
      variance: Math.round(variance * 10) / 10,
      standardDeviation: Math.round(standardDeviation * 10) / 10,
      score: 50, // Neutral prior
    };
  }

  // Coefficient of Variation: CV = σ / μ
  const cv = mean > 0 ? standardDeviation / mean : 0;

  // -------------------------------------------------------------------------
  // 1. Base Variance Scoring (Calibrated on Binoculars & Multilingual AI benchmarks)
  // -------------------------------------------------------------------------
  let baseScore = 50;

  if (variance >= 120) {
    // High burstiness: massive variation between short and long sentences (quintessential human)
    // Scale: σ² = 120 -> 18, σ² >= 250 -> 5
    baseScore = Math.max(5, Math.round(18 - ((variance - 120) / 130) * 13));
  } else if (variance >= 75) {
    // Healthy human variation: σ² in [75, 120)
    // Scale: 75 -> 38, 120 -> 18
    baseScore = Math.round(38 - ((variance - 75) / 45) * 20);
  } else if (variance >= 40) {
    // Moderate uniformity / transitional zone: σ² in [40, 75)
    // Scale: 40 -> 65, 75 -> 38
    baseScore = Math.round(65 - ((variance - 40) / 35) * 27);
  } else {
    // Low variance: σ² < 40 (artificially tight clustering)
    // Scale: 0 -> 95, 40 -> 65
    baseScore = Math.round(95 - (variance / 40) * 30);
  }

  // -------------------------------------------------------------------------
  // 2. Mean Length & False Positive Mitigation for Human Short Sentences
  // -------------------------------------------------------------------------
  // LLMs almost NEVER output texts where the average sentence is under 11 words.
  // When humans write dialogue or concise notes (e.g. lengths: 4, 6, 5, 3), σ² is naturally low
  // due to the mathematical lower bound, but this is AUTHENTIC HUMAN TEXT.
  if (mean < 10) {
    // Strong dampener: authentic human concise/punchy prose
    baseScore = Math.round(baseScore * 0.35);
  } else if (mean < 14) {
    // Moderate dampener
    baseScore = Math.round(baseScore * 0.65);
  } else if (mean >= 16 && mean <= 30 && variance < 45 && cv < 0.28) {
    // "Sweet Spot" of AI Slop: average 16-30 words per sentence with low variance and low CV
    // Reinforce synthetic uniformity signal
    baseScore = Math.min(100, Math.round(baseScore * 1.15));
  }

  // -------------------------------------------------------------------------
  // 3. Coefficient of Variation (CV) Calibration
  // -------------------------------------------------------------------------
  if (cv >= 0.65) {
    // When CV is very high, human burstiness is unmistakable
    baseScore = Math.min(baseScore, 20);
  } else if (cv < 0.20 && mean >= 14) {
    // Extreme artificial monotony
    baseScore = Math.max(baseScore, 82);
  }

  const finalScore = Math.min(Math.max(Math.round(baseScore), 0), 100);

  return {
    sentenceCount,
    meanLength: Math.round(mean * 10) / 10,
    variance: Math.round(variance * 10) / 10,
    standardDeviation: Math.round(standardDeviation * 10) / 10,
    score: finalScore,
  };
}

/**
 * Calculates Lexical Diversity metrics including:
 * - Crude Type-Token Ratio (TTR = V / N)
 * - Length-Normalized Segmented TTR (STTR / MSTTR, block size 50 tokens)
 * - N-gram repetition rate
 */
export function calculateLexicalDiversity(text: string): LexicalMetrics {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);

  const totalTokens = tokens.length;
  if (totalTokens === 0) {
    return {
      totalTokens: 0,
      uniqueTokens: 0,
      typeTokenRatio: 0,
      normalizedTTR: 0,
      repetitionRate: 0,
    };
  }

  const uniqueSet = new Set(tokens);
  const uniqueTokens = uniqueSet.size;
  const typeTokenRatio = Math.round((uniqueTokens / totalTokens) * 1000) / 1000;

  // -------------------------------------------------------------------------
  // Length-Normalized TTR Calculation (Segmented TTR / STTR)
  // Inspired by multilingual computational linguistics standards
  // -------------------------------------------------------------------------
  const BLOCK_SIZE = 50;
  let normalizedTTR = typeTokenRatio;

  if (totalTokens >= BLOCK_SIZE) {
    const numBlocks = Math.floor(totalTokens / BLOCK_SIZE);
    let cumulativeBlockTtr = 0;

    for (let b = 0; b < numBlocks; b++) {
      const blockTokens = tokens.slice(b * BLOCK_SIZE, (b + 1) * BLOCK_SIZE);
      const blockUnique = new Set(blockTokens).size;
      cumulativeBlockTtr += blockUnique / BLOCK_SIZE;
    }

    // Include remainder block if sufficiently large (>= 20 tokens)
    const remainderTokens = tokens.slice(numBlocks * BLOCK_SIZE);
    if (remainderTokens.length >= 20) {
      const remainderUnique = new Set(remainderTokens).size;
      const remainderTtr = remainderUnique / remainderTokens.length;
      const totalWeight = numBlocks * BLOCK_SIZE + remainderTokens.length;
      normalizedTTR =
        (cumulativeBlockTtr * BLOCK_SIZE + remainderTtr * remainderTokens.length) / totalWeight;
    } else {
      normalizedTTR = cumulativeBlockTtr / numBlocks;
    }
  } else {
    // For short texts (< 50 tokens), apply Guiraud-inspired exponent normalization
    // to prevent artificially inflated 1.0 TTR on short snippets
    normalizedTTR = Math.min(1.0, uniqueTokens / Math.pow(totalTokens, 0.88));
  }

  normalizedTTR = Math.round(normalizedTTR * 1000) / 1000;

  // -------------------------------------------------------------------------
  // Bigram Repetition Rate
  // -------------------------------------------------------------------------
  let repeatedBigrams = 0;
  if (totalTokens >= 4) {
    const bigrams: string[] = [];
    for (let i = 0; i < totalTokens - 1; i++) {
      bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
    }
    const uniqueBigrams = new Set(bigrams).size;
    repeatedBigrams = Math.max(0, 1 - uniqueBigrams / bigrams.length);
  }

  const repetitionRate = Math.round(repeatedBigrams * 1000) / 1000;

  return {
    totalTokens,
    uniqueTokens,
    typeTokenRatio,
    normalizedTTR,
    repetitionRate,
  };
}
