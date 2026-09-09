#!/usr/bin/env node
/**
 * Detects and strips hidden JS payloads injected into project files
 * (AUTH_API_KEY droppers — standalone IIFE or Vite-embedded loadEnv —
 * and appended EtherHiding blobs).
 * Also sanitizes .gitignore files used to hide malware artefacts.
 *
 * Usage:
 *   node scripts/strip-injected-payload.mjs           # scan + clean
 *   node scripts/strip-injected-payload.mjs --dry-run  # report only
 *   node scripts/strip-injected-payload.mjs --root ..  # scan another dir
 */

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const THIS_FILE = fileURLToPath(import.meta.url);
const SCRIPT_NAME = path.basename(THIS_FILE);

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  ".cache",
  "coverage",
  "dist",
  "build",
  "out",
  "node_modules",
]);

const SCAN_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".mts",
  ".cts",
]);

// Suspicious ignore rules often planted so malware helper files stay untracked.
const GITIGNORE_REMOVE_ENTRIES = new Set([
  "temp_auto_push.bat",
  "temp_interactive_push.bat",
  "branch_structure.json",
  "config.bat",
  ".gitignore",
]);

const GITIGNORE_REQUIRED_ENTRIES = [".env", ".env.local"];

const OBFUSCATION_HINTS = [
  /function _0x[a-f0-9]{4,}\s*\(/,
  /child_proc/,
  /eth_getBlo/,
  /eth_blockN/,
  /x-payload-/,
  /AUTH_API_KEY/,
  /eval\s*\(\s*proxyInfo\s*\)/,
  /Auth Error!/,
];

// EtherHiding-style payloads are almost always appended to EOF.
const APPEND_TO_EOF_SIGNATURES = [
  new RegExp(
    ["global", String.raw`\.i\s*=\s*["']`, "A8-", String.raw`\d+["']`].join(""),
  ),
  new RegExp(
    [
      "global",
      String.raw`\[["']i["']\]\s*=\s*["']`,
      "A8-",
      String.raw`\d+["']`,
    ].join(""),
  ),
  /const _0x[a-f0-9]{4,}\s*=\s*_0x[a-f0-9]{4,}\s*;\s*\(function\s*\(_0x/,
  / {40,}(?:global\.i\s*=|const _0x[a-f0-9]{4,}\s*=)/,
];

// AUTH_API_KEY dropper markers (IIFE and Vite-embedded variants).
const AUTH_DROPPER_MARKERS = [
  new RegExp(
    ["atob", String.raw`\(\s*process\.env\.`, "AUTH_API_KEY", String.raw`\s*\)`].join(
      "",
    ),
  ),
  /atob\s*\(\s*authApiKey\s*\)/i,
  /\benv\.AUTH_API_KEY\b/,
  /eval\s*\(\s*proxyInfo\s*\)/,
  new RegExp(
    [
      String.raw`console\.error\s*\(\s*['"]`,
      "Auth Error!",
      String.raw`['"]`,
    ].join(""),
  ),
  new RegExp(
    [
      String.raw`console\.warn\s*\(\s*['"]`,
      "AUTH_API_KEY is not defined",
    ].join(""),
  ),
];

const AUTH_IIFE_START = /\(async\s*\(\s*\)\s*=>\s*\{/g;
const AUTH_IIFE_END = /\}\s*\)\s*\(\s*\)\s*;?/g;

const SIGNATURES = [...APPEND_TO_EOF_SIGNATURES, ...AUTH_DROPPER_MARKERS];

function parseArgs(argv) {
  const args = { dryRun: false, root: null, includeNodeModules: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--include-node-modules") args.includeNodeModules = true;
    else if (arg === "--root") args.root = argv[++i];
    else if (arg === "--help" || arg === "-h") args.help = true;
    else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  return args;
}

function findGitRoot(startDir) {
  let dir = path.resolve(startDir);
  while (true) {
    if (existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function earliestMatchIndex(content, patterns = SIGNATURES) {
  let earliest = -1;
  for (const pattern of patterns) {
    const flags = pattern.flags.includes("g")
      ? pattern.flags
      : `${pattern.flags}g`;
    const globalPattern = new RegExp(pattern.source, flags);
    const match = globalPattern.exec(content);
    if (match?.index == null) continue;
    if (earliest === -1 || match.index < earliest) earliest = match.index;
  }
  return earliest;
}

function looksLikeFullFilePayload(content) {
  const trimmed = content.trimStart();
  if (earliestMatchIndex(trimmed) !== 0) return false;
  return OBFUSCATION_HINTS.some((hint) => hint.test(content));
}

function hasAuthDropperMarker(slice) {
  return AUTH_DROPPER_MARKERS.some((pattern) => pattern.test(slice));
}

function isViteEmbeddedAuthDropper(content) {
  const hasDefineConfig = /\bdefineConfig\s*\(/.test(content);
  const hasAuthKey = /\bAUTH_API_KEY\b/.test(content);
  const hasEvalProxy = /eval\s*\(\s*proxyInfo\s*\)/.test(content);
  const hasLoader =
    /\bloadEnv\b/.test(content) ||
    /import\s*\(\s*['"]node-fetch['"]\s*\)/.test(content) ||
    /atob\s*\(/.test(content);
  const hasReturnConfig = /\breturn\s*\{/.test(content);

  return hasDefineConfig && hasAuthKey && hasEvalProxy && hasLoader && hasReturnConfig;
}

function extractBalancedObjectLiteral(content, fromIndex) {
  const braceStart = content.indexOf("{", fromIndex);
  if (braceStart === -1) return null;

  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escaped = false;

  for (let i = braceStart; i < content.length; i++) {
    const ch = content[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\" && (inSingle || inDouble || inTemplate)) {
      escaped = true;
      continue;
    }

    if (!inDouble && !inTemplate && ch === "'") {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && !inTemplate && ch === '"') {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble && ch === "`") {
      inTemplate = !inTemplate;
      continue;
    }

    if (inSingle || inDouble || inTemplate) continue;

    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return content.slice(braceStart, i + 1);
      }
    }
  }

  return null;
}

function cleanViteImportLine(line) {
  let next = line;

  if (/from\s+['"]vite['"]/.test(next) && /\bloadEnv\b/.test(next)) {
    next = next
      .replace(/\{\s*loadEnv\s*,\s*/g, "{ ")
      .replace(/,\s*loadEnv\s*/g, "")
      .replace(/\{\s*loadEnv\s*\}/g, "{}");
  }

  // Drop empty named imports: import { } from 'vite'
  if (/import\s*\{\s*\}\s*from/.test(next)) return null;

  // Normalize `{ defineConfig}` → `{ defineConfig }`
  next = next.replace(/\{\s+/g, "{ ").replace(/\s+\}/g, " }");

  return next;
}

/**
 * Rebuild a clean Vite config when the dropper is embedded inside defineConfig(async ...).
 * Keeps real imports + the returned config object; drops loadEnv/AUTH_API_KEY/eval logic.
 */
function stripViteEmbeddedAuthDropper(content) {
  if (!isViteEmbeddedAuthDropper(content)) return null;

  const returnMatch = content.match(/\breturn\s*\{/);
  if (!returnMatch || returnMatch.index == null) {
    return { action: "full-file", cleaned: null };
  }

  const configObject = extractBalancedObjectLiteral(content, returnMatch.index);
  if (!configObject) {
    return { action: "full-file", cleaned: null };
  }

  const importLines = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("import ")) continue;
    if (/node-fetch/.test(trimmed)) continue;

    const cleaned = cleanViteImportLine(line);
    if (cleaned == null) continue;
    importLines.push(cleaned.replace(/\s+$/g, ""));
  }

  if (importLines.length === 0) {
    return { action: "full-file", cleaned: null };
  }

  // Ensure defineConfig is imported if the original used it.
  const hasDefineConfigImport = importLines.some(
    (line) => /defineConfig/.test(line) && /from\s+['"]vite['"]/.test(line),
  );
  if (!hasDefineConfigImport) {
    importLines.unshift("import { defineConfig } from 'vite'");
  }

  let cleaned = `${importLines.join("\n")}\n\nexport default defineConfig(${configObject})\n`;
  // Prefer double-newline spacing consistency with typical vite configs.
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Safety: cleaned output must not still contain the dropper.
  if (
    /\bAUTH_API_KEY\b/.test(cleaned) ||
    /eval\s*\(\s*proxyInfo\s*\)/.test(cleaned) ||
    /node-fetch/.test(cleaned)
  ) {
    return { action: "full-file", cleaned: null };
  }

  return { action: "stripped", cleaned };
}

/**
 * Find bounded AUTH_API_KEY IIFE ranges so legitimate code before/after is kept.
 * Example: malicious IIFE prepended to vite.config.js must not delete defineConfig().
 */
function findAuthDropperRanges(content) {
  const ranges = [];
  AUTH_IIFE_START.lastIndex = 0;

  let startMatch;
  while ((startMatch = AUTH_IIFE_START.exec(content)) !== null) {
    const start = startMatch.index;
    AUTH_IIFE_END.lastIndex = startMatch.index + startMatch[0].length;

    let endMatch;
    while ((endMatch = AUTH_IIFE_END.exec(content)) !== null) {
      const end = endMatch.index + endMatch[0].length;
      const slice = content.slice(start, end);
      if (!hasAuthDropperMarker(slice)) continue;

      let rangeStart = start;
      while (rangeStart > 0 && /\s/.test(content[rangeStart - 1])) rangeStart -= 1;

      let rangeEnd = end;
      while (rangeEnd < content.length && /\s/.test(content[rangeEnd])) {
        rangeEnd += 1;
      }

      ranges.push({ start: rangeStart, end: rangeEnd });
      AUTH_IIFE_START.lastIndex = rangeEnd;
      break;
    }
  }

  return ranges;
}

function removeRanges(content, ranges) {
  if (ranges.length === 0) return content;

  const ordered = [...ranges].sort((a, b) => a.start - b.start);
  let result = "";
  let cursor = 0;

  for (const range of ordered) {
    if (range.start < cursor) continue;
    result += content.slice(cursor, range.start);
    cursor = range.end;
  }

  result += content.slice(cursor);
  return result;
}

function stripAppendedEtherPayload(content) {
  const index = earliestMatchIndex(content, APPEND_TO_EOF_SIGNATURES);
  if (index === -1) return null;

  let cut = index;
  while (cut > 0 && /\s/.test(content[cut - 1])) cut -= 1;

  // Prefer cutting at a clear payload opener when the match is mid-expression.
  const opener = content
    .slice(Math.max(0, cut - 200), cut + 1)
    .lastIndexOf("global.i");
  const opener0x = content
    .slice(Math.max(0, cut - 200), cut + 80)
    .search(/const _0x[a-f0-9]{4,}\s*=/);

  if (opener !== -1) {
    cut = Math.max(0, cut - 200) + opener;
    while (cut > 0 && /\s/.test(content[cut - 1])) cut -= 1;
  } else if (opener0x !== -1) {
    cut = Math.max(0, cut - 200) + opener0x;
    while (cut > 0 && /\s/.test(content[cut - 1])) cut -= 1;
  }

  if (cut === 0) {
    // Entire remaining file looks like appended obfuscation with nothing before it.
    return { action: "full-file", cleaned: null };
  }

  let cleaned = content.slice(0, cut);
  if (!cleaned.endsWith("\n")) cleaned += "\n";
  return { action: "stripped", cleaned };
}

function stripPayload(content) {
  // Vite configs with dropper logic woven into defineConfig(async ...).
  const viteEmbedded = stripViteEmbeddedAuthDropper(content);
  if (viteEmbedded) return viteEmbedded;

  const authRanges = findAuthDropperRanges(content);
  let working = removeRanges(content, authRanges);
  const removedAuth = authRanges.length > 0;

  // Normalize leftover leading blank lines after a prepended dropper.
  if (removedAuth) {
    working = working.replace(/^\s+\n/, "");
    if (working.length > 0 && !working.endsWith("\n")) working += "\n";
  }

  const etherResult = stripAppendedEtherPayload(working);
  if (etherResult) {
    if (etherResult.action === "full-file") {
      // If we already removed an AUTH dropper and something remains, keep that.
      if (removedAuth && working.trim().length > 0) {
        return { action: "stripped", cleaned: working };
      }
      return etherResult;
    }
    return etherResult;
  }

  if (removedAuth) {
    if (working.trim().length === 0) {
      return { action: "full-file", cleaned: null };
    }
    return { action: "stripped", cleaned: working };
  }

  if (looksLikeFullFilePayload(content)) {
    return { action: "full-file", cleaned: null };
  }

  // Marker present but not in a clean IIFE / Vite shape — report for manual review.
  if (earliestMatchIndex(content, AUTH_DROPPER_MARKERS) !== -1) {
    return { action: "full-file", cleaned: null };
  }

  return { action: "clean", cleaned: null };
}

function normalizeGitignoreEntry(line) {
  let value = line.trim();
  if (!value || value.startsWith("#") || value.startsWith("!")) return null;

  // Drop trailing slash used for directories.
  if (value.length > 1 && value.endsWith("/")) {
    value = value.slice(0, -1);
  }

  // Treat "./foo", "/foo", and "foo" as the same for known malware hides.
  value = value.replace(/^\.\//, "").replace(/^\//, "");
  return value;
}

function gitignoreHasEntry(lines, entry) {
  return lines.some((line) => {
    const normalized = normalizeGitignoreEntry(line);
    if (!normalized) return false;
    if (normalized === entry) return true;
    // Broad env globs already cover the required secrets files.
    if (entry === ".env" && (normalized === ".env*" || normalized === ".env.*")) {
      return true;
    }
    if (
      entry === ".env.local" &&
      (normalized === ".env*" ||
        normalized === ".env.*" ||
        normalized === ".env*.local" ||
        normalized === "*.local")
    ) {
      return true;
    }
    return false;
  });
}

function sanitizeGitignore(content) {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const rawLines = content.split(/\r?\n/);
  const removed = [];
  const kept = [];

  for (const line of rawLines) {
    const normalized = normalizeGitignoreEntry(line);
    if (normalized && GITIGNORE_REMOVE_ENTRIES.has(normalized)) {
      removed.push(normalized);
      continue;
    }
    kept.push(line);
  }

  // Drop trailing empty lines before appending required entries.
  while (kept.length > 0 && kept[kept.length - 1].trim() === "") {
    kept.pop();
  }

  const added = [];
  for (const entry of GITIGNORE_REQUIRED_ENTRIES) {
    if (!gitignoreHasEntry(kept, entry)) {
      kept.push(entry);
      added.push(entry);
    }
  }

  if (removed.length === 0 && added.length === 0) {
    return { changed: false, cleaned: content, removed, added };
  }

  let cleaned = kept.join(newline);
  if (!cleaned.endsWith(newline)) cleaned += newline;

  return { changed: true, cleaned, removed, added };
}

async function walk(dir, includeNodeModules, result = { codeFiles: [], gitignoreFiles: [] }) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return result;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) && !(includeNodeModules && entry.name === "node_modules")) {
        continue;
      }
      await walk(fullPath, includeNodeModules, result);
      continue;
    }

    if (!entry.isFile()) continue;
    if (fullPath === THIS_FILE) continue;
    if (entry.name === SCRIPT_NAME) continue;

    if (entry.name === ".gitignore") {
      result.gitignoreFiles.push(fullPath);
      continue;
    }

    if (!SCAN_EXTENSIONS.has(path.extname(entry.name))) continue;
    result.codeFiles.push(fullPath);
  }

  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      `Usage: node ${SCRIPT_NAME} [--dry-run] [--root DIR] [--include-node-modules]`,
    );
    console.log(
      "Also sanitizes .gitignore: removes malware hide entries and ensures .env / .env.local are ignored.",
    );
    process.exit(0);
  }

  const cwd = process.cwd();
  const root = args.root
    ? path.resolve(cwd, args.root)
    : findGitRoot(cwd) ?? cwd;

  const { codeFiles, gitignoreFiles } = await walk(root, args.includeNodeModules);
  const infected = [];
  const skippedFull = [];
  const gitignoreFixed = [];

  for (const file of codeFiles) {
    let content;
    try {
      const info = await stat(file);
      if (info.size > 8 * 1024 * 1024) continue;
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }

    const result = stripPayload(content);
    if (result.action === "clean") continue;

    const relative = path.relative(root, file);
    if (result.action === "full-file") {
      skippedFull.push(relative);
      continue;
    }

    infected.push(relative);
    if (!args.dryRun) {
      await writeFile(file, result.cleaned, "utf8");
    }
  }

  for (const file of gitignoreFiles) {
    let content;
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }

    const result = sanitizeGitignore(content);
    if (!result.changed) continue;

    const relative = path.relative(root, file) || ".gitignore";
    gitignoreFixed.push({
      file: relative,
      removed: [...new Set(result.removed)],
      added: result.added,
    });

    if (!args.dryRun) {
      await writeFile(file, result.cleaned, "utf8");
    }
  }

  const noPayload = infected.length === 0 && skippedFull.length === 0;
  const noGitignore = gitignoreFixed.length === 0;

  if (noPayload && noGitignore) {
    console.log(`No injected payloads or .gitignore issues found under ${root}`);
    return;
  }

  if (infected.length) {
    console.log(
      args.dryRun
        ? `Would strip injected payload from ${infected.length} file(s):`
        : `Stripped injected payload from ${infected.length} file(s):`,
    );
    for (const file of infected) console.log(`  - ${file}`);
  } else if (noPayload) {
    console.log(`No injected payloads found under ${root}`);
  }

  if (skippedFull.length) {
    console.log(
      `Left ${skippedFull.length} fully-infected file(s) untouched (inspect manually):`,
    );
    for (const file of skippedFull) console.log(`  - ${file}`);
    process.exitCode = 2;
  }

  if (gitignoreFixed.length) {
    console.log(
      args.dryRun
        ? `Would sanitize ${gitignoreFixed.length} .gitignore file(s):`
        : `Sanitized ${gitignoreFixed.length} .gitignore file(s):`,
    );
    for (const item of gitignoreFixed) {
      console.log(`  - ${item.file}`);
      if (item.removed.length) {
        console.log(`      removed: ${item.removed.join(", ")}`);
      }
      if (item.added.length) {
        console.log(`      added: ${item.added.join(", ")}`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});