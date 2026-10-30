/**
 * Sprint 3 Integration Test: Direct End-to-End Test for /api/analyze Handler
 * Tests both Vietnamese and English sample texts through the API controller.
 */

import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/analyze/route';

async function runApiTests() {
  console.log('=================================================================');
  console.log('🌐 TESTING /api/analyze END-TO-END WITH SAMPLE TEXTS');
  console.log('=================================================================\n');

  // SAMPLE 1: Vietnamese AI Slop Sample
  const viText = `Trong kỷ nguyên số hóa 4.0 phát triển vượt bậc hiện nay, không thể phủ nhận rằng công nghệ trí tuệ nhân tạo đóng vai trò quan trọng và là chiếc cầu nối thiết yếu giữa con người và tri thức. Không thể không nhắc đến những đột phá mang tính cách mạng, tạo tiền đề cho sự chuyển dịch toàn diện của xã hội. 

Hãy cùng điểm qua những tác động sâu rộng của làn sóng này: nó tựa như một bức tranh đa sắc màu, phản ánh sự kết hợp hoàn hảo giữa thuật toán hiện đại và năng lực sáng tạo vô tận. Dù vẫn còn đặt ra một dấu hỏi lớn về tính an toàn đạo đức, công nghệ vẫn đóng vai trò là một bệ phóng vững chắc cho tương lai.`;

  console.log('--- 1. Testing Vietnamese Sample ---');
  const reqVi = new NextRequest('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: viText,
      language: 'vi',
    }),
  });

  const resVi = await POST(reqVi);
  const dataVi = await resVi.json();

  console.log(`HTTP Status: ${resVi.status}`);
  console.log(`Success: ${dataVi.success}`);
  if (dataVi.success && dataVi.data) {
    const d = dataVi.data;
    console.log(`Language Detected: ${d.language}`);
    console.log(`Words: ${d.wordCount}, Sentences: ${d.sentenceCount}`);
    console.log(`AI Slop Score: ${d.aiSlopScore}% (Verdict: ${d.aiVerdict})`);
    console.log(`Plagiarism Score: ${d.plagiarismScore}% (Verdict: ${d.plagiarismVerdict})`);
    console.log(`Human Authenticity: ${d.humanAuthenticityScore}%`);
    console.log(`Highlight Segments Count: ${d.segments.length}`);
    console.log(`Executive Summary: "${d.executiveSummary}"`);
    console.log(`Timing: L1=${d.timing.layer1Ms}ms, L2=${d.timing.layer2Ms}ms, Total=${d.timing.totalMs}ms`);
  } else {
    console.error('API Error:', dataVi.error);
    process.exit(1);
  }

  console.log('\n--- 2. Testing English Sample ---');
  const enText = `In today's fast-paced digital landscape, it is imperative that we delve into the intricacies of generative artificial intelligence. This paradigm shift stands as a testament to relentless technological innovation, acting as a beacon of hope for solving complex global challenges.

By fostering a culture of collaborative research, organizations can effectively harness the power of deep learning across an ever-evolving landscape. Ultimately, this creates a rich tapestry of opportunities that bridges theoretical science and real-world deployment.`;

  const reqEn = new NextRequest('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: enText,
      language: 'en',
    }),
  });

  const resEn = await POST(reqEn);
  const dataEn = await resEn.json();

  console.log(`HTTP Status: ${resEn.status}`);
  console.log(`Success: ${dataEn.success}`);
  if (dataEn.success && dataEn.data) {
    const d = dataEn.data;
    console.log(`Language Detected: ${d.language}`);
    console.log(`Words: ${d.wordCount}, Sentences: ${d.sentenceCount}`);
    console.log(`AI Slop Score: ${d.aiSlopScore}% (Verdict: ${d.aiVerdict})`);
    console.log(`Plagiarism Score: ${d.plagiarismScore}% (Verdict: ${d.plagiarismVerdict})`);
    console.log(`Human Authenticity: ${d.humanAuthenticityScore}%`);
    console.log(`Highlight Segments Count: ${d.segments.length}`);
    console.log(`Executive Summary: "${d.executiveSummary}"`);
    console.log(`Timing: L1=${d.timing.layer1Ms}ms, L2=${d.timing.layer2Ms}ms, Total=${d.timing.totalMs}ms`);
  } else {
    console.error('API Error:', dataEn.error);
    process.exit(1);
  }

  console.log('\n=================================================================');
  console.log('🎉 SPRINT 3 API INTEGRATION VERIFICATION COMPLETE!');
  console.log('=================================================================');
}

runApiTests().catch((err) => {
  console.error('Fatal Test Exception:', err);
  process.exit(1);
});
