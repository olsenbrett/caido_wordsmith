import type { GenerateOptions } from "./common.js";

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
  const charset = options.charset ?? "abcdefghijklmnopqrstuvwxyz";
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
  const charset = options.charset ?? "abcdefghijklmnopqrstuvwxyz";
  const minLen = options.minLength ?? 1;
  const maxLen = options.maxLength ?? 4;
  let total = 0;
  for (let len = minLen; len <= maxLen; len++) {
    total += Math.pow(charset.length, len);
  }
  return total;
}
