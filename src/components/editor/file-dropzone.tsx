'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  X,
  Sparkles,
  ClipboardPaste,
  Loader2,
} from 'lucide-react';
import { parseDocumentFile, SUPPORTED_EXTENSIONS } from '@/lib/parsers';
import { ParsedDocument } from '@/types/analysis';

interface FileDropzoneProps {
  onAnalyze: (text: string) => void;
  isLoading: boolean;
  initialText?: string;
  disabled?: boolean;
}

const SAMPLE_TEXT_VI = `Trong kỷ nguyên số hóa 4.0 phát triển vượt bậc hiện nay, không thể phủ nhận rằng công nghệ trí tuệ nhân tạo đóng vai trò quan trọng và là chiếc cầu nối thiết yếu giữa con người và tri thức. Không thể không nhắc đến những đột phá mang tính cách mạng, tạo tiền đề cho sự chuyển dịch toàn diện của xã hội. 

Hãy cùng điểm qua những tác động sâu rộng của làn sóng này: nó tựa như một bức tranh đa sắc màu, phản ánh sự kết hợp hoàn hảo giữa thuật toán hiện đại và năng lực sáng tạo vô tận. Dù vẫn còn đặt ra một dấu hỏi lớn về tính an toàn đạo đức, công nghệ vẫn đóng vai trò là một bệ phóng vững chắc cho tương lai.`;

const SAMPLE_TEXT_EN = `In today's fast-paced digital landscape, it is imperative that we delve into the intricacies of generative artificial intelligence. This paradigm shift stands as a testament to relentless technological innovation, acting as a beacon of hope for solving complex global challenges.

By fostering a culture of collaborative research, organizations can effectively harness the power of deep learning across an ever-evolving landscape. Ultimately, this creates a rich tapestry of opportunities that bridges theoretical science and real-world deployment.`;

export function FileDropzone({
  onAnalyze,
  isLoading,
  initialText = '',
  disabled = false,
}: FileDropzoneProps) {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [text, setText] = useState<string>(initialText);
  const [parsedDoc, setParsedDoc] = useState<ParsedDocument | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatting utility for file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleProcessFile = useCallback(async (file: File) => {
    setParseError(null);
    setIsParsing(true);

    try {
      const parsed = await parseDocumentFile(file);
      setParsedDoc(parsed);
      setText(parsed.cleanedText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi trích xuất tệp';
      setParseError(msg);
      setParsedDoc(null);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isLoading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isLoading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
      if (!SUPPORTED_EXTENSIONS.includes(ext as typeof SUPPORTED_EXTENSIONS[number])) {
        setParseError(`Định dạng không được hỗ trợ (${ext}). Hỗ trợ: .docx, .pdf, .txt, .md`);
        return;
      }
      await handleProcessFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleProcessFile(files[0]);
    }
    // reset input so the same file can be re-selected if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClear = () => {
    setText('');
    setParsedDoc(null);
    setParseError(null);
  };

  const loadSample = (lang: 'vi' | 'en') => {
    const sample = lang === 'vi' ? SAMPLE_TEXT_VI : SAMPLE_TEXT_EN;
    setText(sample);
    setParsedDoc(null);
    setParseError(null);
    setActiveTab('paste');
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = text.length;
  const isTooShort = charCount > 0 && charCount < 30;
  const isTooLong = charCount > 50000;
  const canAnalyze = charCount >= 30 && charCount <= 50000 && !isLoading && !isParsing;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canAnalyze) {
      onAnalyze(text);
    }
  };

  return (
    <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-2xl shadow-xl backdrop-blur-sm overflow-hidden transition-all">
      {/* Top Bar: Tabs & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between border-b border-neutral-800/80 px-4 sm:px-6 py-3 bg-neutral-950/60 gap-3">
        {/* Tab Switcher */}
        <div
          role="tablist"
          aria-label="Phương thức nhập văn bản"
          className="inline-flex p-1 bg-neutral-900 border border-neutral-800 rounded-xl"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'paste'}
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'paste'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-amber-400" />
            <span>Dán văn bản (Paste)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'upload'}
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-teal-400" />
            <span>Tải file lên (.docx, .pdf, .txt, .md)</span>
          </button>
        </div>

        {/* Quick Sample Triggers & Clear */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500 hidden sm:inline">Mẫu thử:</span>
          <button
            type="button"
            onClick={() => loadSample('vi')}
            disabled={isLoading || isParsing}
            className="px-2.5 py-1 rounded-md bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-300 border border-neutral-700/50 transition-colors disabled:opacity-50"
            title="Tải văn bản mẫu tiếng Việt chứa mẫu câu AI sáo ngữ"
          >
            VI Mẫu AI
          </button>
          <button
            type="button"
            onClick={() => loadSample('en')}
            disabled={isLoading || isParsing}
            className="px-2.5 py-1 rounded-md bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-300 border border-neutral-700/50 transition-colors disabled:opacity-50"
            title="Load English sample with AI formulaic tone"
          >
            EN Sample
          </button>
          {text.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading || isParsing}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-neutral-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors ml-1"
              title="Xóa trắng nội dung"
            >
              <X className="w-3 h-3" />
              <span>Xóa</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        {/* Upload Mode Dropzone */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf,.txt,.md"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload-input"
            />
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer select-none text-center ${
                isDragging
                  ? 'border-amber-400 bg-amber-950/20'
                  : 'border-neutral-700/70 bg-neutral-950/40 hover:border-neutral-600 hover:bg-neutral-950/60'
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Khu vực kéo thả tệp tài liệu"
            >
              <div className="w-12 h-12 rounded-xl bg-neutral-800/90 border border-neutral-700 flex items-center justify-center text-teal-400 mb-3 shadow-sm">
                {isParsing ? (
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                ) : (
                  <FileUp className="w-6 h-6" />
                )}
              </div>
              <p className="text-sm font-medium text-neutral-200">
                {isParsing
                  ? 'Đang trích xuất văn bản trực tiếp trên trình duyệt...'
                  : 'Kéo thả tệp vào đây hoặc nhấn để chọn'}
              </p>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                Hỗ trợ <span className="text-neutral-300 font-mono">.docx</span>,{' '}
                <span className="text-neutral-300 font-mono">.pdf</span>,{' '}
                <span className="text-neutral-300 font-mono">.txt</span>,{' '}
                <span className="text-neutral-300 font-mono">.md</span> (Tối đa 15MB, bảo mật 100% không tải lên máy chủ)
              </p>
            </div>

            {/* Parsed File Meta Banner */}
            {parsedDoc && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-800/60 flex items-center justify-center text-teal-400">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-200 truncate max-w-xs sm:max-w-md">
                      {parsedDoc.fileName}
                    </p>
                    <p className="text-neutral-400 text-[11px] mt-0.5">
                      {formatFileSize(parsedDoc.fileSize)} • {parsedDoc.wordCount.toLocaleString()} từ • {parsedDoc.charCount.toLocaleString()} ký tự
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParsedDoc(null);
                    setText('');
                  }}
                  className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                  aria-label="Hủy tệp đã tải"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error Notification */}
        {parseError && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Text Area (Visible in Paste mode or as review in Upload mode) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <label htmlFor="content-input" className="font-medium text-neutral-300">
              {activeTab === 'upload' ? 'Nội dung trích xuất từ tệp:' : 'Văn bản cần kiểm tra:'}
            </label>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className={isTooShort ? 'text-amber-400' : isTooLong ? 'text-rose-400' : 'text-neutral-400'}>
                {charCount.toLocaleString()} / 50,000 ký tự
              </span>
              <span className="text-neutral-500">•</span>
              <span className="text-neutral-300">{wordCount.toLocaleString()} từ</span>
            </div>
          </div>

          <div className="relative">
            <textarea
              id="content-input"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setParseError(null);
              }}
              placeholder="Dán bài viết, bài luận, đoạn văn bản tiếng Việt hoặc tiếng Anh vào đây để kiểm tra AI Slop & Đạo văn (tối thiểu 30 ký tự)..."
              disabled={isLoading || isParsing}
              rows={activeTab === 'upload' && !parsedDoc ? 5 : 9}
              className="w-full bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40 transition-all font-sans leading-relaxed resize-y min-h-[140px]"
            />
          </div>

          {/* Validation Warnings */}
          {isTooShort && (
            <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5 px-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>Văn bản quá ngắn (cần tối thiểu 30 ký tự để phân tích chính xác).</span>
            </p>
          )}
          {isTooLong && (
            <p className="text-[11px] text-rose-400/90 flex items-center gap-1.5 px-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>Văn bản vượt quá ngưỡng 50,000 ký tự. Vui lòng rút gọn trước khi gửi.</span>
            </p>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-800/60">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Phân tích kết hợp: Winnowing, Burstiness & Gemini Search Grounding</span>
          </div>

          <button
            type="submit"
            disabled={!canAnalyze}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl font-medium text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 active:scale-[0.98] ${
              canAnalyze
                ? 'bg-neutral-100 hover:bg-white text-neutral-950 shadow-lg shadow-neutral-950/40 cursor-pointer font-semibold'
                : 'bg-neutral-800/80 text-neutral-500 cursor-not-allowed border border-neutral-700/40'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-neutral-900" />
                <span>Đang Phân Tích Chuyên Sâu...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Kiểm Tra Ngay / Analyze Now</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function FileUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M12 12v6" />
      <path d="m15 15-3-3-3 3" />
    </svg>
  );
}