export type GenerateMode = "charset" | "mask" | "mangle";

export type GenerateOptions = {
  mode: GenerateMode;
  // Charset mode
  charset?: string;
  minLength?: number;
  maxLength?: number;
  // Mask mode
  mask?: string;
  // Mangle mode
  words?: string[];
  prefixes?: string[];
  suffixes?: string[];
  years?: string[];
  separators?: string[];
  capitalize?: boolean;
  uppercase?: boolean;
  lowercase?: boolean;
  leetspeak?: boolean;
  // Common
  dedupe?: boolean;
  previewLimit?: number;
};

export type PreviewResult = {
  preview: string[];
  previewCount: number;
  totalGenerated: number;
  estimatedTotal: number;
  durationMs: number;
};

export type GenerateResult = {
  totalGenerated: number;
  outputPath: string;
  durationMs: number;
};

export const DEFAULT_PREVIEW_LIMIT = 100;
export const MAX_ENTRIES = 10_000_000;

export function validateOptions(options: GenerateOptions): string | null {
  if (!["charset", "mask", "mangle"].includes(options.mode)) {
    return `Unknown mode: ${options.mode}`;
  }
  if (options.mode === "charset") {
    const charset = options.charset ?? "abcdefghijklmnopqrstuvwxyz";
    const minLen = options.minLength ?? 1;
    const maxLen = options.maxLength ?? 4;
    if (minLen < 1 || maxLen < 1) return "Lengths must be at least 1";
    if (minLen > maxLen) return "minLength must be <= maxLength";
    if (charset.length === 0) return "Charset must not be empty";
    if (maxLen > 8) return "maxLength must be <= 8 to avoid combinatorial explosion";
    let total = 0;
    for (let len = minLen; len <= maxLen; len++) {
      total += Math.pow(charset.length, len);
      if (total > MAX_ENTRIES) return `Estimated ${total.toLocaleString()} entries exceeds limit of ${MAX_ENTRIES.toLocaleString()}`;
    }
  }
  if (options.mode === "mask") {
    if (!options.mask || options.mask.trim() === "") return "Mask must not be empty";
  }
  if (options.mode === "mangle") {
    if (!options.words || options.words.length === 0) return "At least one word is required for mangle mode";
  }
  return null;
}
