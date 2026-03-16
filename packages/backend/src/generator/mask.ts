import type { GenerateOptions } from "./common.js";

const TOKEN_CHARSETS: Record<string, string> = {
  "?l": "abcdefghijklmnopqrstuvwxyz",
  "?u": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "?d": "0123456789",
  "?s": "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
};

function parseMask(mask: string): string[] {
  const charsets: string[] = [];
  let i = 0;
  while (i < mask.length) {
    if (mask[i] === "?" && i + 1 < mask.length) {
      const token = "?" + mask[i + 1];
      if (TOKEN_CHARSETS[token]) {
        charsets.push(TOKEN_CHARSETS[token]);
        i += 2;
        continue;
      }
    }
    charsets.push(mask[i]);
    i++;
  }
  return charsets;
}

function* expandPositions(
  charsets: string[],
  pos: number,
  current: string,
  cancelFlag: { cancelled: boolean }
): Generator<string> {
  if (pos === charsets.length) {
    yield current;
    return;
  }
  const cs = charsets[pos];
  for (let i = 0; i < cs.length; i++) {
    if (cancelFlag.cancelled) return;
    yield* expandPositions(charsets, pos + 1, current + cs[i], cancelFlag);
  }
}

export function* generateMask(options: GenerateOptions, cancelFlag: { cancelled: boolean }): Generator<string> {
  const mask = options.mask ?? "";
  if (!mask) return;
  const charsets = parseMask(mask);
  yield* expandPositions(charsets, 0, "", cancelFlag);
}

export function estimateMaskCount(options: GenerateOptions): number {
  const mask = options.mask ?? "";
  if (!mask) return 0;
  const charsets = parseMask(mask);
  if (charsets.length === 0) return 0;
  return charsets.reduce((acc, cs) => acc * cs.length, 1);
}
