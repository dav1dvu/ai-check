/**
 * Winnowing Fingerprint Algorithm (Schleimer et al.)
 * Fast local fingerprint selection for near-duplicate and verbatim text detection.
 * Inspired by NoplagLabs/noplag-engine and abautu/plagzap
 */

import { WinnowingFingerprintMetrics } from '@/types/analysis';

/**
 * Polynomial rolling hash (Rabin-Karp variant)
 */
function hashKgram(kgram: string): number {
  let hash = 0;
  const prime = 1000000007;
  const base = 257;

  for (let i = 0; i < kgram.length; i++) {
    hash = (hash * base + kgram.charCodeAt(i)) % prime;
  }
  return hash;
}

/**
 * Extracts k-grams and selects min-hashes in sliding windows of size w.
 */
export function extractWinnowingFingerprints(
  text: string,
  k: number = 25, // k-gram character length
  w: number = 10  // window size
): WinnowingFingerprintMetrics {
  // Strip non-alphanumeric characters for robust structural comparison
  const sanitized = text.toLowerCase().replace(/\s+/g, '');

  if (sanitized.length < k) {
    return {
      kGramSize: k,
      windowSize: w,
      fingerprintsCount: 0,
      sampledFingerprints: [],
    };
  }

  // 1. Generate hashes of all k-grams
  const hashes: number[] = [];
  for (let i = 0; i <= sanitized.length - k; i++) {
    const kgram = sanitized.substring(i, i + k);
    hashes.push(hashKgram(kgram));
  }

  // 2. Sliding window winnowing
  const fingerprints: number[] = [];
  let minIndex = -1;

  for (let i = 0; i <= hashes.length - w; i++) {
    const window = hashes.slice(i, i + w);
    let currentMin = window[0];
    let currentMinIdx = 0;

    for (let j = 1; j < window.length; j++) {
      if (window[j] <= currentMin) {
        currentMin = window[j];
        currentMinIdx = j;
      }
    }

    const absoluteMinIdx = i + currentMinIdx;
    if (absoluteMinIdx !== minIndex) {
      fingerprints.push(currentMin);
      minIndex = absoluteMinIdx;
    }
  }

  return {
    kGramSize: k,
    windowSize: w,
    fingerprintsCount: fingerprints.length,
    sampledFingerprints: fingerprints.slice(0, 50), // Store sample
  };
}

/**
 * Calculates Jaccard similarity between two sets of fingerprints
 */
export function calculateFingerprintSimilarity(
  fpA: number[],
  fpB: number[]
): number {
  if (fpA.length === 0 || fpB.length === 0) return 0;

  const setA = new Set(fpA);
  const setB = new Set(fpB);

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersection++;
    }
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : Math.round((intersection / union) * 1000) / 1000;
}
