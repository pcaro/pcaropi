import { readFileSync } from "node:fs";

/**
 * Parse a pi session JSONL file into a Session record.
 *
 * Lines that are not valid JSON, or records without `usage`, are skipped
 * without throwing.
 *
 * @param {string} path - path to a session `.jsonl` file
 * @returns {{id:string,cwd:string,project:string,startedAt:string,model:string|null,turns:number,tokens:{input:number,output:number,cacheRead:number,cacheWrite:number,total:number},cost:number}}
 */
export function parseSessionFile(path) {
  const text = readFileSync(path, "utf8");

  const session = { id: "", cwd: "", startedAt: null, seen: false };
  let model = null;
  let turns = 0;
  const tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 };
  let cost = 0;

  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (!rec || typeof rec !== "object") continue;

    if (rec.type === "session") {
      const startedAt = rec.startedAt ?? rec.timestamp;
      // A `.jsonl` without a usable session record is not a session (likely
      // subagent transcripts). Only `cli` decides to skip those, so we throw.
      if (typeof startedAt === "string") {
        session.seen = true;
        session.id = String(rec.id ?? "");
        session.cwd = String(rec.cwd ?? "");
        session.startedAt = startedAt;
      }
    } else if (rec.type === "model_change") {
      if (rec.provider != null && rec.modelId != null) {
        model = `${rec.provider}/${rec.modelId}`;
      }
    } else if (rec.type === "message" && rec.message?.role === "assistant") {
      turns++;
      const usage = rec.message.usage;
      if (usage) {
        tokens.input += usage.input ?? 0;
        tokens.output += usage.output ?? 0;
        tokens.cacheRead += usage.cacheRead ?? 0;
        tokens.cacheWrite += usage.cacheWrite ?? 0;
        tokens.total += usage.totalTokens ?? 0;
        cost += usage.cost?.total ?? 0;
      }
    }
  }

  if (!session.seen) throw new Error(`no session record: ${path}`);

  const project = session.cwd
    ? session.cwd.split("/").filter(Boolean).pop() ?? session.cwd
    : "";

  return {
    id: session.id,
    cwd: session.cwd,
    project,
    startedAt: session.startedAt,
    model,
    turns,
    tokens,
    cost,
  };
}
