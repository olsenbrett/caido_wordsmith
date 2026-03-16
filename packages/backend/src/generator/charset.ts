import type { GenerateOptions } from "./common.js";

/**
 * Expand a charset string that may contain range notation like a-z, A-Z, 0-9.
 * Example: "a-z0-9!@#" → "abcdefghijklmnopqrstuvwxyz0123456789!@#" (deduplicated)
 */
export function expandCharsetString(raw: string): string {
  let result = "";
  let i = 0;
  while (i < raw.length) {
    if (i + 2 < raw.length && raw[i + 1] === "-") {
      const fromCode = raw.charCodeAt(i);
      const toCode = raw.charCodeAt(i + 2);
      if (fromCode <= toCode) {
        for (let c = fromCode; c <= toCode; c++) {
          result += String.fromCharCode(c);
        }
        i += 3;
        continue;
      }
    }
    result += raw[i];
    i++;
  }
  // Deduplicate while preserving order
  return [...new Set(result)].join("");
}

function* combineAtLength(charset: string, length: number, prefix: string): Generator<string> {
  if (length === 0) {
    yield prefix;
    return;
  }
  for (let i = 0; i < charset.length; i++) {
    yield* combineAtLength(charset, length - 1, prefix + charset[i]);
  }
}

export function* generateCharset(options: GenerateOptions, cancelFlag: { cancelled: boolean }): Generator<string> {
  const raw = options.charset ?? "abcdefghijklmnopqrstuvwxyz";
  const charset = expandCharsetString(raw);
  const minLen = options.minLength ?? 1;
  const maxLen = options.maxLength ?? 4;

  for (let len = minLen; len <= maxLen; len++) {
    for (const entry of combineAtLength(charset, len, "")) {
      if (cancelFlag.cancelled) return;
      yield entry;
    }
  }
}

export function estimateCharsetCount(options: GenerateOptions): number {
  const raw = options.charset ?? "abcdefghijklmnopqrstuvwxyz";
  const charset = expandCharsetString(raw);
  const minLen = options.minLength ?? 1;
  const maxLen = options.maxLength ?? 4;
  let total = 0;
  for (let len = minLen; len <= maxLen; len++) {
    total += Math.pow(charset.length, len);
  }
  return total;
}
