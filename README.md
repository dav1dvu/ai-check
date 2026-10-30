# 🛡️ AI Slop & Plagiarism Detector (EN & VI)

> **Hệ thống Phát hiện AI Slop & Đạo văn Song ngữ (Tiếng Việt & Tiếng Anh)**  
> *Kiến trúc Lai Hybrid Fusion Engine • 100% Stateless & Privacy-First • Triển khai tối ưu trên Vercel Serverless*

[![Next.js](https://img.shields.io/badge/Next.js-15.5.x-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.x-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_Mode-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-44%2F44_Passing-emerald?style=for-the-badge)](https://nodejs.org/)
[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel_Serverless-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

---

## 🌟 Tổng Quan Dự Án (Project Overview)

Trong kỷ nguyên bùng nổ của các mô hình ngôn ngữ lớn (LLM), không gian học thuật, báo chí và sáng tạo nội dung đang phải đối mặt với hai vấn đề nhức nhối: **AI Slop** (văn phong nhân tạo rập khuôn, hoa mỹ vô hồn, thiếu dẫn chứng thực tế) và **Đạo văn ngữ nghĩa** (Paraphrasing Plagiarism - hành vi xào xáo lại từ ngữ nhằm qua mặt các bộ lọc truyền thống).

**AI Slop & Plagiarism Detector** được xây dựng như một công cụ kiểm chứng văn bản tiêu chuẩn cao, kết hợp giữa **giải thuật tính toán ngôn ngữ học chính xác** và **năng lực tìm kiếm web thời gian thực của Google Gemini API**, đồng thời giữ vững nguyên tắc bảo vệ quyền riêng tư tuyệt đối: **100% Stateless — Không lưu trữ bất kỳ ký tự nào của người dùng**.

---

## ✨ Tính Năng Nổi Bật (Core Features)

### 1. Phân Tích Song Ngữ Chuẩn Xác (EN & VI Bilingual)
- **Tiếng Việt**: Tự động nhận diện và chuẩn hóa Unicode NFC (tránh lỗi dấu tổ hợp). Bộ từ điển 14+ mẫu sáo ngữ tiếng Việt kinh điển (*"trong thời đại số 4.0", "đóng vai trò then chốt", "bước tiến vượt bậc", "như một bức tranh đa sắc màu", "đặt ra một dấu hỏi lớn"...*) sử dụng regex ranh giới từ Unicode Lookbehind/Lookahead.
- **Tiếng Anh**: Khai thác các đặc trưng từ nghiên cứu ICLR 2024, bắt trọn các marker bất thường của LLM (*"delve into the intricacies", "a tapestry of", "beacon of hope", "foster a culture of", "in today's fast-paced digital world"...*).

### 2. Bảo Mật & Riêng Tư Tuyệt Đối (100% Stateless & Zero Retention)
- **Không Database, Không ORM, Không Cache vĩnh viễn**: Mọi văn bản chỉ tồn tại trong bộ nhớ tạm (in-memory) trong suốt vòng đời của request và được giải phóng ngay lập tức.
- **Xử Lý Tệp Trực Tiếp Trên Trình Duyệt (Client-Side File Parsing)**:
  - Hỗ trợ 4 định dạng phổ biến: `.docx` (Word), `.pdf`, `.txt`, `.md`.
  - Toàn bộ nội dung tệp được trích xuất trực tiếp bằng Web Worker và ArrayBuffer tại trình duyệt người dùng trước khi gửi chuỗi text sạch lên server.
  - **Lợi ích**: Không vượt ngưỡng payload 4.5MB của Vercel Serverless, không rò rỉ file nhị phân lên server.

### 3. Đối Chiếu Đạo Văn Web Thực Tế (Google Search Grounding)
- Tích hợp công cụ **Google Search Tool** chính thức qua `@google/genai`.
- Mô hình tự động trích xuất các câu đáng ngờ để truy vấn trực tiếp trên Internet, bóc tách `groundingMetadata` và trả về danh sách các URL nguồn đối chiếu kèm tiêu đề, tên miền, và mức độ trùng lặp.

### 4. Giao Diện Dual-Panel Tương Tác Cao Cấp (Anti-Slop Editorial Design)
- **Triết lý thiết kế Anti-slop**: Tối giản, đĩnh đạc, loại bỏ hoàn toàn giao diện màu tím AI rẻ tiền; tối ưu độ tương phản chuẩn **WCAG 2.2 AAA (> 7:1)**.
- **Đồng hồ trực quan kép (Score Gauge)**: Đo lường đồng thời chỉ số AI Slop Index (0-100%) và Plagiarism Index (0-100%).
- **Thanh đo lường 4 trục**: Nhịp điệu câu & Entropy, Mật độ sáo ngữ, Độ sâu luận điểm, Tính nguyên bản & Trích dẫn.
- **Trình xem văn bản tương tác**: Tô màu trực quan theo tọa độ ký tự chính xác (`startOffset` - `endOffset`), click vào đoạn highlight để xem lý do và **Gợi ý viết lại tự nhiên hơn (Natural Rewrite Suggestion)**.
- **Tiện ích xuất bản**: Sao chép Markdown 1-click, In / Xuất PDF với CSS `@media print` nền trắng tiết kiệm mực.

---

## 🏗️ Kiến Trúc Hybrid Fusion Engine

Do nền tảng Vercel Serverless có giới hạn bộ nhớ (RAM) và kích thước gói triển khai (50MB), việc nạp các mô hình PyTorch nặng hàng trăm MB (như PhoBERT hay Falcon/LLaMA) là bất khả thi. Dự án giải quyết bài toán này bằng **Kiến Trúc Lai 2 Tầng (Hybrid Fusion Engine)**:

```
                      [ Người dùng nhập Text hoặc Upload DOCX/PDF/TXT/MD ]
                                                │
                                    (Client-side Parsers)
                                                │
                                       [ Normalized Text ]
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
        [ LỚP 1: FAST ALGORITHMIC ENGINE ]             [ LỚP 2: SEMANTIC & SEARCH GROUNDING ]
            (TypeScript Pure • < 15ms)                     (Google Gemini 3.8 Flash SDK)
                       │                                                 │
        • Chuẩn hóa Unicode NFC tiếng Việt               • Tiếp nhận Telemetry từ Lớp 1
        • Phương sai độ dài câu (Burstiness σ²)          • Chain-of-Thought (CoT) 4 bước
        • Normalized Type-Token Ratio (STTR)             • Kích hoạt Google Search Grounding
        • Winnowing Fingerprinting (Rabin-Karp)          • Bóc tách nguồn URL đối chiếu thực
        • Quét Regex 28+ sáo ngữ AI (VI & EN)           • Đánh giá ngữ nghĩa (Paraphrasing)
        • Bảo vệ câu ngắn con người (μ < 10)            • Auto-Fallback sang Gemini 3.5 Flash Lite
                       │                                                 │
                       └────────────────────────┬────────────────────────┘
                                                │
                                  [ Bộ Điều Phối API Controller ]
                                 (src/app/api/analyze/route.ts)
                                                │
                                  [ DTO JSON Chuẩn Cấu Trúc ]
                                                │
                                  [ Giao Diện Dual-Panel UI ]
```

---

## 📚 Ghi Nhận Đóng Góp Từ 8 Repositories Nghiên Cứu

Hệ thống được thừa hưởng và đúc kết tri thức thuật toán từ 8 dự án mã nguồn mở danh tiếng:

| STT | Repository | Mảng nghiên cứu | Tri thức kỹ thuật được kế thừa & chuyển giao |
| :---: | :--- | :--- | :--- |
| **1** | [`ahans30/Binoculars`](https://github.com/ahans30/Binoculars) | AI Detect (EN) | Nguyên lý tương phản Perplexity, đo độ trôi chảy phi tự nhiên và tính đều đặn về nhịp điệu câu văn. |
| **2** | [`trieuntu/VietAIDetector`](https://github.com/trieuntu/VietAIDetector) | AI Detect (VI) | Danh mục sáo ngữ tiếng Việt rập khuôn; chuẩn hóa dấu thanh Unicode tiếng Việt. |
| **3** | [`vutuongvy101/multilingual-ai-human-text-detection`](https://github.com/vutuongvy101/multilingual-ai-human-text-detection) | Đa ngữ (VI - EN) | Công thức đo lường độ trồi sụt độ dài câu (Sentence Burstiness Variance $\sigma^2$) và Type-Token Ratio (TTR). |
| **4** | [`houtini-ai/ai-detect`](https://github.com/houtini-ai/ai-detect) | AI Detect (EN) | Bộ regex heuristic nhận diện trạng từ liên kết trang trọng dày đặc và các marker từ vựng LLM bất thường. |
| **5** | [`NoplagLabs/noplag-engine`](https://github.com/NoplagLabs/noplag-engine) | Đạo văn (EN) | Thuật toán **Winnowing Fingerprinting** băm k-gram trượt bằng đa thức Rabin-Karp độ phức tạp $O(N)$. |
| **6** | [`abautu/plagzap`](https://github.com/abautu/plagzap) | Đạo văn (EN) | Cấu trúc dữ liệu mảng tọa độ `[startOffset, endOffset]` để render dải màu highlight không đè gãy văn bản. |
| **7** | [`minhmo3004/PlagiarismGuard_demo`](https://github.com/minhmo3004/PlagiarismGuard_demo) | Đạo văn (VI) | Tiền xử lý văn bản tiếng Việt NFC, loại bỏ ký tự khoảng trắng tổ hợp ẩn và lọc stop-words. |
| **8** | [`oldguard69/graduation-thesis`](https://github.com/oldguard69/graduation-thesis) | Đạo văn (VI) | Tiêu chí phát hiện đạo văn cấp độ ngữ nghĩa (Paraphrasing Plagiarism - "thay vỏ giữ ruột"). |

---

## 🚀 Hướng Dẫn Triển Khai Lên Vercel (3 Bước)

Hệ thống được thiết kế tối ưu 100% cho Vercel Serverless Function, triển khai hoàn tất trong vòng 2 phút.

### Bước 1: Đẩy Mã Nguồn Lên GitHub
```bash
git add .
git commit -m "feat: ready for vercel deployment"
git push origin master
```

### Bước 2: Import Repository Vào Vercel Dashboard
1. Truy cập [Vercel Dashboard](https://vercel.com/dashboard).
2. Nhấp vào **"Add New..."** $\rightarrow$ chọn **"Project"**.
3. Chọn kho chứa GitHub của bạn (`ai-check`) và nhấp **"Import"**.
4. Vercel sẽ tự động phát hiện Framework Preset là **Next.js**. Giữ nguyên cấu hình Build và Output Directory mặc định.

### Bước 3: Cấu Hình Biến Môi Trường (Environment Variables)
Tại mục **"Environment Variables"** trên Vercel Dashboard, thêm 2 biến sau:

| Tên biến | Bắt buộc | Giá trị mẫu | Giải thích |
| :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | **Có** | `AIzaSy...` | Khóa API từ [Google AI Studio](https://aistudio.google.com/). *(Tuyệt đối không thêm tiền tố `NEXT_PUBLIC_` để bảo mật server-side)*. |
| `GEMINI_MODEL` | *Không* | `gemini-3.8-flash` | Model AI mong muốn (Mặc định: `gemini-3.8-flash`, tự động fallback sang `gemini-3.5-flash-lite`). |

👉 Nhấp **"Deploy"**. Vercel sẽ biên dịch ứng dụng và cấp cho bạn một domain URL production (ví dụ: `https://ai-check.vercel.app`).

---

## 💻 Hướng Dẫn Chạy Cục Bộ (Local Development)

### Yêu Cầu Môi Trường
- **Node.js**: Phiên bản 20.x trở lên (đã kiểm thử ổn định trên Node.js v24).
- **Trình quản lý gói**: `npm`.

### 1. Cài đặt các gói phụ thuộc
```bash
npm install
```

### 2. Thiết lập cấu hình biến môi trường
Sao chép tệp mẫu và nhập khóa Gemini API của bạn:
```bash
cp .env.example .env.local
```
Mở `.env.local` và cập nhật:
```env
GEMINI_API_KEY="your_actual_gemini_api_key_here"
GEMINI_MODEL="gemini-3.8-flash"
```

### 3. Chạy môi trường phát triển (Development Server)
```bash
npm run dev
```
Mở trình duyệt tại [http://localhost:3000](http://localhost:3000) để trải nghiệm ứng dụng.

### 4. Chạy bộ kiểm thử tự động (Test Suite)
Dự án tích hợp bộ 44 bài test tự động bao phủ toàn diện 4 khía cạnh: Document Parsers, Thuật toán Lớp 1, Route Handler Serverless và An ninh Bảo mật (XSS, Secret Isolation, Stateless Storage):
```bash
npm test
```

### 5. Kiểm tra biên dịch sản phẩm (Production Build)
```bash
npm run build
```
Kết quả biên dịch Turbopack:
```text
Route (app)                         Size  First Load JS
┌ ○ /                            19.7 kB         133 kB  (< 200 kB tối ưu)
├ ○ /_not-found                      0 B         114 kB
└ ƒ /api/analyze                     0 B            0 B
+ First Load JS shared by all     124 kB
```

---

## 🔒 Cam Kết An Ninh & Quyền Riêng Tư (Security & Privacy)

- **Phòng chống XSS (OWASP Top 10 / CWE-79)**: 0 hàm `dangerouslySetInnerHTML`, 0 `.innerHTML`, 0 `eval()`. Toàn bộ văn bản hiển thị qua React 19 Virtual DOM Text Node an toàn.
- **Làm sạch liên kết (URL Sanitization)**: Mọi liên kết nguồn trích dẫn từ Google Search đều được thẩm định qua bộ lọc [`src/lib/security.ts`](src/lib/security.ts), chỉ chấp nhận giao thức `http:` và `https:`.
- **Cô lập bí mật (Secret Isolation)**: Biến `GEMINI_API_KEY` chỉ tồn tại tại môi trường Vercel Serverless Function, tuyệt đối không xuất hiện trong bundle client của người dùng.
- **Tiếp cận toàn diện (WCAG 2.2 AAA)**: Bảng màu highlight đạt tỷ lệ tương phản > 7:1, hỗ trợ phím điều hướng (Tab, Enter, Space) và thông báo nhãn đa phương tiện.

---

## 👥 Đội Ngũ Phát Triển (Team Roster & Contributions)

Dự án được xây dựng bởi đội ngũ chuyên trách với vai trò và kỹ năng chuyên biệt:

- **`fullstack-architect`**: Kiến trúc Next.js 15 App Router, Clean Architecture, Thin Controller, Client-side File Parsers (Mammoth & PDF.js), Gemini Service & Vercel Serverless Integration.
- **`ai-researcher`**: Đúc kết tri thức từ 8 GitHub repos, thuật toán Winnowing & Rabin-Karp, hiệu chuẩn phương sai Burstiness, bộ từ điển Unicode Regex Markers song ngữ, Prompt Chain-of-Thought & Few-Shot Demonstrations.
- **`ui-ux-designer`**: Thiết kế giao diện Anti-slop Editorial Dual-panel, Score Gauge kép, 4-Axis Breakdown, Interactive Text Highlight Viewer với Drawer giải thích và Gợi ý viết lại tự nhiên, xuất bản Print/PDF.
- **`qa-security-auditor`**: Thiết kế 44 bài kiểm thử tự động (Node Test Runner), thẩm định an ninh XSS, cô lập API Key, tối ưu First Load JS (133 kB), chứng nhận sẵn sàng triển khai Vercel.

---

## 📄 Giấy Phép (License)

Dự án được phát hành theo giấy phép [MIT License](LICENSE). Tự do sử dụng, chỉnh sửa và triển khai cho các mục đích cá nhân, học thuật và thương mại.
