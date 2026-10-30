/**
 * Gemini Semantic & Grounding Service (Layer 2)
 * Clean Architecture: Application Service / Gateway to Google AI Studio (@google/genai)
 * 
 * Capabilities:
 * - Dynamic model selection via GEMINI_MODEL with automatic fallback
 * - Google Search Grounding (Web Grounding for live plagiarism & attribution verification)
 * - Grounding metadata extraction (web search queries, grounding chunks, URLs)
 * - Chain-of-Thought (CoT) Prompting with Bilingual Few-Shot Demonstrations
 * - Strict JSON parsing with Markdown code fence recovery
 * - Context window support up to 50,000 characters
 * 
 * Theoretical Framework:
 * - ahans30/Binoculars (Rhythm entropy and perplexity)
 * - trieuntu/VietAIDetector (Vietnamese morphological markers & clichés)
 * - houtini-ai/ai-detect (English heuristic markers)
 * - oldguard69/graduation-thesis (PhoBERT Semantic Paraphrase Detection)
 * - minhmo3004/PlagiarismGuard_demo (Unicode NFC & source cross-referencing)
 */

import { GoogleGenAI } from '@google/genai';
import {
  DetectedLanguage,
  GroundedSource,
  SemanticAnalysisBreakdown,
  RewriteRequestDto,
  RewriteOption,
} from '@/types/analysis';

export interface GeminiEvaluationInput {
  text: string;
  detectedLanguage: DetectedLanguage;
  sentenceCount: number;
  wordCount: number;
  burstinessVariance: number;
  burstinessScore: number;
  formulaicMarkerCount: number;
  normalizedTTR?: number;
  hapaxRatio?: number;
  yulesK?: number;
  punctuationEntropy?: number;
  eslDetected?: boolean;
  eslSignals?: string[];
  enableGrounding?: boolean;
}

export interface GeminiEvaluationResult {
  aiSlopScore: number;
  plagiarismScore: number;
  summary: string;
  breakdown: SemanticAnalysisBreakdown;
  sources: GroundedSource[];
  searchQueries: string[];
  modelUsed: string;
  fallbackTriggered: boolean;
}

const PRIMARY_MODEL_DEFAULT = 'gemini-3.8-flash';
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

/**
 * Executes semantic AI Slop & Plagiarism evaluation with Gemini and Google Search Grounding
 */
export async function evaluateWithGemini(
  input: GeminiEvaluationInput
): Promise<GeminiEvaluationResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not configured. Skipping Layer 2 Gemini evaluation.');
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });
  const configuredModel = process.env.GEMINI_MODEL || PRIMARY_MODEL_DEFAULT;

  const prompt = buildAnalysisPrompt(input);

  // Configure Google Search Tool for live plagiarism checking & Grounding
  // Note: On Google AI Studio Free Tier (unbilled projects), Search Grounding triggers 429 RESOURCE_EXHAUSTED.
  // We enable it when explicitly opted in via ENABLE_GROUNDING="true", otherwise default to fast LLM evaluation.
  const shouldEnableGrounding = process.env.ENABLE_GROUNDING === 'true' && input.enableGrounding !== false;

  const config = {
    tools: shouldEnableGrounding ? [{ googleSearch: {} }] : [],
    responseMimeType: 'application/json',
  };

  // 1. Attempt Primary Model Call with Grounding
  try {
    const result = await executeModelCall(ai, configuredModel, prompt, config, input);
    return result;
  } catch (primaryError) {
    const errMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
    console.warn(
      `Primary Gemini model (${configuredModel}) failed (${errMessage}). Attempting resilience fallbacks...`
    );

    // 2. Resilience Fallback A: If Search Grounding was active and triggered 429/ResourceExhausted or error,
    // retry the primary model WITHOUT Google Search Grounding tool (semantic LLM only)
    if (config.tools.length > 0) {
      try {
        console.info(`Retrying ${configuredModel} without Google Search Grounding to bypass Grounding tool quota...`);
        const noGroundingConfig = {
          tools: [] as Array<{ googleSearch: Record<string, never> }>,
          responseMimeType: 'application/json',
        };
        const ungroundedResult = await executeModelCall(ai, configuredModel, prompt, noGroundingConfig, input, false);
        return ungroundedResult;
      } catch (noGroundingError) {
        console.warn(
          `Retry without grounding on ${configuredModel} also failed:`,
          noGroundingError instanceof Error ? noGroundingError.message : noGroundingError
        );
      }
    }

    // 3. Resilience Fallback B: Attempt Fallback Model (gemini-3.5-flash-lite)
    if (configuredModel !== FALLBACK_MODEL) {
      try {
        const fallbackConfig = {
          tools: [] as Array<{ googleSearch: Record<string, never> }>,
          responseMimeType: 'application/json',
        };
        const fallbackResult = await executeModelCall(ai, FALLBACK_MODEL, prompt, fallbackConfig, input, true);
        return fallbackResult;
      } catch (fallbackError) {
        console.warn(
          `Fallback Gemini model (${FALLBACK_MODEL}) also failed:`,
          fallbackError instanceof Error ? fallbackError.message : fallbackError
        );
      }
    }

    return null;
  }
}

/**
 * Builds rigorous multilingual prompt context with Chain-of-Thought (CoT) reasoning,
 * Instruction Hierarchy, and bilingual Few-Shot demonstrations.
 */
function buildAnalysisPrompt(input: GeminiEvaluationInput): string {
  const isVi = input.detectedLanguage === 'vi';

  return `
[ROLE & SYSTEM IDENTITY]
You are an elite, dual-engine AI Slop & Plagiarism Attribution Auditor specializing in bilingual English and Vietnamese academic & journalistic evaluation.
Your methodology synthesizes foundational NLP research:
1. Binoculars & Perplexity/Burstiness: ahans30/Binoculars & vutuongvy101/multilingual-ai-human-text-detection (Evaluating sentence length variance σ², rhythm cadence, and entropy).
2. Clichés & Morphological AI Markers: trieuntu/VietAIDetector & houtini-ai/ai-detect (Formulaic openers, conversational filler, and stilted transitions).
3. Semantic Paraphrase & Attribution: oldguard69/graduation-thesis (PhoBERT Paraphrase Detection) & minhmo3004/PlagiarismGuard_demo (Cross-referencing web sources and detecting structural paraphrasing).
4. Advanced Stylometry & ESL Bias Guardrail: Liang et al. (Stanford 2023), Yule's Characteristic K, Hapax Legomena Ratio, and Punctuation Shannon Entropy (Controlling False Positive Rate FPR < 2% to protect non-native English learners and student writers).

---

[CHAIN-OF-THOUGHT (CoT) REASONING GUIDELINES]
Before formulating your final score, methodically execute these 4 reasoning steps:

STEP 1: SENTENCE RHYTHM & LENGTH ENTROPY ANALYSIS
- Examine sentence length variance across the text.
- Human writing is dynamic and bursty: short punchy remarks ("Chính xác.", "Not at all.") juxtaposed with sprawling, multi-clause explanations (producing variance σ² > 120).
- AI slop text is monotonous: sentences cluster uniformly between 18-25 words with low variance (σ² < 40) and low coefficient of variation.
- Note: Do NOT penalize authentic human concise writing (e.g., short dialogue or brief notes where mean length < 10 words).

STEP 2: CLICHÉ, FLUFF & EMPIRICAL DEPTH AUDITING
- Identify formulaic AI tropes:
  * Vietnamese: "trong kỷ nguyên số / 4.0", "đóng vai trò quan trọng/then chốt", "không thể không nhắc đến", "đặt ra một dấu hỏi lớn", "bệ phóng vững chắc", "bức tranh đa sắc màu", "chiếc cầu nối", "tạo tiền đề cho".
  * English: "in today's fast-paced digital world", "delve into the intricacies", "a tapestry of", "beacon of hope", "foster a culture of", "it is imperative that", "ever-evolving landscape", "testament to", "harness the power of".
- Scrutinize empirical grounding: Does the text contain concrete figures, verified names, specific dates, or personal lived experience? Or is it empty padding and high-level generalities?

STEP 3: ACTIVE GOOGLE SEARCH GROUNDING & WEB ATTRIBUTION
- Extract distinct, factual, or specialized sentences from the text.
- Execute targeted Google searches to cross-reference whether these statements match published articles, academic papers, Wikipedia, or news outlets.
- Distinguish between honest citations (proper quotation marks / attribution) vs. unattributed verbatim copying.

STEP 4: SEMANTIC PARAPHRASE DETECTION (PhoBERT Paraphrase Principles)
- Detect "spin" or structural borrowing: situations where the original source's argument outline and sentence clauses are retained, but words are replaced with synonyms.
- If the narrative mimics the exact chronological reasoning of an existing article without independent analysis, assign an elevated plagiarism score.

---

[FEW-SHOT DEMONSTRATIONS]

--- FEW-SHOT 1: VIETNAMESE AI SLOP vs HUMAN AUTHENTIC ---
Example 1A (AI Slop - Vietnamese):
"Trong kỷ nguyên số hóa 4.0 phát triển vượt bậc hiện nay, công nghệ điện toán đám mây đóng vai trò vô cùng quan trọng và là chiếc cầu nối thiết yếu. Không thể phủ nhận rằng công nghệ này như một bức tranh đa sắc màu, tạo tiền đề vững chắc cho các doanh nghiệp bứt phá ngoạn mục. Tóm lại, có thể thấy rằng việc áp dụng công nghệ là chìa khóa vàng mở ra chân trời mới."
CoT Audit:
- Step 1: 3 sentences, lengths: 24, 25, 20 words. Zero variance, monotonous cadence.
- Step 2: Saturated with clichés ("kỷ nguyên số hóa 4.0", "chiếc cầu nối thiết yếu", "bức tranh đa sắc màu", "tạo tiền đề", "chìa khóa vàng"). No concrete company or numbers cited.
- Step 3 & 4: Generic slop, no specific paper stolen.
Expected Output:
{
  "aiSlopScore": 92,
  "plagiarismScore": 10,
  "summary": "Văn bản mang đậm dấu ấn AI Slop với mật độ sáo ngữ dày đặc, nhịp điệu câu đều chằn chặn và hoàn toàn thiếu vắng dẫn chứng thực tế.",
  "rhythmScore": 90,
  "rhythmExplanation": "Độ dài câu dao động quanh mức 20-25 từ, đơn điệu và thiếu độ trồi sụt tự nhiên.",
  "fluffScore": 95,
  "fluffExplanation": "Chứa hàng loạt sáo ngữ kinh điển: kỷ nguyên số hóa, chiếc cầu nối, bức tranh đa sắc màu, chìa khóa vàng.",
  "depthScore": 88,
  "depthExplanation": "Chỉ đưa ra các nhận định chung chung, không có số liệu kỹ thuật hay ví dụ doanh nghiệp cụ thể.",
  "attributionScore": 10,
  "attributionExplanation": "Văn phong tổng hợp nhân tạo, không phát hiện sao chép nguyên văn từ nguồn cụ thể."
}

Example 1B (Human Authentic - Vietnamese):
"Hôm qua, nhóm kỹ thuật tụi mình thức trắng đêm debug cụm Kubernetes ở trung tâm dữ liệu Viettel IDC Sóng Thần. Đúng 3h sáng, cụm etcd bị mất quorum do lỗi đứt cáp quang nội bộ. Hậu quả là 40 service thanh toán bị nghẽn trong 18 phút. Cảm giác lúc đó thót tim thực sự, nhưng nhờ script failover tự động chuẩn bị từ tuần trước nên hệ thống kịp hồi phục."
CoT Audit:
- Step 1: Sentence lengths: 17, 14, 12, 19 words. Natural cadence with short human emotional reaction.
- Step 2: Specific entities (Kubernetes, Viettel IDC Sóng Thần, etcd quorum, 40 service, 18 phút). Real engineering experience.
- Step 3 & 4: Original personal testimony.
Expected Output:
{
  "aiSlopScore": 6,
  "plagiarismScore": 0,
  "summary": "Văn bản con người chân thực 100%, ghi chép trải nghiệm thực tế với số liệu, tên hệ thống và cảm xúc tự nhiên.",
  "rhythmScore": 15,
  "rhythmExplanation": "Nhịp điệu tự nhiên, có câu ngắn nhấn mạnh cảm xúc xen lẫn miêu tả kỹ thuật.",
  "fluffScore": 5,
  "fluffExplanation": "Hoàn toàn không có từ đệm sáo rỗng hay ẩn dụ khuôn mẫu.",
  "depthScore": 10,
  "depthExplanation": "Mức độ chi tiết kỹ thuật cao, dẫn chứng cụ thể về thời gian, địa điểm và tên sự cố.",
  "attributionScore": 0,
  "attributionExplanation": "Trải nghiệm cá nhân nguyên bản, không có dấu hiệu đạo văn."
}

--- FEW-SHOT 2: ENGLISH AI SLOP vs HUMAN AUTHENTIC ---
Example 2A (AI Slop - English):
"In today's fast-paced digital landscape, it is imperative to delve into the intricacies of artificial intelligence. This technological paradigm shift serves as a beacon of hope and stands as a testament to human ingenuity. By fostering a culture of innovation, organizations can seamlessly harness the power of machine learning across a rich tapestry of industries."
CoT Audit:
- Step 1: 3 sentences, 21, 19, 23 words. Perfectly uniform length.
- Step 2: Dense clustering of LLM cliché markers ("in today's fast-paced digital landscape", "delve into the intricacies", "beacon of hope", "testament to", "foster a culture", "seamlessly harness", "tapestry of industries"). Zero technical substance.
Expected Output:
{
  "aiSlopScore": 95,
  "plagiarismScore": 5,
  "summary": "Classic synthetic AI slop characterized by dense formulaic metaphors, mechanical sentence rhythms, and absence of verifiable data.",
  "rhythmScore": 92,
  "rhythmExplanation": "Sentence lengths are unnaturally uniform (19-23 words) with low entropy.",
  "fluffScore": 98,
  "fluffExplanation": "Contains quintessential AI tropes: 'delve into', 'beacon of hope', 'tapestry of industries'.",
  "depthScore": 90,
  "depthExplanation": "Superficial generalities with no technical architecture, framework, or metrics mentioned.",
  "attributionScore": 5,
  "attributionExplanation": "Generic generative model boilerplate without verbatim source replication."
}

Example 2B (Human Authentic - English):
"We stress-tested the new Postgres connection pooler on AWS m6i.2xlarge instances with pgbench yesterday. Throughput plateaued at 42,000 TPS because pgbouncer hit CPU saturation on a single core. Switching to odyssey resolved the bottleneck immediately. Our P99 latency plummeted from 84ms to 11ms."
CoT Audit:
- Step 1: Sentence lengths: 12, 11, 7, 8 words. Bursty, concise engineering log.
- Step 2: Real hardware specs (AWS m6i.2xlarge), specific benchmarks (pgbench, 42k TPS), concrete tools (pgbouncer, odyssey), and exact latency measurements (P99: 84ms -> 11ms).
Expected Output:
{
  "aiSlopScore": 4,
  "plagiarismScore": 0,
  "summary": "Authentic human technical memo with verifiable benchmark data, hardware specifications, and punchy cadence.",
  "rhythmScore": 12,
  "rhythmExplanation": "Crisp, concise sentence structures typical of experienced software engineers.",
  "fluffScore": 4,
  "fluffExplanation": "Completely free of rhetorical filler and AI clichés.",
  "depthScore": 8,
  "depthExplanation": "High empirical depth: specific tools, exact numbers, and verified benchmark metrics.",
  "attributionScore": 0,
  "attributionExplanation": "Original engineering benchmark report."
}

---

[LAYER 1 TELEMETRY FOR TEXT UNDER ANALYSIS]
- Detected Language: ${input.detectedLanguage}
- Sentence Count: ${input.sentenceCount}
- Word Count: ${input.wordCount}
- Sentence Length Variance (σ²): ${input.burstinessVariance} (Algorithmic Burstiness Score: ${input.burstinessScore}/100)
- Heuristic Cliché Markers Detected: ${input.formulaicMarkerCount}
${input.normalizedTTR !== undefined ? `- Normalized Lexical Diversity (STTR): ${input.normalizedTTR}` : ''}
${input.hapaxRatio !== undefined ? `- Hapax Legomena Ratio (V1 / N): ${input.hapaxRatio} (Human baseline: > 0.45, AI slop: < 0.30)` : ''}
${input.yulesK !== undefined ? `- Yule's Characteristic K: ${input.yulesK} (Vocabulary repetition index)` : ''}
${input.punctuationEntropy !== undefined ? `- Punctuation Shannon Entropy: ${input.punctuationEntropy} bits (Human expressive: > 1.8, Sterile AI: < 1.1)` : ''}
${input.eslDetected ? `- 🛡️ ESL / Apprentice Writer Guardrail ACTIVATED: Detected authentic non-native / student personal signals (${input.eslSignals?.join(', ') || 'personal experience'}). Strict instruction: Guard against false-positive AI slop classification.` : ''}

---

[INPUT TEXT TO ANALYZE]
"""
${input.text}
"""

---

[OUTPUT FORMAT REQUIREMENT]
Return ONLY a valid JSON object matching this schema. All text fields MUST be in ${isVi ? 'Vietnamese (tiếng Việt chuẩn)' : 'English'}:
{
  "aiSlopScore": number, // 0 to 100 (0 = authentic human, 100 = blatant AI slop)
  "plagiarismScore": number, // 0 to 100 (0 = completely original, 100 = uncredited copying/paraphrase)
  "summary": string, // 2-3 sentences synthesizing rhythm, authenticity, and plagiarism findings
  "rhythmScore": number, // 0 to 100 (high = artificially uniform cadence)
  "rhythmExplanation": string, // explanation of sentence rhythm and variance
  "fluffScore": number, // 0 to 100 (high = excessive clichés & empty filler)
  "fluffExplanation": string, // breakdown of formulaic markers found
  "depthScore": number, // 0 to 100 (high = superficial fluff, low = deep concrete details)
  "depthExplanation": string, // evaluation of empirical evidence, specific data, or real experience
  "attributionScore": number, // 0 to 100 (high = suspected plagiarism / semantic paraphrase)
  "attributionExplanation": string // verdict on originality and Google Search source comparison
}
`;
}

/**
 * Safely parses JSON response from Gemini, removing Markdown code fences if present.
 * Implements Error Recovery from prompt-engineering-patterns.
 */
function parseJsonSafely(raw: string): Record<string, unknown> {
  let cleaned = raw.trim();

  // Strip Markdown JSON code fences
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Find first '{' and last '}' to handle any incidental prefix/suffix text
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned) as Record<string, unknown>;
}

/**
 * Executes a single generateContent call and parses structured response and grounding metadata
 */
async function executeModelCall(
  ai: GoogleGenAI,
  modelName: string,
  prompt: string,
  config: { tools: Array<{ googleSearch: Record<string, never> }>; responseMimeType?: string },
  input: GeminiEvaluationInput,
  isFallback: boolean = false
): Promise<GeminiEvaluationResult> {
  // Guard with strict 9000ms timeout to prevent Vercel Serverless 10-15s Hobby timeout
  const timeoutMs = 9000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`GEMINI_TIMEOUT: Model ${modelName} exceeded ${timeoutMs}ms limit`)), timeoutMs)
  );

  const callPromise = ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config,
  });

  const response = await Promise.race([callPromise, timeoutPromise]);

  const responseText = response.text;
  if (!responseText) {
    throw new Error(`Empty response text received from model ${modelName}`);
  }

  const parsed = parseJsonSafely(responseText);

  // Extract candidate & groundingMetadata from response
  const candidate = response.candidates?.[0];
  const groundingMetadata = candidate?.groundingMetadata;

  const searchQueries: string[] = (groundingMetadata?.webSearchQueries as string[]) || [];
  const sources: GroundedSource[] = [];

  if (groundingMetadata?.groundingChunks && Array.isArray(groundingMetadata.groundingChunks)) {
    const seenUris = new Set<string>();

    for (let i = 0; i < groundingMetadata.groundingChunks.length; i++) {
      const chunk = groundingMetadata.groundingChunks[i];
      const web = chunk.web;
      if (!web || !web.uri) continue;

      if (seenUris.has(web.uri)) continue;
      seenUris.add(web.uri);

      let domain = 'web';
      try {
        domain = new URL(web.uri).hostname.replace(/^www\./, '');
      } catch {
        domain = web.domain || 'web';
      }

      sources.push({
        id: `source-${i + 1}-${Math.random().toString(36).slice(2, 7)}`,
        url: web.uri,
        title: web.title || domain,
        domain,
        similarityScore: Math.min(Math.round(Number(parsed.plagiarismScore ?? 30)), 100),
        matchedSnippetCount: 1,
        isConfirmedPlagiarism: Number(parsed.plagiarismScore ?? 0) >= 40,
      });
    }
  }

  const isVi = input.detectedLanguage === 'vi';

  const breakdown: SemanticAnalysisBreakdown = {
    rhythmAndEntropy: {
      score: Math.round(Number(parsed.rhythmScore ?? input.burstinessScore)),
      explanation:
        (parsed.rhythmExplanation as string) ||
        (isVi ? 'Độ trồi sụt và biến thiên nhịp điệu câu văn.' : 'Sentence length rhythm and entropy.'),
    },
    fluffAndFormulas: {
      score: Math.round(Number(parsed.fluffScore ?? 30)),
      explanation:
        (parsed.fluffExplanation as string) ||
        (isVi ? 'Mật độ sáo ngữ và từ đệm AI.' : 'Cliché and formulaic filler density.'),
    },
    reasoningDepth: {
      score: Math.round(Number(parsed.depthScore ?? 30)),
      explanation:
        (parsed.depthExplanation as string) ||
        (isVi ? 'Độ sâu luận điểm và dẫn chứng thực tế.' : 'Argumentative depth and empirical evidence.'),
    },
    attributionIntegrity: {
      score: Math.round(Number(parsed.attributionScore ?? (sources.length > 0 ? 50 : 10))),
      explanation:
        (parsed.attributionExplanation as string) ||
        (isVi ? 'Tính nguyên bản và nguồn tham chiếu.' : 'Attribution integrity and web grounding.'),
    },
  };

  return {
    aiSlopScore: Math.min(Math.max(Math.round(Number(parsed.aiSlopScore ?? 0)), 0), 100),
    plagiarismScore: Math.min(Math.max(Math.round(Number(parsed.plagiarismScore ?? 0)), 0), 100),
    summary:
      (parsed.summary as string) ||
      (isVi ? 'Hoàn thành phân tích ngữ nghĩa chuyên sâu.' : 'Completed semantic evaluation.'),
    breakdown,
    sources,
    searchQueries,
    modelUsed: modelName,
    fallbackTriggered: isFallback,
  };
}

// -----------------------------------------------------------------------------
// ONE-CLICK DE-SLOP & MULTI-TONE REWRITER (Gemini 3.8 Flash + 8s Timeout)
// -----------------------------------------------------------------------------

export interface RewriterServiceResult {
  options: RewriteOption[];
  modelUsed: string;
  fallbackTriggered: boolean;
  latencyMs: number;
}

const REWRITE_TIMEOUT_MS = 8000;

/**
 * Executes multi-tone de-slop rewrite with Gemini and 8-second timeout protection
 */
export async function rewriteSentenceWithGemini(
  dto: RewriteRequestDto
): Promise<RewriterServiceResult> {
  const startTime = performance.now();
  const apiKey = process.env.GEMINI_API_KEY;
  const configuredModel = process.env.GEMINI_MODEL || PRIMARY_MODEL_DEFAULT;

  // If no API key configured, use high-quality heuristic de-slopping immediately
  if (!apiKey) {
    const options = generateHeuristicRewrites(dto);
    return {
      options,
      modelUsed: 'Heuristic Rule-Based Engine (No API Key)',
      fallbackTriggered: true,
      latencyMs: Math.round((performance.now() - startTime) * 100) / 100,
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildRewritePrompt(dto);
  const config = {
    responseMimeType: 'application/json',
  };

  // 1. Attempt Primary Model with 8s timeout
  try {
    const result = await executeRewriteCall(ai, configuredModel, prompt, config, dto);
    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      options: result,
      modelUsed: configuredModel,
      fallbackTriggered: false,
      latencyMs,
    };
  } catch (primaryErr) {
    console.warn(
      `Primary model (${configuredModel}) rewrite failed, attempting fallback to ${FALLBACK_MODEL}:`,
      primaryErr instanceof Error ? primaryErr.message : primaryErr
    );

    // 2. Attempt Fallback Model
    if (configuredModel !== FALLBACK_MODEL) {
      try {
        const fallbackResult = await executeRewriteCall(ai, FALLBACK_MODEL, prompt, config, dto);
        const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
        return {
          options: fallbackResult,
          modelUsed: FALLBACK_MODEL,
          fallbackTriggered: true,
          latencyMs,
        };
      } catch (fallbackErr) {
        console.warn(
          `Fallback model (${FALLBACK_MODEL}) rewrite failed:`,
          fallbackErr instanceof Error ? fallbackErr.message : fallbackErr
        );
      }
    }

    // 3. Graceful degradation to Algorithmic De-slop Engine
    const options = generateHeuristicRewrites(dto);
    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      options,
      modelUsed: 'Heuristic Algorithmic Engine (API Fallback)',
      fallbackTriggered: true,
      latencyMs,
    };
  }
}

/**
 * Builds rigorous Anti-slop Prompt with Instruction Hierarchy and Few-Shot Examples
 */
function buildRewritePrompt(dto: RewriteRequestDto): string {
  const isVi = dto.language === 'vi';

  return `
You are a master bilingual editor and Anti-slop stylistic specialist in ${isVi ? 'Vietnamese' : 'English'}.
Your mission is to liberate the following sentence from AI-generated formulaic fluff, robotic cadence, and synthetic clichés, providing 3 distinct, authentic human variations.

TARGET SENTENCE:
"${dto.sentence}"

${dto.context ? `CONTEXT (SURROUNDING TEXT FOR COHERENCE):\n"${dto.context}"\n` : ''}
${dto.violationReason ? `DETECTED SLOP / FLAW:\n${dto.violationReason}\n` : ''}

STRICT PROHIBITION LIST - NEVER USE THESE SYNTHETIC CLICHÉS:
${isVi ? `
- "trong thời đại số", "trong kỷ nguyên 4.0", "trong bối cảnh hiện nay"
- "đóng vai trò quan trọng", "then chốt", "thiết yếu", "cốt lõi"
- "không thể phủ nhận rằng", "không thể không nhắc đến"
- "bước tiến vượt bậc", "bước đột phá ngoạn mục"
- "như một bức tranh đa sắc màu", "như một chiếc cầu nối"
- "đặt ra một dấu hỏi lớn", "bệ phóng vững chắc", "chìa khóa vạn năng"
` : `
- "in today's fast-paced digital world", "in the modern era"
- "delve into the intricacies", "delve deeper"
- "a rich tapestry of", "a testament to", "beacon of hope"
- "it is crucial/imperative to note", "furthermore/moreover" overused
- "foster a culture of", "harness the power of", "ever-evolving landscape"
`}

GENERATE EXACTLY 3 DISTINCT TONES:

1. TONE "concise" (${isVi ? 'Súc tích & Trực diện' : 'Concise & Direct'}):
   - Cut word count by 30-50%. Strip all boilerplate adverbs and bloated transitions.
   - Use direct subject-verb structure. Make the core action immediate and unambiguous.

2. TONE "narrative" (${isVi ? 'Kể chuyện & Trải nghiệm' : 'Narrative & Experiential'}):
   - Frame the thought from human reality, observation, or lived experience.
   - High burstiness (mix short/long cadence). Sounds like an insightful practitioner speaking to a colleague.

3. TONE "academic" (${isVi ? 'Học thuật Sắc bén' : 'Sharp & Academic'}):
   - Replace generic metaphors with precise domain terminology.
   - Analytical, measured, objective. Explains causality without hyperbole.

FEW-SHOT EXAMPLES:
${isVi ? `
Example 1:
Input: "Trong thời đại số 4.0, công nghệ AI đóng vai trò then chốt và là bước tiến vượt bậc không thể phủ nhận."
Concise: "Trí tuệ nhân tạo đang định hình lại phương thức vận hành của hầu hết ngành công nghiệp."
Narrative: "Khi bắt tay vào thử nghiệm AI thực tế, chúng tôi thấy rõ máy móc đã vượt khỏi giai đoạn trình diễn phòng lab."
Academic: "Sự thâm nhập của các mô hình học sâu đã làm thay đổi căn bản cấu trúc chi phí và năng suất lao động."
` : `
Example 2:
Input: "In today's fast-paced digital world, it is crucial to delve into AI as a testament to human ingenuity."
Concise: "Modern AI drastically reduces repetitive cognitive labor across industries."
Narrative: "When we deployed these models last year, our team immediately noticed how the daily engineering workflow shifted."
Academic: "Empirical evaluations indicate that generative architectures substantially lower task completion latency in data processing."
`}

OUTPUT FORMAT:
Return a STRICT JSON object with this exact shape:
{
  "options": [
    {
      "tone": "concise",
      "toneLabel": "${isVi ? 'Súc tích & Trực diện' : 'Concise & Direct'}",
      "rewrittenText": "string",
      "rationale": "string (${isVi ? 'giải thích ngắn cách đã khử sáo ngữ' : 'short explanation of how slop was eliminated'})"
    },
    {
      "tone": "narrative",
      "toneLabel": "${isVi ? 'Kể chuyện & Trải nghiệm' : 'Narrative & Experiential'}",
      "rewrittenText": "string",
      "rationale": "string"
    },
    {
      "tone": "academic",
      "toneLabel": "${isVi ? 'Học thuật Sắc bén' : 'Sharp & Academic'}",
      "rewrittenText": "string",
      "rationale": "string"
    }
  ]
}
`;
}

/**
 * Dispatches the rewrite request with an enforced 8-second timeout guard
 */
async function executeRewriteCall(
  ai: GoogleGenAI,
  modelName: string,
  prompt: string,
  config: { responseMimeType: string },
  dto: RewriteRequestDto
): Promise<RewriteOption[]> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`REWRITE_TIMEOUT: Model ${modelName} exceeded ${REWRITE_TIMEOUT_MS}ms limit`)),
      REWRITE_TIMEOUT_MS
    )
  );

  const callPromise = ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config,
  });

  const response = await Promise.race([callPromise, timeoutPromise]);
  const text = response.text;

  if (!text) {
    throw new Error(`Empty response from model ${modelName}`);
  }

  const parsed = parseJsonSafely(text);
  const options = parsed.options as RewriteOption[] | undefined;

  if (!Array.isArray(options) || options.length === 0) {
    throw new Error('Model returned invalid or empty options array');
  }

  // Validate and sanitize each option
  return options.slice(0, 3).map((opt, idx) => {
    const tone: 'concise' | 'narrative' | 'academic' =
      opt.tone === 'concise' || opt.tone === 'narrative' || opt.tone === 'academic'
        ? opt.tone
        : idx === 0
        ? 'concise'
        : idx === 1
        ? 'narrative'
        : 'academic';

    const defaultLabelsVi = {
      concise: 'Súc tích & Trực diện',
      narrative: 'Kể chuyện & Trải nghiệm',
      academic: 'Học thuật Sắc bén',
    };

    const defaultLabelsEn = {
      concise: 'Concise & Direct',
      narrative: 'Narrative & Experiential',
      academic: 'Sharp & Academic',
    };

    const labels = dto.language === 'vi' ? defaultLabelsVi : defaultLabelsEn;

    return {
      tone,
      toneLabel: opt.toneLabel || labels[tone],
      rewrittenText: (opt.rewrittenText || '').trim(),
      rationale: (opt.rationale || '').trim(),
    };
  });
}

/**
 * Algorithmic Heuristic Fallback Engine
 * Generates 3 clean variations using grammar transforms and marker stripping
 */
export function generateHeuristicRewrites(dto: RewriteRequestDto): RewriteOption[] {
  const isVi = dto.language === 'vi';
  const sentence = dto.sentence.trim();

  // Strip punctuation at end
  const endsWithPeriod = /[.!?]$/.test(sentence);
  const core = sentence.replace(/[.!?]+$/, '').trim();

  if (isVi) {
    // Vietnamese Heuristic Cleaning
    let cleaned = core
      .replace(/(?:trong\s+(?:thời\s+đại|kỷ\s+nguyên)\s+[\w\s.0-9]+?[,\s]*)/gi, '')
      .replace(/(?:không\s+thể\s+(?:phủ\s+nhận|bàn\s+cãi)\s+rằng[,\s]*)/gi, '')
      .replace(/(?:không\s+thể\s+không\s+nhắc\s+đến[,\s]*)/gi, '')
      .replace(/(?:có\s+thể\s+thấy\s+rằng[,\s]*)/gi, '')
      .replace(/đóng\s+vai\s+trò\s+(?:vô\s+cùng\s+)?(?:quan\s+trọng|then\s+chốt|cốt\s+lõi|thiết\s+yếu)\s*(?:và\s+)?(?:là\s+)?/gi, 'tác động trực tiếp đến ')
      .replace(/như\s+một\s+(?:chiếc\s+)?cầu\s+nối\s+(?:thiết\s+yếu\s+)?giữa/gi, 'kết nối ')
      .replace(/như\s+một\s+bức\s+tranh\s+đa\s+sắc\s+màu/gi, 'phản ánh nhiều khía cạnh đa dạng')
      .replace(/bước\s+tiến\s+(?:vượt\s+bậc|ngoạn\s+mục)/gi, 'bước phát triển rõ rệt')
      .trim();

    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    return [
      {
        tone: 'concise',
        toneLabel: 'Súc tích & Trực diện',
        rewrittenText: `${cleaned}${endsWithPeriod ? '.' : ''}`,
        rationale: 'Loại bỏ hoàn toàn các liên từ mở đầu sáo rỗng và các cụm từ phô trương ("đóng vai trò quan trọng", "kỷ nguyên số").',
      },
      {
        tone: 'narrative',
        toneLabel: 'Kể chuyện & Trải nghiệm',
        rewrittenText: `Qua trải nghiệm thực tế, ${cleaned.charAt(0).toLowerCase() + cleaned.slice(1)}${endsWithPeriod ? '.' : ''}`,
        rationale: 'Đưa góc nhìn người thật việc thật vào câu văn, tạo nhịp điệu tự nhiên và đáng tin cậy.',
      },
      {
        tone: 'academic',
        toneLabel: 'Học thuật Sắc bén',
        rewrittenText: `Dữ liệu thực nghiệm cho thấy ${cleaned.charAt(0).toLowerCase() + cleaned.slice(1)}${endsWithPeriod ? '.' : ''}`,
        rationale: 'Chuyển hóa nhận định chung chung thành luận điểm phân tích dựa trên cơ sở dữ liệu khách quan.',
      },
    ];
  } else {
    // English Heuristic Cleaning
    let cleaned = core
      .replace(/(?:in\s+today'?s\s+[\w\s-]+?world[,\s]*)/gi, '')
      .replace(/(?:it\s+is\s+(?:crucial|essential|imperative|worth\s+noting)\s+to\s+(?:note|remember|consider)\s+(?:that)?\s*)/gi, '')
      .replace(/(?:furthermore|moreover|consequently)[,\s]*/gi, '')
      .replace(/delve\s+(?:into|deeper\s+into)/gi, 'examine')
      .replace(/a\s+rich\s+tapestry\s+of/gi, 'a complex mix of')
      .replace(/a\s+testament\s+to/gi, 'evidence of')
      .replace(/beacon\s+of\s+hope/gi, 'clear indicator')
      .replace(/harness\s+the\s+power\s+of/gi, 'use')
      .trim();

    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    return [
      {
        tone: 'concise',
        toneLabel: 'Concise & Direct',
        rewrittenText: `${cleaned}${endsWithPeriod ? '.' : ''}`,
        rationale: 'Eliminated formulaic introductory fluff ("in today\'s world", "it is crucial to note") and prioritized active verbs.',
      },
      {
        tone: 'narrative',
        toneLabel: 'Narrative & Experiential',
        rewrittenText: `In practice, ${cleaned.charAt(0).toLowerCase() + cleaned.slice(1)}${endsWithPeriod ? '.' : ''}`,
        rationale: 'Anchored the statement with human practitioner experience and natural cadence.',
      },
      {
        tone: 'academic',
        toneLabel: 'Sharp & Academic',
        rewrittenText: `Empirical evidence indicates that ${cleaned.charAt(0).toLowerCase() + cleaned.slice(1)}${endsWithPeriod ? '.' : ''}`,
        rationale: 'Replaced hyperbole with objective, causality-focused academic tone.',
      },
    ];
  }
}
