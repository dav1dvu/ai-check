# 👥 TEAM ROSTER & GLOBAL SKILLS ENFORCEMENT (UPDATED)

**Dự án**: AI Slop & Plagiarism Detector (EN & VI)  
**Nền tảng triển khai**: Next.js 15 trên Vercel (100% Serverless / Client, Zero Database, Gemini Grounding API)  
**Trưởng nhóm (Team Lead)**: Antigravity Lead Agent  

---

## 1. Phân công Thành viên & Bắt buộc Áp dụng Global Skills

Mỗi thành viên trong nhóm phụ trách một mảng chuyên biệt. **Yêu cầu bắt buộc**: Mọi quyết định thiết kế và thực thi mã nguồn phải tham chiếu và tuân thủ chặt chẽ tài liệu hướng dẫn của Skill Global đã được chỉ định.

| Thành viên | Vai trò phụ trách | Kỹ năng Global BẮT BUỘC áp dụng | Đường dẫn Skill Global |
| :--- | :--- | :--- | :--- |
| **`ai-researcher`** | Nghiên cứu thuật toán từ 8 GitHub repos (Binoculars, Noplag, PhoBERT, v.v.), xây dựng Heuristic Rules & Gemini Prompt Engine. | • `prompt-engineering-patterns`<br>• `api-design-principles` | `skills/prompt-engineering-patterns/SKILL.md`<br>`skills/api-design-principles/SKILL.md` |
| **`fullstack-architect`** | Kiến trúc Next.js App Router, Route Handlers, Streaming SSE, tích hợp `@google/genai` (Search Grounding), xử lý file parser ở client. | • `nextjs-app-router-patterns`<br>• `architecture-patterns` | `skills/nextjs-app-router-patterns/SKILL.md`<br>`skills/architecture-patterns/SKILL.md` |
| **`ui-ux-designer`** | Thiết kế giao diện Dual-panel cao cấp, Anti-slop UI, Highlight tương tác, Score Gauge, Action Toolbar chuẩn Awwwards/SaaS. | • **`ui-ux-pro-max`** *(Kỹ thuật thiết kế hệ thống, typography, palette, layout Next.js & Tailwind)*<br>• **`taste-skill`** *(Anti-slop frontend art direction, loại bỏ hoàn toàn giao diện khuôn mẫu AI)*<br>• **`wcag-audit-patterns`** *(Tiêu chuẩn tiếp cận, tương phản highlight)* | `skills/ui-ux-pro-max/SKILL.md`<br>`skills/taste-skill/SKILL.md`<br>`skills/wcag-audit-patterns/SKILL.md` |
| **`qa-security-auditor`** | Kiểm thử, thẩm định bảo mật (XSS, API Key isolation, Vercel Serverless payload/timeout limit validation). | • `comprehensive-review-full-review`<br>• `frontend-mobile-security-xss-scan`<br>• `test-automator` | `skills/comprehensive-review-full-review/SKILL.md`<br>`skills/frontend-mobile-security-xss-scan/SKILL.md`<br>`skills/test-automator/SKILL.md` |

---

## 2. Ghi chú Nâng cấp cho `ui-ux-designer`
- **Sự kết hợp giữa `ui-ux-pro-max` và `taste-skill`**:
  - Website của chúng ta là công cụ **bắt lỗi AI Slop**, do đó giao diện tuyệt đối KHÔNG ĐƯỢC trông giống như một sản phẩm do AI sinh ra (AI template slop với 3 card icon generic, gradient tím mờ, font nhạt nhòa).
  - `taste-skill` giữ vai trò "Linh hồn thẩm mỹ Anti-slop" (enforce strict no-slop house style).
  - `ui-ux-pro-max` giữ vai trò "Bộ não kỹ thuật UI" (hơn 192 bảng màu, 74 font pairing, tokens chuẩn Tailwind/Next.js, UX patterns).
  - `wcag-audit-patterns` giữ vai trò bảo chứng tính tiếp cận khi tương tác với các dải text highlight vàng/đỏ.
