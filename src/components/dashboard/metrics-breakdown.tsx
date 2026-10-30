'use client';

import React, { useState } from 'react';
import {
  SemanticAnalysisBreakdown,
  StylometryMetrics,
  FastAlgorithmicEvaluation,
} from '@/types/analysis';
import {
  Activity,
  Layers,
  Sparkles,
  BookOpenCheck,
  HelpCircle,
  Binary,
  Hash,
  Quote,
  Feather,
} from 'lucide-react';

interface MetricsBreakdownProps {
  breakdown: SemanticAnalysisBreakdown;
  stylometry?: StylometryMetrics;
  algorithmicMetrics?: FastAlgorithmicEvaluation;
}

type TabType = 'semantic' | 'stylometry';

export function MetricsBreakdown({
  breakdown,
  stylometry,
  algorithmicMetrics,
}: MetricsBreakdownProps) {
  const [activeTab, setActiveTab] = useState<TabType>('semantic');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Extract effective stylometry data either from direct prop or algorithmicMetrics
  const effectiveStylometry: StylometryMetrics = stylometry ||
    algorithmicMetrics?.stylometry || {
      hapaxRatio: algorithmicMetrics?.hapaxRatio ?? 0.42,
      yulesK: algorithmicMetrics?.yulesK ?? 145.0,
      punctuationEntropy: algorithmicMetrics?.punctuationEntropy ?? 1.65,
      punctuationCount: 12,
      distinctPunctuationCount: 3,
      hasExpressivePunctuation: false,
    };

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

  // Interpretations for Stylometric Metrics
  const getHapaxStatus = (ratio: number) => {
    if (ratio >= 0.45) {
      return {
        label: 'Con người đa dạng (> 45%)',
        colorClass: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80',
        barColor: 'bg-emerald-500',
        quality: 'Tự nhiên & Phong phú',
      };
    }
    if (ratio >= 0.30) {
      return {
        label: 'Mức độ trung bình (30% - 45%)',
        colorClass: 'text-amber-400 bg-amber-950/60 border-amber-800/80',
        barColor: 'bg-amber-500',
        quality: 'Trung gian',
      };
    }
    return {
      label: 'Lặp từ đặc trưng AI slop (< 30%)',
      colorClass: 'text-rose-400 bg-rose-950/60 border-rose-800/80',
      barColor: 'bg-rose-500',
      quality: 'Thiếu từ vựng độc bản',
    };
  };

  const getYulesKStatus = (k: number) => {
    if (k < 100) {
      return {
        label: 'Vốn từ phong phú tự nhiên (K < 100)',
        colorClass: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80',
        barColor: 'bg-emerald-500',
        quality: 'Đa dạng xuất sắc',
      };
    }
    if (k <= 300) {
      return {
        label: 'Mức độ trung bình (100 - 300)',
        colorClass: 'text-amber-400 bg-amber-950/60 border-amber-800/80',
        barColor: 'bg-amber-500',
        quality: 'Vừa phải',
      };
    }
    return {
      label: 'Lặp từ khuôn mẫu đặc trưng AI (K > 300)',
      colorClass: 'text-rose-400 bg-rose-950/60 border-rose-800/80',
      barColor: 'bg-rose-500',
      quality: 'Lặp khuôn từ vựng',
    };
  };

  const getPunctuationEntropyStatus = (entropy: number) => {
    if (entropy >= 1.8) {
      return {
        label: 'Biểu cảm đa dạng (H > 1.8)',
        colorClass: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80',
        barColor: 'bg-emerald-500',
        quality: 'Giàu cảm xúc',
      };
    }
    if (entropy >= 1.15) {
      return {
        label: 'Mức độ vừa phải (1.15 - 1.8)',
        colorClass: 'text-amber-400 bg-amber-950/60 border-amber-800/80',
        barColor: 'bg-amber-500',
        quality: 'Bình thường',
      };
    }
    return {
      label: 'Đơn điệu đối xứng đặc trưng AI (H < 1.15)',
      colorClass: 'text-rose-400 bg-rose-950/60 border-rose-800/80',
      barColor: 'bg-rose-500',
      quality: 'Thiếu nhịp điệu tự nhiên',
    };
  };

  const semanticMetrics = [
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

  const hapaxStatus = getHapaxStatus(effectiveStylometry.hapaxRatio);
  const yulesKStatus = getYulesKStatus(effectiveStylometry.yulesK);
  const punctuationEntropyStatus = getPunctuationEntropyStatus(effectiveStylometry.punctuationEntropy);

  const tooltipsData: Record<string, { title: string; content: string }> = {
    hapax: {
      title: 'Tỷ Lệ Từ Hiếm Độc Bản (Hapax Legomena Ratio)',
      content:
        'Hapax Legomena (V₁ / N) là tỷ lệ các từ vựng chỉ xuất hiện đúng 1 lần trong bài. Tư duy con người gắn với ký ức cụ thể nên tỷ lệ này thường > 45%. Mô hình AI thường lấy mẫu hội tụ về các từ phổ biến, khiến tỷ lệ này giảm sâu xuống < 30%.',
    },
    yulesK: {
      title: "Hệ Số Đặc Trưng Yule's K (Yule's Characteristic K)",
      content:
        "Thước đo độ phong phú từ vựng toán học hoàn toàn độc lập với độ dài văn bản. K < 100 phản ánh văn phong tự nhiên phong phú. K > 300 chỉ ra văn bản bị lặp lại đơn điệu một nhóm từ vựng cố định, dấu hiệu điển hình của AI slop.",
    },
    entropy: {
      title: 'Entropy Dấu Câu (Punctuation Shannon Entropy)',
      content:
        'Đo lường sự phân bổ của 10 nhóm dấu câu (chấm, phẩy, chấm phẩy, gạch ngang, ngoặc đơn...). Con người sử dụng dấu câu biểu cảm đa dạng (H > 1.8 bits). AI thường chỉ dùng dấu chấm và dấu phẩy đối xứng máy móc (H < 1.15 bits).',
    },
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-5">
      {/* Header with Dual Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-3 gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 tracking-tight">
            Đánh Giá Chi Tiết (Detailed Metrics)
          </h3>
          <p className="text-xs text-neutral-400">
            Kết hợp 4 trục ngữ nghĩa và bộ chỉ số ngôn ngữ học lượng hóa (Stylometry)
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          role="tablist"
          aria-label="Lựa chọn bảng chỉ số đánh giá"
          className="inline-flex p-1 bg-neutral-950 border border-neutral-800 rounded-xl text-xs self-start sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'semantic'}
            onClick={() => setActiveTab('semantic')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'semantic'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            4 Trục Ngữ Nghĩa
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'stylometry'}
            onClick={() => setActiveTab('stylometry')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'stylometry'
                ? 'bg-neutral-800 text-amber-300 shadow-sm border border-amber-700/50'
                : 'text-neutral-400 hover:text-amber-300'
            }`}
          >
            <Binary className="w-3.5 h-3.5 text-amber-400" />
            <span>Chỉ Số Ngôn Ngữ Học</span>
          </button>
        </div>
      </div>

      {/* TAB 1: 4-AXIS SEMANTIC METRICS */}
      {activeTab === 'semantic' && (
        <div className="space-y-4 animate-fadeIn">
          {semanticMetrics.map((m) => {
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
      )}

      {/* TAB 2: STYLOMETRY ANALYSIS */}
      {activeTab === 'stylometry' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Card 1: Hapax Legomena Ratio */}
          <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2.5 transition-colors hover:border-neutral-700/80 relative">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400">
                  <Feather className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-semibold text-neutral-200">
                      Tỷ Lệ Từ Hiếm Độc Bản (Hapax Ratio)
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTooltip(activeTooltip === 'hapax' ? null : 'hapax')
                      }
                      onMouseEnter={() => setActiveTooltip('hapax')}
                      onMouseLeave={() => setActiveTooltip(null)}
                      className="text-neutral-500 hover:text-amber-400 transition-colors focus:outline-none"
                      aria-label="Giải thích chỉ số Hapax Legomena Ratio"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Hapax Legomena Ratio (V₁ / N)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${hapaxStatus.colorClass}`}
                >
                  {hapaxStatus.quality}
                </span>
                <span className="font-mono text-sm font-bold text-neutral-100">
                  {(effectiveStylometry.hapaxRatio * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Progress Bar with benchmarks */}
            <div className="space-y-1">
              <div
                className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden relative"
                role="progressbar"
                aria-label="Tỷ Lệ Từ Hiếm Độc Bản"
                aria-valuenow={Math.round(effectiveStylometry.hapaxRatio * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full ${hapaxStatus.barColor} transition-all duration-700 rounded-full`}
                  style={{
                    width: `${Math.min(100, Math.max(0, effectiveStylometry.hapaxRatio * 100))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-neutral-500 px-0.5">
                <span>AI slop &lt; 30%</span>
                <span className="text-neutral-400">Ngưỡng chuẩn con người &gt; 45%</span>
                <span>100%</span>
              </div>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed pl-1 border-l-2 border-neutral-800">
              {hapaxStatus.label}
            </p>

            {/* Tooltip Card */}
            {activeTooltip === 'hapax' && (
              <div
                role="tooltip"
                className="absolute z-20 left-4 right-4 top-14 p-3 rounded-xl bg-neutral-900 border border-amber-600/60 shadow-2xl text-xs space-y-1 text-neutral-200 animate-fadeIn"
              >
                <p className="font-semibold text-amber-300">
                  {tooltipsData.hapax.title}
                </p>
                <p className="text-neutral-300 leading-relaxed text-[11px]">
                  {tooltipsData.hapax.content}
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Yule's Characteristic K */}
          <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2.5 transition-colors hover:border-neutral-700/80 relative">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400">
                  <Hash className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-semibold text-neutral-200">
                      Hệ Số Phong Phú Từ Vựng Yule&apos;s K
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTooltip(activeTooltip === 'yulesK' ? null : 'yulesK')
                      }
                      onMouseEnter={() => setActiveTooltip('yulesK')}
                      onMouseLeave={() => setActiveTooltip(null)}
                      className="text-neutral-500 hover:text-amber-400 transition-colors focus:outline-none"
                      aria-label="Giải thích chỉ số Yule's Characteristic K"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Length-independent Vocabulary Diversity
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${yulesKStatus.colorClass}`}
                >
                  {yulesKStatus.quality}
                </span>
                <span className="font-mono text-sm font-bold text-neutral-100">
                  K = {effectiveStylometry.yulesK.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Visual K scale */}
            <div className="space-y-1">
              <div
                className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden relative"
                role="progressbar"
                aria-label="Hệ số Yule's K"
                aria-valuenow={Math.round(effectiveStylometry.yulesK)}
                aria-valuemin={0}
                aria-valuemax={400}
              >
                {/* For Yule's K, lower is better. We visualize position up to K=400 */}
                <div
                  className={`h-full ${yulesKStatus.barColor} transition-all duration-700 rounded-full`}
                  style={{
                    width: `${Math.min(100, Math.max(5, (effectiveStylometry.yulesK / 400) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-neutral-500 px-0.5">
                <span className="text-emerald-400">K &lt; 100 (Tự nhiên)</span>
                <span>K = 100-300</span>
                <span className="text-rose-400">K &gt; 300 (AI Slop)</span>
              </div>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed pl-1 border-l-2 border-neutral-800">
              {yulesKStatus.label}
            </p>

            {/* Tooltip Card */}
            {activeTooltip === 'yulesK' && (
              <div
                role="tooltip"
                className="absolute z-20 left-4 right-4 top-14 p-3 rounded-xl bg-neutral-900 border border-amber-600/60 shadow-2xl text-xs space-y-1 text-neutral-200 animate-fadeIn"
              >
                <p className="font-semibold text-amber-300">
                  {tooltipsData.yulesK.title}
                </p>
                <p className="text-neutral-300 leading-relaxed text-[11px]">
                  {tooltipsData.yulesK.content}
                </p>
              </div>
            )}
          </div>

          {/* Card 3: Punctuation Cadence & Shannon Entropy */}
          <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2.5 transition-colors hover:border-neutral-700/80 relative">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400">
                  <Quote className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-semibold text-neutral-200">
                      Entropy Dấu Câu & Nhịp Điệu
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTooltip(activeTooltip === 'entropy' ? null : 'entropy')
                      }
                      onMouseEnter={() => setActiveTooltip('entropy')}
                      onMouseLeave={() => setActiveTooltip(null)}
                      className="text-neutral-500 hover:text-amber-400 transition-colors focus:outline-none"
                      aria-label="Giải thích chỉ số Shannon Entropy Dấu câu"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Punctuation Shannon Entropy (H_punct)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${punctuationEntropyStatus.colorClass}`}
                >
                  {punctuationEntropyStatus.quality}
                </span>
                <span className="font-mono text-sm font-bold text-neutral-100">
                  {effectiveStylometry.punctuationEntropy.toFixed(2)} bits
                </span>
              </div>
            </div>

            {/* Progress bar up to 3.0 bits */}
            <div className="space-y-1">
              <div
                className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden relative"
                role="progressbar"
                aria-label="Entropy Dấu Câu"
                aria-valuenow={Math.round((effectiveStylometry.punctuationEntropy / 3.0) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full ${punctuationEntropyStatus.barColor} transition-all duration-700 rounded-full`}
                  style={{
                    width: `${Math.min(100, Math.max(0, (effectiveStylometry.punctuationEntropy / 3.0) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-neutral-500 px-0.5">
                <span className="text-rose-400">H &lt; 1.15 bits (Đơn điệu)</span>
                <span>H = 1.15-1.8</span>
                <span className="text-emerald-400">H &gt; 1.8 bits (Biểu cảm)</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-850 text-[11px] text-neutral-400">
              <span>{punctuationEntropyStatus.label}</span>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                  {effectiveStylometry.distinctPunctuationCount} loại dấu
                </span>
                {effectiveStylometry.hasExpressivePunctuation && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/60 text-emerald-300">
                    Dấu biểu cảm ✓
                  </span>
                )}
              </div>
            </div>

            {/* Tooltip Card */}
            {activeTooltip === 'entropy' && (
              <div
                role="tooltip"
                className="absolute z-20 left-4 right-4 top-14 p-3 rounded-xl bg-neutral-900 border border-amber-600/60 shadow-2xl text-xs space-y-1 text-neutral-200 animate-fadeIn"
              >
                <p className="font-semibold text-amber-300">
                  {tooltipsData.entropy.title}
                </p>
                <p className="text-neutral-300 leading-relaxed text-[11px]">
                  {tooltipsData.entropy.content}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}