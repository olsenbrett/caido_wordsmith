import type { GenerateOptions } from "./common.js";

export function* generateNumbers(
  options: GenerateOptions,
  cancelFlag: { cancelled: boolean }
): Generator<string> {
  const from = options.numberFrom ?? 0;
  const to = options.numberTo ?? 100;
  const step = options.numberStep ?? 1;
  const pad = options.numberPad ?? 0;

  for (let i = from; i <= to; i += step) {
    if (cancelFlag.cancelled) return;
    const s = String(Math.round(i));
    yield pad > 0 ? s.padStart(pad, "0") : s;
  }
}

export function estimateNumbersCount(options: GenerateOptions): number {
  const from = options.numberFrom ?? 0;
  const to = options.numberTo ?? 100;
  const step = options.numberStep ?? 1;
  if (step <= 0) return 0;
  return Math.max(0, Math.floor((to - from) / step) + 1);
}
