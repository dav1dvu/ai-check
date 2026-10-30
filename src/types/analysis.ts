/**
 * AI Slop & Plagiarism Detector (EN & VI)
 * Clean Architecture: Domain Entities & Data Transfer Objects
 * 
 * Based on research synthesis from:
 * - ahans30/Binoculars (Perplexity, Rhythm & Entropy)
 * - trieuntu/VietAIDetector (Vietnamese AI Clichés & Morphological markers)
 * - vutuongvy101/multilingual-ai-human-text-detection (Burstiness, TTR)
 * - houtini-ai/ai-detect (Heuristic marker density)
 * - NoplagLabs/noplag-engine (Winnowing Fingerprinting)
 * - abautu/plagzap (LCS & Character Offset Highlights)
 * - minhmo3004/PlagiarismGuard_demo (Vietnamese Unicode NFC Normalization)
 * - oldguard69/graduation-thesis (Semantic & Paraphrase Plagiarism)
 */

export type SupportedLanguage = 'vi' | 'en' | 'auto';

export type DetectedLanguage = 'vi' | 'en' | 'unknown';

export type SeverityLevel = 'low' | 'medium' | 'high';

export type SegmentType = 
  | 'ai_slop'             // Formulaic AI writing, generic tone, fluff
  | 'formulaic_marker'    // Specific repetitive transitional clichés
  | 'unnatural_rhythm'    // Monotonous sentence length distribution
  | 'plagiarism_verbatim' // Word-for-word string overlap
  | 'plagiarism_paraphrase' // Semantic rewording with identical structure
  | 'human_authentic';    // High burstiness, personal nuance

export type AiVerdict = 
  | 'likely_human'        // 0 - 25% AI probability
  | 'mixed_or_edited'     // 26 - 60% AI probability (human edited AI, or AI polished human)
  | 'likely_ai'           // 61 - 85% AI probability
  | 'highly_synthetic';   // 86 - 100% AI probability

export type PlagiarismVerdict = 
  | 'original'            // 0 - 15% similarity
  | 'minor_overlaps'      // 16 - 35% common phrases or brief citations
  | 'moderate_plagiarism' // 36 - 65% suspicious paraphrasing or copying
  | 'heavy_plagiarism';   // 66 - 100% widespread uncredited replication

/**
 * Character-offset highlight segment for precise UI rendering (inspired by PlagZap)
 */
export interface HighlightSegment {
  id: string;
  startOffset: number;    // Absolute 0-based character index in original text
  endOffset: number;      // Absolute 0-based character index end (exclusive)
  textSnippet: string;    // Substring slice matching offsets
  type: SegmentType;
  severity: SeverityLevel;
  confidence: number;     // 0.0 to 1.0
  reason: string;         // Human explanation in active UI language
  suggestion?: string;    // Natural human rewrite suggestion
  matchedSourceUrl?: string;
  matchedSourceTitle?: string;
  matchedSimilarity?: number; // 0.0 to 1.0
  matchedSnippet?: string;    // Web excerpt snippet for live citation side-by-side comparison
}

/**
 * Layer 1 Metrics: Ultra-fast TypeScript Algorithmic Evaluation (<15ms)
 */
export interface BurstinessMetrics {
  sentenceCount: number;
  meanLength: number;         // Mean sentence length in characters or words
  variance: number;           // Variance of sentence length
  standardDeviation: number;  // Standard deviation
  score: number;              // 0-100 normalized score (low variance = high AI slop likelihood)
}

export interface LexicalMetrics {
  totalTokens: number;
  uniqueTokens: number;
  typeTokenRatio: number;     // TTR = unique / total (0.0 - 1.0)
  normalizedTTR: number;      // Length-normalized TTR (STTR / Segmental, 0.0 - 1.0)
  repetitionRate: number;     // Proportion of repeated n-grams
  hapaxRatio?: number;        // Hapax Legomena ratio (V1 / N)
  yulesK?: number;            // Yule's characteristic K measure
}

export interface StylometryMetrics {
  hapaxRatio: number;          // Hapax Legomena ratio (V1 / N, 0.0 - 1.0)
  yulesK: number;              // Yule's characteristic K measure
  punctuationEntropy: number;  // Shannon entropy of punctuation distribution (in bits)
  punctuationCount: number;    // Total punctuation marks analyzed
  distinctPunctuationCount: number; // Distinct punctuation mark categories observed
  hasExpressivePunctuation: boolean; // Presence of human expressive marks (semicolon, dash, colon, parenthesis, ellipsis)
}

export interface EslGuardrailMetrics {
  isEslDetected: boolean;      // True if authentic non-native / apprentice writing is recognized
  confidence: number;          // 0.0 to 1.0
  mitigationApplied: boolean;  // True if 0.5x penalty reduction was applied
  signals: string[];           // Linguistic triggers observed (e.g. personal experience, emotions)
  explanation: string;         // Human-readable rationale in active UI language
}

export interface HeuristicMarkerMetrics {
  markerCount: number;
  markerDensity: number;      // Markers per 100 words
  totalMarkerWeight: number;  // Cumulative severity weight
  detectedMarkers: Array<{
    term: string;
    count: number;
    category: 'cliche' | 'filler' | 'stilted_transition' | 'hedging';
    suggestion?: string;
  }>;
}

export interface WinnowingFingerprintMetrics {
  kGramSize: number;
  windowSize: number;
  fingerprintsCount: number;
  sampledFingerprints: number[];
}

export interface FastAlgorithmicEvaluation {
  burstiness: BurstinessMetrics;
  lexical: LexicalMetrics;
  heuristics: HeuristicMarkerMetrics;
  fingerprint: WinnowingFingerprintMetrics;
  stylometry?: StylometryMetrics;       // Advanced stylometric profiling (Hapax, Yule's K, Punctuation Entropy)
  eslGuardrail?: EslGuardrailMetrics;   // Non-native / apprentice human false-positive guardrail
  hapaxRatio?: number;                 // Top-level shortcut for V1 / N
  yulesK?: number;                     // Top-level shortcut for Yule's K
  punctuationEntropy?: number;         // Top-level shortcut for punctuation Shannon entropy
  heuristicAiScore: number;            // 0 - 100 preliminary score
  computedInMs: number;
}

/**
 * Layer 2: Web-grounded Source Citation (Gemini Google Search Grounding)
 */
export interface GroundedSource {
  id: string;
  url: string;
  title: string;
  snippet?: string;
  domain: string;
  similarityScore: number;      // 0 - 100
  matchedSnippetCount: number;
  isConfirmedPlagiarism: boolean;
}

/**
 * Semantic breakdown from Gemini Model
 */
export interface SemanticAnalysisBreakdown {
  rhythmAndEntropy: {
    score: number;              // 0 - 100 (high = artificial)
    explanation: string;
  };
  fluffAndFormulas: {
    score: number;              // 0 - 100
    explanation: string;
  };
  reasoningDepth: {
    score: number;              // 0 - 100 (high = superficial generalizations)
    explanation: string;
  };
  attributionIntegrity: {
    score: number;              // 0 - 100 (high = suspected plagiarism)
    explanation: string;
  };
}

/**
 * Complete Domain Analysis Result
 */
export interface AnalysisResult {
  id: string;
  createdAt: string;            // ISO timestamp
  language: DetectedLanguage;
  characterCount: number;
  wordCount: number;
  sentenceCount: number;
  readingTimeMinutes: number;

  // Aggregate Scores (0 - 100)
  aiSlopScore: number;
  plagiarismScore: number;
  humanAuthenticityScore: number;

  // Verdicts
  aiVerdict: AiVerdict;
  plagiarismVerdict: PlagiarismVerdict;

  // Highlights & Segments for UI Dual-panel view
  segments: HighlightSegment[];

  // Algorithmic Data (Layer 1)
  algorithmicMetrics: FastAlgorithmicEvaluation;

  // Semantic & Grounding Data (Layer 2)
  sources: GroundedSource[];
  searchQueries?: string[];     // Google Search queries triggered by Gemini Grounding
  modelUsed?: string;           // LLM model that generated the semantic verdict
  breakdown: SemanticAnalysisBreakdown;
  executiveSummary: string;     // Multi-sentence synthesis in detected language

  // Performance Telemetry
  timing: {
    layer1Ms: number;
    layer2Ms: number;
    totalMs: number;
  };
}

/**
 * Client Document Parsing Result
 */
export interface ParsedDocument {
  fileName: string;
  fileSize: number;             // in bytes
  fileType: 'docx' | 'pdf' | 'txt' | 'md';
  rawText: string;
  cleanedText: string;
  wordCount: number;
  charCount: number;
  extractedAt: string;
  warnings?: string[];
}

/**
 * API Request Data Transfer Object (DTO)
 */
export interface AnalyzeRequestDto {
  text: string;
  language?: SupportedLanguage;
  options?: {
    checkAiSlop?: boolean;
    checkPlagiarism?: boolean;
    enableGrounding?: boolean;
    sensitivity?: 'low' | 'medium' | 'high';
  };
}

/**
 * API Response Data Transfer Object (DTO)
 */
export interface AnalyzeResponseDto {
  success: boolean;
  data?: AnalysisResult;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * One-Click De-slop & Multi-Tone Rewriter DTOs
 */
export type RewriteTone = 'concise' | 'narrative' | 'academic';

export interface RewriteOption {
  tone: RewriteTone;
  toneLabel: string;
  rewrittenText: string;
  rationale: string;
}

export interface RewriteRequestDto {
  sentence: string;
  context?: string;
  language: 'vi' | 'en';
  violationReason?: string;
}

export interface RewriteResponseDto {
  success: boolean;
  options?: RewriteOption[];
  data?: {
    sentence: string;
    options: RewriteOption[];
    modelUsed?: string;
    latencyMs?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

