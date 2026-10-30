'use client';

import React, { useState } from 'react';
import { ChunkTrajectoryItem } from '@/types/analysis';
import {
  Activity,
  Sparkles,
  UserCheck,
  AlertTriangle,
  MoveRight,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';

export interface SlopTrajectoryProps {
  trajectory?: ChunkTrajectoryItem[];
  totalWords?: number;
  onSelectChunk?: (chunk: ChunkTrajectoryItem) => void;
  activeChunkIndex?: number | null;
}

export function SlopTrajectory({
  trajectory = [],
  totalWords,
  onSelectChunk,
  activeChunkIndex: externalActiveIdx,
}: SlopTrajectoryProps) {
  // Find the highest AI slop chunk to spotlight by default if none selected
  const defaultHighRiskIdx =
    trajectory.length > 0
      ? trajectory.reduce(
          (maxIdx, curr, idx, arr) => (curr.aiScore > arr[maxIdx].aiScore ? idx : maxIdx),
          0
        )
      : 0;

  const [selectedIdx, setSelectedIdx] = useState<number>(
    externalActiveIdx ?? defaultHighRiskIdx
  );

  // If document is short (< 2 chunks), don't show full sparkline
  if (!trajectory || trajectory.length < 2) {
    return null;
  }

  const activeIdx = externalActiveIdx ?? selectedIdx;
  const activeChunk = trajectory[activeIdx] || trajectory[0];

  const handleBlockClick = (chunk: ChunkTrajectoryItem) => {
    setSelectedIdx(chunk.chunkIndex);
    onSelectChunk?.(chunk);
  };

  const getToneVisuals = (tone: 'likely_ai' | 'mixed' | 'likely_human', aiScore: number) => {
    if (tone === 'likely_ai' || aiScore >= 60) {
      return {
        label: 'AI Slop chi phối',
        barGradient: 'from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400',
        badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
        textColor: 'text-rose-400',
        icon: Sparkles,
      };
    }
    if (tone === 'mixed' || aiScore >= 35) {
      return {
        label: 'Văn bản lai / Xào xáo',
        barGradient: 'from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400',
        badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
        textColor: 'text-amber-400',
        icon: AlertTriangle,
      };
    }
    return {
      label: 'Con người tự nhiên',
      barGradient: 'from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
      textColor: 'text-emerald-400',
      icon: UserCheck,
    };
  };

  const activeVisuals = getToneVisuals(activeChunk.dominantTone, activeChunk.aiScore);
  const ActiveIcon = activeVisuals.icon;

  // Calculate high-risk chunks count
  const aiDominantCount = trajectory.filter((c) => c.dominantTone === 'likely_ai').length;
  const humanDominantCount = trajectory.filter((c) => c.dominantTone === 'likely_human').length;
  const mixedCount = trajectory.length - aiDominantCount - humanDominantCount;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-xl backdrop-blur-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-amber-400">
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              Dòng Chảy AI Slop Theo Phân Đoạn
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                {trajectory.length} Cửa Sổ Trượt
              </span>
            </h4>
            <p className="text-[11px] text-neutral-400">
              Sliding Window ~500 từ (gối đầu 10%) giải quyết bài toán Văn bản lai (Hybrid Text)
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Người ({humanDominantCount})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Lai ({mixedCount})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            AI ({aiDominantCount})
          </span>
        </div>
      </div>

      {/* Sparkline Timeline Flow Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 px-0.5">
          <span>Đầu bài viết (0 từ)</span>
          <span className="flex items-center gap-1 text-amber-400/90 font-sans">
            <SlidersHorizontal className="w-3 h-3" />
            Nhấp vào phân đoạn để cuộn tới văn bản
          </span>
          <span>Cuối bài viết ({totalWords ? `${totalWords.toLocaleString()} từ` : '100%'})</span>
        </div>

        {/* Timeline Bar with individual segment blocks */}
        <div
          role="tablist"
          aria-label="Thanh dòng chảy AI Slop theo phân đoạn"
          className="h-10 w-full rounded-xl bg-neutral-950 border border-neutral-800/90 p-1 flex gap-1 items-stretch shadow-inner"
        >
          {trajectory.map((chunk, idx) => {
            const isSelected = activeIdx === idx;
            const visuals = getToneVisuals(chunk.dominantTone, chunk.aiScore);

            return (
              <button
                key={chunk.chunkIndex}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`Phân đoạn ${idx + 1}: ${chunk.wordCount} từ, AI Slop ${chunk.aiScore}%`}
                onClick={() => handleBlockClick(chunk)}
                className={`flex-1 rounded-lg transition-all relative group cursor-pointer bg-gradient-to-t ${visuals.barGradient} ${
                  isSelected
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-950 z-10 scale-[1.03] shadow-md shadow-amber-500/20'
                    : 'opacity-85 hover:opacity-100 hover:scale-[1.01]'
                }`}
                title={`Đoạn #${idx + 1}: ${chunk.aiScore}% AI (${visuals.label})`}
              >
                {/* Block index label */}
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white drop-shadow-sm select-none">
                  {idx + 1}
                </span>

                {/* Score badge at top edge */}
                <span className="absolute -top-1 right-0.5 w-1.5 h-1.5 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Chunk Spotlight Card */}
      <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-200">
              Phân đoạn #{activeChunk.chunkIndex + 1}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${activeVisuals.badgeColor}`}
            >
              <ActiveIcon className="w-3 h-3" />
              {activeVisuals.label} ({activeChunk.aiScore}%)
            </span>
          </div>

          {/* Jump to chunk button */}
          <button
            type="button"
            onClick={() => onSelectChunk?.(activeChunk)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:border-neutral-600 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Cuộn đến đoạn này</span>
            <MoveRight className="w-3 h-3 text-neutral-400" />
          </button>
        </div>

        {/* Chunk Telemetry Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-neutral-400 pt-1 border-t border-neutral-800/60">
          <div>
            <span className="text-neutral-500 block">Số lượng từ:</span>
            <span className="text-neutral-200 font-semibold">{activeChunk.wordCount} từ</span>
          </div>
          <div>
            <span className="text-neutral-500 block">Tọa độ ký tự:</span>
            <span className="text-neutral-200 font-semibold">
              {activeChunk.startChar.toLocaleString()} - {activeChunk.endChar.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block">Phương sai nhịp điệu:</span>
            <span className="text-neutral-200 font-semibold">
              σ² = {activeChunk.burstinessVariance ?? 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block">Độ phong phú từ (Hapax):</span>
            <span className="text-neutral-200 font-semibold">
              {activeChunk.hapaxRatio ? `${Math.round(activeChunk.hapaxRatio * 100)}%` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Top Violations Chips */}
        {activeChunk.topViolations && activeChunk.topViolations.length > 0 && (
          <div className="pt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-neutral-500 font-mono">Dấu hiệu nhận diện:</span>
            {activeChunk.topViolations.map((violation, vIdx) => (
              <span
                key={vIdx}
                className="px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-300"
              >
                &ldquo;{violation}&rdquo;
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
