import type { GenerateOptions } from "./common.js";

export function* generateNull(
  options: GenerateOptions,
  cancelFlag: { cancelled: boolean }
): Generator<string> {
  const count = options.nullCount ?? 10;
  const value = options.nullValue ?? "";

  for (let i = 0; i < count; i++) {
    if (cancelFlag.cancelled) return;
    yield value;
  }
}

export function estimateNullCount(options: GenerateOptions): number {
  return options.nullCount ?? 10;
}
