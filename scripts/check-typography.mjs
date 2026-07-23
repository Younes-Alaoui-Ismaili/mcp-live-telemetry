#!/usr/bin/env node
/**
 * check-typography.mjs
 *
 * Fails if an em dash (U+2014) or en dash (U+2013) appears in any tracked text
 * file. Enforced in CI. This project uses plain hyphens, commas, colons and
 * parentheses instead, so these characters never belong in source or docs.
 *
 * Usage:
 *   node scripts/check-typography.mjs [target-dir]
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const FORBIDDEN = /[—–]/;
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "coverage"]);
const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz",
  ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp4", ".mov", ".mp3", ".wasm"
]);

const SELF = path.resolve(process.argv[1] ?? "");

async function walk(dir, out) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(full, out);
    } else if (entry.isFile()) {
      if (path.resolve(full) === SELF) continue;
      if (BINARY_EXT.has(path.extname(entry.name).toLowerCase())) continue;
      out.push(full);
    }
  }
}

async function main() {
  const target = path.resolve(process.argv[2] ?? ".");
  const files = [];
  await walk(target, files);

  const hits = [];
  for (const file of files) {
    let text;
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    text.split(/\r?\n/).forEach((line, i) => {
      if (FORBIDDEN.test(line)) {
        hits.push({ file: path.relative(target, file), line: i + 1, text: line.trim() });
      }
    });
  }

  if (hits.length === 0) {
    console.log(`[typography] OK: no em or en dash in ${files.length} files`);
    process.exit(0);
  }

  console.error(`[typography] FAIL: ${hits.length} forbidden dash character(s)`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  ${h.text.slice(0, 120)}`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(`[typography] unexpected error: ${err?.message ?? err}`);
  process.exit(2);
});
