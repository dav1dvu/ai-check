'use client';

import React from 'react';
import { SemanticAnalysisBreakdown } from '@/types/analysis';
import {
  Activity,
  Layers,
  Sparkles,
  BookOpenCheck,
} from 'lucide-react';

interface MetricsBreakdownProps {
  breakdown: SemanticAnalysisBreakdown;
}

export function MetricsBreakdown({ breakdown }: MetricsBreakdownProps) {
  const getRiskStatus = (score: number) => {
    if (score >= 70) {
      return {
        label: 'Nguy cơ cao',
        colorClass: 'text-rose-400 bg-rose-950/60 border-rose-800/80',
        barColor: 'bg-rose-500',
      };
    }
    if (score >= 40) {
      return {
        label: 'Cần lưu ý',
        colorClass: 'text-amber-400 bg-amber-950/60 border-amber-800/80',
        barColor: 'bg-amber-500',
      };
    }
    return {
      label: 'Bình thường',
      colorClass: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80',
      barColor: 'bg-emerald-500',
    };
  };

  const metrics = [
    {
      id: 'rhythm',
      nameVi: 'Nhịp Điệu Câu & Entropy',
      nameEn: 'Sentence Rhythm & Entropy',
      description: 'Đo lường độ biến thiên chiều dài câu (Burstiness). AI thường tạo câu đều đặn thiếu nhịp điệu tự nhiên.',
      score: breakdown.rhythmAndEntropy.score,
      explanation: breakdown.rhythmAndEntropy.explanation,
      icon: Activity,
    },
    {
      id: 'fluff',
      nameVi: 'Sáo Ngữ & Khuôn Mẫu',
      nameEn: 'Fluff & Formulaic Clichés',
      description: 'Mật độ các cụm từ đệm, liên từ khuôn sáo ("không thể phủ nhận rằng", "kỷ nguyên số hóa", v.v.).',
      score: breakdown.fluffAndFormulas.score,
      explanation: breakdown.fluffAndFormulas.explanation,
      icon: Sparkles,
    },
    {
      id: 'depth',
      nameVi: 'Độ Sâu Lập Luận',
      nameEn: 'Reasoning Depth & Nuance',
      description: 'Đánh giá mức độ khái quát hóa rập khuôn so với lập luận có bằng chứng, chi tiết thực tế.',
      score: breakdown.reasoningDepth.score,
      explanation: breakdown.reasoningDepth.explanation,
      icon: Layers,
    },
    {
      id: 'attribution',
      nameVi: 'Tính Nguyên Bản & Trích Dẫn',
      nameEn: 'Attribution & Originality',
      description: 'Mức độ phụ thuộc cấu trúc và sao chép ngữ nghĩa từ các tài liệu đã xuất bản trên mạng.',
      score: breakdown.attributionIntegrity.score,
      explanation: breakdown.attributionIntegrity.explanation,
      icon: BookOpenCheck,
    },
  ];

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-5">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 tracking-tight">
            Đánh Giá 4 Trục Chi Tiết (4-Axis Metrics Breakdown)
          </h3>
          <p className="text-xs text-neutral-400">
            Dựa trên mô hình đánh giá nhịp điệu Binoculars và PhoBERT Semantic Rules
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {metrics.map((m) => {
          const risk = getRiskStatus(m.score);
          const Icon = m.icon;

          return (
            <div
              key={m.id}
              className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2.5 transition-colors hover:border-neutral-700/80"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300">
                    <Icon className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-200">
                      {m.nameVi}
                    </h4>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {m.nameEn}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${risk.colorClass}`}
                  >
                    {risk.label}
                  </span>
                  <span className="font-mono text-sm font-bold text-neutral-100">
                    {Math.round(m.score)}/100
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden"
                role="progressbar"
                aria-label={m.nameVi}
                aria-valuenow={m.score}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full ${risk.barColor} transition-all duration-700 rounded-full`}
                  style={{ width: `${Math.min(100, Math.max(0, m.score))}%` }}
                />
              </div>

              {/* Explanation Note */}
              <p className="text-xs text-neutral-400 leading-relaxed pl-1 border-l-2 border-neutral-800">
                {m.explanation || m.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}