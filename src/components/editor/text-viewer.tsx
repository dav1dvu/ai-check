'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  HighlightSegment,
} from '@/types/analysis';
import { sanitizeUrl } from '@/lib/security';
import {
  AlertTriangle,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  X,
  Lightbulb,
  Copy,
  Check,
} from 'lucide-react';

interface TextViewerProps {
  originalText: string;
  segments: HighlightSegment[];
  onSegmentSelect?: (segment: HighlightSegment | null) => void;
}

type FilterMode = 'all' | 'ai' | 'plagiarism';

interface TextChunk {
  id: string;
  isHighlighted: boolean;
  text: string;
  start: number;
  end: number;
  segment?: HighlightSegment;
}

export function TextViewer({
  originalText,
  segments,
  onSegmentSelect,
}: TextViewerProps) {
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');
  const [selectedSegment, setSelectedSegment] = useState<HighlightSegment | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const [copiedSuggestion, setCopiedSuggestion] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Filter segments based on selected filter mode
  const filteredSegments = useMemo(() => {
    if (!segments || segments.length === 0) return [];
    
    return segments.filter((seg) => {
      const isAi =
        seg.type === 'ai_slop' ||
        seg.type === 'formulaic_marker' ||
        seg.type === 'unnatural_rhythm';
      const isPlag =
        seg.type === 'plagiarism_verbatim' ||
        seg.type === 'plagiarism_paraphrase';

      if (activeFilter === 'ai') return isAi;
      if (activeFilter === 'plagiarism') return isPlag;
      return true;
    });
  }, [segments, activeFilter]);

  // Counts for filters
  const counts = useMemo(() => {
    let aiCount = 0;
    let plagCount = 0;
    segments.forEach((s) => {
      if (
        s.type === 'ai_slop' ||
        s.type === 'formulaic_marker' ||
        s.type === 'unnatural_rhythm'
      ) {
        aiCount++;
      } else if (
        s.type === 'plagiarism_verbatim' ||
        s.type === 'plagiarism_paraphrase'
      ) {
        plagCount++;
      }
    });
    return {
      all: segments.length,
      ai: aiCount,
      plagiarism: plagCount,
    };
  }, [segments]);

  // Clean, non-overlapping chunks from originalText
  const chunks = useMemo<TextChunk[]>(() => {
    if (!originalText) return [];
    if (!filteredSegments || filteredSegments.length === 0) {
      return [
        {
          id: 'chunk-all',
          isHighlighted: false,
          text: originalText,
          start: 0,
          end: originalText.length,
        },
      ];
    }

    // Sort valid segments by startOffset ascending
    const validSorted = [...filteredSegments]
      .filter((s) => s.startOffset >= 0 && s.endOffset <= originalText.length && s.startOffset < s.endOffset)
      .sort((a, b) => a.startOffset - b.startOffset || (b.endOffset - b.startOffset) - (a.endOffset - a.startOffset));

    const result: TextChunk[] = [];
    let currentIdx = 0;

    for (let i = 0; i < validSorted.length; i++) {
      const seg = validSorted[i];
      if (seg.startOffset < currentIdx) {
        // Skip fully overlapping nested segment to maintain clean text flow
        continue;
      }

      // Add plain unhighlighted gap before this segment
      if (seg.startOffset > currentIdx) {
        result.push({
          id: `chunk-plain-${currentIdx}`,
          isHighlighted: false,
          text: originalText.slice(currentIdx, seg.startOffset),
          start: currentIdx,
          end: seg.startOffset,
        });
      }

      // Add highlighted segment
      result.push({
        id: `chunk-seg-${seg.id}-${seg.startOffset}`,
        isHighlighted: true,
        text: originalText.slice(seg.startOffset, seg.endOffset),
        start: seg.startOffset,
        end: seg.endOffset,
        segment: seg,
      });

      currentIdx = seg.endOffset;
    }

    // Remaining tail
    if (currentIdx < originalText.length) {
      result.push({
        id: `chunk-plain-${currentIdx}-end`,
        isHighlighted: false,
        text: originalText.slice(currentIdx),
        start: currentIdx,
        end: originalText.length,
      });
    }

    return result;
  }, [originalText, filteredSegments]);

  // Close popover on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedSegment(null);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setSelectedSegment(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectChunk = (chunk: TextChunk) => {
    if (!chunk.segment) return;
    setSelectedSegment(chunk.segment);
    onSegmentSelect?.(chunk.segment);

    // Update active index
    const idx = filteredSegments.findIndex((s) => s.id === chunk.segment?.id);
    if (idx !== -1) setActiveSegmentIndex(idx);
  };

  const navigateSegment = (direction: 'prev' | 'next') => {
    if (filteredSegments.length === 0) return;
    let nextIdx = direction === 'next' ? activeSegmentIndex + 1 : activeSegmentIndex - 1;
    if (nextIdx >= filteredSegments.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = filteredSegments.length - 1;

    const targetSeg = filteredSegments[nextIdx];
    setActiveSegmentIndex(nextIdx);
    setSelectedSegment(targetSeg);
    onSegmentSelect?.(targetSeg);

    // Smooth scroll to segment
    const el = document.getElementById(`seg-target-${targetSeg.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }
  };

  // Helper to generate natural rewrite suggestion based on segment reason & snippet
  const getSuggestion = (seg: HighlightSegment): string => {
    if (seg.suggestion) return seg.suggestion;

    const isAi =
      seg.type === 'ai_slop' ||
      seg.type === 'formulaic_marker' ||
      seg.type === 'unnatural_rhythm';

    if (isAi) {
      if (seg.textSnippet.toLowerCase().includes('kỷ nguyên') || seg.textSnippet.toLowerCase().includes('era')) {
        return 'Hãy diễn đạt trực tiếp bằng ngữ cảnh cụ thể: ví dụ thay vì "Trong kỷ nguyên số hóa hiện nay", hãy viết "Ngày nay, khi công nghệ máy tính phổ biến..."';
      }
      if (seg.textSnippet.toLowerCase().includes('không thể phủ nhận') || seg.textSnippet.toLowerCase().includes('undeniable')) {
        return 'Bỏ các cụm khẳng định thụ động rườm rà. Viết thẳng vào nhận định chính để tăng tính chủ động và thuyết phục.';
      }
      if (seg.textSnippet.toLowerCase().includes('đóng một vai trò') || seg.textSnippet.toLowerCase().includes('pivotal role')) {
        return 'Thay thế cụm "đóng vai trò quan trọng" bằng động từ hành động cụ thể miêu tả tác động thực tế của chủ thể.';
      }
      return 'Thay thế các từ nối sáo ngữ khuôn mẫu bằng luận điểm ngắn gọn, nêu số liệu thực tế hoặc trải nghiệm cá nhân cụ thể.';
    }

    if (seg.type === 'plagiarism_verbatim') {
      return 'Đoạn văn trùng khớp nguyên văn với nguồn tham khảo. Hãy trích dẫn trong ngoặc kép kèm ghi chú nguồn rõ ràng, hoặc diễn đạt lại toàn bộ bằng ngôn ngữ của riêng bạn.';
    }

    return 'Diễn đạt lại ý tưởng theo cấu trúc ngữ pháp khác, kết hợp góc nhìn phân tích độc lập để tránh trùng lặp cấu trúc tư duy với bài viết gốc.';
  };

  const handleCopySuggestion = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedSuggestion(true);
    setTimeout(() => setCopiedSuggestion(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900/90 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
      {/* Viewer Header & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 px-4 sm:px-6 py-3.5 bg-neutral-950/70">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeFilter === 'all'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Tất cả ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeFilter === 'ai'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60 shadow-sm'
                : 'text-neutral-400 hover:text-amber-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            AI Slop ({counts.ai})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('plagiarism')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeFilter === 'plagiarism'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60 shadow-sm'
                : 'text-neutral-400 hover:text-rose-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Đạo văn ({counts.plagiarism})
          </button>
        </div>

        {/* Stepper Navigation between flags */}
        {filteredSegments.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-400 text-[11px] hidden sm:inline">
              Đoạn {activeSegmentIndex >= 0 ? activeSegmentIndex + 1 : '-'}/{filteredSegments.length}
            </span>
            <div className="inline-flex items-center border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900">
              <button
                type="button"
                onClick={() => navigateSegment('prev')}
                className="p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors focus:outline-none"
                aria-label="Đoạn nghi vấn trước"
                title="Đoạn trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-neutral-800" />
              <button
                type="button"
                onClick={() => navigateSegment('next')}
                className="p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors focus:outline-none"
                aria-label="Đoạn nghi vấn tiếp theo"
                title="Đoạn tiếp theo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div
        ref={containerRef}
        className="relative flex-1 p-5 sm:p-8 overflow-y-auto max-h-[640px] focus:outline-none font-sans text-sm sm:text-base leading-loose text-neutral-200 select-text"
        tabIndex={0}
        aria-label="Trình xem văn bản có đánh dấu tương tác"
      >
        {chunks.length === 0 ? (
          <p className="text-neutral-500 italic">Không có văn bản nào để hiển thị.</p>
        ) : (
          <div className="space-y-4 whitespace-pre-wrap break-words">
            {chunks.map((chunk) => {
              if (!chunk.isHighlighted || !chunk.segment) {
                return <span key={chunk.id}>{chunk.text}</span>;
              }

              const seg = chunk.segment;
              const isAi =
                seg.type === 'ai_slop' ||
                seg.type === 'formulaic_marker' ||
                seg.type === 'unnatural_rhythm';
              const isPlag =
                seg.type === 'plagiarism_verbatim' ||
                seg.type === 'plagiarism_paraphrase';
              const isSelected = selectedSegment?.id === seg.id;

              return (
                <mark
                  key={chunk.id}
                  id={`seg-target-${seg.id}`}
                  onClick={() => handleSelectChunk(chunk)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectChunk(chunk);
                    }
                  }}
                  className={`relative inline cursor-pointer rounded px-1 py-0.5 transition-all outline-none focus-visible:ring-2 ${
                    isAi
                      ? isSelected
                        ? 'bg-amber-500/35 border-b-2 border-amber-400 text-amber-100 ring-2 ring-amber-400'
                        : 'bg-amber-500/18 hover:bg-amber-500/28 border-b-2 border-amber-500/80 text-amber-100'
                      : isPlag
                      ? isSelected
                        ? 'bg-rose-500/35 border-b-2 border-rose-400 text-rose-100 ring-2 ring-rose-400'
                        : 'bg-rose-500/20 hover:bg-rose-500/30 border-b-2 border-rose-500/80 text-rose-100'
                      : 'bg-neutral-800 text-neutral-200'
                  }`}
                  aria-describedby={`tooltip-${seg.id}`}
                  title={`${isAi ? 'AI Slop' : 'Đạo văn'}: Nhấn để xem lý do & gợi ý sửa`}
                >
                  {chunk.text}
                </mark>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Detail Drawer / Popover when a segment is selected */}
      {selectedSegment && (
        <div
          ref={popoverRef}
          role="region"
          aria-label="Chi tiết phân tích đoạn văn được chọn"
          className="border-t border-neutral-800 bg-neutral-950/95 p-4 sm:p-5 transition-all shadow-2xl space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Badge */}
              {selectedSegment.type === 'ai_slop' ||
              selectedSegment.type === 'formulaic_marker' ||
              selectedSegment.type === 'unnatural_rhythm' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  AI Slop & Sáo Ngữ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/80">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Đạo Văn / Trùng Lặp
                </span>
              )}

              {/* Severity */}
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/60 uppercase">
                Mức độ: {selectedSegment.severity}
              </span>

              {/* Confidence */}
              <span className="text-[11px] font-mono text-neutral-400">
                Độ tin cậy: {Math.round(selectedSegment.confidence * 100)}%
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedSegment(null)}
              className="p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
              aria-label="Đóng bảng giải thích"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Snippet quotation */}
          <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300 italic border-l-4 border-l-amber-500">
            &ldquo;{selectedSegment.textSnippet}&rdquo;
          </div>

          {/* Reason */}
          <div className="text-xs text-neutral-300 leading-relaxed">
            <span className="font-semibold text-neutral-100">Lý do phát hiện: </span>
            {selectedSegment.reason}
          </div>

          {/* Natural Rewrite Suggestion */}
          <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-teal-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-teal-400" />
                Gợi ý diễn đạt tự nhiên hơn:
              </span>
              <button
                type="button"
                onClick={() => handleCopySuggestion(getSuggestion(selectedSegment))}
                className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                title="Sao chép gợi ý"
              >
                {copiedSuggestion ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Sao chép gợi ý</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {getSuggestion(selectedSegment)}
            </p>
          </div>

          {/* Matched Source link if present */}
          {selectedSegment.matchedSourceUrl && sanitizeUrl(selectedSegment.matchedSourceUrl) && (
            <div className="flex items-center gap-2 pt-1 text-xs text-neutral-400">
              <ExternalLink className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Nguồn nghi vấn:</span>
              <a
                href={sanitizeUrl(selectedSegment.matchedSourceUrl) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-300 hover:underline truncate max-w-sm"
              >
                {selectedSegment.matchedSourceTitle || selectedSegment.matchedSourceUrl}
              </a>
              {selectedSegment.matchedSimilarity && (
                <span className="font-mono text-neutral-500">
                  ({Math.round(selectedSegment.matchedSimilarity * 100)}% trùng lặp)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer Info Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-neutral-950/80 border-t border-neutral-800/60 text-[11px] text-neutral-400 font-mono">
        <div className="flex items-center gap-4">
          <span>Tổng {originalText.length.toLocaleString()} ký tự</span>
          <span>•</span>
          <span>
            {filteredSegments.length} đoạn được đánh dấu (
            {counts.all === 0
              ? '100% tự nhiên'
              : `${Math.round((filteredSegments.length / (originalText.split(/[.?!]+/).filter(Boolean).length || 1)) * 100)}% mật độ`}
            )
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-neutral-500">
          <HelpCircle className="w-3 h-3" />
          <span>Nhấp vào đoạn màu để xem chi tiết & gợi ý sửa</span>
        </div>
      </div>
    </div>
  );
}