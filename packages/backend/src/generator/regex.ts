import type { GenerateOptions } from "./common.js";

// ─── AST Types ────────────────────────────────────────────────────────────────

type RegexNode =
  | { kind: "literal"; char: string }
  | { kind: "charclass"; chars: string }
  | { kind: "sequence"; nodes: RegexNode[] }
  | { kind: "alternation"; nodes: RegexNode[] }
  | { kind: "repeat"; node: RegexNode; min: number; max: number }; // max=-1 means unbounded

// ─── Parser ───────────────────────────────────────────────────────────────────

const PRINTABLE_ASCII = Array.from({ length: 95 }, (_, i) =>
  String.fromCharCode(32 + i)
).join("");

class RegexParser {
  private pos = 0;

  constructor(private readonly pattern: string) {}

  parse(): RegexNode {
    const node = this.parseAlternation();
    if (this.pos !== this.pattern.length) {
      throw new Error(
        `Unexpected character '${this.pattern[this.pos]}' at position ${this.pos}`
      );
    }
    return node;
  }

  private parseAlternation(): RegexNode {
    const nodes: RegexNode[] = [this.parseSequence()];
    while (this.pos < this.pattern.length && this.pattern[this.pos] === "|") {
      this.pos++;
      nodes.push(this.parseSequence());
    }
    return nodes.length === 1 ? nodes[0] : { kind: "alternation", nodes };
  }

  private parseSequence(): RegexNode {
    const nodes: RegexNode[] = [];
    while (
      this.pos < this.pattern.length &&
      this.pattern[this.pos] !== ")" &&
      this.pattern[this.pos] !== "|"
    ) {
      nodes.push(this.parseAtom());
    }
    if (nodes.length === 0) return { kind: "literal", char: "" };
    if (nodes.length === 1) return nodes[0];
    return { kind: "sequence", nodes };
  }

  private parseAtom(): RegexNode {
    const base = this.parseBase();
    if (this.pos >= this.pattern.length) return base;

    const q = this.pattern[this.pos];
    if (q === "?") {
      this.pos++;
      return { kind: "repeat", node: base, min: 0, max: 1 };
    }
    if (q === "+") {
      this.pos++;
      return { kind: "repeat", node: base, min: 1, max: -1 };
    }
    if (q === "*") {
      this.pos++;
      return { kind: "repeat", node: base, min: 0, max: -1 };
    }
    if (q === "{") {
      const { min, max } = this.parseBraces();
      return { kind: "repeat", node: base, min, max };
    }
    return base;
  }

  private parseBraces(): { min: number; max: number } {
    this.pos++; // consume '{'
    let minStr = "";
    while (
      this.pos < this.pattern.length &&
      this.pattern[this.pos] !== "," &&
      this.pattern[this.pos] !== "}"
    ) {
      minStr += this.pattern[this.pos++];
    }
    if (this.pattern[this.pos] === "}") {
      this.pos++;
      const n = parseInt(minStr, 10);
      if (isNaN(n)) throw new Error("Invalid quantifier");
      return { min: n, max: n };
    }
    this.pos++; // consume ','
    let maxStr = "";
    while (
      this.pos < this.pattern.length &&
      this.pattern[this.pos] !== "}"
    ) {
      maxStr += this.pattern[this.pos++];
    }
    if (this.pattern[this.pos] !== "}") throw new Error("Unclosed '{'");
    this.pos++; // consume '}'
    const min = parseInt(minStr, 10);
    const max = maxStr.trim() === "" ? -1 : parseInt(maxStr, 10);
    if (isNaN(min)) throw new Error("Invalid quantifier min");
    return { min, max };
  }

  private parseBase(): RegexNode {
    if (this.pos >= this.pattern.length) {
      throw new Error("Unexpected end of pattern");
    }
    const c = this.pattern[this.pos];

    if (c === "(") {
      this.pos++;
      // Handle non-capturing group (?:...)
      if (
        this.pos + 1 < this.pattern.length &&
        this.pattern[this.pos] === "?" &&
        this.pattern[this.pos + 1] === ":"
      ) {
        this.pos += 2;
      }
      const inner = this.parseAlternation();
      if (this.pos >= this.pattern.length || this.pattern[this.pos] !== ")") {
        throw new Error("Expected closing ')'");
      }
      this.pos++;
      return inner;
    }

    if (c === "[") {
      return this.parseCharClass();
    }

    if (c === "\\") {
      this.pos++;
      if (this.pos >= this.pattern.length) throw new Error("Trailing backslash");
      const esc = this.pattern[this.pos++];
      return { kind: "charclass", chars: escapeToChars(esc) };
    }

    if (c === ".") {
      this.pos++;
      return { kind: "charclass", chars: PRINTABLE_ASCII };
    }

    // Guard: don't consume special chars that belong to the parent context
    if (c === ")" || c === "|" || c === "?" || c === "*" || c === "+" || c === "{") {
      throw new Error(`Unexpected '${c}' at position ${this.pos}`);
    }

    this.pos++;
    return { kind: "literal", char: c };
  }

  private parseCharClass(): RegexNode {
    this.pos++; // consume '['
    const negated =
      this.pos < this.pattern.length && this.pattern[this.pos] === "^";
    if (negated) this.pos++;

    let chars = "";
    while (this.pos < this.pattern.length && this.pattern[this.pos] !== "]") {
      if (this.pattern[this.pos] === "\\") {
        this.pos++;
        const esc = this.pattern[this.pos++];
        chars += escapeToChars(esc);
      } else if (
        this.pos + 2 < this.pattern.length &&
        this.pattern[this.pos + 1] === "-" &&
        this.pattern[this.pos + 2] !== "]"
      ) {
        const from = this.pattern.charCodeAt(this.pos);
        const to = this.pattern.charCodeAt(this.pos + 2);
        if (from > to) throw new Error(`Invalid range in character class`);
        for (let code = from; code <= to; code++) {
          chars += String.fromCharCode(code);
        }
        this.pos += 3;
      } else {
        chars += this.pattern[this.pos++];
      }
    }
    if (this.pos >= this.pattern.length) throw new Error("Unclosed '['");
    this.pos++; // consume ']'

    if (negated) {
      const charSet = new Set(chars);
      chars = PRINTABLE_ASCII.split("")
        .filter((ch) => !charSet.has(ch))
        .join("");
    } else {
      chars = [...new Set(chars)].join("");
    }

    return { kind: "charclass", chars };
  }
}

function escapeToChars(esc: string): string {
  switch (esc) {
    case "d":
      return "0123456789";
    case "D":
      return PRINTABLE_ASCII.split("")
        .filter((c) => !"0123456789".includes(c))
        .join("");
    case "w":
      return "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
    case "W":
      return PRINTABLE_ASCII.split("")
        .filter(
          (c) =>
            !"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_".includes(
              c
            )
        )
        .join("");
    case "l":
      return "abcdefghijklmnopqrstuvwxyz";
    case "u":
      return "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    case "s":
      return " \t\n\r\f";
    case "S":
      return PRINTABLE_ASCII.split("")
        .filter((c) => !" \t\n\r\f".includes(c))
        .join("");
    case "n":
      return "\n";
    case "t":
      return "\t";
    case "r":
      return "\r";
    default:
      return esc; // escaped literal
  }
}

// ─── Generator ────────────────────────────────────────────────────────────────

function* generateFromNode(
  node: RegexNode,
  quantifierMax: number,
  cancelFlag: { cancelled: boolean }
): Generator<string> {
  if (cancelFlag.cancelled) return;

  switch (node.kind) {
    case "literal":
      yield node.char;
      break;

    case "charclass":
      for (const c of node.chars) {
        if (cancelFlag.cancelled) return;
        yield c;
      }
      break;

    case "sequence":
      yield* generateSequence(node.nodes, 0, "", quantifierMax, cancelFlag);
      break;

    case "alternation":
      for (const alt of node.nodes) {
        if (cancelFlag.cancelled) return;
        yield* generateFromNode(alt, quantifierMax, cancelFlag);
      }
      break;

    case "repeat": {
      const actualMax =
        node.max === -1 ? quantifierMax : node.max;
      const cappedMax = Math.min(actualMax, quantifierMax);
      // Pre-collect single-node strings to allow cross-product repetition
      const singles: string[] = [];
      for (const s of generateFromNode(node.node, quantifierMax, cancelFlag)) {
        singles.push(s);
      }
      for (let count = node.min; count <= cappedMax; count++) {
        if (cancelFlag.cancelled) return;
        yield* crossProduct(singles, count, "", cancelFlag);
      }
      break;
    }
  }
}

function* generateSequence(
  nodes: RegexNode[],
  pos: number,
  prefix: string,
  quantifierMax: number,
  cancelFlag: { cancelled: boolean }
): Generator<string> {
  if (cancelFlag.cancelled) return;
  if (pos === nodes.length) {
    yield prefix;
    return;
  }
  for (const part of generateFromNode(nodes[pos], quantifierMax, cancelFlag)) {
    if (cancelFlag.cancelled) return;
    yield* generateSequence(nodes, pos + 1, prefix + part, quantifierMax, cancelFlag);
  }
}

function* crossProduct(
  items: string[],
  count: number,
  prefix: string,
  cancelFlag: { cancelled: boolean }
): Generator<string> {
  if (cancelFlag.cancelled) return;
  if (count === 0) {
    yield prefix;
    return;
  }
  for (const item of items) {
    if (cancelFlag.cancelled) return;
    yield* crossProduct(items, count - 1, prefix + item, cancelFlag);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function* generateRegex(
  options: GenerateOptions,
  cancelFlag: { cancelled: boolean }
): Generator<string> {
  const pattern = options.regex ?? "";
  if (!pattern) return;
  const quantifierMax = options.regexQuantifierMax ?? 4;

  let root: RegexNode;
  try {
    root = new RegexParser(pattern).parse();
  } catch (e) {
    throw new Error(`Invalid regex pattern: ${(e as Error).message}`);
  }

  yield* generateFromNode(root, quantifierMax, cancelFlag);
}

export function estimateRegexCount(_options: GenerateOptions): number {
  // Exact estimation requires walking the AST; return 0 as "unknown"
  return 0;
}
