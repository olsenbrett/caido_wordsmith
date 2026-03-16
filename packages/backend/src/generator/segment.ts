import type { GenerateOptions, SegmentDef } from "./common.js";
import { expandCharsetString } from "./charset.js";

const SEGMENT_CHARSETS: Record<string, string> = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  special: "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
  alphanumeric: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  alpha: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
};

export function getCharsetForSegment(seg: SegmentDef): string {
  if (seg.type === "custom") {
    return expandCharsetString(seg.customChars ?? "");
  }
  return SEGMENT_CHARSETS[seg.type] ?? "";
}

function* expandPositions(
  positions: string[],
  pos: number,
  current: string,
  cancelFlag: { cancelled: boolean }
): Generator<string> {
  if (cancelFlag.cancelled) return;
  if (pos === positions.length) {
    yield current;
    return;
  }
  const cs = positions[pos];
  for (let i = 0; i < cs.length; i++) {
    if (cancelFlag.cancelled) return;
    yield* expandPositions(positions, pos + 1, current + cs[i], cancelFlag);
  }
}

export function* generateSegment(options: GenerateOptions, cancelFlag: { cancelled: boolean }): Generator<string> {
  const segments = options.segments ?? [];
  if (segments.length === 0) return;

  // Build the flat list of per-position charsets by expanding each segment count times
  const positions: string[] = [];
  for (const seg of segments) {
    const cs = getCharsetForSegment(seg);
    if (!cs) continue;
    for (let i = 0; i < seg.count; i++) {
      positions.push(cs);
    }
  }

  yield* expandPositions(positions, 0, "", cancelFlag);
}

export function estimateSegmentCount(options: GenerateOptions): number {
  const segments = options.segments ?? [];
  if (segments.length === 0) return 0;

  let total = 1;
  for (const seg of segments) {
    const cs = getCharsetForSegment(seg);
    for (let i = 0; i < seg.count; i++) {
      total *= cs.length;
      if (total > 1e15) return 1e15; // cap to avoid Infinity
    }
  }
  return total;
}
