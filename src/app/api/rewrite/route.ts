/**
 * One-Click De-slop & Multi-Tone Rewriter Route Handler
 * Architecture: Web Adapter / Controller (Clean Architecture)
 * 
 * Vercel Serverless Configurations:
 * - maxDuration = 15s
 * - dynamic = 'force-dynamic'
 */

import { NextRequest, NextResponse } from 'next/server';
import { RewriteRequestDto, RewriteResponseDto } from '@/types/analysis';
import { rewriteSentenceWithGemini } from '@/lib/ai/gemini-service';

export const maxDuration = 15;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse<RewriteResponseDto>> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Yêu cầu không hợp lệ (Dữ liệu gửi lên phải là định dạng JSON hợp chuẩn).',
          },
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Vui lòng cung cấp dữ liệu hợp lệ trong thân yêu cầu (Request body is required).',
          },
        },
        { status: 400 }
      );
    }

    const { sentence, context, language, violationReason } = body as Partial<RewriteRequestDto>;

    // 1. Validate sentence
    if (typeof sentence !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Thuộc tính sentence bắt buộc phải là chuỗi ký tự (Sentence must be a string).',
          },
        },
        { status: 400 }
      );
    }

    const trimmedSentence = sentence.trim();

    if (trimmedSentence.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Câu văn cần viết lại không được để trống.',
          },
        },
        { status: 400 }
      );
    }

    if (trimmedSentence.length < 5) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SENTENCE_TOO_SHORT',
            message: 'Câu văn quá ngắn để có thể viết lại (Tối thiểu 5 ký tự).',
          },
        },
        { status: 400 }
      );
    }

    if (trimmedSentence.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SENTENCE_TOO_LONG',
            message: 'Câu văn vượt quá độ dài cho phép biên tập lại (Tối đa 1,000 ký tự).',
          },
        },
        { status: 400 }
      );
    }

    // 2. Determine language (heuristic detection if omitted or invalid)
    const vietnameseCharPattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    let targetLang: 'vi' | 'en' = 'vi';
    if (language === 'vi' || language === 'en') {
      targetLang = language;
    } else {
      targetLang = vietnameseCharPattern.test(trimmedSentence) ? 'vi' : 'en';
    }

    // 3. Execute multi-tone rewrite
    const serviceResult = await rewriteSentenceWithGemini({
      sentence: trimmedSentence,
      context: typeof context === 'string' ? context.slice(0, 500) : undefined,
      language: targetLang,
      violationReason: typeof violationReason === 'string' ? violationReason.slice(0, 200) : undefined,
    });

    return NextResponse.json({
      success: true,
      options: serviceResult.options,
      data: {
        sentence: trimmedSentence,
        options: serviceResult.options,
        modelUsed: serviceResult.modelUsed,
        latencyMs: serviceResult.latencyMs,
      },
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
