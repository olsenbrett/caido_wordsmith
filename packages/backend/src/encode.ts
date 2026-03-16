import type { EncodingType } from "./generator/common.js";

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

export function encodeEntry(entry: string, encoding: EncodingType): string {
  switch (encoding) {
    case "url":
      return encodeURIComponent(entry);
    case "base64":
      // Node.js Buffer is available in the backend runtime
      return Buffer.from(entry, "utf8").toString("base64");
    case "hex":
      return Buffer.from(entry, "utf8").toString("hex");
    case "html":
      return entry.replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] ?? c);
    case "none":
    default:
      return entry;
  }
}

/**
 * Wraps a generator, applying the given encoding to every yielded entry.
 */
export function* applyEncoding(
  source: Generator<string>,
  encoding: EncodingType
): Generator<string> {
  if (!encoding || encoding === "none") {
    yield* source;
    return;
  }
  for (const entry of source) {
    yield encodeEntry(entry, encoding);
  }
}
