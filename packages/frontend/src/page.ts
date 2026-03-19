import type { CaidoSDK } from "./index.js";
import type { GenerateOptions, ProcessingRule } from "caido-wordsmith-backend";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function splitLines(s: string): string[] {
  return s.split("\n").map((x) => x.trim()).filter(Boolean);
}

function splitCsv(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

// ─── Mode Forms ───────────────────────────────────────────────────────────────

function buildCharsetForm(): { root: HTMLElement; getOptions: () => Partial<GenerateOptions> } {
  const charsetInput = el("input", { type: "text", class: "ws-input", value: "abcdefghijklmnopqrstuvwxyz0123456789", placeholder: "Characters to use" });
  const minLenInput = el("input", { type: "number", class: "ws-input ws-input--short", value: "1", min: "1", max: "8" });
  const maxLenInput = el("input", { type: "number", class: "ws-input ws-input--short", value: "4", min: "1", max: "8" });

  const root = el("div", { class: "ws-form" },
    el("div", { class: "ws-field" },
      el("label", { class: "ws-label" }, "Character set"),
      charsetInput,
      el("span", { class: "ws-hint" }, "All characters to combine")
    ),
    el("div", { class: "ws-field ws-field--row" },
      el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "Min length"), minLenInput),
      el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "Max length"), maxLenInput)
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
  const maskInput = el("input", { type: "text", class: "ws-input", value: "?l?l?l?d", placeholder: "e.g. ?u?l?l?l?d?d" });

  const root = el("div", { class: "ws-form" },
    el("div", { class: "ws-field" },
      el("label", { class: "ws-label" }, "Mask"),
      maskInput,
      el("div", { class: "ws-hint ws-hint--tokens" },
        el("code", {}, "?l"), " lowercase  ",
        el("code", {}, "?u"), " uppercase  ",
        el("code", {}, "?d"), " digits  ",
        el("code", {}, "?s"), " special  — any other char is literal"
      )
    )
  );

  return { root, getOptions: () => ({ mask: maskInput.value }) };
}

function buildMangleForm(): { root: HTMLElement; getOptions: () => Partial<GenerateOptions> } {
  const wordsInput = el("textarea", { class: "ws-textarea", rows: "5", placeholder: "One word per line\nadmin\npassword\ncompany" }) as HTMLTextAreaElement;
  const prefixesInput = el("input", { type: "text", class: "ws-input", placeholder: "Comma-separated, e.g. super,my" });
  const suffixesInput = el("input", { type: "text", class: "ws-input", placeholder: "Comma-separated, e.g. !,123" });
  const yearsInput = el("input", { type: "text", class: "ws-input", value: "2022,2023,2024,2025", placeholder: "Comma-separated years" });
  const separatorsInput = el("input", { type: "text", class: "ws-input", placeholder: "Separators for word+sep+word, e.g. _,-" });

  function mkCheck(id: string, label: string): { wrap: HTMLElement; input: HTMLInputElement } {
    const input = el("input", { type: "checkbox", id, class: "ws-checkbox" }) as HTMLInputElement;
    const wrap = el("label", { class: "ws-checkbox-label", for: id }, input, ` ${label}`);
    return { wrap, input };
  }

  const { wrap: capWrap, input: capInput }     = mkCheck("ws-cap",    "Capitalize");
  const { wrap: upperWrap, input: upperInput } = mkCheck("ws-upper",  "UPPERCASE");
  const { wrap: lowerWrap, input: lowerInput } = mkCheck("ws-lower",  "lowercase");
  const { wrap: leetWrap, input: leetInput }   = mkCheck("ws-leet",   "l33tspeak");
  const { wrap: ddWrap, input: ddInput }       = mkCheck("ws-dedupe", "Deduplicate");
  ddInput.checked = true;

  const root = el("div", { class: "ws-form" },
    el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "Base words"), wordsInput),
    el("div", { class: "ws-field ws-field--row" },
      el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "Prefixes"), prefixesInput),
      el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "Suffixes"), suffixesInput)
    ),
    el("div", { class: "ws-field ws-field--row" },
      el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "Years"), yearsInput),
      el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "Word separators"), separatorsInput)
    ),
    el("div", { class: "ws-field ws-field--checkboxes" }, capWrap, upperWrap, lowerWrap, leetWrap, ddWrap)
  );

  return {
    root,
    getOptions: () => ({
      words: splitLines(wordsInput.value),
      prefixes: splitCsv(prefixesInput.value),
      suffixes: splitCsv(suffixesInput.value),
      years: splitCsv(yearsInput.value),
      separators: splitCsv(separatorsInput.value),
      capitalize: capInput.checked,
      uppercase: upperInput.checked,
      lowercase: lowerInput.checked,
      leetspeak: leetInput.checked,
      dedupe: ddInput.checked,
    }),
  };
}

function buildNumbersForm(): { root: HTMLElement; getOptions: () => Partial<GenerateOptions> } {
  const fromInput  = el("input", { type: "number", class: "ws-input", value: "0",   placeholder: "From" });
  const toInput    = el("input", { type: "number", class: "ws-input", value: "100", placeholder: "To" });
  const stepInput  = el("input", { type: "number", class: "ws-input", value: "1",   placeholder: "Step", min: "1" });
  const padInput   = el("input", { type: "number", class: "ws-input", value: "0",   placeholder: "0 = none", min: "0", max: "20" });

  const root = el("div", { class: "ws-form" },
    el("div", { class: "ws-field ws-field--row" },
      el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "From"), fromInput),
      el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "To"), toInput),
      el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "Step"), stepInput)
    ),
    el("div", { class: "ws-field ws-field--half" },
      el("label", { class: "ws-label" }, "Leading zeros (pad to N digits)"),
      padInput,
      el("span", { class: "ws-hint" }, "e.g. pad=4 → 0001, 0042")
    )
  );

  return {
    root,
    getOptions: () => ({
      numberFrom: parseFloat(fromInput.value) || 0,
      numberTo:   parseFloat(toInput.value)   || 100,
      numberStep: parseFloat(stepInput.value) || 1,
      numberPad:  parseInt(padInput.value, 10) || 0,
    }),
  };
}

function buildDatesForm(): { root: HTMLElement; getOptions: () => Partial<GenerateOptions> } {
  const fromInput   = el("input", { type: "date", class: "ws-input", value: "2020-01-01" });
  const toInput     = el("input", { type: "date", class: "ws-input", value: "2024-12-31" });
  const stepSelect  = el("select", { class: "ws-select" }) as HTMLSelectElement;
  const formatInput = el("input", { type: "text", class: "ws-input", value: "YYYY-MM-DD", placeholder: "e.g. DD/MM/YYYY" });

  for (const [v, l] of [["day","Day"],["week","Week"],["month","Month"],["year","Year"]]) {
    stepSelect.appendChild(el("option", { value: v }, l));
  }

  const root = el("div", { class: "ws-form" },
    el("div", { class: "ws-field ws-field--row" },
      el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "From"), fromInput),
      el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "To"), toInput)
    ),
    el("div", { class: "ws-field ws-field--row" },
      el("div", { class: "ws-field" },
        el("label", { class: "ws-label" }, "Step"),
        stepSelect
      ),
      el("div", { class: "ws-field" },
        el("label", { class: "ws-label" }, "Format"),
        formatInput,
        el("span", { class: "ws-hint" }, "Tokens: YYYY YY MM M DD D")
      )
    )
  );

  return {
    root,
    getOptions: () => ({
      dateFrom:   fromInput.value,
      dateTo:     toInput.value,
      dateStep:   stepSelect.value as "day" | "week" | "month" | "year",
      dateFormat: formatInput.value || "YYYY-MM-DD",
    }),
  };
}

function buildNullForm(): { root: HTMLElement; getOptions: () => Partial<GenerateOptions> } {
  const countInput = el("input", { type: "number", class: "ws-input ws-input--short", value: "10", min: "1" });
  const valueInput = el("input", { type: "text", class: "ws-input", placeholder: "Leave empty for empty string" });

  const root = el("div", { class: "ws-form" },
    el("div", { class: "ws-field ws-field--half" },
      el("label", { class: "ws-label" }, "Count"),
      countInput
    ),
    el("div", { class: "ws-field" },
      el("label", { class: "ws-label" }, "Payload value"),
      valueInput,
      el("span", { class: "ws-hint" }, "The string to repeat N times. Empty = blank line per payload.")
    )
  );

  return {
    root,
    getOptions: () => ({
      nullCount: parseInt(countInput.value, 10) || 10,
      nullValue: valueInput.value,
    }),
  };
}

function buildCharBlocksForm(): { root: HTMLElement; getOptions: () => Partial<GenerateOptions> } {
  const charInput   = el("input", { type: "text", class: "ws-input ws-input--short", value: "A", maxlength: "1", placeholder: "A" });
  const minLenInput = el("input", { type: "number", class: "ws-input ws-input--short", value: "1",   min: "1" });
  const maxLenInput = el("input", { type: "number", class: "ws-input ws-input--short", value: "100", min: "1" });

  const root = el("div", { class: "ws-form" },
    el("div", { class: "ws-field ws-field--row" },
      el("div", { class: "ws-field" },
        el("label", { class: "ws-label" }, "Character"),
        charInput,
        el("span", { class: "ws-hint" }, "First char used")
      ),
      el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "Min length"), minLenInput),
      el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "Max length"), maxLenInput)
    ),
    el("div", { class: "ws-hint" }, "Generates AAAA, AAAAA, AAAAAA … up to max length — useful for buffer overflow and length-based fuzzing.")
  );

  return {
    root,
    getOptions: () => ({
      blockChar:       charInput.value || "A",
      blockMinLength:  parseInt(minLenInput.value, 10) || 1,
      blockMaxLength:  parseInt(maxLenInput.value, 10) || 100,
    }),
  };
}

function buildUsernamesForm(): { root: HTMLElement; getOptions: () => Partial<GenerateOptions> } {
  const firstInput = el("textarea", { class: "ws-textarea", rows: "5", placeholder: "One first name per line\nJohn\nJane" }) as HTMLTextAreaElement;
  const lastInput  = el("textarea", { class: "ws-textarea", rows: "5", placeholder: "One last name per line\nDoe\nSmith" }) as HTMLTextAreaElement;

  function mkCheck(id: string, label: string): { wrap: HTMLElement; input: HTMLInputElement } {
    const input = el("input", { type: "checkbox", id, class: "ws-checkbox" }) as HTMLInputElement;
    const wrap = el("label", { class: "ws-checkbox-label", for: id }, input, ` ${label}`);
    return { wrap, input };
  }
  const { wrap: ddWrap, input: ddInput } = mkCheck("ws-un-dedupe", "Deduplicate");
  ddInput.checked = true;

  const root = el("div", { class: "ws-form" },
    el("div", { class: "ws-field ws-field--row" },
      el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "First names"), firstInput),
      el("div", { class: "ws-field" }, el("label", { class: "ws-label" }, "Last names"), lastInput)
    ),
    el("div", { class: "ws-hint" },
      "Generates patterns: john, doe, johndoe, john.doe, john_doe, jdoe, j.doe, johnd, doejohn, doe.john, doej, and more."
    ),
    el("div", { class: "ws-field ws-field--checkboxes" }, ddWrap)
  );

  return {
    root,
    getOptions: () => ({
      firstnames: splitLines(firstInput.value),
      lastnames:  splitLines(lastInput.value),
      dedupe:     ddInput.checked,
    }),
  };
}

// ─── Payload Processing ───────────────────────────────────────────────────────

type RuleUI = { root: HTMLElement; getRule: () => ProcessingRule | null };

const RULE_TYPES: { value: string; label: string }[] = [
  { value: "prefix",      label: "Add prefix" },
  { value: "suffix",      label: "Add suffix" },
  { value: "replace",     label: "Match / Replace" },
  { value: "urlencode",   label: "URL encode" },
  { value: "base64encode",label: "Base64 encode" },
  { value: "base64decode",label: "Base64 decode" },
  { value: "uppercase",   label: "UPPERCASE" },
  { value: "lowercase",   label: "lowercase" },
  { value: "reverse",     label: "Reverse" },
];

function buildRuleRow(onRemove: () => void): RuleUI {
  const typeSelect = el("select", { class: "ws-select ws-rule-type" }) as HTMLSelectElement;
  for (const { value, label } of RULE_TYPES) {
    typeSelect.appendChild(el("option", { value }, label));
  }

  const params = el("div", { class: "ws-rule-params" });

  const prefixInput  = el("input", { type: "text", class: "ws-input", placeholder: "Value to prepend" });
  const suffixInput  = el("input", { type: "text", class: "ws-input", placeholder: "Value to append" });
  const matchInput   = el("input", { type: "text", class: "ws-input", placeholder: "Match" });
  const replaceInput = el("input", { type: "text", class: "ws-input", placeholder: "Replace with" });
  const regexInput   = el("input", { type: "checkbox", class: "ws-checkbox" }) as HTMLInputElement;
  const regexLabel   = el("label", { class: "ws-checkbox-label" }, regexInput, " Regex");

  function refreshParams() {
    params.innerHTML = "";
    switch (typeSelect.value) {
      case "prefix":  params.appendChild(prefixInput);  break;
      case "suffix":  params.appendChild(suffixInput);  break;
      case "replace":
        params.appendChild(matchInput);
        params.appendChild(replaceInput);
        params.appendChild(regexLabel);
        break;
    }
  }

  typeSelect.addEventListener("change", refreshParams);
  refreshParams();

  const btnRemove = el("button", { class: "ws-btn-remove", title: "Remove rule" }, "✕");
  btnRemove.addEventListener("click", onRemove);

  const root = el("div", { class: "ws-rule-row" }, typeSelect, params, btnRemove);

  return {
    root,
    getRule: () => {
      const t = typeSelect.value;
      switch (t) {
        case "prefix":  return { type: "prefix",  value: (prefixInput  as HTMLInputElement).value };
        case "suffix":  return { type: "suffix",  value: (suffixInput  as HTMLInputElement).value };
        case "replace": return { type: "replace", match: (matchInput as HTMLInputElement).value, replace: (replaceInput as HTMLInputElement).value, regex: regexInput.checked };
        case "urlencode":    return { type: "urlencode" };
        case "base64encode": return { type: "base64encode" };
        case "base64decode": return { type: "base64decode" };
        case "uppercase":    return { type: "uppercase" };
        case "lowercase":    return { type: "lowercase" };
        case "reverse":      return { type: "reverse" };
        default: return null;
      }
    },
  };
}

function buildProcessingSection(): { root: HTMLElement; getRules: () => ProcessingRule[] } {
  const rules: RuleUI[] = [];
  const rulesList = el("div", { class: "ws-rules-list" });

  function addRule() {
    const ui = buildRuleRow(() => {
      const idx = rules.indexOf(ui);
      if (idx >= 0) { rules.splice(idx, 1); rulesList.removeChild(ui.root); }
    });
    rules.push(ui);
    rulesList.appendChild(ui.root);
  }

  const btnAdd = el("button", { class: "ws-btn-add-rule" }, "+ Add rule");
  btnAdd.addEventListener("click", addRule);

  const header = el("div", { class: "ws-section-header" },
    el("span", { class: "ws-section-title" }, "Payload Processing"),
    el("span", { class: "ws-section-hint" }, "Applied to every entry after generation"),
    btnAdd
  );

  const root = el("div", { class: "ws-processing-section" }, header, rulesList);

  return {
    root,
    getRules: () => rules.map((r) => r.getRule()).filter(Boolean) as ProcessingRule[],
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function createPage(sdk: CaidoSDK): HTMLElement {
  type Mode = GenerateOptions["mode"];

  const MODES: { value: Mode; label: string; desc: string }[] = [
    { value: "mangle",     label: "Word Mangle",        desc: "Mutate a word list with case, leet, prefixes, suffixes, and years" },
    { value: "usernames",  label: "Username Generator", desc: "Generate username permutations from first and last names" },
    { value: "numbers",    label: "Numbers",            desc: "Numeric range with configurable step and leading-zero padding" },
    { value: "dates",      label: "Dates",              desc: "Date range with configurable step and format string" },
    { value: "charset",    label: "Charset / Brute-force", desc: "All combinations of a character set between min and max length" },
    { value: "mask",       label: "Mask",               desc: "Fixed-length patterns using ?l ?u ?d ?s tokens" },
    { value: "null",       label: "Null Payloads",      desc: "Repeat a fixed value (or empty string) N times" },
    { value: "charblocks", label: "Character Blocks",   desc: "Repeat a single character with increasing length — good for overflow fuzzing" },
  ];

  let currentMode: Mode = "mangle";

  // Build all form instances up front
  const forms: Record<Mode, { root: HTMLElement; getOptions: () => Partial<GenerateOptions> }> = {
    charset:    buildCharsetForm(),
    mask:       buildMaskForm(),
    mangle:     buildMangleForm(),
    numbers:    buildNumbersForm(),
    dates:      buildDatesForm(),
    null:       buildNullForm(),
    charblocks: buildCharBlocksForm(),
    usernames:  buildUsernamesForm(),
  };

  // Mode selector
  const modeSelect = el("select", { class: "ws-select ws-mode-select" }) as HTMLSelectElement;
  for (const { value, label } of MODES) {
    const opt = el("option", { value }, label);
    if (value === currentMode) opt.setAttribute("selected", "");
    modeSelect.appendChild(opt);
  }

  const modeDesc = el("p", { class: "ws-mode-desc" });
  const formContainer = el("div", { class: "ws-form-container" });

  function switchMode(mode: Mode) {
    currentMode = mode;
    const info = MODES.find((m) => m.value === mode);
    modeDesc.textContent = info?.desc ?? "";
    formContainer.innerHTML = "";
    formContainer.appendChild(forms[mode].root);
  }

  modeSelect.addEventListener("change", () => switchMode(modeSelect.value as Mode));
  switchMode(currentMode);

  // Payload processing
  const processing = buildProcessingSection();

  // Preview / results
  const previewOutput = el("textarea", { class: "ws-preview-output", readonly: "", placeholder: "Preview will appear here…" }) as HTMLTextAreaElement;
  const previewMeta   = el("div", { class: "ws-preview-meta" }, "");
  const progressBar   = el("progress", { class: "ws-progress", value: "0", max: "100" }) as HTMLProgressElement;
  const progressText  = el("div", { class: "ws-progress-text" }, "");
  const progressSection = el("div", { class: "ws-progress-section ws-hidden" }, progressBar, progressText);
  const resultPanel   = el("div", { class: "ws-result ws-hidden" });
  const errorPanel    = el("div", { class: "ws-error ws-hidden" });

  // Buttons
  const btnPreview  = el("button", { class: "c-button c-button--primary" }, "Preview");
  const btnGenerate = el("button", { class: "c-button" }, "Generate file");
  const btnCancel   = el("button", { class: "c-button ws-hidden" }, "Cancel");

  // ── Helpers ──────────────────────────────────────────────────────────────

  function collectOptions(previewLimit?: number): GenerateOptions {
    return {
      mode: currentMode,
      previewLimit,
      processing: processing.getRules(),
      ...forms[currentMode].getOptions(),
    } as GenerateOptions;
  }

  function showError(msg: string) {
    errorPanel.textContent = msg;
    errorPanel.classList.remove("ws-hidden");
  }

  function clearError() {
    errorPanel.textContent = "";
    errorPanel.classList.add("ws-hidden");
  }

  function setLoading(loading: boolean) {
    btnPreview.disabled  = loading;
    btnGenerate.disabled = loading;
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
      const result = await sdk.backend.previewWordlist(collectOptions(100));
      previewOutput.value = result.preview.join("\n");
      const est = result.estimatedTotal > result.previewCount
        ? ` (est. total: ${result.estimatedTotal.toLocaleString()})`
        : "";
      previewMeta.textContent = `${result.previewCount} entries shown${est} — ${result.durationMs}ms`;
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
      const result = await sdk.backend.generateWordlist(collectOptions());
      progressSection.classList.add("ws-hidden");
      resultPanel.classList.remove("ws-hidden");
      resultPanel.innerHTML = `
        <div class="ws-result__title">Generation complete</div>
        <div class="ws-result__row"><strong>Entries:</strong> ${result.totalGenerated.toLocaleString()}</div>
        <div class="ws-result__row"><strong>Duration:</strong> ${result.durationMs}ms</div>
        <div class="ws-result__row ws-result__path"><strong>Hosted file:</strong> <code>${result.outputPath}</code></div>
        <div class="ws-result__hint">
          The file is saved as a <strong>Hosted File</strong> in Caido.
          Go to <strong>Automate → Payloads → Hosted File</strong> to select it.
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

  return el("div", { class: "ws-root" },
    el("div", { class: "ws-header" },
      el("h2", { class: "ws-title" }, "Wordsmith"),
      el("p", { class: "ws-subtitle" }, "Generate security testing wordlists for Caido Automate")
    ),

    el("div", { class: "ws-mode-row" },
      el("div", { class: "ws-field" },
        el("label", { class: "ws-label" }, "Payload type"),
        modeSelect,
        modeDesc
      )
    ),

    formContainer,

    processing.root,

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
    resultPanel
  );
}
