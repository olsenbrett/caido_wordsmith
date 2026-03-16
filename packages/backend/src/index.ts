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
import { generateSegment, estimateSegmentCount } from "./generator/segment.js";
import { generateRegex, estimateRegexCount } from "./generator/regex.js";
import { applyEncoding } from "./encode.js";
import { writeWordlistFile, getPreviewEntries, getOutputDir } from "./output.js";

// Module-level cancel flag shared across all generators
const cancelFlag = { cancelled: false };

function getGenerator(options: GenerateOptions): Generator<string> {
  const encoding = options.encoding ?? "none";
  let raw: Generator<string>;

  switch (options.mode) {
    case "charset":
      raw = generateCharset(options, cancelFlag);
      break;
    case "mask":
      raw = generateMask(options, cancelFlag);
      break;
    case "mangle":
      raw = generateMangle(options, cancelFlag);
      break;
    case "segment":
      raw = generateSegment(options, cancelFlag);
      break;
    case "regex":
      raw = generateRegex(options, cancelFlag);
      break;
  }

  return applyEncoding(raw, encoding);
}

function getEstimatedTotal(options: GenerateOptions): number {
  switch (options.mode) {
    case "charset":
      return estimateCharsetCount(options);
    case "mask":
      return estimateMaskCount(options);
    case "mangle":
      return estimateMangleCount(options);
    case "segment":
      return estimateSegmentCount(options);
    case "regex":
      return estimateRegexCount(options);
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
