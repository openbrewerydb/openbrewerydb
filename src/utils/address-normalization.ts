/**
 * Shared address normalization utilities
 * Used by both analyze-data.ts and normalize-addresses.ts
 */

/**
 * Lightweight normalisation for address comparison (casing, punctuation, abbreviations).
 * Used for duplicate detection in analyze-data.ts.
 */
export function normalizeAddress(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/[.,#;:'"!@$%^&*()_+=\[\]\\\/\-]/g, " ")
    .replace(/\bstreet\b/g, "st")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\bboulevard\b/g, "blvd")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\broad\b/g, "rd")
    .replace(/\blane\b/g, "ln")
    .replace(/\bcourt\b/g, "ct")
    .replace(/\bsuite\b/g, "ste")
    .replace(/\bunit\b/g, "ste")
    .replace(/\bno\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lowercase, trimmed key for name comparison.
 */
export function normalizeName(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase().trim();
}
