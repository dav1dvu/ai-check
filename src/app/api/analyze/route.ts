/**
 * AI Slop & Plagiarism Detector - Analyze Route Handler
 * Architecture: Web Adapter / Controller (Clean Architecture)
 * 
 * Coordinates:
 * - Layer 1: Fast Algorithmic Evaluation (< 15ms)
 * - Layer 2: Semantic & Google Search Grounding Service (Gemini)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  AnalyzeRequestDto,
  AnalyzeResponseDto,
  AnalysisResult,
  DetectedLanguage,
  AiVerdict,
  PlagiarismVerdict,
  GroundedSource,
} from '@/types/analysis';
import {
  runFastAlgorithmicEvaluation,
  normalizeText,
  splitIntoSentences,
  performLiveWebPlagiarismSearch,
} from '@/lib/algorithms';
import { evaluateWithGemini } from '@/lib/ai/gemini-service';

// Vercel Serverless maximum execution duration (in seconds)
export const maxDuration = 60;

// Ensure this route handler is strictly dynamic and not statically cached
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponseDto>> {
  const overallStartTime = performance.now();

  try {
    let body: AnalyzeRequestDto;
    try {
      body = (await request.json()) as AnalyzeRequestDto;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Dữ liệu yêu cầu không đúng định dạng JSON hợp lệ.',
          },
        },
        { status: 400 }
      );
    }

    // 1. Input Validation
    if (!body || !body.text || typeof body.text !== 'string' || body.text.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Vui lòng cung cấp nội dung văn bản hợp lệ (text must be a non-empty string).',
          },
        },
        { status: 400 }
      );
    }

    const rawText = body.text.trim();
    if (rawText.length < 30) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TEXT_TOO_SHORT',
            message: 'Đoạn văn bản quá ngắn để phân tích tin cậy. Vui lòng nhập tối thiểu 30 ký tự.',
          },
        },
        { status: 400 }
      );
    }

    if (rawText.length > 50000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TEXT_TOO_LONG',
            message: 'Văn bản vượt quá giới hạn phân tích tối đa (50,000 ký tự).',
          },
        },
        { status: 400 }
      );
    }

    // 2. Preprocessing & Language Detection
    const normalized = normalizeText(rawText);
    const sentences = splitIntoSentences(normalized);
    const words = normalized.split(/\s+/).filter(Boolean);

    const vietnameseCharPattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    const isVietnamese = body.language === 'vi' || (body.language !== 'en' && vietnameseCharPattern.test(normalized));
    const detectedLanguage: DetectedLanguage = isVietnamese ? 'vi' : 'en';

    // -------------------------------------------------------------------------
    // 3. LAYER 1: Fast Algorithmic Evaluation (< 15ms)
    // -------------------------------------------------------------------------
    const layer1Start = performance.now();
    const { metrics: algorithmicMetrics, segments: layer1Segments } = runFastAlgorithmicEvaluation(
      normalized,
      detectedLanguage
    );
    const layer1Ms = Math.round((performance.now() - layer1Start) * 100) / 100;

    // -------------------------------------------------------------------------
    // 4. LAYER 2: Semantic Evaluation with Gemini & Live Web Plagiarism Search
    // -------------------------------------------------------------------------
    const layer2Start = performance.now();
    const shouldCheckPlagiarism = body.options?.checkPlagiarism !== false && body.options?.enableGrounding !== false;

    // Run Gemini evaluation and independent Live Web Search in parallel with strict 3.5s timeout
    const [geminiSettled, webSearchSettled] = await Promise.allSettled([
      evaluateWithGemini({
        text: normalized, // Full text up to 50,000 chars sent
        detectedLanguage,
        sentenceCount: sentences.length,
        wordCount: words.length,
        burstinessVariance: algorithmicMetrics.burstiness.variance,
        burstinessScore: algorithmicMetrics.burstiness.score,
        formulaicMarkerCount: algorithmicMetrics.heuristics.markerCount,
        normalizedTTR: algorithmicMetrics.lexical.normalizedTTR,
        hapaxRatio: algorithmicMetrics.hapaxRatio ?? algorithmicMetrics.stylometry?.hapaxRatio,
        yulesK: algorithmicMetrics.yulesK ?? algorithmicMetrics.stylometry?.yulesK,
        punctuationEntropy: algorithmicMetrics.punctuationEntropy ?? algorithmicMetrics.stylometry?.punctuationEntropy,
        eslDetected: algorithmicMetrics.eslGuardrail?.isEslDetected,
        eslSignals: algorithmicMetrics.eslGuardrail?.signals,
        enableGrounding: body.options?.enableGrounding !== false,
      }),
      shouldCheckPlagiarism
        ? performLiveWebPlagiarismSearch(normalized, detectedLanguage, 3500)
        : Promise.resolve({ sources: [], searchQueries: [], plagiarismSegments: [] }),
    ]);

    const geminiResult = geminiSettled.status === 'fulfilled' ? geminiSettled.value : null;
    const liveWebResult =
      webSearchSettled.status === 'fulfilled'
        ? webSearchSettled.value
        : { sources: [], searchQueries: [], plagiarismSegments: [] };
    const layer2Ms = Math.round((performance.now() - layer2Start) * 100) / 100;

    // -------------------------------------------------------------------------
    // 5. Synthesis & Verdict Determination
    // -------------------------------------------------------------------------
    let aiSlopScore = algorithmicMetrics.heuristicAiScore;
    let plagiarismScore = 0;

    // Combine sources from Gemini and Live Web Search (deduplicated by domain and clean URL)
    const combinedSourcesMap = new Map<string, GroundedSource>();

    // 1. Add Gemini sources if present
    if (geminiResult?.sources) {
      for (const s of geminiResult.sources) {
        combinedSourcesMap.set(s.url.toLowerCase(), s);
      }
    }

    // 2. Add Live Web Search sources
    for (const ws of liveWebResult.sources) {
      const key = ws.url.toLowerCase();
      if (combinedSourcesMap.has(key)) {
        const existing = combinedSourcesMap.get(key)!;
        existing.matchedSnippetCount += ws.matchedSnippetCount;
        if (ws.similarityScore > existing.similarityScore) {
          existing.similarityScore = ws.similarityScore;
          existing.isConfirmedPlagiarism = existing.isConfirmedPlagiarism || ws.isConfirmedPlagiarism;
        }
      } else {
        combinedSourcesMap.set(key, ws);
      }
    }

    const sources = Array.from(combinedSourcesMap.values()).sort(
      (a, b) => b.similarityScore - a.similarityScore
    );

    const searchQueries = Array.from(
      new Set([...(geminiResult?.searchQueries || []), ...liveWebResult.searchQueries])
    );

    let modelUsed = geminiResult?.modelUsed || (sources.length > 0 ? 'Live Web Search Engine + Layer 1' : 'Layer 1 Heuristic Engine');

    let executiveSummary = isVietnamese
      ? `Phân tích theo giải thuật Lớp 1 ghi nhận ${sentences.length} câu với phương sai độ dài ${algorithmicMetrics.burstiness.variance} và ${algorithmicMetrics.heuristics.markerCount} điểm sáo ngữ.`
      : `Algorithmic Layer 1 analysis scanned ${sentences.length} sentences with variance ${algorithmicMetrics.burstiness.variance} and ${algorithmicMetrics.heuristics.markerCount} clichés.`;

    if (algorithmicMetrics.eslGuardrail?.mitigationApplied) {
      executiveSummary += isVietnamese
        ? ` Đã kích hoạt rào chắn bảo vệ người viết phi bản ngữ/học sinh (giảm 50% điểm phạt).`
        : ` ESL / non-native writer guardrail activated (50% penalty discount applied).`;
    }

    let breakdown = {
      rhythmAndEntropy: {
        score: algorithmicMetrics.burstiness.score,
        explanation: isVietnamese
          ? `Độ lệch chuẩn độ dài câu: ${algorithmicMetrics.burstiness.standardDeviation}.`
          : `Standard deviation of sentence length: ${algorithmicMetrics.burstiness.standardDeviation}.`,
      },
      fluffAndFormulas: {
        score: Math.min(algorithmicMetrics.heuristics.markerDensity * 20, 100),
        explanation: isVietnamese
          ? `Phát hiện ${algorithmicMetrics.heuristics.markerCount} cụm từ sáo ngữ.`
          : `Detected ${algorithmicMetrics.heuristics.markerCount} formulaic cliché markers.`,
      },
      reasoningDepth: {
        score: 40,
        explanation: isVietnamese ? 'Độ phong phú từ vựng mức bình thường.' : 'Normal vocabulary diversity.',
      },
      attributionIntegrity: {
        score: 10,
        explanation: isVietnamese ? 'Chưa phát hiện đạo văn trùng lặp rõ ràng.' : 'No evident verbatim plagiarism detected.',
      },
    };

    // Calculate maximum similarity from live web search
    let maxLiveWebSimilarity = 0;
    if (sources.length > 0) {
      maxLiveWebSimilarity = Math.max(...sources.map((s) => s.similarityScore));
    }

    if (geminiResult) {
      aiSlopScore = geminiResult.aiSlopScore;
      plagiarismScore = Math.max(geminiResult.plagiarismScore, maxLiveWebSimilarity >= 35 ? maxLiveWebSimilarity : 0);
      executiveSummary = geminiResult.summary;
      breakdown = geminiResult.breakdown;
      modelUsed = geminiResult.modelUsed;
      if (maxLiveWebSimilarity >= 35 && breakdown.attributionIntegrity.score < maxLiveWebSimilarity) {
        breakdown.attributionIntegrity = {
          score: maxLiveWebSimilarity,
          explanation: isVietnamese
            ? `Phát hiện ${sources.filter((s) => s.isConfirmedPlagiarism).length} nguồn web có độ tương đồng từ ngữ cao (tối đa ${maxLiveWebSimilarity}%).`
            : `Detected ${sources.filter((s) => s.isConfirmedPlagiarism).length} web sources with high text similarity (peak ${maxLiveWebSimilarity}%).`,
        };
      }
    } else {
      // Layer 1 Fallback with Live Web Search
      if (maxLiveWebSimilarity >= 35) {
        plagiarismScore = maxLiveWebSimilarity;
        breakdown.attributionIntegrity = {
          score: maxLiveWebSimilarity,
          explanation: isVietnamese
            ? `Đối chiếu web độc lập phát hiện ${sources.filter((s) => s.isConfirmedPlagiarism).length} nguồn trùng lặp (tương đồng ${maxLiveWebSimilarity}%).`
            : `Independent web search identified ${sources.filter((s) => s.isConfirmedPlagiarism).length} confirmed sources (peak similarity ${maxLiveWebSimilarity}%).`,
        };
      }
    }

    // Combine algorithmic highlight segments and live web plagiarism highlights
    const allSegments = [...layer1Segments, ...liveWebResult.plagiarismSegments];

    // Determine Verdicts
    let aiVerdict: AiVerdict = 'likely_human';
    if (aiSlopScore >= 80) aiVerdict = 'highly_synthetic';
    else if (aiSlopScore >= 60) aiVerdict = 'likely_ai';
    else if (aiSlopScore >= 35) aiVerdict = 'mixed_or_edited';

    let plagiarismVerdict: PlagiarismVerdict = 'original';
    if (plagiarismScore >= 65) plagiarismVerdict = 'heavy_plagiarism';
    else if (plagiarismScore >= 35) plagiarismVerdict = 'moderate_plagiarism';
    else if (plagiarismScore >= 15) plagiarismVerdict = 'minor_overlaps';

    const humanAuthenticityScore = Math.max(0, 100 - aiSlopScore);
    const totalMs = Math.round((performance.now() - overallStartTime) * 100) / 100;

    const result: AnalysisResult = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      language: detectedLanguage,
      characterCount: normalized.length,
      wordCount: words.length,
      sentenceCount: sentences.length,
      readingTimeMinutes: Math.max(1, Math.ceil(words.length / 200)),
      aiSlopScore,
      plagiarismScore,
      humanAuthenticityScore,
      aiVerdict,
      plagiarismVerdict,
      segments: allSegments,
      algorithmicMetrics,
      sources,
      searchQueries,
      modelUsed,
      breakdown,
      executiveSummary,
      timing: {
        layer1Ms,
        layer2Ms,
        totalMs,
      },
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown internal server error';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message,
        },
      },
      { status: 500 }
    );
  }
}
