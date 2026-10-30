/**
 * Winnowing Fingerprint Algorithm (Schleimer et al.)
 * Fast local fingerprint selection for near-duplicate and verbatim text detection.
 * Inspired by NoplagLabs/noplag-engine and abautu/plagzap
 * Optimized with O(1) Rabin-Karp polynomial rolling hash and zero-allocation sliding window.
 */

import { WinnowingFingerprintMetrics } from '@/types/analysis';

const PRIME = 1000000007;
const BASE = 257;

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
  const len = sanitized.length;

  if (len < k) {
    return {
      kGramSize: k,
      windowSize: w,
      fingerprintsCount: 0,
      sampledFingerprints: [],
    };
  }

  const totalKgrams = len - k + 1;
  const hashes = new Int32Array(totalKgrams);

  // Precompute BASE^(k-1) % PRIME
  let basePow = 1;
  for (let p = 0; p < k - 1; p++) {
    basePow = (basePow * BASE) % PRIME;
  }

  // 1. First k-gram hash
  let currentHash = 0;
  for (let i = 0; i < k; i++) {
    currentHash = (currentHash * BASE + sanitized.charCodeAt(i)) % PRIME;
  }
  hashes[0] = currentHash;

  // 2. Rolling hash for remaining k-grams in O(1) time
  for (let i = 1; i < totalKgrams; i++) {
    const prevChar = sanitized.charCodeAt(i - 1);
    const nextChar = sanitized.charCodeAt(i + k - 1);
    const removed = (prevChar * basePow) % PRIME;
    currentHash = (currentHash - removed + PRIME) % PRIME;
    currentHash = (currentHash * BASE + nextChar) % PRIME;
    hashes[i] = currentHash;
  }

  // 3. Sliding window winnowing with zero array allocations
  const fingerprints: number[] = [];
  let minIndex = -1;

  for (let i = 0; i <= totalKgrams - w; i++) {
    let currentMin = hashes[i];
    let currentMinIdx = 0;

    for (let j = 1; j < w; j++) {
      const val = hashes[i + j];
      if (val <= currentMin) {
        currentMin = val;
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
