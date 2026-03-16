import { mkdir, writeFile, open } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const OUTPUT_DIR = join(tmpdir(), "caido-wordsmith");

export async function ensureOutputDir(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
}

export function getOutputDir(): string {
  return OUTPUT_DIR;
}

export async function writeWordlistFile(
  generator: Generator<string>,
  onProgress: (processed: number) => void
): Promise<{ path: string; count: number }> {
  await ensureOutputDir();
  const filename = `wordlist-${Date.now()}.txt`;
  const filepath = join(OUTPUT_DIR, filename);

  const fileHandle = await open(filepath, "w");
  const writeStream = fileHandle.createWriteStream();

  let count = 0;
  let buffer = "";
  const FLUSH_SIZE = 1000;

  try {
    for (const entry of generator) {
      buffer += entry + "\n";
      count++;
      if (count % FLUSH_SIZE === 0) {
        await new Promise<void>((resolve, reject) => {
          writeStream.write(buffer, (err) => (err ? reject(err) : resolve()));
        });
        buffer = "";
        onProgress(count);
      }
    }
    // Flush remaining
    if (buffer) {
      await new Promise<void>((resolve, reject) => {
        writeStream.write(buffer, (err) => (err ? reject(err) : resolve()));
      });
    }
    onProgress(count);
  } finally {
    await new Promise<void>((resolve, reject) => {
      writeStream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    await fileHandle.close();
  }

  return { path: filepath, count };
}

export function getPreviewEntries(
  generator: Generator<string>,
  limit: number
): string[] {
  const entries: string[] = [];
  for (const entry of generator) {
    entries.push(entry);
    if (entries.length >= limit) break;
  }
  return entries;
}
