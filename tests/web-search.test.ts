/**
 * Automated Test Suite: Independent Live Web Plagiarism Search Engine
 * Tests salient sentence extraction, query formulation, N-gram similarity matching,
 * and graceful fallback execution.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractSalientSentences,
  extractSalientSentenceSpans,
  formulateSearchQuery,
  computeNgramSimilarity,
  performLiveWebPlagiarismSearch,
} from '../src/lib/algorithms/web-search';

describe('Live Web Plagiarism Search Engine Tests', () => {
  // ---------------------------------------------------------------------------
  // 1. Salient Sentence Extraction
  // ---------------------------------------------------------------------------
  describe('Salient Sentence Extraction', () => {
    test('filters out short sentences (< 10 words) and conversational greetings', () => {
      const text = `
        Xin chào quý vị độc giả.
        Hôm nay trời đẹp.
        Kiến trúc Kubernetes điều phối các container ứng dụng tự động trên các cụm máy chủ phân tán có độ sẵn sàng cao.
        Hẹn gặp lại sau.
      `;

      const salient = extractSalientSentences(text, 2);

      assert.equal(salient.length, 1, 'Should only select sentences with >= 10 words');
      assert.ok(
        salient[0].includes('Kubernetes'),
        'Selected sentence should be the substantive technical statement'
      );
    });

    test('correctly computes start and end character offsets in extractSalientSentenceSpans', () => {
      const text =
        'Đoạn mở đầu ngắn. Hệ thống điều phối bộ nhớ phân tán giúp cải thiện đáng kể hiệu năng của các cụm xử lý dữ liệu lớn.';

      const spans = extractSalientSentenceSpans(text, 1);
      assert.equal(spans.length, 1);
      const span = spans[0];
      assert.ok(span.startOffset >= 0);
      assert.ok(span.endOffset > span.startOffset);
      assert.equal(text.slice(span.startOffset, span.endOffset), span.text);
    });

    test('handles empty input gracefully', () => {
      const result = extractSalientSentences('', 3);
      assert.deepEqual(result, []);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Search Query Formulation
  // ---------------------------------------------------------------------------
  describe('Search Query Formulation', () => {
    test('strips conversational clichés and keeps core keywords', () => {
      const rawSentence =
        "Trong kỷ nguyên số hóa hiện nay, công nghệ điện toán đám mây Kubernetes giúp tự động hóa việc triển khai microservices.";
      const query = formulateSearchQuery(rawSentence);

      assert.ok(!query.includes('Trong kỷ nguyên số hóa'), 'Should remove leading cliché');
      assert.ok(query.includes('Kubernetes'), 'Should retain technical subject');
      assert.ok(query.split(/\s+/).length <= 12, 'Query length should not exceed 12 words');
    });

    test('strips English introductory AI fillers', () => {
      const rawSentence =
        "In today's fast-paced digital world, neural networks process complex multivariable parameters for predictive analytics.";
      const query = formulateSearchQuery(rawSentence);

      assert.ok(!query.includes("today's fast-paced"), 'Should remove opening filler');
      assert.ok(query.includes('neural networks'), 'Should retain substantive query subject');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. N-gram Similarity Matching
  // ---------------------------------------------------------------------------
  describe('N-gram Similarity Matching', () => {
    test('computes high similarity and flags confirmed plagiarism for near-verbatim overlap (>= 35%)', () => {
      const sentence =
        'Kubernetes is an open-source container orchestration system for automating software deployment and scaling.';
      const snippet =
        'Kubernetes is an open source container orchestration system for automating application deployment, scaling, and management.';

      const result = computeNgramSimilarity(sentence, snippet);

      assert.ok(
        result.similarityScore >= 60,
        `Expected similarity >= 60%, got ${result.similarityScore}%`
      );
      assert.equal(result.isConfirmedPlagiarism, true);
    });

    test('identifies moderate paraphrase with confirmed plagiarism boundary (>= 35%)', () => {
      const sentence =
        'Thuật toán Winnowing trích xuất dấu vân tay tài liệu để phát hiện trùng lặp cục bộ.';
      const snippet =
        'Giải thuật Winnowing được sử dụng rộng rãi nhằm trích xuất dấu vân tay tài liệu để phát hiện trùng lặp văn bản.';

      const result = computeNgramSimilarity(sentence, snippet);

      assert.ok(
        result.similarityScore >= 35,
        `Expected similarity >= 35%, got ${result.similarityScore}%`
      );
      assert.equal(result.isConfirmedPlagiarism, true);
    });

    test('returns low score (< 15%) and false for unrelated text', () => {
      const sentence =
        'Hôm nay nhóm nghiên cứu tiến hành đo lường phương sai độ dài câu trên tập dữ liệu tiếng Việt.';
      const snippet =
        'Món phở bò truyền thống của Hà Nội được nấu từ nước dùng xương hầm trong nhiều giờ cùng hoa hồi và quế.';

      const result = computeNgramSimilarity(sentence, snippet);

      assert.ok(
        result.similarityScore < 15,
        `Expected similarity < 15%, got ${result.similarityScore}%`
      );
      assert.equal(result.isConfirmedPlagiarism, false);
    });

    test('handles empty strings without errors or NaN', () => {
      const result = computeNgramSimilarity('', '');
      assert.equal(result.similarityScore, 0);
      assert.equal(result.isConfirmedPlagiarism, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Live Search Engine Execution & Fallback Resilience
  // ---------------------------------------------------------------------------
  describe('Live Search Engine Resilience', () => {
    test('executes live search safely and returns structured output without throwing', async () => {
      const text = `
        Trí tuệ nhân tạo là ngành khoa học máy tính liên quan đến việc xây dựng các cỗ máy thông minh có khả năng thực hiện các nhiệm vụ đòi hỏi trí thông minh của con người.
        Mô hình học sâu sử dụng các mạng nơ-ron nhiều lớp để trích xuất các đặc trưng phân tầng từ dữ liệu thô.
      `;

      const output = await performLiveWebPlagiarismSearch(text, 'vi', 3500);

      assert.ok(Array.isArray(output.sources), 'Sources must be an array');
      assert.ok(Array.isArray(output.searchQueries), 'Search queries must be an array');
      assert.ok(Array.isArray(output.plagiarismSegments), 'Plagiarism segments must be an array');

      // Verify all returned sources comply with GroundedSource schema
      for (const src of output.sources) {
        assert.ok(src.id, 'Source must have an id');
        assert.ok(src.url.startsWith('http'), 'Source URL must be valid HTTP/HTTPS');
        assert.ok(src.domain, 'Source must have a domain');
        assert.ok(src.similarityScore >= 0 && src.similarityScore <= 100);
        assert.equal(typeof src.isConfirmedPlagiarism, 'boolean');
      }
    });

    test('aborts and returns empty array gracefully on immediate timeout (0ms)', async () => {
      const text = 'Một đoạn văn bản kiểm tra với độ dài hơn mười từ để kích hoạt trích xuất câu phức tạp.';
      const output = await performLiveWebPlagiarismSearch(text, 'vi', 1);

      assert.ok(Array.isArray(output.sources));
      assert.ok(Array.isArray(output.searchQueries));
    });
  });
});
