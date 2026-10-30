/**
 * Layer 1 Lightweight Algorithmic Engine (Composite)
 * Executes in < 15ms. Zero database, zero heavy ML models, 100% Vercel Serverless compatible.
 */

import { calculateBurstiness, calculateLexicalDiversity } from './burstiness';
import { extractWinnowingFingerprints } from './winnowing';
import { scanHeuristicMarkers } from './regex-markers';
import { normalizeText } from './normalizer';
import { FastAlgorithmicEvaluation, HighlightSegment } from '@/types/analysis';

export * from './normalizer';
export * from './burstiness';
export * from './winnowing';
export * from './regex-markers';

export interface FastEvaluationOutput {
  metrics: FastAlgorithmicEvaluation;
  segments: HighlightSegment[];
}

export function runFastAlgorithmicEvaluation(
  rawText: string,
  preferredLang: 'vi' | 'en' = 'vi'
): FastEvaluationOutput {
  const startTime = performance.now();
  const normalized = normalizeText(rawText);

  // 1. Calculate sentence burstiness & variance
  const burstiness = calculateBurstiness(normalized);

  // 2. Calculate lexical diversity & repetition
  const lexical = calculateLexicalDiversity(normalized);

  // 3. Extract Winnowing fingerprints
  const fingerprint = extractWinnowingFingerprints(normalized);

  // 4. Scan regex markers for AI clichés
  const { metrics: heuristics, segments } = scanHeuristicMarkers(normalized, preferredLang);

  // 5. Compute combined heuristic AI score (0 - 100)
  // Higher = more synthetic (calibrated via Binoculars rhythm + VietAIDetector/houtini markers)
  let score = 0;
  score += burstiness.score * 0.35; // 35% weight on sentence rhythm uniformity
  
  // Marker presence: combined signal of marker density and cumulative severity weight
  const markerSignal = (heuristics.markerDensity * 12) + (heuristics.totalMarkerWeight * 0.7);
  score += Math.min(markerSignal, 55); // Up to 55% based on heuristic AI markers

  // Use length-normalized TTR to penalize repetitive / restricted vocabulary without bias against long texts
  if (lexical.normalizedTTR < 0.60 && lexical.totalTokens >= 40) {
    score += 10; // Low normalized vocabulary diversity penalty
  }
  const heuristicAiScore = Math.min(Math.max(Math.round(score), 0), 100);

  const endTime = performance.now();
  const computedInMs = Math.round((endTime - startTime) * 100) / 100;

  return {
    metrics: {
      burstiness,
      lexical,
      heuristics,
      fingerprint,
      heuristicAiScore,
      computedInMs,
    },
    segments,
  };
}
