# 📋 CHỈ ĐẠO CỦA TRƯỞNG NHÓM (DIRECTIVE FROM TEAM LEAD)

**Kính gửi**: Toàn thể thành viên nhóm dự án (`ai-researcher`, `fullstack-architect`, `ui-ux-designer`, `qa-security-auditor`)  
**Mục tiêu**: Xây dựng nền tảng Web kiểm tra AI Slop & Đạo văn (EN & VI) deploy 100% lên Vercel, sử dụng Gemini API, không lưu dữ liệu người dùng.

---

### 1. Nguyên tắc Cốt lõi (Non-negotiables)
1. **Stateless 100%**: Tuyệt đối không thiết lập database lưu trữ bài viết của người dùng. Tôn trọng quyền riêng tư.
2. **Vercel Constraints Compliance**:
   - File parsing (.docx, .pdf, .txt, .md) xử lý trực tiếp tại **Client (Browser)** để không vượt ngưỡng 4.5MB Serverless Payload và không phụ thuộc thư viện binary C++ native trên Lambda.
   - API route bắt buộc phải dùng **Streaming (SSE / ReadableStream)** hoặc tối ưu thời gian phản hồi dưới 30s (`maxDuration = 60`) để không bị timeout.
3. **Ứng dụng Kỹ năng Global (Skills Enforcement)**:
   - Từng thành viên phải áp dụng chuẩn mực trong các tài liệu skill được giao. Không viết code tùy tiện, code phải chuẩn TypeScript, clean architecture, responsive và accessibility WCAG.

---

### 2. Định hướng Xử lý 8 Repositories GitHub (Mục 3A)
Chúng ta được giao 8 repos GitHub danh tiếng:
- **AI Detect VI**: `trieuntu/VietAIDetector`, `vutuongvy101/multilingual-ai-human-text-detection`
- **AI Detect EN**: `ahans30/Binoculars`, `houtini-ai/ai-detect`
- **Plagiarism VI**: `minhmo3004/PlagiarismGuard_demo`, `oldguard69/graduation-thesis` (PhoBERT + SVM)
- **Plagiarism EN**: `NoplagLabs/noplag-engine`, `abautu/plagzap`

**Quyết định Kỹ thuật then chốt**:
Vercel Serverless không thể chạy model PyTorch/PhoBERT 500MB+ hoặc LLaMA/Falcon (Binoculars) do giới hạn 50MB package và RAM.  
👉 **Giải pháp Đột phá: Hybrid Fusion Engine**
- **Lớp 1 (Lightweight Algorithmic Engine - TypeScript)**: Triển khai thuật toán Winnowing Fingerprint (từ *Noplag*), Rabin-Karp & LCS (từ *PlagZap*), tính toán Burstiness (độ biến thiên độ dài câu), Lexical Diversity (TTR), và bộ lọc từ vựng sáo ngữ AI (từ *VietAIDetector* & *ai-detect*). Chạy ngay trong 10ms!
- **Lớp 2 (Semantic & Search Grounding Engine - Gemini API)**: Đúc kết tri thức phát hiện sâu và chống xào xáo ngữ nghĩa (từ *Binoculars* & *PhoBERT+SVM*) thành Structured Evaluation Rules, đồng thời bật **Google Search Tool** của Gemini để đối chiếu nguồn trực tiếp trên Internet.

---

### 3. Phân công Công việc Ngay lập tức
1. `ai-researcher`: Soạn báo cáo chi tiết về 8 repos và thiết kế Hybrid Engine trong `.messages/02_REPO_ANALYSIS_STRATEGY.md`.
2. `fullstack-architect`: Thiết lập kiến trúc thư mục Next.js 15, route handlers, cấu trúc JSON Schema cho Gemini.
3. `ui-ux-designer`: Thiết kế bản vẽ giao diện Dual-panel (Upload/Paste, Highlight Viewer, Score Gauge, Action Toolbar).
4. `qa-security-auditor`: Thiết lập checklist bảo mật (XSS, API Key protection, Vercel payload/timeout limits).

*Trưởng nhóm Antigravity - Ký tên.*
