/**
 * Security & Input Sanitization Utilities
 * Implements URL protocol sanitization and input defense-in-depth
 * Adheres to frontend-mobile-security-xss-scan best practices (OWASP CWE-79).
 */

/**
 * Validates and sanitizes URLs before binding to href or window navigation.
 * Strictly permits only http: and https: protocols, completely blocking
 * dangerous schemes like javascript:, data:, and vbscript:.
 */
export function sanitizeUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    // Non-parseable or relative URLs
  }
  return null;
}

/**
 * Convenience helper returning boolean check
 */
export function isValidHttpUrl(url?: string | null): boolean {
  return sanitizeUrl(url) !== null;
}
