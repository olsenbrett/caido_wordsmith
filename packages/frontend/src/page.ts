import type { CaidoSDK } from "./index.js";
import type { GenerateOptions, SegmentDef, SegmentType } from "caido-wordsmith-backend";

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

function mkCheckbox(id: string, label: string): { wrap: HTMLElement; input: HTMLInputElement } {
  const input = el("input", { type: "checkbox", id, class: "ws-checkbox" }) as HTMLInputElement;
  const wrap = el("label", { class: "ws-checkbox-label", for: id }, input, ` ${label}`);
  return { wrap, input };
}

// ─── Charset Form ────────────────────────────────────────────────────────────

function buildCharsetForm(): { root: HTMLElement; getOptions: () => Partial<GenerateOptions> } {
  const charsetInput = el("input", {
    type: "text",
    id: "ws-charset",
    class: "ws-input",
    value: "a-z0-9",
    placeholder: "e.g. a-z, A-Z, 0-9, or literal chars like !@#",
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

  // Quick-add preset buttons
  const presets: [string, string][] = [
    ["a-z", "a-z"],
    ["A-Z", "A-Z"],
    ["0-9", "0-9"],
    ["a-zA-Z", "a-zA-Z"],
    ["a-zA-Z0-9", "Alphanumeric"],
    ["!@#$%^&*", "Special"],
  ];

  const presetButtons = presets.map(([value, label]) => {
    const btn = el("button", { class: "ws-preset-btn", type: "button" }, label);
    btn.addEventListener("click", () => {
      const current = charsetInput.value;
      charsetInput.value = current ? current + value : value;
    });
    return btn;
  });

  const clearBtn = el("button", { class: "ws-preset-btn ws-preset-btn--danger", type: "button" }, "Clear");
  clearBtn.addEventListener("click", () => { charsetInput.value = ""; });

  const root = el(
    "div",
    { class: "ws-form" },
    el("div", { class: "ws-field" },
      el("label", { class: "ws-label", for: "ws-charset" }, "Character set"),
      charsetInput,
      el("div", { class: "ws-preset-row" }, ...presetButtons, clearBtn),
      el("span", { class: "ws-hint" }, "Supports range notation: a-z, A-Z, 0-9 or literal characters")
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

// ─── Mask Form ───────────────────────────────────────────────────────────────

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

// ─── Mangle Form ─────────────────────────────────────────────────────────────

function buildMangleForm(): { root: HTMLElement; getOptions: () => Partial<GenerateOptions> } {
  const wordsInput = el("textarea", {
    id: "ws-words",
    class: "ws-textarea",
    rows: "4",
    placeholder: "One word per line, e.g.\nadmin\npassword\ncompany",
  }) as HTMLTextAreaElement;

  const prefixesInput = el("input", {
    type: "text", id: "ws-prefixes", class: "ws-input",
    placeholder: "Comma-separated, e.g. super,my",
  });
  const suffixesInput = el("input", {
    type: "text", id: "ws-suffixes", class: "ws-input",
    placeholder: "Comma-separated, e.g. !,123",
  });
  const yearsInput = el("input", {
    type: "text", id: "ws-years", class: "ws-input",
    value: "2022,2023,2024,2025",
    placeholder: "Comma-separated, e.g. 2023,2024",
  });
  const separatorsInput = el("input", {
    type: "text", id: "ws-separators", class: "ws-input",
    placeholder: "Separators for word+sep+word, e.g. _,-",
  });

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

// ─── Segment Form ─────────────────────────────────────────────────────────────

const SEGMENT_TYPES: SegmentType[] = [
  "digits", "lowercase", "uppercase", "alpha", "alphanumeric", "special", "custom",
];

const SEGMENT_LABELS: Record<SegmentType, string> = {
  digits: "Digits (0-9)",
  lowercase: "Lowercase (a-z)",
  uppercase: "Uppercase (A-Z)",
  alpha: "Alpha (a-zA-Z)",
  alphanumeric: "Alphanumeric",
  special: "Special chars",
  custom: "Custom chars",
};

function buildSegmentForm(): { root: HTMLElement; getOptions: () => Partial<GenerateOptions> } {
  const segmentList = el("div", { class: "ws-segment-list" });
  const segments: Array<{ getSegment: () => SegmentDef; row: HTMLElement }> = [];

  function addSegmentRow(defaults?: Partial<SegmentDef>) {
    const typeSelect = el("select", { class: "ws-select ws-select--seg-type" }) as HTMLSelectElement;
    for (const type of SEGMENT_TYPES) {
      const opt = el("option", { value: type }, SEGMENT_LABELS[type]);
      if (type === (defaults?.type ?? "digits")) opt.selected = true;
      typeSelect.appendChild(opt);
    }

    const countInput = el("input", {
      type: "number",
      class: "ws-input ws-input--short",
      value: String(defaults?.count ?? 3),
      min: "1",
      max: "8",
      placeholder: "Count",
    }) as HTMLInputElement;

    const customInput = el("input", {
      type: "text",
      class: "ws-input ws-input--custom",
      placeholder: "Custom chars (e.g. abc!@#)",
      value: defaults?.customChars ?? "",
    }) as HTMLInputElement;
    customInput.style.display = typeSelect.value === "custom" ? "" : "none";

    typeSelect.addEventListener("change", () => {
      customInput.style.display = typeSelect.value === "custom" ? "" : "none";
    });

    const removeBtn = el("button", { class: "ws-segment-remove", type: "button" }, "×");
    const row = el("div", { class: "ws-segment-row" },
      typeSelect,
      el("span", { class: "ws-segment-x" }, "×"),
      countInput,
      el("span", { class: "ws-segment-label" }, "chars"),
      customInput,
      removeBtn
    );

    removeBtn.addEventListener("click", () => {
      const idx = segments.findIndex((s) => s.row === row);
      if (idx !== -1) segments.splice(idx, 1);
      row.remove();
    });

    const entry = {
      row,
      getSegment: (): SegmentDef => ({
        type: typeSelect.value as SegmentType,
        count: parseInt(countInput.value, 10) || 1,
        customChars: typeSelect.value === "custom" ? customInput.value : undefined,
      }),
    };
    segments.push(entry);
    segmentList.appendChild(row);
  }

  // Start with two default segments
  addSegmentRow({ type: "digits", count: 3 });
  addSegmentRow({ type: "lowercase", count: 4 });

  const addBtn = el("button", { class: "ws-btn-add-segment", type: "button" }, "+ Add segment");
  addBtn.addEventListener("click", () => addSegmentRow());

  const hint = el("div", { class: "ws-hint" },
    "Each segment adds N characters of the chosen type. Segments are concatenated left-to-right. ",
    "Example: 3 digits + 1 special + 4 lowercase = e.g. ",
    el("code", {}, "123!abcd")
  );

  const root = el(
    "div",
    { class: "ws-form" },
    el("div", { class: "ws-field" },
      el("label", { class: "ws-label" }, "Segments"),
      segmentList,
      addBtn,
      hint
    )
  );

  return {
    root,
    getOptions: () => ({
      segments: segments.map((s) => s.getSegment()),
    }),
  };
}

// ─── Regex Form ──────────────────────────────────────────────────────────────

function buildRegexForm(): { root: HTMLElement; getOptions: () => Partial<GenerateOptions> } {
  const regexInput = el("input", {
    type: "text",
    id: "ws-regex",
    class: "ws-input ws-input--mono",
    placeholder: "e.g. [A-Z]{2}\\d{4} or (foo|bar)\\d?",
    value: "",
  });

  const quantMaxInput = el("input", {
    type: "number",
    id: "ws-quant-max",
    class: "ws-input ws-input--short",
    value: "4",
    min: "1",
    max: "8",
  });

  const root = el(
    "div",
    { class: "ws-form" },
    el("div", { class: "ws-field" },
      el("label", { class: "ws-label", for: "ws-regex" }, "Regex pattern"),
      regexInput,
      el("div", { class: "ws-hint ws-hint--tokens" },
        el("code", {}, "[a-z]"), " class  ",
        el("code", {}, "\\d"), " digits  ",
        el("code", {}, "\\w"), " word  ",
        el("code", {}, "\\l"), " lowercase  ",
        el("code", {}, "\\u"), " uppercase  ",
        el("code", {}, "."), " any printable  ",
        el("code", {}, "{n,m}"), " range  ",
        el("code", {}, "(a|b)"), " alternation"
      )
    ),
    el("div", { class: "ws-field ws-field--row" },
      el("div", { class: "ws-field" },
        el("label", { class: "ws-label", for: "ws-quant-max" }, "Max repetitions for + / *"),
        quantMaxInput,
        el("span", { class: "ws-hint" }, "Caps unbounded quantifiers (+ and *) to avoid explosion")
      )
    )
  );

  return {
    root,
    getOptions: () => ({
      regex: regexInput.value,
      regexQuantifierMax: parseInt(quantMaxInput.value, 10) || 4,
    }),
  };
}

// ─── Encoding Selector ────────────────────────────────────────────────────────

function buildEncodingSelector(): { root: HTMLElement; getEncoding: () => string } {
  const select = el("select", { class: "ws-select", id: "ws-encoding" }) as HTMLSelectElement;
  const options: [string, string][] = [
    ["none", "No encoding"],
    ["url", "URL encode (%xx)"],
    ["base64", "Base64"],
    ["hex", "Hex"],
    ["html", "HTML entities"],
  ];
  for (const [value, label] of options) {
    select.appendChild(el("option", { value }, label));
  }

  const root = el("div", { class: "ws-encoding-bar" },
    el("label", { class: "ws-label", for: "ws-encoding" }, "Output encoding:"),
    select
  );

  return {
    root,
    getEncoding: () => select.value,
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function createPage(sdk: CaidoSDK): HTMLElement {
  type Mode = "charset" | "mask" | "mangle" | "segment" | "regex";
  let currentMode: Mode = "mangle";

  const charsetForm = buildCharsetForm();
  const maskForm = buildMaskForm();
  const mangleForm = buildMangleForm();
  const segmentForm = buildSegmentForm();
  const regexForm = buildRegexForm();
  const encodingSelector = buildEncodingSelector();

  const formContainer = el("div", { class: "ws-form-container" });

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

  const btnPreview = el("button", { class: "c-button c-button--primary", id: "ws-btn-preview" }, "Preview");
  const btnGenerate = el("button", { class: "c-button", id: "ws-btn-generate" }, "Generate file");
  const btnCancel = el("button", { class: "c-button ws-hidden", id: "ws-btn-cancel" }, "Cancel");

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const tabDefs: [Mode, string][] = [
    ["charset", "Charset"],
    ["mask", "Mask"],
    ["mangle", "Mangle"],
    ["segment", "Segments"],
    ["regex", "Regex"],
  ];

  const tabButtons = Object.fromEntries(
    tabDefs.map(([mode, label]) => [
      mode,
      el("button", { class: "ws-tab", "data-mode": mode }, label) as HTMLButtonElement,
    ])
  ) as Record<Mode, HTMLButtonElement>;

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
      case "segment": formContainer.appendChild(segmentForm.root); break;
      case "regex": formContainer.appendChild(regexForm.root); break;
    }
  }

  for (const [mode, btn] of Object.entries(tabButtons) as [Mode, HTMLButtonElement][]) {
    btn.addEventListener("click", () => switchMode(mode));
  }

  // ── Collect options ───────────────────────────────────────────────────────

  function collectOptions(previewLimit?: number): GenerateOptions {
    let modeOptions: Partial<GenerateOptions> = {};
    switch (currentMode) {
      case "charset": modeOptions = charsetForm.getOptions(); break;
      case "mask": modeOptions = maskForm.getOptions(); break;
      case "mangle": modeOptions = mangleForm.getOptions(); break;
      case "segment": modeOptions = segmentForm.getOptions(); break;
      case "regex": modeOptions = regexForm.getOptions(); break;
    }
    const encoding = encodingSelector.getEncoding() as GenerateOptions["encoding"];
    return { mode: currentMode, previewLimit, encoding, ...modeOptions };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function showError(msg: string) {
    errorPanel.textContent = msg;
    errorPanel.classList.remove("ws-hidden");
  }

  function clearError() {
    errorPanel.textContent = "";
    errorPanel.classList.add("ws-hidden");
  }

  function setLoading(loading: boolean) {
    (btnPreview as HTMLButtonElement).disabled = loading;
    (btnGenerate as HTMLButtonElement).disabled = loading;
    btnCancel.classList.toggle("ws-hidden", !loading);
  }

  // ── Preview ───────────────────────────────────────────────────────────────

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
      const est =
        result.estimatedTotal > 0 && result.estimatedTotal > result.previewCount
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

  // ── Generate ──────────────────────────────────────────────────────────────

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

  // ── Cancel ────────────────────────────────────────────────────────────────

  btnCancel.addEventListener("click", async () => {
    await sdk.backend.cancelGeneration();
    progressText.textContent = "Cancelling…";
  });

  // ── Progress events ───────────────────────────────────────────────────────

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

  // ── Assemble ──────────────────────────────────────────────────────────────

  switchMode(currentMode);

  const root = el(
    "div",
    { class: "ws-root" },
    el("div", { class: "ws-header" },
      el("h2", { class: "ws-title" }, "Wordsmith"),
      el("p", { class: "ws-subtitle" }, "Generate security testing wordlists for Caido Automate")
    ),
    el("div", { class: "ws-tabs" },
      ...tabDefs.map(([mode]) => tabButtons[mode])
    ),
    formContainer,
    encodingSelector.root,
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
