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

const PRIMARY_MODEL_DEFAULT = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.5-flash-lite';

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
  const config = {
    tools: input.enableGrounding !== false ? [{ googleSearch: {} }] : [],
    responseMimeType: 'application/json',
  };

  // Attempt Primary Model Call
  try {
    const result = await executeModelCall(ai, configuredModel, prompt, config, input);
    return result;
  } catch (primaryError) {
    console.warn(
      `Primary Gemini model (${configuredModel}) failed. Attempting fallback to ${FALLBACK_MODEL}:`,
      primaryError instanceof Error ? primaryError.message : primaryError
    );

    // Attempt Fallback Model Call
    if (configuredModel !== FALLBACK_MODEL) {
      try {
        const fallbackResult = await executeModelCall(ai, FALLBACK_MODEL, prompt, config, input, true);
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
  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config,
  });

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
