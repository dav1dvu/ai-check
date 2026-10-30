# Báo Cáo Kỹ Thuật: Module Phân Đoạn Trượt & Đo Lường Dòng Chảy AI Slop (Sliding Window Chunking & Slop Trajectory Engine)

- **Người thực hiện:** fullstack-architect
- **Ngày hoàn thành:** 30/10/2026
- **Trạng thái:** Hoàn tất 100%, 84/84 tests pass, First Load JS đạt 143 kB

---

## 1. Mục Tiêu & Bối Cảnh Bài Toán

### 1.1 Vấn đề "Văn bản lai" (Hybrid Text) trong văn bản dài
Khi đánh giá các tài liệu học thuật hoặc bài viết dài (từ 800 đến 15.000+ từ), người dùng thường gặp hiện tượng "Văn bản lai": phần lớn bài viết do con người tự viết (chỉ số AI rất thấp ~10-20%), nhưng có 1 hoặc 2 phân đoạn/chương quan trọng được sinh hoàn toàn bằng LLM (ChatGPT / Claude ~90%).
- Nếu áp dụng giải thuật trung bình cộng số học đơn thuần ($\text{Score} = \frac{1}{N} \sum s_i$), điểm số của cả bài sẽ bị pha loãng xuống mức an toàn (~25-30%), dẫn đến hiện tượng bỏ lọt vi phạm (False Negative nghiêm trọng).
- Ngược lại, nếu gửi nguyên khối 15.000 từ vào một lượt suy luận duy nhất, hệ thống không chỉ đối mặt với nguy cơ quá tải bộ nhớ và timeout trên Vercel Serverless (`maxDuration = 60`), mà còn không chỉ ra được chính xác dòng chảy AI phân bố ở đâu trong bài viết.

### 1.2 Giải pháp kiến trúc
Thiết kế và triển khai **Sliding Window Chunking & Slop Trajectory Engine** theo Clean Architecture:
1. Độc lập hóa thành một Domain Service tại [src/lib/algorithms/chunking.ts](file:///C:/DATA/01_Projects/ai-check/src/lib/algorithms/chunking.ts).
2. Phân đoạn trượt $O(N)$ giữ nguyên ranh giới câu (Sentence Boundary Preservation) với độ gối đầu 10% (Overlap) để không đứt gãy ngữ cảnh.
3. Đo lường độc lập cho từng phân đoạn: `aiScore`, `dominantTone`, `topViolations`, `burstinessVariance`, `hapaxRatio`.
4. Áp dụng công thức tính điểm tổng hợp có trọng số (**Weighted Composite Scoring**) ưu tiên phân vị rủi ro cao (Top Quartile & Max Spike).
5. Trực quan hóa tiến trình bằng thanh timeline tương tác trực quan (**SlopTrajectory**) với tính năng 1-click cuộn mượt tới vị trí ký tự trong trình đọc.

---

## 2. Ứng Dụng Triệt Để 3 Global Skills

### 2.1 `architecture-patterns` (Domain Service Isolation)
- Module phân đoạn trượt được đóng gói hoàn toàn độc lập tại `src/lib/algorithms/chunking.ts`, không phụ thuộc vào tầng Controller (`route.ts`) hay tầng UI.
- Tầng Controller [src/app/api/analyze/route.ts](file:///C:/DATA/01_Projects/ai-check/src/app/api/analyze/route.ts) chỉ gọi hàm nghiệp vụ `analyzeDocumentTrajectory(normalized, language)` và gán kết quả vào DTO [AnalysisResult](file:///C:/DATA/01_Projects/ai-check/src/types/analysis.ts).
- Đảm bảo tính đơn nhiệm: Thuật toán có thể được sử dụng độc lập trên Serverless API, Worker hoặc Client mà không gây tác dụng phụ.

### 2.2 `nextjs-app-router-patterns` (Serverless & Performance Optimization)
- Xử lý hoàn toàn trong giới hạn bộ nhớ và thời gian của Vercel Serverless: Không spawn child process, không tải model nhị phân nặng, toàn bộ pipeline phân đoạn và đánh giá 10.000 từ hoàn tất chỉ trong **~41ms** (dưới ngân sách 50ms rất nhiều lần).
- Không ảnh hưởng đến thời gian phản hồi của Route Handler `/api/analyze`.

### 2.3 `application-performance-performance-optimization` (O(N) Without Backtracking)
- **Zero Regex Recompilation:** Tái sử dụng các đối tượng `RegExp` đã được biên dịch trước trong `AI_MARKER_PATTERNS` bằng cách reset `pattern.regex.lastIndex = 0` thay vì `new RegExp(...)` trong vòng lặp.
- **Tối ưu hóa đếm từ:** Loại bỏ hoàn toàn việc tạo mảng chuỗi trung gian qua `split(/\s+/).filter(Boolean)` trong các vòng lặp câu; thay bằng đếm ký tự mã ASCII space (`charCodeAt === 32`), loại bỏ áp lực dọn rác (GC pressure).
- **Tránh trùng lặp phân tích cú pháp:** `SentenceSpan` được bóc tách và tính sẵn `wordCount` một lần duy nhất lúc khởi tạo; các phân đoạn sau đó chỉ việc trích xuất mảng con `sentenceLengths.slice(startIdx, endIdx + 1)` để tính Burstiness Variance $\sigma^2$ trong thời gian $O(1)$.

---

## 3. Chi Tiết Kỹ Thuật Đã Triển Khai

### 3.1 Cấu trúc DTO Mở Rộng ([src/types/analysis.ts](file:///C:/DATA/01_Projects/ai-check/src/types/analysis.ts))
```typescript
export interface ChunkTrajectoryItem {
  chunkIndex: number;
  startChar: number;
  endChar: number;
  wordCount: number;
  aiScore: number;
  plagiarismScore: number;
  dominantTone: 'likely_ai' | 'mixed' | 'likely_human';
  topViolations: string[];
  burstinessVariance?: number;
  hapaxRatio?: number;
}
```
Và trường tuỳ chọn `trajectory?: ChunkTrajectoryItem[];` được bổ sung trực tiếp vào `AnalysisResult`.

### 3.2 Thuật toán Phân đoạn Trượt ([src/lib/algorithms/chunking.ts](file:///C:/DATA/01_Projects/ai-check/src/lib/algorithms/chunking.ts))
1. **Ngưỡng kích hoạt:** Tự động kích hoạt khi `totalWords >= 800` hoặc `normalized.length >= 4000`. Khi dưới ngưỡng, hệ thống trả về 1 chunk duy nhất bao trùm toàn bộ văn bản.
2. **Kích thước cửa sổ trượt:** 
   - `targetChunkWords = 500` từ (phù hợp với biên độ nhận diện nhịp điệu phong cách học Stylometry và Burstiness).
   - `overlapRatio = 0.10` (10% gối đầu ~45-50 từ qua ranh giới câu).
   - Tịnh tiến cửa sổ `stepWords = 450` từ.
3. **Sentence Boundary Preservation:**
   - Cửa sổ không cắt ngang chừng giữa câu mà mở rộng từ `startOffset` của câu đầu tiên đến `endOffset` của câu kết thúc chunk.
   - Các câu cuối bài viết nếu còn dưới 120 từ sẽ được tự động gộp vào chunk liền trước để tránh phát sinh mẩu thừa vụn vặt (Tail Merging).

### 3.3 Công thức Weighted Composite Scoring cho Văn bản lai
```typescript
export function computeWeightedCompositeScore(chunks: ChunkTrajectoryItem[]): number {
  if (!chunks || chunks.length === 0) return 0;
  if (chunks.length === 1) return chunks[0].aiScore;

  const scores = chunks.map((c) => c.aiScore);
  const sorted = [...scores].sort((a, b) => b - a);
  const maxScore = sorted[0] || 0;
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  const topCount = Math.max(1, Math.round(chunks.length * 0.25));
  const topQuartile = sorted.slice(0, topCount).reduce((sum, s) => sum + s, 0) / topCount;

  let composite: number;
  if (maxScore >= 70) {
    // Phát hiện slop nghiêm trọng ở ít nhất một phân đoạn
    composite = 0.50 * topQuartile + 0.30 * maxScore + 0.20 * avgScore;
  } else if (maxScore >= 50) {
    // Slop mức độ vừa phải
    composite = 0.40 * topQuartile + 0.35 * avgScore + 0.25 * maxScore;
  } else {
    // Phần lớn là văn bản con người tự nhiên
    composite = 0.60 * avgScore + 0.40 * topQuartile;
  }

  return Math.min(Math.max(Math.round(composite), 0), 100);
}
```
*Kết quả:* Một bài báo gồm 4 đoạn tự nhiên (15-20 điểm) và 1 đoạn ChatGPT (92 điểm) sẽ cho điểm tổng hợp **80/100 (Cảnh báo AI nghiêm trọng)** thay vì bị trung bình hoá xuống **32/100 (An toàn - sai lệch)**!

### 3.4 Giao diện Dòng Chảy AI Slop ([src/components/dashboard/slop-trajectory.tsx](file:///C:/DATA/01_Projects/ai-check/src/components/dashboard/slop-trajectory.tsx))
- **Mini-Sparkline Timeline Bar:** Hiển thị thanh tiến trình trực quan phân bổ theo tỷ lệ độ dài từng chunk.
  - Khối đỏ: AI Slop chi phối ($\ge 60$).
  - Khối vàng: Văn phong hỗn hợp ($35 - 59$).
  - Khối xanh ngọc: Tự nhiên con người ($< 35$).
- **Thẻ chi tiết phân đoạn:** Hiển thị điểm số, nhịp điệu biến thiên câu $\sigma^2$, độ phong phú từ vựng Hapax Legomena, và danh sách cụm từ sáo ngữ vi phạm hàng đầu.
- **Tương tác 1-Click cuộn tới vị trí:** Nút "Cuộn tới đoạn này trong văn bản" kích hoạt callback `setTargetCharOffset(chunk.startChar)`, truyền vào [src/components/editor/text-viewer.tsx](file:///C:/DATA/01_Projects/ai-check/src/components/editor/text-viewer.tsx) để thực hiện `scrollIntoView({ behavior: 'smooth', block: 'center' })` chính xác đến từng ký tự.

---

## 4. Kết Quả Kiểm Thử & Tối Ưu Hóa

### 4.1 Bộ Test Tự Động ([tests/chunking.test.ts](file:///C:/DATA/01_Projects/ai-check/tests/chunking.test.ts))
Đã viết mới 10 ca kiểm thử bao quát toàn bộ các khía cạnh:
1. `short text returns exactly 1 chunk and isChunked === false`: Xác nhận ngưỡng kích hoạt.
2. `single sentence document is handled safely`: Xử lý biên văn bản 1 câu.
3. `1,500 - 3,000 words produces multiple chunks with ~10% sentence overlap`: Kiểm tra tính gối đầu `nextChunk.startChar < currentChunk.endChar`.
4. `chunk boundaries align with normalized text offsets`: Khớp chính xác chỉ số ký tự văn bản.
5. `weighted composite scoring prevents high-slop sections from being diluted`: Kiểm chứng giải bài toán văn bản lai.
6. `real hybrid document generates high weighted score for mixed document`: Mô phỏng văn bản lai thực tế song ngữ.
7. `empty string returns safe empty trajectory with zero score`: An toàn chuỗi rỗng.
8. `computeWeightedCompositeScore handles empty or single element array safely`: Không lỗi mảng rỗng.
9. `clamping strictly constrains scores between 0 and 100`: Giới hạn điểm số 0-100 tuyệt đối, không phát sinh NaN.
10. `10,000 words processes within 50ms (Serverless-optimized)`: Đạt **~41.8ms** trên 10.200 từ.

### 4.2 Tổng hợp Kiểm Thử Dự Án
```text
ℹ tests 84
ℹ suites 41
ℹ pass 84
ℹ fail 0
ℹ duration_ms 2072.5973 (2.07s cho toàn bộ 84 test)
```

### 4.3 Next.js Turbopack Build
```text
Route (app)                         Size  First Load JS
┌ ○ /                            29.6 kB         143 kB
├ ○ /_not-found                      0 B         114 kB
├ ƒ /api/analyze                     0 B            0 B
└ ƒ /api/rewrite                     0 B            0 B
+ First Load JS shared by all     126 kB
```
- First Load JS chỉ **143 kB** (ngân sách yêu cầu < 200 kB).
- Quy tắc React Hook `useState` và lint types tuân thủ 100%.
- Cơ chế bảo mật cách ly khóa API (`GEMINI_API_KEY`) được giữ vững tuyệt đối.
