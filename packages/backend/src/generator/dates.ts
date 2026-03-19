import type { GenerateOptions } from "./common.js";

function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  // Replace longest tokens first to avoid partial matches
  return format
    .replace("YYYY", String(year))
    .replace("YY", String(year).slice(-2))
    .replace("MM", String(month).padStart(2, "0"))
    .replace("DD", String(day).padStart(2, "0"))
    .replace("M", String(month))
    .replace("D", String(day));
}

function advanceDate(date: Date, step: string): void {
  switch (step) {
    case "day":   date.setDate(date.getDate() + 1); break;
    case "week":  date.setDate(date.getDate() + 7); break;
    case "month": date.setMonth(date.getMonth() + 1); break;
    case "year":  date.setFullYear(date.getFullYear() + 1); break;
  }
}

export function* generateDates(
  options: GenerateOptions,
  cancelFlag: { cancelled: boolean }
): Generator<string> {
  const from = new Date(options.dateFrom ?? "2020-01-01");
  const to = new Date(options.dateTo ?? "2024-12-31");
  const step = options.dateStep ?? "day";
  const format = options.dateFormat ?? "YYYY-MM-DD";

  const current = new Date(from);
  while (current <= to) {
    if (cancelFlag.cancelled) return;
    yield formatDate(current, format);
    advanceDate(current, step);
  }
}

export function estimateDatesCount(options: GenerateOptions): number {
  const from = new Date(options.dateFrom ?? "2020-01-01");
  const to = new Date(options.dateTo ?? "2024-12-31");
  const step = options.dateStep ?? "day";
  const diffMs = to.getTime() - from.getTime();
  const diffDays = Math.ceil(diffMs / 86_400_000);
  switch (step) {
    case "day":   return Math.max(0, diffDays + 1);
    case "week":  return Math.max(0, Math.floor(diffDays / 7) + 1);
    case "month": {
      const months =
        (to.getFullYear() - from.getFullYear()) * 12 +
        (to.getMonth() - from.getMonth());
      return Math.max(0, months + 1);
    }
    case "year":  return Math.max(0, to.getFullYear() - from.getFullYear() + 1);
  }
  return 0;
}
