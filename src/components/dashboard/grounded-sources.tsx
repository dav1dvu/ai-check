'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GroundedSource } from '@/types/analysis';
import { sanitizeUrl } from '@/lib/security';
import {
  Globe,
  ExternalLink,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crosshair,
  BookOpen,
  Newspaper,
} from 'lucide-react';

interface GroundedSourcesProps {
  sources: GroundedSource[];
  searchQueries?: string[];
  activeSourceUrl?: string | null;
  onLocateSource?: (source: GroundedSource) => void;
}

export function GroundedSources({
  sources,
  searchQueries = [],
  activeSourceUrl,
  onLocateSource,
}: GroundedSourcesProps) {
  const [showQueries, setShowQueries] = useState<boolean>(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll active source card into view within the dashboard when activeSourceUrl changes
  useEffect(() => {
    if (activeSourceUrl) {
      const el = cardRefs.current.get(activeSourceUrl);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeSourceUrl]);

  const getSourceTypeBadge = (domain: string) => {
    const isWiki = domain.toLowerCase().includes('wikipedia.org');
    if (isWiki) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-800/60">
          <BookOpen className="w-2.5 h-2.5 text-sky-400" />
          <span>Bách khoa Wikipedia</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-800/80 text-neutral-300 border border-neutral-700/60">
        <Newspaper className="w-2.5 h-2.5 text-neutral-400" />
        <span>Trang tin / Báo chí / Blog</span>
      </span>
    );
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 tracking-tight">
            Nguồn Đối Chiếu Thực Tế (Grounded Sources)
          </h3>
          <p className="text-xs text-neutral-400">
            Đối chiếu thời gian thực qua Mạng Tìm kiếm Mở (Live Web & Open Knowledge Engine)
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
        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {sources.map((src) => {
            const isActive = activeSourceUrl === src.url;
            const safeHref = sanitizeUrl(src.url) || '#';

            return (
              <div
                key={src.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(src.url, el);
                  else cardRefs.current.delete(src.url);
                }}
                className={`p-3.5 rounded-xl transition-all space-y-2.5 relative ${
                  isActive
                    ? 'bg-neutral-900/95 border-rose-500/80 ring-2 ring-rose-500/80 shadow-lg shadow-rose-950/40'
                    : 'bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700/80'
                }`}
              >
                {/* Top Row: Favicon, Title, Badges */}
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
                        href={safeHref}
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
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                        src.similarityScore >= 60
                          ? 'bg-rose-950/80 text-rose-300 border-rose-800/70'
                          : src.similarityScore >= 35
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800/70'
                          : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                      }`}
                    >
                      Trùng khớp {src.similarityScore}%
                    </span>
                  </div>
                </div>

                {/* Source Excerpt Snippet */}
                {src.snippet && (
                  <p className="text-xs text-neutral-400 italic line-clamp-2 pl-2 border-l-2 border-neutral-800 leading-relaxed font-sans">
                    &ldquo;{src.snippet}&rdquo;
                  </p>
                )}

                {/* Bottom Row: Source Category Badge + Two-way Action Button */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-850">
                  <div className="flex items-center gap-1.5">
                    {getSourceTypeBadge(src.domain)}
                    {src.isConfirmedPlagiarism && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-950/90 text-rose-300 border border-rose-800/80">
                        Xác nhận trùng lặp
                      </span>
                    )}
                  </div>

                  {/* Action Button: "Xem vị trí trong bài" */}
                  <button
                    type="button"
                    onClick={() => onLocateSource?.(src)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-95 ${
                      isActive
                        ? 'bg-rose-500 text-white font-semibold shadow-sm'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:text-white'
                    }`}
                    title="Cuộn Text Viewer đến câu văn đối chiếu với nguồn này"
                    aria-label={`Xem vị trí trong bài của nguồn ${src.domain}`}
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>{isActive ? 'Đang xem vị trí' : 'Xem vị trí trong bài'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Google Search Queries Collapsible */}
      {searchQueries && searchQueries.length > 0 && (
        <div className="pt-2 border-t border-neutral-800/60 space-y-2">
          <button
            type="button"
            onClick={() => setShowQueries(!showQueries)}
            className="w-full flex items-center justify-between text-xs text-neutral-400 hover:text-neutral-200 py-1 transition-colors focus:outline-none cursor-pointer"
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
