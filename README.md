# Caido Wordsmith

A [Caido](https://caido.io) plugin for generating security testing wordlists — brute-force charset combinations, mask-based patterns, and word-mangling mutations — designed to feed directly into Caido Automate.

## Features

| Mode | Description |
|---|---|
| **Charset** | Brute-force all combinations of a character set between a min and max length |
| **Mask** | Pattern-based generation using `?l` `?u` `?d` `?s` tokens (like hashcat masks) |
| **Mangle** | Mutate a list of base words with capitalization, leet, prefixes, suffixes, and years |

Output is a `.txt` file written directly on the Caido host, one payload per line, ready to load into Caido Automate as a Hosted File or Simple List.

---

## Installation

### Option A — Install the pre-built zip (recommended)

1. Download `plugin_package.zip` from the [Releases](../../releases) page.
2. In Caido, go to **Plugins** → **Install** and upload the zip.

### Option B — Build from source

**Prerequisites:** Node.js LTS, pnpm

```bash
git clone <repo-url>
cd caido_wordsmith
pnpm install
pnpm package        # builds and creates plugin_package.zip
```

Then install `plugin_package.zip` via **Plugins** → **Install** in Caido.

> **Note:** The `pnpm package` command is important — `pnpm build` alone only compiles the source files into `dist/`. The `package` command also copies `manifest.json` into `dist/` and zips everything up. Uploading just the `dist/` folder or the repo root will fail with a manifest error.

---

## Usage

After installation, open the **Wordsmith** item in the Caido sidebar.

### Charset mode

Generates every combination of characters in a given set.

| Field | Description |
|---|---|
| Character set | The characters to combine (e.g. `abc123`) |
| Min length | Shortest output string |
| Max length | Longest output string |

Generation is rejected before it starts if the estimated output exceeds 10 million entries.

### Mask mode

Generates strings matching a fixed-length pattern. Tokens:

| Token | Expands to |
|---|---|
| `?l` | `abcdefghijklmnopqrstuvwxyz` |
| `?u` | `ABCDEFGHIJKLMNOPQRSTUVWXYZ` |
| `?d` | `0123456789` |
| `?s` | `!"#$%&'()*+,-./:;<=>?@[\]^_{|}~` |
| any other char | literal character |

Example: `?u?l?l?d?d` → five-character strings like `Abc12`.

### Mangle mode

Takes a list of base words and produces mutations:

- Original, capitalized (`Word`), uppercase (`WORD`), lowercase (`word`)
- `prefix + word`, `word + suffix`
- `word + year` (e.g. `admin2024`)
- `word + separator + word` (e.g. `admin_password`)
- Leetspeak substitutions (`a→4`, `e→3`, `i→1`, `o→0`, `s→5`)

Enable **Deduplicate** (on by default) to strip repeated entries.

---

## Using output with Caido Automate

After clicking **Generate file**, the plugin writes a `.txt` file to the Caido host and shows the full path in the result panel.

Two ways to use it in Automate:

1. **Hosted File** — Go to Automate → Payloads → Hosted File and paste the output path.
2. **Simple List** — Open the `.txt` file, copy its contents, and paste into Automate → Payloads → Simple List.

---

## Development

```bash
pnpm install
pnpm dev        # rebuilds on file changes (frontend + backend)
```

Load the plugin in Caido's developer mode to test changes live.

### Project structure

```
packages/
  frontend/src/
    index.ts        ← registers the sidebar page
    page.ts         ← full UI (mode tabs, forms, preview, actions)
    api.ts          ← typed RPC wrappers
  backend/src/
    index.ts        ← wires RPC handlers
    generator/
      charset.ts    ← brute-force charset generator
      mask.ts       ← mask token generator
      mangle.ts     ← word mutation generator
      common.ts     ← shared types and validation
    output.ts       ← streaming file writer
```

---

## Limits

- Charset generation is capped at 10 million entries.
- Preview is limited to the first 100 entries (configurable).
- Progress events are throttled to one per 1,000 entries to avoid flooding Caido's IPC channel.

---

## License

MIT
