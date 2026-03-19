import type { GenerateOptions } from "./common.js";

export function* generateUsernames(
  options: GenerateOptions,
  cancelFlag: { cancelled: boolean }
): Generator<string> {
  const firsts = (options.firstnames ?? []).map((s) => s.trim()).filter(Boolean);
  const lasts = (options.lastnames ?? []).map((s) => s.trim()).filter(Boolean);
  const dedupe = options.dedupe !== false;
  const seen = dedupe ? new Set<string>() : null;

  function* emit(s: string): Generator<string> {
    if (!s) return;
    if (seen) {
      if (!seen.has(s)) { seen.add(s); yield s; }
    } else {
      yield s;
    }
  }

  // First-only pass (when no lastnames provided)
  if (lasts.length === 0) {
    for (const first of firsts) {
      if (cancelFlag.cancelled) return;
      yield* emit(first.toLowerCase());
      yield* emit(first.toUpperCase());
      yield* emit(first[0].toLowerCase() + first.slice(1).toLowerCase());
    }
    return;
  }

  for (const first of firsts) {
    for (const last of lasts) {
      if (cancelFlag.cancelled) return;

      const f = first.toLowerCase();
      const l = last.toLowerCase();
      const fi = f[0] ?? "";
      const li = l[0] ?? "";

      yield* emit(f);               // john
      yield* emit(l);               // doe
      yield* emit(f + l);           // johndoe
      yield* emit(f + "." + l);     // john.doe
      yield* emit(f + "_" + l);     // john_doe
      yield* emit(f + "-" + l);     // john-doe
      yield* emit(fi + l);          // jdoe
      yield* emit(fi + "." + l);    // j.doe
      yield* emit(f + li);          // johnd
      yield* emit(l + f);           // doejohn
      yield* emit(l + "." + f);     // doe.john
      yield* emit(l + fi);          // doej
    }
  }
}

export function estimateUsernamesCount(options: GenerateOptions): number {
  const firsts = (options.firstnames ?? []).filter(Boolean).length;
  const lasts = (options.lastnames ?? []).filter(Boolean).length;
  if (lasts === 0) return firsts * 3;
  return firsts * lasts * 12;
}
