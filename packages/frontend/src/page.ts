import type { CaidoSDK } from "./index.js";
import type { GenerateOptions } from "caido-wordsmith-backend";

// ─── Helpers ────────────────────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (HTMLElement | string)[]
): HTMLElementTagNameMap[K] {
  const elem = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) elem.setAttribute(k, v);
  for (const child of children) {
    if (typeof child === "string") elem.appendChild(document.createTextNode(child));
    else elem.appendChild(child);
  }
  return elem;
}

// ─── Mode-specific option builders ───────────────────────────────────────────

function buildCharsetForm(): { root: HTMLElement; getOptions: () => Partial<GenerateOptions> } {
  const charsetInput = el("input", {
    type: "text",
    id: "ws-charset",
    class: "ws-input",
    value: "abcdefghijklmnopqrstuvwxyz0123456789",
    placeholder: "Characters to use",
  });
  const minLenInput = el("input", {
    type: "number",
    id: "ws-min-len",
    class: "ws-input ws-input--short",
    value: "1",
    min: "1",
    max: "8",
  });
  const maxLenInput = el("input", {
    type: "number",
    id: "ws-max-len",
    class: "ws-input ws-input--short",
    value: "4",
    min: "1",
    max: "8",
  });

  const root = el(
    "div",
    { class: "ws-form" },
    el("div", { class: "ws-field" },
      el("label", { class: "ws-label", for: "ws-charset" }, "Character set"),
      charsetInput,
      el("span", { class: "ws-hint" }, "All characters to brute-force from")
    ),
    el("div", { class: "ws-field ws-field--row" },
      el("div", { class: "ws-field" },
        el("label", { class: "ws-label", for: "ws-min-len" }, "Min length"),
        minLenInput
      ),
      el("div", { class: "ws-field" },
        el("label", { class: "ws-label", for: "ws-max-len" }, "Max length"),
        maxLenInput
      )
    )
  );

  return {
    root,
    getOptions: () => ({
      charset: charsetInput.value.trim(),
      minLength: parseInt(minLenInput.value, 10) || 1,
      maxLength: parseInt(maxLenInput.value, 10) || 4,
    }),
  };
}

function buildMaskForm(): { root: HTMLElement; getOptions: () => Partial<GenerateOptions> } {
  const maskInput = el("input", {
    type: "text",
    id: "ws-mask",
    class: "ws-input",
    value: "?l?l?l?d",
    placeholder: "e.g. ?u?l?l?l?d?d",
  });

  const root = el(
    "div",
    { class: "ws-form" },
    el("div", { class: "ws-field" },
      el("label", { class: "ws-label", for: "ws-mask" }, "Mask"),
      maskInput,
      el("div", { class: "ws-hint ws-hint--tokens" },
        el("code", {}, "?l"), " lowercase  ",
        el("code", {}, "?u"), " uppercase  ",
        el("code", {}, "?d"), " digits  ",
        el("code", {}, "?s"), " special  — other chars are literals"
      )
    )
  );

  return {
    root,
    getOptions: () => ({ mask: maskInput.value }),
  };
}

function buildMangleForm(): { root: HTMLElement; getOptions: () => Partial<GenerateOptions> } {
  const wordsInput = el("textarea", {
    id: "ws-words",
    class: "ws-textarea",
    rows: "4",
    placeholder: "One word per line, e.g.\nadmin\npassword\ncompany",
  }) as HTMLTextAreaElement;

  const prefixesInput = el("input", {
    type: "text",
    id: "ws-prefixes",
    class: "ws-input",
    placeholder: "Comma-separated, e.g. super,my",
  });

  const suffixesInput = el("input", {
    type: "text",
    id: "ws-suffixes",
    class: "ws-input",
    placeholder: "Comma-separated, e.g. !,123",
  });

  const yearsInput = el("input", {
    type: "text",
    id: "ws-years",
    class: "ws-input",
    value: "2022,2023,2024,2025",
    placeholder: "Comma-separated, e.g. 2023,2024",
  });

  const separatorsInput = el("input", {
    type: "text",
    id: "ws-separators",
    class: "ws-input",
    placeholder: "Separators for word+sep+word, e.g. _,-",
  });

  function mkCheckbox(id: string, label: string): { wrap: HTMLElement; input: HTMLInputElement } {
    const input = el("input", { type: "checkbox", id, class: "ws-checkbox" }) as HTMLInputElement;
    const wrap = el("label", { class: "ws-checkbox-label", for: id }, input, ` ${label}`);
    return { wrap, input };
  }

  const { wrap: capWrap, input: capInput } = mkCheckbox("ws-cap", "Capitalize");
  const { wrap: upperWrap, input: upperInput } = mkCheckbox("ws-upper", "UPPERCASE");
  const { wrap: lowerWrap, input: lowerInput } = mkCheckbox("ws-lower", "lowercase");
  const { wrap: leetWrap, input: leetInput } = mkCheckbox("ws-leet", "l33tspeak");
  const { wrap: dedupeWrap, input: dedupeInput } = mkCheckbox("ws-dedupe", "Deduplicate");
  dedupeInput.checked = true;

  const root = el(
    "div",
    { class: "ws-form" },
    el("div", { class: "ws-field" },
      el("label", { class: "ws-label", for: "ws-words" }, "Base words"),
      wordsInput
    ),
    el("div", { class: "ws-field" },
      el("label", { class: "ws-label", for: "ws-prefixes" }, "Prefixes"),
      prefixesInput
    ),
    el("div", { class: "ws-field" },
      el("label", { class: "ws-label", for: "ws-suffixes" }, "Suffixes"),
      suffixesInput
    ),
    el("div", { class: "ws-field" },
      el("label", { class: "ws-label", for: "ws-years" }, "Years"),
      yearsInput
    ),
    el("div", { class: "ws-field" },
      el("label", { class: "ws-label", for: "ws-separators" }, "Separators (word+sep+word)"),
      separatorsInput
    ),
    el("div", { class: "ws-field ws-field--checkboxes" },
      capWrap, upperWrap, lowerWrap, leetWrap, dedupeWrap
    )
  );

  function splitCsv(s: string): string[] {
    return s.split(",").map((x) => x.trim()).filter(Boolean);
  }

  return {
    root,
    getOptions: () => ({
      words: wordsInput.value.split("\n").map((x) => x.trim()).filter(Boolean),
      prefixes: splitCsv(prefixesInput.value),
      suffixes: splitCsv(suffixesInput.value),
      years: splitCsv(yearsInput.value),
      separators: splitCsv(separatorsInput.value),
      capitalize: capInput.checked,
      uppercase: upperInput.checked,
      lowercase: lowerInput.checked,
      leetspeak: leetInput.checked,
      dedupe: dedupeInput.checked,
    }),
  };
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function createPage(sdk: CaidoSDK): HTMLElement {
  type Mode = "charset" | "mask" | "mangle";
  let currentMode: Mode = "mangle";

  // Build form sections
  const charsetForm = buildCharsetForm();
  const maskForm = buildMaskForm();
  const mangleForm = buildMangleForm();

  const formContainer = el("div", { class: "ws-form-container" });

  // Preview / results
  const previewOutput = el("textarea", {
    class: "ws-preview-output",
    readonly: "",
    placeholder: "Preview will appear here…",
  }) as HTMLTextAreaElement;

  const previewMeta = el("div", { class: "ws-preview-meta" }, "");
  const progressBar = el("progress", { class: "ws-progress", value: "0", max: "100" }) as HTMLProgressElement;
  const progressText = el("div", { class: "ws-progress-text" }, "");
  const progressSection = el("div", { class: "ws-progress-section ws-hidden" }, progressBar, progressText);

  const resultPanel = el("div", { class: "ws-result ws-hidden" });

  const errorPanel = el("div", { class: "ws-error ws-hidden" });

  // Buttons
  const btnPreview = el("button", { class: "c-button c-button--primary", id: "ws-btn-preview" }, "Preview");
  const btnGenerate = el("button", { class: "c-button", id: "ws-btn-generate" }, "Generate file");
  const btnCancel = el("button", { class: "c-button ws-hidden", id: "ws-btn-cancel" }, "Cancel");

  // ── Mode switch ──────────────────────────────────────────────────────────

  const tabButtons: Record<Mode, HTMLButtonElement> = {
    charset: el("button", { class: "ws-tab", "data-mode": "charset" }, "Charset") as HTMLButtonElement,
    mask: el("button", { class: "ws-tab", "data-mode": "mask" }, "Mask") as HTMLButtonElement,
    mangle: el("button", { class: "ws-tab ws-tab--active", "data-mode": "mangle" }, "Mangle") as HTMLButtonElement,
  };

  function switchMode(mode: Mode) {
    currentMode = mode;
    for (const [m, btn] of Object.entries(tabButtons) as [Mode, HTMLButtonElement][]) {
      btn.classList.toggle("ws-tab--active", m === mode);
    }
    formContainer.innerHTML = "";
    switch (mode) {
      case "charset": formContainer.appendChild(charsetForm.root); break;
      case "mask": formContainer.appendChild(maskForm.root); break;
      case "mangle": formContainer.appendChild(mangleForm.root); break;
    }
  }

  for (const [mode, btn] of Object.entries(tabButtons) as [Mode, HTMLButtonElement][]) {
    btn.addEventListener("click", () => switchMode(mode));
  }

  // ── Collect options ──────────────────────────────────────────────────────

  function collectOptions(previewLimit?: number): GenerateOptions {
    let modeOptions: Partial<GenerateOptions> = {};
    switch (currentMode) {
      case "charset": modeOptions = charsetForm.getOptions(); break;
      case "mask": modeOptions = maskForm.getOptions(); break;
      case "mangle": modeOptions = mangleForm.getOptions(); break;
    }
    return { mode: currentMode, previewLimit, ...modeOptions };
  }

  // ── Show / hide helpers ──────────────────────────────────────────────────

  function showError(msg: string) {
    errorPanel.textContent = msg;
    errorPanel.classList.remove("ws-hidden");
  }

  function clearError() {
    errorPanel.textContent = "";
    errorPanel.classList.add("ws-hidden");
  }

  function setLoading(loading: boolean) {
    btnPreview.disabled = loading;
    btnGenerate.disabled = loading;
    btnCancel.classList.toggle("ws-hidden", !loading);
  }

  // ── Preview ──────────────────────────────────────────────────────────────

  btnPreview.addEventListener("click", async () => {
    clearError();
    resultPanel.classList.add("ws-hidden");
    setLoading(true);
    previewOutput.value = "";
    previewMeta.textContent = "Loading…";

    try {
      const opts = collectOptions(100);
      const result = await sdk.backend.previewWordlist(opts);
      previewOutput.value = result.preview.join("\n");
      const est = result.estimatedTotal > result.previewCount
        ? ` (estimated total: ${result.estimatedTotal.toLocaleString()})`
        : "";
      previewMeta.textContent = `Showing ${result.previewCount} entries${est} — ${result.durationMs}ms`;
    } catch (err) {
      showError(`Preview failed: ${(err as Error).message}`);
      previewMeta.textContent = "";
    } finally {
      setLoading(false);
    }
  });

  // ── Generate ─────────────────────────────────────────────────────────────

  btnGenerate.addEventListener("click", async () => {
    clearError();
    resultPanel.classList.add("ws-hidden");
    progressSection.classList.remove("ws-hidden");
    progressBar.value = 0;
    progressText.textContent = "Starting…";
    setLoading(true);

    try {
      const opts = collectOptions();
      const result = await sdk.backend.generateWordlist(opts);
      progressSection.classList.add("ws-hidden");
      resultPanel.classList.remove("ws-hidden");
      resultPanel.innerHTML = `
        <div class="ws-result__title">Generation complete</div>
        <div class="ws-result__row"><strong>Entries:</strong> ${result.totalGenerated.toLocaleString()}</div>
        <div class="ws-result__row"><strong>Duration:</strong> ${result.durationMs}ms</div>
        <div class="ws-result__row ws-result__path"><strong>Output file:</strong> <code>${result.outputPath}</code></div>
        <div class="ws-result__hint">
          Load this file into <strong>Caido Automate</strong> as a Hosted File, or open it and paste as a Simple List.
        </div>
      `;
    } catch (err) {
      progressSection.classList.add("ws-hidden");
      showError(`Generation failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  });

  // ── Cancel ───────────────────────────────────────────────────────────────

  btnCancel.addEventListener("click", async () => {
    await sdk.backend.cancelGeneration();
    progressText.textContent = "Cancelling…";
  });

  // ── Progress events ──────────────────────────────────────────────────────

  sdk.backend.onEvent("wordlist:progress", ({ processed, total }) => {
    if (total > 0) {
      const pct = Math.min(100, Math.round((processed / total) * 100));
      progressBar.value = pct;
      progressText.textContent = `${processed.toLocaleString()} / ${total.toLocaleString()} (${pct}%)`;
    } else {
      progressBar.removeAttribute("max");
      progressText.textContent = `${processed.toLocaleString()} entries…`;
    }
  });

  // ── Assemble page ────────────────────────────────────────────────────────

  switchMode(currentMode);

  const root = el(
    "div",
    { class: "ws-root" },
    el("div", { class: "ws-header" },
      el("h2", { class: "ws-title" }, "Wordsmith"),
      el("p", { class: "ws-subtitle" }, "Generate security testing wordlists for Caido Automate")
    ),
    el("div", { class: "ws-tabs" }, tabButtons.charset, tabButtons.mask, tabButtons.mangle),
    formContainer,
    el("div", { class: "ws-actions" }, btnPreview, btnGenerate, btnCancel),
    errorPanel,
    el("div", { class: "ws-preview" },
      el("div", { class: "ws-preview__header" },
        el("span", { class: "ws-preview__title" }, "Preview"),
        previewMeta
      ),
      previewOutput
    ),
    progressSection,
    resultPanel,
    el("div", { class: "ws-help" },
      el("strong", {}, "Using with Caido Automate: "),
      "After generating, go to Automate → Payloads → Hosted File and point it to the output path above, or open the file and paste its contents as a Simple List."
    )
  );

  return root;
}
