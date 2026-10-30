/**
 * Independent Live Web Plagiarism Search Engine
 * 
 * Clean Architecture & Domain Service:
 * - Independent of paid external APIs (Zero Google Search Grounding billing dependencies)
 * - Synthesizes extraction principles from minhmo3004/PlagiarismGuard_demo & NoplagLabs/noplag-engine
 * - Employs DuckDuckGo Lite & Wikipedia Open Knowledge Search with 3.5s AbortSignal timeout
 * - Computes N-gram & Jaccard similarity matching between web snippets and original text
 * - Flags confirmed plagiarism when overlap >= 35%
 */

import { GroundedSource, HighlightSegment } from '@/types/analysis';
import { splitIntoSentences, SentenceSpan } from './normalizer';
import { sanitizeUrl } from '../security';

export interface RawWebSearchResult {
  url: string;
  title: string;
  snippet: string;
  domain: string;
}

export interface LiveWebSearchOutput {
  sources: GroundedSource[];
  searchQueries: string[];
  plagiarismSegments: HighlightSegment[];
}

const DEFAULT_TIMEOUT_MS = 3500;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Extracts 2-3 most complex/salient sentence spans for plagiarism cross-referencing.
 * Excludes short sentences (< 10 words) and pure conversational openings/boilerplate.
 */
export function extractSalientSentenceSpans(text: string, maxCount: number = 3): SentenceSpan[] {
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return [];

  const candidates = sentences.filter((s) => {
    if (s.wordCount < 10) return false;
    const lower = s.text.toLowerCase().trim();
    // Filter conversational greetings or trivial transitions
    if (
      lower.startsWith('xin chào') ||
      lower.startsWith('hello') ||
      lower.startsWith('hãy cùng điểm qua') ||
      lower.startsWith('tóm lại, có thể thấy') ||
      lower.startsWith('in conclusion,') ||
      lower.startsWith('without further ado')
    ) {
      return false;
    }
    return true;
  });

  if (candidates.length === 0) {
    // Fallback to longest sentences if all filtered out
    return sentences
      .sort((a, b) => b.wordCount - a.wordCount)
      .slice(0, maxCount);
  }

  // Score complexity: length + unique words count + presence of substantive terms
  const scored = candidates.map((s) => {
    const words = s.text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean);
    const uniqueWords = new Set(words).size;
    const longWords = words.filter((w) => w.length >= 5).length;
    const complexityScore = uniqueWords * 1.5 + longWords * 2.0;

    return {
      span: s,
      score: complexityScore,
    };
  });

  // Sort descending by complexity
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxCount).map((s) => s.span);
}

export function extractSalientSentences(text: string, maxCount: number = 3): string[] {
  return extractSalientSentenceSpans(text, maxCount).map((s) => s.text);
}

/**
 * Formulates a high-precision search query from a complex sentence.
 * Removes conversational leading markers and keeps the core 8-12 informative keywords.
 */
export function formulateSearchQuery(sentence: string): string {
  // Strip common leading discourse fillers
  const cleaned = sentence
    .replace(/^(trong thời đại số|trong kỷ nguyên số hóa|không thể phủ nhận rằng|không thể không nhắc đến|tóm lại,|in today's fast-paced digital world,|it is imperative that|delve into the intricacies of)/gi, '')
    .trim();

  const words = cleaned
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length <= 12) {
    return words.join(' ');
  }

  // Take the most substantial continuous span (first 10-12 words)
  return words.slice(0, 11).join(' ');
}

/**
 * Computes N-gram & containment similarity between original sentence and web snippet.
 * Combines unigram overlap and bigram overlap.
 * Returns similarityScore (0 - 100) and isConfirmedPlagiarism (>= 35%).
 */
export function computeNgramSimilarity(
  sourceText: string,
  targetSnippet: string
): { similarityScore: number; isConfirmedPlagiarism: boolean } {
  const tokenize = (str: string): string[] =>
    str
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean);

  const t1 = tokenize(sourceText);
  const t2 = tokenize(targetSnippet);

  if (t1.length === 0 || t2.length === 0) {
    return { similarityScore: 0, isConfirmedPlagiarism: false };
  }

  // 1. Unigram Overlap (Containment relative to smaller snippet or query)
  const set1 = new Set(t1);
  const set2 = new Set(t2);
  let commonUnigrams = 0;
  for (const w of set1) {
    if (set2.has(w)) commonUnigrams++;
  }
  const minUnigrams = Math.min(set1.size, set2.size);
  const unigramOverlap = minUnigrams > 0 ? commonUnigrams / minUnigrams : 0;

  // 2. Bigram Overlap
  const getBigrams = (tokens: string[]): Set<string> => {
    const bg = new Set<string>();
    for (let i = 0; i < tokens.length - 1; i++) {
      bg.add(`${tokens[i]} ${tokens[i + 1]}`);
    }
    return bg;
  };

  const bg1 = getBigrams(t1);
  const bg2 = getBigrams(t2);
  let commonBigrams = 0;
  for (const b of bg1) {
    if (bg2.has(b)) commonBigrams++;
  }
  const minBigrams = Math.min(bg1.size, bg2.size);
  const bigramOverlap = minBigrams > 0 ? commonBigrams / minBigrams : 0;

  // Weighted similarity: 35% unigram + 65% bigram (bigrams protect against generic word coincidences)
  const combined = unigramOverlap * 0.35 + bigramOverlap * 0.65;
  const similarityScore = Math.min(100, Math.max(0, Math.round(combined * 100)));

  return {
    similarityScore,
    isConfirmedPlagiarism: similarityScore >= 35,
  };
}

/**
 * Decodes DuckDuckGo redirect link: //duckduckgo.com/l/?uddg=https%3A%2F%2F...
 */
function unwrapDuckDuckGoUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl;
  if (url.startsWith('//')) {
    url = 'https:' + url;
  }
  const match = url.match(/uddg=([^&]+)/);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return url;
    }
  }
  return url;
}

/**
 * Searches DuckDuckGo Lite endpoint with HTML parsing.
 */
async function searchDuckDuckGoLite(
  query: string,
  timeoutMs: number
): Promise<RawWebSearchResult[]> {
  const signal = AbortSignal.timeout(timeoutMs);

  const res = await fetch('https://lite.duckduckgo.com/lite/', {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    body: 'q=' + encodeURIComponent(query),
    signal,
  });

  if (!res.ok) {
    return [];
  }

  const html = await res.text();
  const results: RawWebSearchResult[] = [];

  // Parse result-link and result-snippet from DDG Lite
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;

  const links: { url: string; title: string }[] = [];
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    const cleanUrl = unwrapDuckDuckGoUrl(rawUrl);
    const title = match[2].replace(/<[^>]+>/g, '').trim();
    if (cleanUrl.startsWith('http')) {
      links.push({ url: cleanUrl, title });
    }
  }

  const snippets: string[] = [];
  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  }

  for (let i = 0; i < links.length; i++) {
    const item = links[i];
    const snippet = snippets[i] || '';
    let domain = 'web';
    try {
      domain = new URL(item.url).hostname.replace(/^www\./, '');
    } catch {
      domain = 'web';
    }

    results.push({
      url: item.url,
      title: item.title,
      snippet,
      domain,
    });
  }

  return results;
}

/**
 * Fallback: Searches Wikipedia Open Knowledge Search API (free, fast, no rate-limits).
 */
async function searchWikipediaKnowledge(
  query: string,
  timeoutMs: number,
  language: 'vi' | 'en' = 'vi'
): Promise<RawWebSearchResult[]> {
  const signal = AbortSignal.timeout(timeoutMs);
  const langSubdomain = language === 'vi' ? 'vi' : 'en';
  const endpoint = `https://${langSubdomain}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&format=json&srlimit=3`;

  const res = await fetch(endpoint, {
    headers: { 'User-Agent': USER_AGENT },
    signal,
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    query?: {
      search?: Array<{
        title: string;
        snippet: string;
      }>;
    };
  };

  const items = data.query?.search;
  if (!items || !Array.isArray(items)) return [];

  return items.map((item) => {
    const cleanTitle = item.title;
    const cleanSnippet = item.snippet.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').trim();
    const url = `https://${langSubdomain}.wikipedia.org/wiki/${encodeURIComponent(cleanTitle.replace(/ /g, '_'))}`;
    return {
      url,
      title: `${cleanTitle} - Wikipedia`,
      snippet: cleanSnippet,
      domain: `${langSubdomain}.wikipedia.org`,
    };
  });
}

/**
 * Fallback: Searches DuckDuckGo Instant Answer API.
 */
async function searchDuckDuckGoApi(
  query: string,
  timeoutMs: number
): Promise<RawWebSearchResult[]> {
  const signal = AbortSignal.timeout(timeoutMs);
  const endpoint = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;

  const res = await fetch(endpoint, {
    headers: { 'User-Agent': USER_AGENT },
    signal,
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    Heading?: string;
    Abstract?: string;
    AbstractURL?: string;
    AbstractSource?: string;
    RelatedTopics?: Array<{
      FirstURL?: string;
      Text?: string;
    }>;
  };

  const results: RawWebSearchResult[] = [];

  if (data.AbstractURL && data.Abstract) {
    let domain = 'duckduckgo.com';
    try {
      domain = new URL(data.AbstractURL).hostname.replace(/^www\./, '');
    } catch {
      // default
    }
    results.push({
      url: data.AbstractURL,
      title: data.Heading || data.AbstractSource || 'DuckDuckGo Abstract',
      snippet: data.Abstract,
      domain,
    });
  }

  if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
    for (const topic of data.RelatedTopics.slice(0, 3)) {
      if (topic.FirstURL && topic.Text) {
        let domain = 'web';
        try {
          domain = new URL(topic.FirstURL).hostname.replace(/^www\./, '');
        } catch {
          // default
        }
        results.push({
          url: topic.FirstURL,
          title: topic.Text.split(' - ')[0] || 'Reference Source',
          snippet: topic.Text,
          domain,
        });
      }
    }
  }

  return results;
}

/**
 * Robust Multi-provider Web Query with Graceful Fallback & Strict Timeout
 */
async function queryWebProviders(
  query: string,
  language: 'vi' | 'en',
  timeoutMs: number
): Promise<RawWebSearchResult[]> {
  // 1. Try DuckDuckGo Lite
  try {
    const ddgResults = await searchDuckDuckGoLite(query, timeoutMs);
    if (ddgResults.length > 0) return ddgResults;
  } catch {
    // Continue to fallbacks
  }

  // 2. Try Wikipedia Knowledge Search
  try {
    const wikiResults = await searchWikipediaKnowledge(query, Math.min(2000, timeoutMs), language);
    if (wikiResults.length > 0) return wikiResults;
  } catch {
    // Continue to next fallback
  }

  // 3. Try DuckDuckGo Instant Answer API
  try {
    const apiResults = await searchDuckDuckGoApi(query, Math.min(2000, timeoutMs));
    if (apiResults.length > 0) return apiResults;
  } catch {
    // Return empty array gracefully
  }

  return [];
}

/**
 * Main Live Web Plagiarism Search Engine
 * Executes independent real-time search, computes N-gram overlap, and generates GroundedSource[]
 */
export async function performLiveWebPlagiarismSearch(
  text: string,
  language: 'vi' | 'en' = 'vi',
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<LiveWebSearchOutput> {
  const isVi = language === 'vi';
  const salientSpans = extractSalientSentenceSpans(text, 3);
  if (salientSpans.length === 0) {
    return { sources: [], searchQueries: [], plagiarismSegments: [] };
  }

  const searchQueries: string[] = [];
  const sourceMap = new Map<string, GroundedSource>();
  const plagiarismSegments: HighlightSegment[] = [];
  const highlightedSpans = new Set<string>();

  // Run searches for each salient sentence within overall timeout
  const searchPromises = salientSpans.map(async (span, idx) => {
    const sentence = span.text;
    const query = formulateSearchQuery(sentence);
    if (!query || query.length < 5) return;
    searchQueries.push(query);

    try {
      const rawResults = await queryWebProviders(query, language, timeoutMs);

      for (const raw of rawResults) {
        if (!raw.url) continue;
        const safeUrl = sanitizeUrl(raw.url);
        if (!safeUrl) continue;

        // Compute N-gram similarity against the original query sentence
        const { similarityScore, isConfirmedPlagiarism } = computeNgramSimilarity(
          sentence,
          raw.snippet || raw.title
        );

        const domain = raw.domain || 'web';
        const sourceKey = raw.url.toLowerCase();

        if (sourceMap.has(sourceKey)) {
          const existing = sourceMap.get(sourceKey)!;
          existing.matchedSnippetCount++;
          if (similarityScore > existing.similarityScore) {
            existing.similarityScore = similarityScore;
            existing.isConfirmedPlagiarism = existing.isConfirmedPlagiarism || isConfirmedPlagiarism;
          }
        } else {
          sourceMap.set(sourceKey, {
            id: `live-web-${idx + 1}-${Math.random().toString(36).slice(2, 7)}`,
            url: safeUrl,
            title: raw.title || domain,
            snippet: raw.snippet,
            domain,
            similarityScore,
            matchedSnippetCount: 1,
            isConfirmedPlagiarism,
          });
        }

        // If similarity is high (>= 35%), generate a character-offset highlight segment
        const spanKey = `${span.startOffset}-${span.endOffset}`;
        if (isConfirmedPlagiarism && !highlightedSpans.has(spanKey)) {
          highlightedSpans.add(spanKey);
          const isHeavy = similarityScore >= 60;
          plagiarismSegments.push({
            id: `plag-live-${span.startOffset}-${span.endOffset}`,
            startOffset: span.startOffset,
            endOffset: span.endOffset,
            textSnippet: sentence,
            type: isHeavy ? 'plagiarism_verbatim' : 'plagiarism_paraphrase',
            severity: isHeavy ? 'high' : 'medium',
            confidence: Math.round((similarityScore / 100) * 100) / 100,
            reason: isVi
              ? `Trùng lặp ${similarityScore}% với nguồn trực tuyến: ${raw.title}`
              : `${similarityScore}% content overlap with: ${raw.title}`,
            suggestion: isVi
              ? `Đoạn văn có độ tương đồng đáng kể với trang web đối chiếu. Hãy đưa vào dấu ngoặc kép kèm trích dẫn nguồn hoặc diễn đạt lại bằng ngôn ngữ của riêng bạn.`
              : `Significant overlap with external web source. Consider quoting directly with attribution or reformulating the text in your own words.`,
            matchedSourceUrl: safeUrl,
            matchedSourceTitle: raw.title || domain,
            matchedSimilarity: Math.round((similarityScore / 100) * 100) / 100,
          });
        }
      }
    } catch {
      // Graceful error recovery: failure in one query does not break the whole engine
    }
  });

  await Promise.allSettled(searchPromises);

  // Convert to array and sort by similarity score descending
  const sources = Array.from(sourceMap.values()).sort(
    (a, b) => b.similarityScore - a.similarityScore
  );

  return {
    sources,
    searchQueries,
    plagiarismSegments,
  };
}
