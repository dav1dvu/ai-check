'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Zap,
  Globe,
  Lock,
  RotateCcw,
  AlertCircle,
  Clock,
  CheckCircle,
  Activity,
} from 'lucide-react';
import { FileDropzone } from '@/components/editor/file-dropzone';
import { TextViewer } from '@/components/editor/text-viewer';
import { ScoreGauge } from '@/components/dashboard/score-gauge';
import { MetricsBreakdown } from '@/components/dashboard/metrics-breakdown';
import { GroundedSources } from '@/components/dashboard/grounded-sources';
import { ActionToolbar } from '@/components/dashboard/action-toolbar';
import { AnalysisResult, AnalyzeResponseDto } from '@/types/analysis';

type PageState = 'idle' | 'analyzing' | 'done' | 'error';

export default function HomePage() {
  const [state, setState] = useState<PageState>('idle');
  const [inputText, setInputText] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Simulated phased progress during analysis
  const [loadingStep, setLoadingStep] = useState<number>(1);
  const [loadingProgress, setLoadingProgress] = useState<number>(10);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === 'analyzing') {
      setLoadingStep(1);
      setLoadingProgress(15);

      interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev < 40) {
            setLoadingStep(1);
            return prev + 12;
          } else if (prev < 75) {
            setLoadingStep(2);
            return prev + 7;
          } else if (prev < 92) {
            setLoadingStep(3);
            return prev + 3;
          }
          return prev;
        });
      }, 500);
    }

    return () => clearInterval(interval);
  }, [state]);

  const handleAnalyze = async (textToAnalyze: string) => {
    setInputText(textToAnalyze);
    setState('analyzing');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToAnalyze,
          language: 'auto',
          options: {
            checkAiSlop: true,
            checkPlagiarism: true,
            enableGrounding: false,
          },
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      let resData: AnalyzeResponseDto | null = null;

      if (contentType.includes('application/json')) {
        resData = (await response.json()) as AnalyzeResponseDto;
      } else {
        const textError = await response.text();
        if (response.status === 504 || textError.includes('TIMEOUT') || textError.includes('An error occurred')) {
          throw new Error('Máy chủ phản hồi quá thời gian quy định (Vercel Serverless Timeout). Vui lòng thử lại.');
        }
        throw new Error(`Máy chủ phản hồi lỗi (${response.status}). Vui lòng thử lại sau giây lát.`);
      }

      if (!response.ok || !resData || !resData.success || !resData.data) {
        throw new Error(
          resData?.error?.message || 'Có lỗi xảy ra khi phân tích bài viết. Vui lòng thử lại.'
        );
      }

      setLoadingProgress(100);
      setTimeout(() => {
        setAnalysisResult(resData.data!);
        setState('done');
      }, 400);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ phân tích';
      setErrorMessage(msg);
      setState('error');
    }
  };

  const handleReset = () => {
    setState('idle');
    setAnalysisResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090a0f] text-neutral-100 selection:bg-amber-500/30 selection:text-amber-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md px-4 sm:px-8 py-3.5 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset}>
            <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="font-semibold text-sm sm:text-base tracking-tight text-neutral-100">
                AI Slop & Plagiarism Detector
              </h1>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Bilingual (EN & VI) • Hybrid Fusion Engine
              </p>
            </div>
          </div>

          {/* Privacy & Engine Badge */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-900 border border-neutral-800 text-neutral-300">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">100% Stateless • Zero Data Retention</span>
              <span className="sm:hidden">Stateless</span>
            </span>

            {state === 'done' && (
              <button
                type="button"
                onClick={handleReset}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kiểm tra bài mới</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ========================================================================= */}
        {/* STATE 1: IDLE / INPUT STATE */}
        {/* ========================================================================= */}
        {state === 'idle' && (
          <div className="space-y-8 py-4 sm:py-8 max-w-5xl mx-auto">
            {/* Hero Statement */}
            <div className="text-center space-y-3 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-neutral-900 border border-neutral-800 text-neutral-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Độ Sắc Bén Biên Tập • Không Dùng Mẫu AI Generic
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-100">
                Kiểm Tra AI Slop & Đạo Văn Đa Ngữ
              </h2>
              <p className="text-neutral-400 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
                Phát hiện sáo ngữ rập khuôn, bóc tách nhịp điệu máy móc và đối chiếu nguồn Internet tức thì với mô hình lai 2 tầng: Giải thuật tốc độ cao (&lt;15ms) kết hợp Gemini Search Grounding.
              </p>
            </div>

            {/* Input Dropzone & Textarea */}
            <FileDropzone
              onAnalyze={handleAnalyze}
              isLoading={false}
              initialText={inputText}
            />

            {/* Architectural Trust Points (Anti-slop typography, subtle & dignified) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-neutral-850">
              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/60 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Giải Thuật Lớp 1 (&lt;15ms)</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Đo độ biến thiên câu (Burstiness), Winnowing Fingerprint và mật độ sáo ngữ AI tiếng Việt/Anh.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/60 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                  <Globe className="w-4 h-4 text-teal-400" />
                  <span>Google Search Grounding</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Đối chiếu bài viết trực tiếp với các bài báo, nghiên cứu và website đã xuất bản trên Internet.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/60 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Client-Side File Parsing</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Trích xuất văn bản .docx, .pdf, .txt, .md ngay trên trình duyệt, không đẩy file lên server.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATE 2: ANALYZING / LOADING SKELETON */}
        {/* ========================================================================= */}
        {state === 'analyzing' && (
          <div className="space-y-8 py-8 max-w-5xl mx-auto animate-fadeIn">
            {/* Phased Progress Banner */}
            <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-2xl backdrop-blur-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-amber-400">
                    <Activity className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-neutral-100">
                      Đang Tiến Hành Phân Tích Chuyên Sâu
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {loadingStep === 1 && 'Bước 1/3: Tính toán chỉ số Burstiness & Winnowing Fingerprint...'}
                      {loadingStep === 2 && 'Bước 2/3: Kích hoạt Gemini Google Search Grounding đối chiếu nguồn...'}
                      {loadingStep === 3 && 'Bước 3/3: Phân tích ngữ nghĩa 4 trục & tổng hợp điểm số...'}
                    </p>
                  </div>
                </div>

                <span className="font-mono text-sm font-bold text-amber-400">
                  {loadingProgress}%
                </span>
              </div>

              {/* Progress Track */}
              <div
                className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800"
                role="progressbar"
                aria-label="Tiến trình phân tích"
                aria-valuenow={loadingProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="bg-gradient-to-r from-amber-500 to-teal-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>

              {/* Phase Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                  loadingStep >= 1 ? 'border-amber-500/50 bg-amber-950/20 text-neutral-200' : 'border-neutral-800 text-neutral-500'
                }`}>
                  <CheckCircle className={`w-4 h-4 ${loadingStep > 1 ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span>1. Lớp 1 Thuật toán (&lt;15ms)</span>
                </div>
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                  loadingStep >= 2 ? 'border-amber-500/50 bg-amber-950/20 text-neutral-200' : 'border-neutral-800 text-neutral-500'
                }`}>
                  <CheckCircle className={`w-4 h-4 ${loadingStep > 2 ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span>2. Search Grounding</span>
                </div>
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                  loadingStep >= 3 ? 'border-amber-500/50 bg-amber-950/20 text-neutral-200' : 'border-neutral-800 text-neutral-500'
                }`}>
                  <CheckCircle className={`w-4 h-4 ${loadingStep === 3 ? 'text-amber-400 animate-pulse' : 'text-neutral-500'}`} />
                  <span>3. Đánh giá 4 Trục</span>
                </div>
              </div>
            </div>

            {/* Skeleton Dual-Panel Wireframe */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 opacity-60">
              {/* Left Column Skeleton */}
              <div className="lg:col-span-7 p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-4">
                <div className="h-6 w-1/3 bg-neutral-800 rounded animate-pulse" />
                <div className="space-y-3 pt-4">
                  <div className="h-4 w-full bg-neutral-800/80 rounded animate-pulse" />
                  <div className="h-4 w-5/6 bg-neutral-800/60 rounded animate-pulse" />
                  <div className="h-4 w-11/12 bg-amber-500/20 rounded animate-pulse" />
                  <div className="h-4 w-full bg-neutral-800/80 rounded animate-pulse" />
                  <div className="h-4 w-4/6 bg-rose-500/20 rounded animate-pulse" />
                  <div className="h-4 w-full bg-neutral-800/70 rounded animate-pulse" />
                </div>
              </div>

              {/* Right Column Skeleton */}
              <div className="lg:col-span-5 space-y-4">
                <div className="h-48 rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6 flex items-center justify-around">
                  <div className="w-24 h-24 rounded-full border-4 border-neutral-800 animate-pulse" />
                  <div className="w-24 h-24 rounded-full border-4 border-neutral-800 animate-pulse" />
                </div>
                <div className="h-64 rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6 space-y-3">
                  <div className="h-4 w-1/2 bg-neutral-800 rounded animate-pulse" />
                  <div className="h-3 w-full bg-neutral-800/70 rounded animate-pulse" />
                  <div className="h-3 w-full bg-neutral-800/70 rounded animate-pulse" />
                  <div className="h-3 w-full bg-neutral-800/70 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATE: ERROR */}
        {/* ========================================================================= */}
        {state === 'error' && (
          <div className="max-w-xl mx-auto my-12 p-6 rounded-2xl bg-neutral-900 border border-rose-800/60 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-100">
                Không thể hoàn thành phân tích
              </h3>
              <p className="text-xs text-rose-300 mt-1 max-w-md mx-auto leading-relaxed">
                {errorMessage || 'Đã xảy ra lỗi không xác định. Vui lòng kiểm tra lại văn bản hoặc kết nối mạng.'}
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setState('idle')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
              >
                Chỉnh sửa lại văn bản
              </button>
              <button
                type="button"
                onClick={() => handleAnalyze(inputText)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-white text-neutral-950 transition-colors cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATE 3: DONE / DUAL-PANEL RESULTS VIEW */}
        {/* ========================================================================= */}
        {state === 'done' && analysisResult && (
          <div className="space-y-6 animate-fadeIn">
            {/* Executive Summary & Telemetry Callout */}
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-xl backdrop-blur-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                    Tổng Kết Đánh Giá (Executive Synthesis)
                  </span>
                  <span className="text-[11px] font-mono text-neutral-500">
                    [{analysisResult.language.toUpperCase()}]
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-teal-400" />
                    Tổng {analysisResult.timing.totalMs}ms
                  </span>
                  <span>•</span>
                  <span>Lớp 1: {analysisResult.timing.layer1Ms}ms</span>
                  <span>•</span>
                  <span>Lớp 2: {analysisResult.timing.layer2Ms}ms</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans">
                {analysisResult.executiveSummary}
              </p>

              <div className="flex flex-wrap items-center justify-between pt-1 text-[11px] font-mono text-neutral-400 gap-2">
                <span>
                  Độ dài: {analysisResult.wordCount.toLocaleString()} từ ({analysisResult.characterCount.toLocaleString()} ký tự)
                </span>
                <span>Mô hình: {analysisResult.modelUsed || 'Hybrid Fusion Engine'}</span>
              </div>
            </div>

            {/* DUAL-PANEL GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT PANEL: Interactive Text Viewer with highlights */}
              <div className="lg:col-span-7 space-y-4">
                <TextViewer
                  originalText={inputText}
                  segments={analysisResult.segments}
                />
              </div>

              {/* RIGHT PANEL: Results Dashboard (Gauges, Metrics, Sources, Actions) */}
              <div className="lg:col-span-5 space-y-5">
                {/* 1. Action Toolbar */}
                <ActionToolbar
                  result={analysisResult}
                  onReset={handleReset}
                  originalText={inputText}
                />

                {/* 2. Core Score Gauges */}
                <ScoreGauge
                  aiScore={analysisResult.aiSlopScore}
                  plagiarismScore={analysisResult.plagiarismScore}
                  aiVerdict={analysisResult.aiVerdict}
                  plagiarismVerdict={analysisResult.plagiarismVerdict}
                  humanAuthenticityScore={analysisResult.humanAuthenticityScore}
                />

                {/* 3. 4-Axis Metrics Breakdown */}
                <MetricsBreakdown breakdown={analysisResult.breakdown} />

                {/* 4. Grounded Sources */}
                <GroundedSources
                  sources={analysisResult.sources}
                  searchQueries={analysisResult.searchQueries}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/60 bg-neutral-950/60 px-4 sm:px-8 py-6 mt-12 text-xs text-neutral-500 font-mono print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 AI Slop & Plagiarism Detector • Vercel Serverless Ready</p>
          <p>Thuật toán: Winnowing + Burstiness • Semantic: Gemini Google Search Grounding</p>
        </div>
      </footer>
    </div>
  );
}