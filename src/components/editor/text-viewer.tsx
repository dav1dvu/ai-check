'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  HighlightSegment,
  GroundedSource,
  RewriteOption,
  RewriteResponseDto,
  RewriteTone,
} from '@/types/analysis';
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
  BookOpen,
  GraduationCap,
  CheckCheck,
  Loader2,
  GitCompare,
} from 'lucide-react';

function getToneConfig(tone: RewriteTone) {
  switch (tone) {
    case 'concise':
      return {
        Icon: Sparkles,
        colorClass: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
      };
    case 'narrative':
      return {
        Icon: BookOpen,
        colorClass: 'text-teal-400 bg-teal-950/60 border-teal-800/60',
      };
    case 'academic':
      return {
        Icon: GraduationCap,
        colorClass: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60',
      };
  }
}

interface TextViewerProps {
  originalText: string;
  segments: HighlightSegment[];
  sources?: GroundedSource[];
  focusedSegmentId?: string | null;
  targetCharOffset?: number | null;
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
  sources = [],
  focusedSegmentId,
  targetCharOffset,
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

  // Two-way synchronization: When focusedSegmentId is provided from parent (e.g. GroundedSources)
  useEffect(() => {
    if (!focusedSegmentId) return;

    const targetSeg = segments.find((s) => s.id === focusedSegmentId);
    if (!targetSeg) return;

    // Switch filter if necessary so segment is visible
    const isPlag =
      targetSeg.type === 'plagiarism_verbatim' ||
      targetSeg.type === 'plagiarism_paraphrase';
    if (isPlag && activeFilter === 'ai') {
      setActiveFilter('all');
    }

    setSelectedSegment(targetSeg);
    onSegmentSelect?.(targetSeg);

    // Scroll after DOM updates
    const timer = setTimeout(() => {
      const el = document.getElementById(`seg-target-${targetSeg.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [focusedSegmentId, segments, activeFilter, onSegmentSelect]);

  // Scroll to character offset when targetCharOffset is provided (e.g. from SlopTrajectory Timeline)
  useEffect(() => {
    if (targetCharOffset === null || targetCharOffset === undefined || !containerRef.current) return;

    const totalLen = originalText.length || 1;
    const ratio = Math.max(0, Math.min(1, targetCharOffset / totalLen));
    const targetScroll = ratio * (containerRef.current.scrollHeight - containerRef.current.clientHeight);

    containerRef.current.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth',
    });

    // If there is a segment located at or near this offset, highlight it
    const nearbySeg = segments.find(
      (s) =>
        (s.startOffset <= targetCharOffset && s.endOffset >= targetCharOffset) ||
        Math.abs(s.startOffset - targetCharOffset) < 150
    );
    if (nearbySeg) {
      setSelectedSegment(nearbySeg);
      onSegmentSelect?.(nearbySeg);
    }
  }, [targetCharOffset, originalText.length, segments, onSegmentSelect]);

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
    if (seg.suggestion) return seg.suggestion;

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

  // Handle Multi-tone AI Rewriter API call
  const handleGenerateRewrites = async () => {
    if (!selectedSegment) return;
    setIsRewriting(true);
    setRewriteError(null);

    try {
      const surroundingContext = originalText.slice(
        Math.max(0, selectedSegment.startOffset - 200),
        Math.min(originalText.length, selectedSegment.endOffset + 200)
      );

      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: selectedSegment.textSnippet,
          context: surroundingContext,
          language: language || 'vi',
          violationReason: selectedSegment.reason,
        }),
      });

      const data = (await res.json()) as RewriteResponseDto;
      if (!res.ok || !data.success || (!data.options && !data.data?.options)) {
        throw new Error(data.error?.message || 'Không thể tạo các gợi ý viết lại');
      }

      setRewriteOptions(data.options || data.data?.options || []);
    } catch (err) {
      setRewriteError(
        err instanceof Error ? err.message : 'Lỗi kết nối khi tạo phương án viết lại'
      );
    } finally {
      setIsRewriting(false);
    }
  };

  // Handle 1-Click Apply Replacement into original text
  const handleApplyRewrite = (opt: RewriteOption, idx: number) => {
    if (!selectedSegment || !onTextReplace) return;

    const before = originalText.slice(0, selectedSegment.startOffset);
    const after = originalText.slice(selectedSegment.endOffset);
    const newFullText = before + opt.rewrittenText + after;

    onTextReplace(newFullText);
    setAppliedOptionIdx(idx);
    setTimeout(() => {
      setSelectedSegment(null);
    }, 1200);
  };

  const handleCopyRewrite = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedRewriteIdx(idx);
    setTimeout(() => setCopiedRewriteIdx(null), 2000);
  };

  // Matched source resolution for Live Citation Inspector & Diff Card
  const matchedSource = useMemo(() => {
    if (!selectedSegment?.matchedSourceUrl && !selectedSegment?.matchedSourceTitle) {
      return null;
    }
    return sources?.find(
      (s) =>
        (selectedSegment.matchedSourceUrl && s.url === selectedSegment.matchedSourceUrl) ||
        (selectedSegment.matchedSourceTitle && s.title === selectedSegment.matchedSourceTitle)
    );
  }, [selectedSegment, sources]);

  const citationDomain = useMemo(() => {
    if (matchedSource?.domain) return matchedSource.domain;
    if (selectedSegment?.matchedSourceUrl) {
      try {
        return new URL(selectedSegment.matchedSourceUrl).hostname.replace(/^www\./, '');
      } catch {
        return selectedSegment.matchedSourceTitle || 'Nguồn đối chiếu web';
      }
    }
    return selectedSegment?.matchedSourceTitle || 'Nguồn đối chiếu web';
  }, [matchedSource, selectedSegment]);

  const citationTitle =
    selectedSegment?.matchedSourceTitle || matchedSource?.title || citationDomain;
  const citationSnippet =
    selectedSegment?.matchedSnippet || matchedSource?.snippet || '';
  const citationUrl = sanitizeUrl(
    selectedSegment?.matchedSourceUrl || matchedSource?.url || ''
  );
  const citationSimilarity = Math.round(
    (selectedSegment?.matchedSimilarity ??
      (matchedSource ? matchedSource.similarityScore / 100 : 0.45)) * 100
  );

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
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
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
                className="p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors focus:outline-none cursor-pointer"
                aria-label="Đoạn nghi vấn trước"
                title="Đoạn trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-neutral-800" />
              <button
                type="button"
                onClick={() => navigateSegment('next')}
                className="p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors focus:outline-none cursor-pointer"
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
                    title={`${isAi ? 'AI Slop' : 'Đạo văn'}: Nhấn để xem lý do & đối chiếu nguồn`}
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
          className="border-t border-neutral-800 bg-neutral-950/95 p-4 sm:p-5 transition-all shadow-2xl space-y-3.5"
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
              className="p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
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
            <p className="text-xs text-neutral-300 leading-relaxed font-sans">
              {getSuggestion(selectedSegment)}
            </p>
          </div>

          {/* ========================================================================= */}
          {/* THẺ ĐỐI CHIẾU NGUỒN TRỰC TIẾP (LIVE CITATION DIFF CARD) */}
          {/* ========================================================================= */}
          {(selectedSegment.type === 'plagiarism_verbatim' ||
            selectedSegment.type === 'plagiarism_paraphrase' ||
            selectedSegment.matchedSourceUrl) && (
            <div className="p-4 rounded-xl bg-neutral-900/95 border border-rose-800/70 shadow-xl space-y-3 animate-fadeIn">
              {/* Diff Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-950 flex items-center justify-center text-rose-400 border border-rose-800/60">
                    <GitCompare className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-100 flex items-center gap-1.5">
                      <span>Thẻ Đối Chiếu Nguồn Trực Tiếp (Live Citation Inspector)</span>
                    </h4>
                    <span className="text-[11px] font-mono text-neutral-400 block truncate max-w-xs">
                      {citationDomain}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-800/80">
                    Trùng khớp {citationSimilarity}%
                  </span>
                  {citationUrl && (
                    <a
                      href={citationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
                      title="Mở bài viết gốc trong tab mới"
                    >
                      <span>Mở bài gốc</span>
                      <ExternalLink className="w-3 h-3 text-neutral-400" />
                    </a>
                  )}
                </div>
              </div>

              {/* Side-by-Side Comparison Container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Box A: Văn bản bài viết của bạn */}
                <div className="p-3 rounded-lg bg-neutral-950/90 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Văn bản bài viết của bạn
                    </span>
                    <span className="text-neutral-500 font-mono text-[10px]">Input</span>
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed font-sans bg-amber-950/20 p-2.5 rounded border border-amber-900/30">
                    &ldquo;{selectedSegment.textSnippet}&rdquo;
                  </p>
                </div>

                {/* Box B: Trích đoạn web đối chiếu */}
                <div className="p-3 rounded-lg bg-neutral-950/90 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-rose-300">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      Trích đoạn phát hiện trên Web
                    </span>
                    <span className="text-neutral-500 font-mono text-[10px]">Web Excerpt</span>
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed font-sans bg-rose-950/20 p-2.5 rounded border border-rose-900/30 italic">
                    {citationSnippet ? (
                      <>&ldquo;{citationSnippet}&rdquo;</>
                    ) : (
                      <span className="text-neutral-500 not-italic">
                        (Đoạn trích dẫn không được lưu trong bộ nhớ đệm, vui lòng nhấp &ldquo;Mở bài gốc&rdquo; để kiểm tra toàn văn)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Metadata Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-850 text-[11px] text-neutral-400">
                <span className="truncate max-w-md">
                  Tiêu đề trang: <strong className="text-neutral-300 font-medium">{citationTitle}</strong>
                </span>
                <span className="text-neutral-500 font-mono">
                  Khuyến nghị: Thêm trích dẫn hoặc biên tập lại
                </span>
              </div>
            </div>
          )}

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
                </div>
              </div>
            )}

            {/* Rewriting Error Display */}
            {rewriteError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between">
                <span>{rewriteError}</span>
                <button
                  type="button"
                  onClick={handleGenerateRewrites}
                  className="underline hover:text-white font-medium"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Multi-Tone Suggestions Carousel / List */}
            {rewriteOptions && rewriteOptions.length > 0 && (
              <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    Lựa chọn viết lại (Nhấp 1-Click để thay thế trực tiếp):
                  </span>
                  <button
                    type="button"
                    onClick={() => setRewriteOptions(null)}
                    className="text-[11px] text-neutral-500 hover:text-neutral-300"
                  >
                    Thu gọn
                  </button>
                </div>

                <div className="space-y-2.5">
                  {rewriteOptions.map((opt, idx) => {
                    const isApplied = appliedOptionIdx === idx;
                    const isCopied = copiedRewriteIdx === idx;
                    const { Icon: ToneIcon, colorClass: toneColor } = getToneConfig(opt.tone);

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl transition-all border ${
                          isApplied
                            ? 'bg-emerald-950/40 border-emerald-700/80 ring-1 ring-emerald-500'
                            : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${toneColor}`}
                          >
                            <ToneIcon className="w-3 h-3" />
                            <span>{opt.toneLabel}</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={() => handleCopyRewrite(opt.rewrittenText, idx)}
                              className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                              title="Sao chép đoạn văn này"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* 1-Click Apply Button */}
                            {onTextReplace && (
                              <button
                                type="button"
                                onClick={() => handleApplyRewrite(opt, idx)}
                                disabled={isApplied}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                  isApplied
                                    ? 'bg-emerald-600 text-white cursor-default'
                                    : 'bg-neutral-100 hover:bg-white text-neutral-950 cursor-pointer shadow-sm active:scale-95'
                                }`}
                                title="Thay thế ngay đoạn này vào bài viết gốc"
                              >
                                {isApplied ? (
                                  <>
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    <span>Đã áp dụng!</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Áp dụng</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-neutral-200 leading-relaxed font-sans">
                          {opt.rewrittenText}
                        </p>

                        {opt.rationale && (
                          <p className="text-[11px] text-neutral-400 mt-1 italic pl-1 border-l border-neutral-800">
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
