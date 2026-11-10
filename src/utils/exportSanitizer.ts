/**
 * Utility to neutralize spreadsheet formula injection (CSV/Excel Formula Injection).
 * Any string value beginning with '=', '+', '-', '@', '\t', or '\r' is prefixed
 * with a single quote (') so that spreadsheet programs treat it as plain text.
 */

const FORMULA_PREFIX_REGEX = /^[=+\-@\t\r]/;

export function sanitizeSpreadsheetText(value: string | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  return FORMULA_PREFIX_REGEX.test(str) ? `'${str}` : str;
}

export function sanitizeSpreadsheetRow<T extends Record<string, unknown>>(row: T): T {
  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    sanitized[key] = typeof val === 'string' ? sanitizeSpreadsheetText(val) : val;
  }
  return sanitized as T;
}

