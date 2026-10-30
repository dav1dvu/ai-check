'use client';

import React, { useState } from 'react';
import { AnalysisResult } from '@/types/analysis';
import {
  Copy,
  Check,
  Printer,
  RotateCcw,
} from 'lucide-react';

interface ActionToolbarProps {
  result: AnalysisResult;
  onReset: () => void;
  originalText?: string;
}

export function ActionToolbar({
  result,
  onReset,
}: ActionToolbarProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const generateMarkdownReport = (): string => {
    const lines: string[] = [];
    lines.push(`# 📋 BÁO CÁO PHÂN TÍCH AI SLOP & ĐẠO VĂN (AUDIT REPORT)`);
    lines.push(`**Thời gian tạo**: ${new Date(result.createdAt).toLocaleString('vi-VN')}`);
    lines.push(`**Ngôn ngữ phát hiện**: ${result.language.toUpperCase()}`);
    lines.push(`**Tổng số từ**: ${result.wordCount.toLocaleString()} từ | **Số ký tự**: ${result.characterCount.toLocaleString()}`);
    lines.push(`**Thời gian xử lý**: ${result.timing.totalMs}ms (Lớp 1 Thuật toán: ${result.timing.layer1Ms}ms | Lớp 2 Semantic Grounding: ${result.timing.layer2Ms}ms)`);
    lines.push(`**Mô hình sử dụng**: ${result.modelUsed || 'Hybrid Fusion Engine'}`);
    lines.push('');
    lines.push(`---`);
    lines.push('');
    lines.push(`## 1. ĐIỂM SỐ CỐT LÕI (CORE SCORES)`);
    lines.push(`- **Chỉ số AI Slop (AI Slop Index)**: **${result.aiSlopScore}%** (${result.aiVerdict})`);
    lines.push(`- **Chỉ số Đạo văn (Plagiarism Index)**: **${result.plagiarismScore}%** (${result.plagiarismVerdict})`);
    lines.push(`- **Độ chân thực con người (Human Authenticity)**: **${result.humanAuthenticityScore}%**`);
    lines.push('');
    lines.push(`## 2. TỔNG KẾT TỔNG QUAN (EXECUTIVE SUMMARY)`);
    lines.push(`> ${result.executiveSummary}`);
    lines.push('');
    lines.push(`## 3. ĐÁNH GIÁ 4 TRỤC CHI TIẾT (4-AXIS BREAKDOWN)`);
    lines.push(`1. **Nhịp điệu câu & Entropy**: ${result.breakdown.rhythmAndEntropy.score}/100 - ${result.breakdown.rhythmAndEntropy.explanation}`);
    lines.push(`2. **Sáo ngữ & Khuôn mẫu (Fluff)**: ${result.breakdown.fluffAndFormulas.score}/100 - ${result.breakdown.fluffAndFormulas.explanation}`);
    lines.push(`3. **Độ sâu lập luận**: ${result.breakdown.reasoningDepth.score}/100 - ${result.breakdown.reasoningDepth.explanation}`);
    lines.push(`4. **Tính nguyên bản & Trích dẫn**: ${result.breakdown.attributionIntegrity.score}/100 - ${result.breakdown.attributionIntegrity.explanation}`);
    lines.push('');
    lines.push(`## 4. CÁC ĐOẠN NGHI VẤN ĐƯỢC ĐÁNH DẤU (${result.segments.length})`);
    if (result.segments.length === 0) {
      lines.push(`*Không có đoạn văn nào vi phạm ngưỡng cảnh báo.*`);
    } else {
      result.segments.forEach((seg, idx) => {
        lines.push(`### Đoạn ${idx + 1}: [${seg.type}] (Độ tin cậy: ${Math.round(seg.confidence * 100)}%)`);
        lines.push(`> "${seg.textSnippet}"`);
        lines.push(`- **Lý do**: ${seg.reason}`);
        if (seg.matchedSourceUrl) {
          lines.push(`- **Nguồn đối chiếu**: [${seg.matchedSourceTitle || seg.matchedSourceUrl}](${seg.matchedSourceUrl})`);
        }
        lines.push('');
      });
    }

    if (result.sources && result.sources.length > 0) {
      lines.push(`## 5. NGUỒN ĐỐI CHIẾU GOOGLE SEARCH GROUNDING (${result.sources.length})`);
      result.sources.forEach((src, idx) => {
        lines.push(`${idx + 1}. [${src.title || src.domain}](${src.url}) - Tương đồng: ${src.similarityScore}%`);
      });
    }

    lines.push('');
    lines.push(`---`);
    lines.push(`*Báo cáo được khởi tạo tự động bởi AI Slop & Plagiarism Detector (EN & VI) - 100% Stateless & Privacy-first.*`);
    return lines.join('\n');
  };

  const handleCopyMarkdown = async () => {
    const md = generateMarkdownReport();
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-neutral-900/90 border border-neutral-800 rounded-2xl shadow-lg backdrop-blur-sm print:hidden">
      <div className="flex items-center gap-2">
        {/* Copy Markdown */}
        <button
          type="button"
          onClick={handleCopyMarkdown}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700/80 text-neutral-200 border border-neutral-700/60 transition-all cursor-pointer active:scale-95 shadow-sm"
          title="Sao chép toàn bộ báo cáo phân tích dưới dạng Markdown"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Đã Chép Markdown</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>Sao Chép Markdown</span>
            </>
          )}
        </button>

        {/* Print / Export PDF */}
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700/80 text-neutral-200 border border-neutral-700/60 transition-all cursor-pointer active:scale-95 shadow-sm"
          title="In hoặc xuất báo cáo ra file PDF"
        >
          <Printer className="w-3.5 h-3.5 text-teal-400" />
          <span>In / Xuất PDF</span>
        </button>
      </div>

      {/* New Analysis Reset Button */}
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-white text-neutral-950 transition-all cursor-pointer active:scale-95 shadow-md shadow-neutral-950/30"
        title="Quay lại kiểm tra đoạn văn bản mới"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Kiểm Tra Văn Bản Mới</span>
      </button>
    </div>
  );
}