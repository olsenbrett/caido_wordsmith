import { SDK, DefineAPI, DefineEvents } from "caido:plugin";

import type {
  GenerateOptions,
  PreviewResult,
  GenerateResult,
} from "./generator/common.js";
import { validateOptions, DEFAULT_PREVIEW_LIMIT } from "./generator/common.js";
import { generateCharset, estimateCharsetCount } from "./generator/charset.js";
import { generateMask, estimateMaskCount } from "./generator/mask.js";
import { generateMangle, estimateMangleCount } from "./generator/mangle.js";
import { writeWordlistFile, getPreviewEntries, getOutputDir } from "./output.js";

// Module-level cancel flag shared across all generators
const cancelFlag = { cancelled: false };

function getGenerator(options: GenerateOptions): Generator<string> {
  switch (options.mode) {
    case "charset":
      return generateCharset(options, cancelFlag);
    case "mask":
      return generateMask(options, cancelFlag);
    case "mangle":
      return generateMangle(options, cancelFlag);
  }
}

function getEstimatedTotal(options: GenerateOptions): number {
  switch (options.mode) {
    case "charset":
      return estimateCharsetCount(options);
    case "mask":
      return estimateMaskCount(options);
    case "mangle":
      return estimateMangleCount(options);
  }
}

export type API = DefineAPI<{
  previewWordlist: (sdk: SDK, options: GenerateOptions) => Promise<PreviewResult>;
  generateWordlist: (sdk: SDK, options: GenerateOptions) => Promise<GenerateResult>;
  cancelGeneration: (sdk: SDK) => void;
  getOutputDirectory: (sdk: SDK) => string;
}>;

export type BackendEvents = DefineEvents<{
  "wordlist:progress": (data: { processed: number; total: number }) => void;
}>;

export function init(sdk: SDK<API, BackendEvents>) {
  sdk.api.register("previewWordlist", async (_rpcSdk: SDK, options: GenerateOptions): Promise<PreviewResult> => {
    const error = validateOptions(options);
    if (error) throw new Error(error);

    const start = Date.now();
    const limit = options.previewLimit ?? DEFAULT_PREVIEW_LIMIT;
    const estimatedTotal = getEstimatedTotal(options);

    cancelFlag.cancelled = false;
    const gen = getGenerator(options);
    const entries = getPreviewEntries(gen, limit);

    return {
      preview: entries,
      previewCount: entries.length,
      totalGenerated: entries.length,
      estimatedTotal,
      durationMs: Date.now() - start,
    };
  });

  sdk.api.register("generateWordlist", async (_rpcSdk: SDK, options: GenerateOptions): Promise<GenerateResult> => {
    const error = validateOptions(options);
    if (error) throw new Error(error);

    const start = Date.now();
    const estimatedTotal = getEstimatedTotal(options);

    cancelFlag.cancelled = false;

    const { path, count } = await writeWordlistFile(
      getGenerator(options),
      (processed) => {
        // Use the outer sdk (from init) to send typed events
        sdk.api.send("wordlist:progress", { processed, total: estimatedTotal });
      }
    );

    return {
      totalGenerated: count,
      outputPath: path,
      durationMs: Date.now() - start,
    };
  });

  sdk.api.register("cancelGeneration", (_rpcSdk: SDK): void => {
    cancelFlag.cancelled = true;
  });

  sdk.api.register("getOutputDirectory", (_rpcSdk: SDK): string => {
    return getOutputDir();
  });
}
