import type { GenerateOptions } from "./common.js";

function capitalize(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}

function leetspeak(s: string): string {
  return s
    .replace(/a/g, "4")
    .replace(/A/g, "4")
    .replace(/e/g, "3")
    .replace(/E/g, "3")
    .replace(/i/g, "1")
    .replace(/I/g, "1")
    .replace(/o/g, "0")
    .replace(/O/g, "0")
    .replace(/s/g, "5")
    .replace(/S/g, "5");
}

export function* generateMangle(options: GenerateOptions, cancelFlag: { cancelled: boolean }): Generator<string> {
  const words = options.words ?? [];
  const prefixes = options.prefixes ?? [];
  const suffixes = options.suffixes ?? [];
  const years = options.years ?? [];
  const separators = options.separators ?? [];
  const dedupe = options.dedupe !== false;
  const seen = new Set<string>();

  function* yieldEntry(s: string): Generator<string> {
    if (!s) return;
    if (dedupe) {
      if (!seen.has(s)) {
        seen.add(s);
        yield s;
      }
    } else {
      yield s;
    }
  }

  for (const word of words) {
    if (cancelFlag.cancelled) return;

    // Build list of variants for this word
    const variants: string[] = [word];
    if (options.capitalize) variants.push(capitalize(word));
    if (options.uppercase) variants.push(word.toUpperCase());
    if (options.lowercase) variants.push(word.toLowerCase());
    if (options.leetspeak) variants.push(leetspeak(word));

    for (const variant of variants) {
      if (cancelFlag.cancelled) return;

      // Base variant
      yield* yieldEntry(variant);

      // Prefix + variant
      for (const prefix of prefixes) {
        yield* yieldEntry(prefix + variant);
      }

      // Variant + suffix
      for (const suffix of suffixes) {
        yield* yieldEntry(variant + suffix);
      }

      // Variant + year
      for (const year of years) {
        yield* yieldEntry(variant + year);
      }

      // Variant + separator + word2 (cross-word combos)
      for (const sep of separators) {
        for (const word2 of words) {
          yield* yieldEntry(variant + sep + word2);
        }
      }
    }
  }
}

export function estimateMangleCount(options: GenerateOptions): number {
  const words = options.words ?? [];
  const prefixes = options.prefixes ?? [];
  const suffixes = options.suffixes ?? [];
  const years = options.years ?? [];
  const separators = options.separators ?? [];

  let variantMultiplier = 1;
  if (options.capitalize) variantMultiplier++;
  if (options.uppercase) variantMultiplier++;
  if (options.lowercase) variantMultiplier++;
  if (options.leetspeak) variantMultiplier++;

  const perWord =
    1 + // base variant
    prefixes.length +
    suffixes.length +
    years.length +
    separators.length * words.length;

  return words.length * variantMultiplier * perWord;
}
