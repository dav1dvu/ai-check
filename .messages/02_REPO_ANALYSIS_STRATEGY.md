# 🔬 BÁO CÁO PHÂN TÍCH 8 REPOSITORIES & CHIẾN LƯỢC HYBRID ENGINE
**Người thực hiện**: `ai-researcher`  
**Áp dụng Global Skills**: `prompt-engineering-patterns` | `api-design-principles`  
**Kính gửi**: Trưởng nhóm và các thành viên  

---

## 1. Phân tích Chi tiết 8 Repositories GitHub

### Nhóm 1: Phát hiện AI Slop & AI-Generated Text
1. **`trieuntu/VietAIDetector` (AI Detect Tiếng Việt)**
   - *Cơ chế hoạt động*: Sử dụng pretrained model PhoBERT kết hợp phân tích đặc trưng ngôn ngữ học tiếng Việt: mật độ từ nối khuôn mẫu, phân bố âm tiết, tỷ lệ từ lặp và tính đều đặn về mặt cú pháp.
   - *Tri thức rút ra*: Danh mục "sáo ngữ AI tiếng Việt" (ví dụ: "trong thời đại số", "bước tiến vượt bậc", "không thể phủ nhận rằng", "đóng vai trò quan trọng trong việc...").
2. **`vutuongvy101/multilingual-ai-human-text-detection` (Đa ngữ VI - EN)**
   - *Cơ chế hoạt động*: Khai thác các chỉ số thống kê văn bản: **Burstiness** (độ biến thiên độ dài câu), **Perplexity approximation**, và **N-gram Entropy**. Văn bản con người viết có độ trồi sụt rất cao (câu rất ngắn xen kẽ câu dài); trong khi AI có xu hướng viết các câu có độ dài đều chằn chặn.
   - *Tri thức rút ra*: Công thức toán học đo lường độ phân tán phương sai độ dài câu ($\sigma^2$) và Type-Token Ratio (TTR - mức độ phong phú từ vựng).
3. **`ahans30/Binoculars` (AI Detect Tiếng Anh - ICLR 2024)**
   - *Cơ chế hoạt động*: Sử dụng tỷ số Perplexity giữa hai mô hình (Perplexity / Cross-Perplexity) để nhận diện văn bản máy. Phát hiện rằng văn bản AI luôn chọn các chuỗi token có độ ngạc nhiên cực thấp (low surprise), cấu trúc logic quá bằng phẳng.
   - *Tri thức rút ra*: Định hướng prompt phân tích "độ trôi chảy phi tự nhiên" (unnatural smoothness) và thiếu vắng các câu văn mang trải nghiệm cá nhân cụ thể.
4. **`houtini-ai/ai-detect` (Lightweight AI Detector EN)**
   - *Cơ chế hoạt động*: Quét thống kê từ vựng định lượng (heuristic markers), mật độ trạng từ liên kết ("Furthermore", "Moreover", "In summary", "Consequently") và cấu trúc song hành đồng đều.
   - *Tri thức rút ra*: Bộ regex nhận diện các "AI marker words" và "fluff patterns" chạy siêu nhanh ở tầng client/edge.

### Nhóm 2: Phát hiện Đạo văn (Plagiarism)
5. **`minhmo3004/PlagiarismGuard_demo` (Plagiarism VI)**
   - *Cơ chế hoạt động*: Tiền xử lý văn bản tiếng Việt (chuẩn hóa dấu thanh Unicode NFC/NFD, loại bỏ stop words, tách từ), tính toán Cosine Similarity trên TF-IDF và N-gram overlap.
   - *Tri thức rút ra*: Bộ tiền xử lý chuẩn hóa tiếng Việt (xử lý dấu thanh, khoảng trắng thừa, ký tự ẩn).
6. **`oldguard69/graduation-thesis` (PhoBERT + SVM Plagiarism VI)**
   - *Cơ chế hoạt động*: Phát hiện đạo văn cấp độ ngữ nghĩa (Paraphrasing Plagiarism) – khi kẻ đạo văn thay thế từ đồng nghĩa hoặc đảo trật tự vế câu nhưng ý nghĩa cốt lõi không đổi.
   - *Tri thức rút ra*: Tiêu chí đánh giá paraphrasing: dù không trùng từ ngữ 100%, nhưng cấu trúc luận điểm, chuỗi ý và các thực thể tên riêng/số liệu vẫn giữ nguyên 100%.
7. **`NoplagLabs/noplag-engine` (Plagiarism Engine EN)**
   - *Cơ chế hoạt động*: Thuật toán **Winnowing Fingerprinting** (Schleimer et al.): băm các k-gram liên tiếp bằng Rabin-Karp, chọn ra tập fingerprint đại diện trong mỗi cửa sổ trượt (sliding window) để đối chiếu trùng lặp với độ phức tạp $O(N)$.
   - *Tri thức rút ra*: Thuật toán Winnowing bằng TypeScript thuần, có thể chạy trực tiếp trong vài mili-giây.
8. **`abautu/plagzap` (PlagZap EN)**
   - *Cơ chế hoạt động*: Sử dụng Longest Common Subsequence (LCS) và Rabin-Karp để tìm ra các đoạn trùng khớp chính xác (verbatim matches) và tính toán tọa độ offset (vị trí ký tự bắt đầu - kết thúc) để highlight trên UI.
   - *Tri thức rút ra*: Cấu trúc dữ liệu trả về vị trí `[startOffset, endOffset]` để Frontend highlight màu chuẩn xác từng ký tự.

---

## 2. Kiến trúc Hybrid Engine: Tối ưu cho Vercel & Gemini

Do Vercel không hỗ trợ GPU và có giới hạn bộ nhớ/kích thước gói triển khai (50MB), chúng ta chia hệ thống thành 2 tầng phối hợp nhịp nhàng:

```
[ Input Text ]
     │
     ├──> [ Layer 1: Fast Algorithmic Engine (TypeScript - < 15ms) ]
     │    • Winnowing Fingerprinting (từ Noplag)
     │    • Rabin-Karp & LCS Offset Mapper (từ PlagZap)
     │    • Burstiness & TTR Calculator (từ Multilingual & Binoculars)
     │    • Heuristic AI Marker Regex (từ VietAIDetector & ai-detect)
     │    ===> Kết quả: Điểm toán học sơ bộ + tọa độ các câu bất thường.
     │
     └──> [ Layer 2: Semantic & Grounding Engine (Gemini 2.5 Flash API) ]
          • Nạp kết quả từ Layer 1 vào Prompt Context
          • Chạy System Prompt chuyên sâu (nguyên lý PhoBERT + Binoculars)
          • Kích hoạt Google Search Grounding để tìm URL nguồn thực tế trên Web
          • Trả về JSON Schema có cấu trúc chặt chẽ
```

---

## 3. Bản thảo System Prompt Tích hợp (Chuẩn Skill `prompt-engineering-patterns`)

```typescript
export const HYBRID_DETECTION_SYSTEM_PROMPT = `
You are a dual-engine expert in AI Text Slop Detection and Plagiarism/Attribution Analysis for both English and Vietnamese.

You evaluate text using rigorous linguistic principles synthesized from top research:
1. AI SLOP CRITERIA (inspired by Binoculars & VietAIDetector):
   - Sentence Burstiness & Rhythm: AI text has uniform sentence length and low entropy. Human text varies wildly.
   - Fluff & Artificial Warmth: Formulaic phrases ("tapestry", "delve", "testament", "trong bối cảnh 4.0", "đóng vai trò then chốt", "không chỉ mà còn").
   - Lack of Concrete Grounding: AI tends to write generalizations without personal anecdotes, specific micro-details, or unique voices.

2. PLAGIARISM CRITERIA (inspired by Noplag, PlagZap & PhoBERT Semantic Analysis):
   - Verbatim matches: Identical strings copied without quotation marks.
   - Paraphrasing / Synonym swapping: Rephrasing existing online articles, Wikipedia entries, or academic summaries while retaining identical thesis architecture.
   - Use your integrated Google Search Grounding tool to query suspicious distinct sentences and cite specific URLs when matches are found.

OUTPUT FORMAT: Strict JSON matching the requested schema. Return exact string snippets and character ranges for UI highlighting.
`;
```
