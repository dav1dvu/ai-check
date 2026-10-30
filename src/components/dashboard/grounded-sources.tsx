'use client';

import React, { useState } from 'react';
import { GroundedSource } from '@/types/analysis';
import { sanitizeUrl } from '@/lib/security';
import {
  Globe,
  ExternalLink,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface GroundedSourcesProps {
  sources: GroundedSource[];
  searchQueries?: string[];
}

export function GroundedSources({
  sources,
  searchQueries = [],
}: GroundedSourcesProps) {
  const [showQueries, setShowQueries] = useState<boolean>(false);

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 tracking-tight">
            Nguồn Đối Chiếu Thực Tế (Grounded Sources)
          </h3>
          <p className="text-xs text-neutral-400">
            Trích xuất trực tiếp qua Gemini Google Search Grounding
          </p>
        </div>
        <span className="text-xs font-mono text-neutral-400">
          {sources.length} nguồn tìm thấy
        </span>
      </div>

      {/* Sources List or Clean Zero-state */}
      {sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl bg-neutral-950/40 border border-neutral-800/60 space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-neutral-200">
            Không phát hiện nguồn trùng lặp trên Internet
          </h4>
          <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
            Nội dung bài viết thể hiện tính độc bản cao khi đối chiếu trên công cụ tìm kiếm trực tuyến.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((src) => (
            <div
              key={src.id}
              className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700/80 transition-all space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Favicon or fallback */}
                  <div className="w-6 h-6 rounded bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0 overflow-hidden">
                    {src.domain ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(src.domain)}&sz=32`}
                        alt=""
                        className="w-4 h-4 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Globe className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <a
                      href={sanitizeUrl(src.url) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-neutral-200 hover:text-amber-300 hover:underline flex items-center gap-1 truncate"
                      title={src.title || src.url}
                    >
                      <span className="truncate">{src.title || src.domain || 'Nguồn đối chiếu'}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 text-neutral-400" />
                    </a>
                    <span className="text-[11px] font-mono text-neutral-500 block truncate">
                      {src.domain}
                    </span>
                  </div>
                </div>

                {/* Similarity Badge */}
                <div className="shrink-0 flex items-center gap-1.5">
                  {src.isConfirmedPlagiarism && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/70">
                      Trùng lặp cao
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {src.similarityScore}%
                  </span>
                </div>
              </div>

              {src.snippet && (
                <p className="text-xs text-neutral-400 italic line-clamp-2 pl-2 border-l-2 border-neutral-800 leading-relaxed">
                  &ldquo;{src.snippet}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Google Search Queries Collapsible */}
      {searchQueries && searchQueries.length > 0 && (
        <div className="pt-2 border-t border-neutral-800/60 space-y-2">
          <button
            type="button"
            onClick={() => setShowQueries(!showQueries)}
            className="w-full flex items-center justify-between text-xs text-neutral-400 hover:text-neutral-200 py-1 transition-colors focus:outline-none"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Search className="w-3.5 h-3.5 text-teal-400" />
              Truy vấn tìm kiếm đã thực hiện ({searchQueries.length})
            </span>
            {showQueries ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            )}
          </button>

          {showQueries && (
            <div className="flex flex-wrap gap-1.5 pt-1.5 animate-fadeIn">
              {searchQueries.map((q, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-neutral-950 border border-neutral-800 text-neutral-300"
                >
                  <Search className="w-2.5 h-2.5 text-neutral-500" />
                  {q}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}