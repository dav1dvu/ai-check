'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { HighlightSegment, RewriteOption, RewriteResponseDto } from '@/types/analysis';
import { sanitizeUrl } from '@/lib/security';
import {
  AlertTriangle,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Lightbulb,
  Copy,
  Check,
  Compass,
  Wand2,
  Zap,
  MessageSquareQuote,
  GraduationCap,
  CheckCheck,
  Loader2,
} from 'lucide-react';

interface TextViewerProps {
  originalText: string;
  segments: HighlightSegment[];
  onSegmentSelect?: (segment: HighlightSegment | null) => void;
  onTextReplace?: (newText: string) => void;
  language?: 'vi' | 'en';
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
  onTextReplace,
  language = 'vi',
}: TextViewerProps) {
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');
  const [selectedSegment, setSelectedSegment] = useState<HighlightSegment | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const [copiedSuggestion, setCopiedSuggestion] = useState<boolean>(false);
  const [hoveredMinimapSeg, setHoveredMinimapSeg] = useState<{
    segment: HighlightSegment;
    top: number;
  } | null>(null);

  // Multi-tone AI Rewriter state
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  const [rewriteOptions, setRewriteOptions] = useState<RewriteOption[] | null>(null);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [appliedOptionIdx, setAppliedOptionIdx] = useState<number | null>(null);
  const [copiedRewriteIdx, setCopiedRewriteIdx] = useState<number | null>(null);

  // Reset rewriter state when selected segment changes
  useEffect(() => {
    setRewriteOptions(null);
    setRewriteError(null);
    setAppliedOptionIdx(null);
    setCopiedRewriteIdx(null);
  }, [selectedSegment?.id]);

  // Viewport scroll ratio tracking for the minimap slider
  const [viewportRatio, setViewportRatio] = useState<{ top: number; height: number }>({
    top: 0,
    height: 100,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const minimapTrackRef = useRef<HTMLDivElement>(null);
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
      .filter(
        (s) =>
          s.startOffset >= 0 &&
          s.endOffset <= originalText.length &&
          s.startOffset < s.endOffset
      )
      .sort(
        (a, b) =>
          a.startOffset - b.startOffset ||
          b.endOffset - b.startOffset - (a.endOffset - a.startOffset)
      );

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

  // Handle scroll to update the minimap viewport slider
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight <= clientHeight) {
      setViewportRatio({ top: 0, height: 100 });
      return;
    }
    const top = (scrollTop / scrollHeight) * 100;
    const height = (clientHeight / scrollHeight) * 100;
    setViewportRatio({ top, height });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      handleScroll();
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, chunks]);

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
        !containerRef.current.contains(e.target as Node) &&
        minimapTrackRef.current &&
        !minimapTrackRef.current.contains(e.target as Node)
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

  const scrollToSegment = (seg: HighlightSegment) => {
    setSelectedSegment(seg);
    onSegmentSelect?.(seg);

    const idx = filteredSegments.findIndex((s) => s.id === seg.id);
    if (idx !== -1) setActiveSegmentIndex(idx);

    // Smooth scroll to segment in DOM
    const el = document.getElementById(`seg-target-${seg.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }
  };

  const navigateSegment = (direction: 'prev' | 'next') => {
    if (filteredSegments.length === 0) return;
    let nextIdx = direction === 'next' ? activeSegmentIndex + 1 : activeSegmentIndex - 1;
    if (nextIdx >= filteredSegments.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = filteredSegments.length - 1;

    const targetSeg = filteredSegments[nextIdx];
    scrollToSegment(targetSeg);
  };

  // Click anywhere along the minimap track to scroll proportionally
  const handleMinimapTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !minimapTrackRef.current) return;
    const rect = minimapTrackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const ratio = Math.max(0, Math.min(1, clickY / rect.height));
    const targetScroll =
      ratio * (containerRef.current.scrollHeight - containerRef.current.clientHeight);
    containerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  // Helper to generate natural rewrite suggestion based on segment reason & snippet
  const getSuggestion = (seg: HighlightSegment): string => {
    const isAi =
      seg.type === 'ai_slop' ||
      seg.type === 'formulaic_marker' ||
      seg.type === 'unnatural_rhythm';

    if (isAi) {
      if (
        seg.textSnippet.toLowerCase().includes('kỷ nguyên') ||
        seg.textSnippet.toLowerCase().includes('era')
      ) {
        return 'Hãy diễn đạt trực tiếp bằng ngữ cảnh cụ thể: ví dụ thay vì "Trong kỷ nguyên số hóa hiện nay", hãy viết "Ngày nay, khi công nghệ máy tính phổ biến..."';
      }
      if (
        seg.textSnippet.toLowerCase().includes('không thể phủ nhận') ||
        seg.textSnippet.toLowerCase().includes('undeniable')
      ) {
        return 'Bỏ các cụm khẳng định thụ động rườm rà. Viết thẳng vào nhận định chính để tăng tính chủ động và thuyết phục.';
      }
      if (
        seg.textSnippet.toLowerCase().includes('đóng một vai trò') ||
        seg.textSnippet.toLowerCase().includes('pivotal role')
      ) {
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

  // Generate 3 tones rewrite from /api/rewrite
  const handleGenerateRewrites = async () => {
    if (!selectedSegment) return;
    setIsRewriting(true);
    setRewriteError(null);
    setAppliedOptionIdx(null);

    try {
      const surroundingContext = originalText.slice(
        Math.max(0, selectedSegment.startOffset - 150),
        Math.min(originalText.length, selectedSegment.endOffset + 150)
      );

      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: selectedSegment.textSnippet,
          context: surroundingContext,
          language: language || (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(selectedSegment.textSnippet) ? 'vi' : 'en'),
          violationReason: selectedSegment.reason,
        }),
      });

      const resData: RewriteResponseDto = await res.json();
      if (!res.ok || !resData.success || !resData.options) {
        throw new Error(resData.error?.message || 'Không thể tạo phương án viết lại lúc này.');
      }

      setRewriteOptions(resData.options);
    } catch (err) {
      setRewriteError(err instanceof Error ? err.message : 'Lỗi kết nối khi viết lại câu.');
    } finally {
      setIsRewriting(false);
    }
  };

  const handleCopyRewrite = (textToCopy: string, idx: number) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedRewriteIdx(idx);
    setTimeout(() => setCopiedRewriteIdx(null), 2000);
  };

  const handleApplyRewrite = (option: RewriteOption, idx: number) => {
    if (!selectedSegment) return;
    let updatedText = originalText;
    const targetSnippet = selectedSegment.textSnippet;

    if (
      selectedSegment.startOffset >= 0 &&
      selectedSegment.endOffset <= originalText.length &&
      originalText.slice(selectedSegment.startOffset, selectedSegment.endOffset) === targetSnippet
    ) {
      updatedText =
        originalText.slice(0, selectedSegment.startOffset) +
        option.rewrittenText +
        originalText.slice(selectedSegment.endOffset);
    } else {
      updatedText = originalText.replace(targetSnippet, option.rewrittenText);
    }

    setAppliedOptionIdx(idx);
    if (onTextReplace) {
      onTextReplace(updatedText);
    }
  };

  const totalTextLength = originalText.length || 1;

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
              Đoạn {activeSegmentIndex >= 0 ? activeSegmentIndex + 1 : '-'}/
              {filteredSegments.length}
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

      {/* Main Content Area: Split into Text Container & Vertical Minimap Heatmap Strip */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Scrollable Text Body */}
        <div
          ref={containerRef}
          className="flex-1 p-5 sm:p-8 pr-6 overflow-y-auto max-h-[640px] focus:outline-none font-sans text-sm sm:text-base leading-loose text-neutral-200 select-text"
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

        {/* THƯỚC ĐO BẢN ĐỒ NHIỆT VĂN BẢN (MINIMAP HEATMAP STRIP) */}
        <div
          className="w-5 sm:w-6 my-4 mr-2 sm:mr-3 shrink-0 flex flex-col items-center select-none relative group"
          role="navigation"
          aria-label="Thước đo bản đồ nhiệt văn bản (Minimap Heatmap)"
        >
          {/* Track Container (Width 5px, accessible click region) */}
          <div
            ref={minimapTrackRef}
            onClick={handleMinimapTrackClick}
            className="w-[5px] h-full bg-neutral-800/90 rounded-full relative overflow-hidden cursor-pointer shadow-inner border border-neutral-700/50"
            title="Thước đo bản đồ nhiệt: Nhấp chuột để cuộn nhanh đến vị trí câu văn"
          >
            {/* Viewport Indicator Slider (Shows currently visible region) */}
            <div
              className="absolute left-[-2px] right-[-2px] rounded-full border border-neutral-400/50 bg-neutral-400/15 pointer-events-none transition-all duration-75"
              style={{
                top: `${viewportRatio.top}%`,
                height: `${Math.max(4, viewportRatio.height)}%`,
              }}
            />

            {/* Mapped Heatmap Segment Ticks */}
            {filteredSegments.map((seg) => {
              const topPercent = (seg.startOffset / totalTextLength) * 100;
              const lenPercent =
                ((seg.endOffset - seg.startOffset) / totalTextLength) * 100;
              // Minimum height 2.0% so even short phrases remain clearly visible and clickable
              const heightPercent = Math.max(2.0, lenPercent);

              const isAi =
                seg.type === 'ai_slop' ||
                seg.type === 'formulaic_marker' ||
                seg.type === 'unnatural_rhythm';
              const isPlag =
                seg.type === 'plagiarism_verbatim' ||
                seg.type === 'plagiarism_paraphrase';

              const isCurrent = selectedSegment?.id === seg.id;

              return (
                <div
                  key={`minimap-${seg.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToSegment(seg);
                  }}
                  onMouseEnter={() =>
                    setHoveredMinimapSeg({ segment: seg, top: topPercent })
                  }
                  onMouseLeave={() => setHoveredMinimapSeg(null)}
                  className={`absolute left-0 right-0 rounded-sm transition-all cursor-pointer z-10 ${
                    isAi
                      ? isCurrent
                        ? 'bg-amber-300 ring-2 ring-amber-300 ring-offset-1 ring-offset-neutral-900 scale-x-125'
                        : 'bg-amber-400 hover:bg-amber-300'
                      : isPlag
                      ? isCurrent
                        ? 'bg-rose-400 ring-2 ring-rose-300 ring-offset-1 ring-offset-neutral-900 scale-x-125'
                        : 'bg-rose-500 hover:bg-rose-400'
                      : 'bg-neutral-600'
                  }`}
                  style={{
                    top: `${topPercent}%`,
                    height: `${heightPercent}%`,
                  }}
                  aria-label={`${isAi ? 'AI Slop' : 'Đạo văn'}: ${seg.textSnippet.slice(0, 30)}`}
                />
              );
            })}
          </div>

          {/* Floating Minimap Hover Tooltip */}
          {hoveredMinimapSeg && (
            <div
              className="absolute right-6 z-30 pointer-events-none p-2 rounded-lg bg-neutral-950/95 border border-neutral-700 shadow-2xl text-[11px] font-sans text-neutral-200 whitespace-nowrap animate-fadeIn max-w-[220px] truncate"
              style={{
                top: `${Math.min(85, Math.max(5, hoveredMinimapSeg.top))}%`,
              }}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {hoveredMinimapSeg.segment.type === 'ai_slop' ||
                hoveredMinimapSeg.segment.type === 'formulaic_marker' ||
                hoveredMinimapSeg.segment.type === 'unnatural_rhythm' ? (
                  <span className="text-amber-400">● AI Slop</span>
                ) : (
                  <span className="text-rose-400">● Đạo văn</span>
                )}
                <span className="text-neutral-500 font-mono text-[10px]">
                  ({Math.round(hoveredMinimapSeg.top)}%)
                </span>
              </div>
              <p className="text-neutral-400 italic truncate text-[10px] mt-0.5">
                &ldquo;{hoveredMinimapSeg.segment.textSnippet}&rdquo;
              </p>
            </div>
          )}
        </div>
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

          {/* One-Click Multi-Tone De-Slop Rewriter Trigger & Section */}
          <div className="pt-1 space-y-3">
            {!rewriteOptions && !isRewriting && (
              <button
                type="button"
                onClick={handleGenerateRewrites}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500/15 via-teal-500/15 to-emerald-500/15 hover:from-amber-500/25 hover:via-teal-500/25 hover:to-emerald-500/25 text-amber-200 border border-amber-500/30 hover:border-amber-400/60 transition-all shadow-md hover:shadow-amber-500/10 cursor-pointer"
              >
                <Wand2 className="w-4 h-4 text-amber-400" />
                <span>🪄 Viết lại tự nhiên (3 phong cách)</span>
              </button>
            )}

            {/* Skeleton Loading State */}
            {isRewriting && (
              <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3 animate-pulse">
                <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Đang khử sáo ngữ và biên tập lại theo 3 phong cách...</span>
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-neutral-800/80 rounded-lg" />
                  <div className="h-12 bg-neutral-800/80 rounded-lg" />
                  <div className="h-12 bg-neutral-800/80 rounded-lg" />
                </div>
              </div>
            )}

            {/* Error Banner */}
            {rewriteError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center justify-between">
                <span>{rewriteError}</span>
                <button
                  type="button"
                  onClick={handleGenerateRewrites}
                  className="underline hover:text-rose-100 ml-2 cursor-pointer font-semibold"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Rewritten 3 Tone Options Cards */}
            {rewriteOptions && rewriteOptions.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                    Phương án viết lại tự nhiên (3 phong cách):
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateRewrites}
                    disabled={isRewriting}
                    className="text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                  >
                    Làm mới lại
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {rewriteOptions.map((opt, idx) => {
                    const isApplied = appliedOptionIdx === idx;
                    const isCopied = copiedRewriteIdx === idx;

                    // Theme colors per tone
                    const toneStyles = {
                      concise: {
                        badge: 'bg-sky-950/80 text-sky-300 border-sky-800/80',
                        border: 'hover:border-sky-700/60',
                        icon: Zap,
                      },
                      narrative: {
                        badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
                        border: 'hover:border-emerald-700/60',
                        icon: MessageSquareQuote,
                      },
                      academic: {
                        badge: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
                        border: 'hover:border-purple-700/60',
                        icon: GraduationCap,
                      },
                    }[opt.tone] || {
                      badge: 'bg-neutral-800 text-neutral-300 border-neutral-700',
                      border: 'hover:border-neutral-600',
                      icon: Sparkles,
                    };

                    const ToneIcon = toneStyles.icon;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl bg-neutral-900/90 border transition-all ${
                          isApplied
                            ? 'border-emerald-500/80 bg-emerald-950/20 shadow-sm shadow-emerald-500/10'
                            : `border-neutral-800 ${toneStyles.border}`
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${toneStyles.badge}`}
                          >
                            <ToneIcon className="w-3 h-3" />
                            {opt.toneLabel}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={() => handleCopyRewrite(opt.rewrittenText, idx)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700 transition-colors cursor-pointer"
                              title="Sao chép câu này"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-neutral-400" />
                                  <span>Sao chép</span>
                                </>
                              )}
                            </button>

                            {/* Apply Replace button */}
                            <button
                              type="button"
                              onClick={() => handleApplyRewrite(opt, idx)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                                isApplied
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/40'
                              }`}
                              title="Thay thế câu này vào văn bản"
                            >
                              {isApplied ? (
                                <>
                                  <CheckCheck className="w-3 h-3 text-white" />
                                  <span>Đã thay thế</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  <span>Áp dụng thay thế</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Rewritten Text Content */}
                        <p className="text-xs text-neutral-100 font-sans leading-relaxed">
                          &ldquo;{opt.rewrittenText}&rdquo;
                        </p>

                        {/* Rationale */}
                        {opt.rationale && (
                          <p className="mt-1.5 text-[11px] text-neutral-400 italic">
                            💡 {opt.rationale}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Matched Source link if present */}
          {selectedSegment.matchedSourceUrl && (
            <div className="flex items-center gap-2 pt-1 text-xs text-neutral-400">
              <ExternalLink className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Nguồn nghi vấn:</span>
              <a
                href={sanitizeUrl(selectedSegment.matchedSourceUrl) || undefined}
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
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-neutral-950/80 border-t border-neutral-800/60 text-[11px] text-neutral-400 font-mono">
        <div className="flex items-center gap-4">
          <span>Tổng {originalText.length.toLocaleString()} ký tự</span>
          <span>•</span>
          <span>
            {filteredSegments.length} đoạn được đánh dấu (
            {counts.all === 0
              ? '100% tự nhiên'
              : `${Math.round(
                  (filteredSegments.length /
                    (originalText.split(/[.?!]+/).filter(Boolean).length || 1)) *
                    100
                )}% mật độ`}
            )
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-neutral-500">
          <span className="flex items-center gap-1 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> AI Slop
          </span>
          <span className="flex items-center gap-1 text-[10px] ml-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Đạo văn
          </span>
          <span className="text-neutral-600">|</span>
          <Compass className="w-3 h-3 text-neutral-400" />
          <span>Thước đo Minimap ở lề phải</span>
        </div>
      </div>
    </div>
  );
}