export type GenerateMode =
  | "charset"
  | "mask"
  | "mangle"
  | "numbers"
  | "dates"
  | "null"
  | "charblocks"
  | "usernames";

export type ProcessingRule =
  | { type: "prefix"; value: string }
  | { type: "suffix"; value: string }
  | { type: "urlencode" }
  | { type: "base64encode" }
  | { type: "base64decode" }
  | { type: "replace"; match: string; replace: string; regex: boolean }
  | { type: "uppercase" }
  | { type: "lowercase" }
  | { type: "reverse" };

export type GenerateOptions = {
  mode: GenerateMode;

  // Charset / brute-force
  charset?: string;
  minLength?: number;
  maxLength?: number;

  // Mask
  mask?: string;

  // Mangle
  words?: string[];
  prefixes?: string[];
  suffixes?: string[];
  years?: string[];
  separators?: string[];
  capitalize?: boolean;
  uppercase?: boolean;
  lowercase?: boolean;
  leetspeak?: boolean;

  // Numbers
  numberFrom?: number;
  numberTo?: number;
  numberStep?: number;
  numberPad?: number;

  // Dates
  dateFrom?: string;
  dateTo?: string;
  dateStep?: "day" | "week" | "month" | "year";
  dateFormat?: string;

  // Null payloads
  nullCount?: number;
  nullValue?: string;

  // Character blocks
  blockChar?: string;
  blockMinLength?: number;
  blockMaxLength?: number;

  // Username generator
  firstnames?: string[];
  lastnames?: string[];

  // Payload processing (applied to all modes after generation)
  processing?: ProcessingRule[];

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
  const validModes: GenerateMode[] = [
    "charset", "mask", "mangle", "numbers", "dates", "null", "charblocks", "usernames",
  ];
  if (!validModes.includes(options.mode)) return `Unknown mode: ${options.mode}`;

  if (options.mode === "charset") {
    const charset = options.charset ?? "abcdefghijklmnopqrstuvwxyz";
    const minLen = options.minLength ?? 1;
    const maxLen = options.maxLength ?? 4;
    if (minLen < 1 || maxLen < 1) return "Lengths must be at least 1";
    if (minLen > maxLen) return "minLength must be ≤ maxLength";
    if (charset.length === 0) return "Charset must not be empty";
    if (maxLen > 8) return "maxLength must be ≤ 8 to avoid combinatorial explosion";
    let total = 0;
    for (let len = minLen; len <= maxLen; len++) {
      total += Math.pow(charset.length, len);
      if (total > MAX_ENTRIES)
        return `Estimated ${total.toLocaleString()} entries exceeds limit of ${MAX_ENTRIES.toLocaleString()}`;
    }
  }

  if (options.mode === "mask") {
    if (!options.mask || options.mask.trim() === "") return "Mask must not be empty";
  }

  if (options.mode === "mangle") {
    if (!options.words || options.words.length === 0) return "At least one base word is required";
  }

  if (options.mode === "numbers") {
    const from = options.numberFrom ?? 0;
    const to = options.numberTo ?? 100;
    const step = options.numberStep ?? 1;
    if (step <= 0) return "Step must be positive";
    if (from > to) return "From must be ≤ To";
    const count = Math.floor((to - from) / step) + 1;
    if (count > MAX_ENTRIES)
      return `Estimated ${count.toLocaleString()} entries exceeds limit of ${MAX_ENTRIES.toLocaleString()}`;
  }

  if (options.mode === "dates") {
    if (!options.dateFrom || !options.dateTo) return "From and To dates are required";
    const from = new Date(options.dateFrom);
    const to = new Date(options.dateTo);
    if (isNaN(from.getTime())) return "Invalid From date";
    if (isNaN(to.getTime())) return "Invalid To date";
    if (from > to) return "From date must be before To date";
  }

  if (options.mode === "null") {
    const count = options.nullCount ?? 10;
    if (count < 1) return "Count must be at least 1";
    if (count > MAX_ENTRIES) return `Count exceeds limit of ${MAX_ENTRIES.toLocaleString()}`;
  }

  if (options.mode === "charblocks") {
    if (!options.blockChar || options.blockChar.length === 0) return "Block character is required";
    const min = options.blockMinLength ?? 1;
    const max = options.blockMaxLength ?? 100;
    if (min < 1) return "Min length must be at least 1";
    if (min > max) return "Min length must be ≤ max length";
  }

  if (options.mode === "usernames") {
    const firsts = (options.firstnames ?? []).filter(Boolean);
    const lasts = (options.lastnames ?? []).filter(Boolean);
    if (firsts.length === 0 && lasts.length === 0) return "At least one name is required";
  }

  return null;
}
