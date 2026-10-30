# 🌐 BÁO CÁO HOÀN THÀNH: TRẢI NGHIỆM ĐỐI CHIẾU NGUỒN WEB ĐẠO VĂN & TƯƠNG TÁC HAI CHIỀU (INTERACTIVE LIVE CITATION INSPECTOR & TWO-WAY SOURCE LINKING)

**Người thực hiện**: `ui-ux-designer`  
**Dự án**: AI Slop & Plagiarism Detector (EN & VI bilingual)  
**Thời gian hoàn thành**: 30/10/2026  
**Áp dụng triệt để 3 Global Skills bắt buộc**:
1. `taste-skill` (`C:\Users\Admin\.gemini\config\skills\taste-skill\SKILL.md`):
   - Ngôn ngữ thiết kế tối giản, font chữ học thuật tinh tế, bảng màu tối (dark mode) sang trọng, không dùng gradient thừa hay bóng bẩy giả tạo.
   - Thẻ so sánh đối chiếu trích đoạn phân chia bố cục rõ ràng, sắc nét như ấn bản nghiên cứu khoa học.
2. `ui-ux-pro-max` (`C:\Users\Admin\.gemini\config\skills\ui-ux-pro-max\SKILL.md`):
   - Cấu trúc thẻ thông tin phân cấp trực quan, card đối chiếu so sánh side-by-side dễ quan sát.
   - Vi tương tác (micro-interactions) hai chiều mượt mà giữa Text Viewer và Grounded Sources.
3. `wcag-audit-patterns` (`C:\Users\Admin\.gemini\config\skills\wcag-audit-patterns\SKILL.md`):
   - Độ tương phản màu sắc đạt chuẩn WCAG AA/AAA: Vạch và viền đỏ hồng (`rose-500` / `rose-400`), vàng hổ phách (`amber-400`) trên nền tối `neutral-900`/`neutral-950`.
   - Hỗ trợ đầy đủ điều hướng bàn phím Tab/Enter, `role="region"`, `role="navigation"`, và `aria-label` cho tất cả các nút hành động.

---

## 1. Chi Tiết Các Cải Tiến Giao Diện Đã Triển Khai

### A. Nâng Cấp Component Grounded Sources (`src/components/dashboard/grounded-sources.tsx`)
- **Cập nhật Tiêu Đề Phụ**:
  Thay thế tiêu đề cũ thành:
  > *"Đối chiếu thời gian thực qua Mạng Tìm kiếm Mở (Live Web & Open Knowledge Engine)"*
- **Badge Phân Loại Nguồn Trực Quan**:
  - Nếu domain là `wikipedia.org`: Hiển thị Badge **"Bách khoa Wikipedia"** (tông màu lam dịu `bg-sky-950/80 text-sky-300 border-sky-800/60` kèm icon `BookOpen`).
  - Các domain khác: Hiển thị Badge **"Trang tin / Báo chí / Blog"** (tông màu xám bạc `bg-neutral-800/80 text-neutral-300 border-neutral-700/60` kèm icon `Newspaper`).
  - Đi kèm tag phần trăm tương đồng định lượng: `Trùng khớp 42%` hoặc `Trùng khớp 68%`.
- **Nút Hành Động 1-Click "Xem vị trí trong bài"**:
  - Tích hợp nút hành động trực tiếp trên từng thẻ nguồn kèm icon `Crosshair`.
  - Khi nhấp, Text Viewer bên trái lập tức cuộn mượt (`scrollIntoView({ behavior: 'smooth', block: 'center' })`) tới câu văn vi phạm tương ứng và làm nổi bật câu văn đó.
- **Hiệu Ứng Viền Sáng (Active Ring Focus)**:
  - Khi một thẻ nguồn được chọn (hoặc khi người dùng nhấp vào câu văn đạo văn tương ứng bên Text Viewer), thẻ nguồn sẽ có hiệu ứng viền sáng `ring-2 ring-rose-500/80 border-rose-500/80 shadow-lg shadow-rose-950/40`.
  - Tự động cuộn thẻ đang chọn vào tầm nhìn trong danh sách nguồn (`scrollIntoView({ behavior: 'smooth', block: 'nearest' })`).

---

### B. Thẻ Đối Chiếu Nguồn Trực Tiếp trong Text Viewer (`src/components/editor/text-viewer.tsx`)
Khi người dùng nhấp vào một câu văn có highlight đạo văn (`plagiarism_verbatim` hoặc `plagiarism_paraphrase`), bảng thông tin chi tiết bên dưới (Detail Panel) sẽ kích hoạt **"Thẻ Đối Chiếu Nguồn Trực Tiếp" (Live Citation Inspector & Diff Card)**:
- **Thông Tin Nguồn Đầy Đủ**:
  - Tên miền nguồn (`domain`), tiêu đề trang web (`title`), và đường link ngoài an toàn (được lọc qua `sanitizeUrl` chống XSS).
  - Nút **"Mở bài gốc"** với icon `ExternalLink` mở nguồn web trong tab mới với thuộc tính `rel="noopener noreferrer"`.
  - Tag tỷ lệ trùng khớp phần trăm định lượng.
- **Bố Cục So Sánh Trực Quan (Side-by-Side Comparison)**:
  - **Cột Trái (Input)**: *"Văn bản bài viết của bạn"* — Hiển thị nguyên văn câu trong bài với nền hổ phách nhạt `bg-amber-950/20`.
  - **Cột Phải (Web Excerpt)**: *"Trích đoạn phát hiện trên Web"* — Hiển thị đoạn trích dẫn đối chứng bóc tách từ trang web với nền đỏ hồng `bg-rose-950/20` dạng nghiêng (*italic*).
  - Giúp người dùng hoặc giảng viên/biên tập viên nhìn thấy ngay lập tức mức độ xào xáo hoặc sao chép nguyên văn.
- **Khuyến Nghị Học Thuật**:
  - Gợi ý bổ sung trích dẫn nguồn theo chuẩn APA/IEEE hoặc hướng dẫn biên tập lại bằng tư duy độc lập.

---

### C. Đồng Bộ Tương Tác Hai Chiều (Two-Way Synchronization)
*Được điều phối trơn tru tại `src/app/page.tsx`*:
1. **Chiều 1: Từ Thẻ Nguồn $\rightarrow$ Text Viewer**:
   - Khi bấm **"Xem vị trí trong bài"** trên thẻ nguồn bất kỳ ở cột bên phải:
   - State `activeCitationUrl` và `focusedSegmentId` được cập nhật.
   - Text Viewer tự động chuyển bộ lọc sang đoạn tương ứng (nếu đang bị lọc ẩn), cuộn mượt (`scrollIntoView`) đưa câu văn đó vào chính giữa màn hình và mở bảng phân tích chi tiết.
2. **Chiều 2: Từ Text Viewer $\rightarrow$ Thẻ Nguồn**:
   - Khi người dùng nhấp vào một câu văn bị đánh dấu đạo văn trong Text Viewer:
   - State `activeCitationUrl` được đồng bộ sang `GroundedSources`.
   - Thẻ nguồn tương ứng bên danh sách nguồn lập tức phát sáng với viền `ring-2 ring-rose-500` và chuyển nút thành trạng thái `"Đang xem vị trí"`.

---

## 2. Kết Quả Kiểm Thử & Biên Dịch Toàn Diện

| Hạng mục kiểm tra | Lệnh thực thi | Kết quả | Chi tiết |
| :--- | :--- | :--- | :--- |
| **Kiểm tra TypeScript Strict** | `npx tsc --noEmit` | **PASS (Exit code 0)** | 0 lỗi cú pháp hoặc kiểu dữ liệu. |
| **Bộ kiểm thử tự động** | `npm test` | **PASS (74/74 tests pass)** | Toàn bộ 74 bài test thuật toán, regex, parsers, rewriter, bảo mật và live web search chạy thành công trong 1.75s. |
| **Next.js Production Build** | `npm run build` | **PASS (0 errors, 0 warnings)** | Turbopack compile thành công trong 3.8s, First Load JS chỉ 141 kB. |
| **Tiêu chuẩn Trải nghiệm WCAG** | Audit Accessibility | **PASS** | Tương phản màu sắc đạt chuẩn, thẻ bàn phím và nhãn ngữ nghĩa đầy đủ. |

---

*Báo cáo được đệ trình bởi: ui-ux-designer*
