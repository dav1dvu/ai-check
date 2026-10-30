'use client';

import React from 'react';
import { AiVerdict, PlagiarismVerdict } from '@/types/analysis';
import { UserCheck, ShieldCheck } from 'lucide-react';

interface ScoreGaugeProps {
  aiScore: number;            // 0 - 100
  plagiarismScore: number;    // 0 - 100
  aiVerdict: AiVerdict;
  plagiarismVerdict: PlagiarismVerdict;
  humanAuthenticityScore: number;
}

export function ScoreGauge({
  aiScore,
  plagiarismScore,
  aiVerdict,
  plagiarismVerdict,
  humanAuthenticityScore,
}: ScoreGaugeProps) {
  // Helper for AI Slop Gauge Color & Label
  const getAiBadgeInfo = (score: number, verdict: AiVerdict) => {
    if (score >= 80 || verdict === 'highly_synthetic') {
      return {
        labelVi: 'Đậm chất máy móc',
        labelEn: 'Highly Synthetic',
        color: '#f43f5e', // rose-500
        bgClass: 'bg-rose-950/60 border-rose-800/80 text-rose-300',
        textColor: 'text-rose-400',
        ringColor: 'stroke-rose-500',
      };
    }
    if (score >= 60 || verdict === 'likely_ai') {
      return {
        labelVi: 'Nhiều khả năng là AI',
        labelEn: 'Likely AI Generated',
        color: '#f97316', // orange-500
        bgClass: 'bg-orange-950/60 border-orange-800/80 text-orange-300',
        textColor: 'text-orange-400',
        ringColor: 'stroke-orange-500',
      };
    }
    if (score >= 35 || verdict === 'mixed_or_edited') {
      return {
        labelVi: 'Pha trộn / Biên tập',
        labelEn: 'Mixed or Edited',
        color: '#f59e0b', // amber-500
        bgClass: 'bg-amber-950/60 border-amber-800/80 text-amber-300',
        textColor: 'text-amber-400',
        ringColor: 'stroke-amber-500',
      };
    }
    return {
      labelVi: 'Nguyên bản con người',
      labelEn: 'Likely Human',
      color: '#10b981', // emerald-500
      bgClass: 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300',
      textColor: 'text-emerald-400',
      ringColor: 'stroke-emerald-500',
    };
  };

  // Helper for Plagiarism Gauge Color & Label
  const getPlagiarismBadgeInfo = (score: number, verdict: PlagiarismVerdict) => {
    if (score >= 65 || verdict === 'heavy_plagiarism') {
      return {
        labelVi: 'Đạo văn nghiêm trọng',
        labelEn: 'Heavy Plagiarism',
        color: '#f43f5e',
        bgClass: 'bg-rose-950/60 border-rose-800/80 text-rose-300',
        textColor: 'text-rose-400',
        ringColor: 'stroke-rose-500',
      };
    }
    if (score >= 35 || verdict === 'moderate_plagiarism') {
      return {
        labelVi: 'Nghi vấn đạo văn vừa phải',
        labelEn: 'Moderate Overlaps',
        color: '#f97316',
        bgClass: 'bg-orange-950/60 border-orange-800/80 text-orange-300',
        textColor: 'text-orange-400',
        ringColor: 'stroke-orange-500',
      };
    }
    if (score >= 15 || verdict === 'minor_overlaps') {
      return {
        labelVi: 'Trùng lặp nhỏ / Phổ biến',
        labelEn: 'Minor Overlaps',
        color: '#f59e0b',
        bgClass: 'bg-amber-950/60 border-amber-800/80 text-amber-300',
        textColor: 'text-amber-400',
        ringColor: 'stroke-amber-500',
      };
    }
    return {
      labelVi: 'Tính nguyên bản cao',
      labelEn: 'Original Content',
      color: '#10b981',
      bgClass: 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300',
      textColor: 'text-emerald-400',
      ringColor: 'stroke-emerald-500',
    };
  };

  const aiInfo = getAiBadgeInfo(aiScore, aiVerdict);
  const plagInfo = getPlagiarismBadgeInfo(plagiarismScore, plagiarismVerdict);

  // SVG Gauge calculations (radius = 56, circumference = 2 * PI * 56 ≈ 351.86)
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const aiStrokeDashoffset = circumference - (Math.min(100, Math.max(0, aiScore)) / 100) * circumference;
  const plagStrokeDashoffset = circumference - (Math.min(100, Math.max(0, plagiarismScore)) / 100) * circumference;

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 tracking-tight">
            Chỉ Số Đo Lường Cốt Lõi (Core Indices)
          </h3>
          <p className="text-xs text-neutral-400">
            Tổng hợp từ giải thuật Winnowing & mô hình suy luận đa ngữ
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          Bilingual Verified
        </span>
      </div>

      {/* Twin Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        {/* Gauge 1: AI Slop Index */}
        <div className="flex flex-col items-center p-4 rounded-xl bg-neutral-950/50 border border-neutral-800/80 text-center">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg
              className="w-full h-full -rotate-90"
              viewBox="0 0 136 136"
              role="meter"
              aria-label="Chỉ số AI Slop"
              aria-valuenow={aiScore}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {/* Background Ring */}
              <circle
                cx="68"
                cy="68"
                r={radius}
                className="stroke-neutral-800"
                strokeWidth="10"
                fill="none"
              />
              {/* Active Ring */}
              <circle
                cx="68"
                cy="68"
                r={radius}
                className={`${aiInfo.ringColor} transition-all duration-1000 ease-out`}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={aiStrokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold font-mono tracking-tighter ${aiInfo.textColor}`}>
                {aiScore}%
              </span>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium">
                AI Slop Index
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${aiInfo.bgClass}`}
            >
              {aiInfo.labelVi}
            </span>
            <p className="text-[11px] text-neutral-500 font-mono">({aiInfo.labelEn})</p>
          </div>
        </div>

        {/* Gauge 2: Plagiarism Index */}
        <div className="flex flex-col items-center p-4 rounded-xl bg-neutral-950/50 border border-neutral-800/80 text-center">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg
              className="w-full h-full -rotate-90"
              viewBox="0 0 136 136"
              role="meter"
              aria-label="Chỉ số Đạo văn"
              aria-valuenow={plagiarismScore}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {/* Background Ring */}
              <circle
                cx="68"
                cy="68"
                r={radius}
                className="stroke-neutral-800"
                strokeWidth="10"
                fill="none"
              />
              {/* Active Ring */}
              <circle
                cx="68"
                cy="68"
                r={radius}
                className={`${plagInfo.ringColor} transition-all duration-1000 ease-out`}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={plagStrokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold font-mono tracking-tighter ${plagInfo.textColor}`}>
                {plagiarismScore}%
              </span>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium">
                Plagiarism Index
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${plagInfo.bgClass}`}
            >
              {plagInfo.labelVi}
            </span>
            <p className="text-[11px] text-neutral-500 font-mono">({plagInfo.labelEn})</p>
          </div>
        </div>
      </div>

      {/* Human Authenticity Balance Bar */}
      <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium text-neutral-300">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Độ Chân Thực Con Người (Human Authenticity)
          </span>
          <span className="font-mono font-bold text-emerald-400 text-sm">
            {humanAuthenticityScore}%
          </span>
        </div>
        <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-1000 ease-out rounded-full"
            style={{ width: `${humanAuthenticityScore}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
          <span>0% Máy móc hoàn toàn</span>
          <span>100% Văn phong tự nhiên</span>
        </div>
      </div>
    </div>
  );
}