// main(argv): walk the sessions tree, parse, aggregate, render.
// Contract: see plans/2026-10-29-pi-usage.md "main".

import { readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { parseSessionFile } from "./parse.js";
import { aggregate } from "./aggregate.js";
import { renderSummary } from "./render.js";

function expandTilde(p) {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

/**
 * Recursively collect `*.jsonl` file paths under root.
 * @param {string} root
 * @returns {string[]}
 */
function findSessionFiles(root) {
  const entries = readdirSync(root, { recursive: true });
  return entries
    .map((e) => join(root, String(e)))
    .filter((p) => p.endsWith(".jsonl"));
}

/**
 * Parse args: positional root plus `--json` and `--top N` flags.
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const opts = { root: null, json: false, top: undefined };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") {
      opts.json = true;
    } else if (arg === "--top") {
      const next = argv[i + 1];
      if (next === undefined || !/^\d+$/.test(next)) {
        throw new Error(`--top expects a number, got: ${next ?? "nothing"}`);
      }
      opts.top = Number(next);
      i++;
    } else if (opts.root === null) {
      opts.root = arg;
    } else {
      throw new Error(`unexpected argument: ${arg}`);
    }
  }
  return opts;
}

/**
 * Walk the sessions tree and print cost/token usage per project, model and day.
 *
 * @param {string[]} argv - CLI args: `[root] [--json] [--top N]`
 * @returns {Promise<number>} process exit code
 */
export async function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`pi-usage: ${err.message}\n`);
    return 1;
  }

  const root = expandTilde(opts.root ?? "~/.pi/agent/sessions");
  let rootStat;
  try {
    rootStat = statSync(root);
  } catch {
    process.stderr.write(`pi-usage: sessions root not found: ${root}\n`);
    return 1;
  }
  if (!rootStat.isDirectory()) {
    process.stderr.write(`pi-usage: not a directory: ${root}\n`);
    return 1;
  }

  const sessions = [];
  let failed = 0;
  for (const file of findSessionFiles(root)) {
    try {
      sessions.push(parseSessionFile(file));
    } catch {
      failed++;
    }
  }
  if (failed > 0) {
    process.stderr.write(`pi-usage: skipped ${failed} unreadable file(s)\n`);
  }

  const summary = aggregate(sessions);
  if (opts.json) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stdout.write(renderSummary(summary, { top: opts.top }) + "\n");
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
