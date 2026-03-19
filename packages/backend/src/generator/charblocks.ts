import type { GenerateOptions } from "./common.js";

export function* generateCharBlocks(
  options: GenerateOptions,
  cancelFlag: { cancelled: boolean }
): Generator<string> {
  const char = (options.blockChar ?? "A")[0];
  const minLen = options.blockMinLength ?? 1;
  const maxLen = options.blockMaxLength ?? 100;

  for (let len = minLen; len <= maxLen; len++) {
    if (cancelFlag.cancelled) return;
    yield char.repeat(len);
  }
}

export function estimateCharBlocksCount(options: GenerateOptions): number {
  const min = options.blockMinLength ?? 1;
  const max = options.blockMaxLength ?? 100;
  return Math.max(0, max - min + 1);
}
