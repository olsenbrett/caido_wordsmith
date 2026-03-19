import type { GenerateOptions } from "./generator/common.js";
import { applyProcessingRules } from "./generator/processing.js";

type MinimalSDK = {
  hostedFile: {
    create(spec: { name: string; content: string }): Promise<{ path: string; name: string; id: string }>;
  };
};

function process(entry: string, options: GenerateOptions): string {
  const rules = options.processing ?? [];
  return rules.length > 0 ? applyProcessingRules(entry, rules) : entry;
}

export async function writeWordlistFile(
  sdk: MinimalSDK,
  generator: Generator<string>,
  options: GenerateOptions,
  onProgress: (processed: number) => void
): Promise<{ path: string; count: number }> {
  const filename = `wordlist-${Date.now()}.txt`;
  const lines: string[] = [];
  let count = 0;

  for (const entry of generator) {
    lines.push(process(entry, options));
    count++;
    if (count % 1000 === 0) {
      onProgress(count);
    }
  }
  onProgress(count);

  const content = lines.join("\n") + (lines.length > 0 ? "\n" : "");
  const file = await sdk.hostedFile.create({ name: filename, content });

  return { path: file.path, count };
}

export function getPreviewEntries(
  generator: Generator<string>,
  limit: number,
  options: GenerateOptions
): string[] {
  const entries: string[] = [];
  for (const entry of generator) {
    entries.push(process(entry, options));
    if (entries.length >= limit) break;
  }
  return entries;
}
