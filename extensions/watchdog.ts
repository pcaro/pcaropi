import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { type AssistantMessage, type Message, uuidv7 } from "@earendil-works/pi-ai";
import {
  candidateModels,
  describeError,
  modelLabel,
} from "./lib/model-fallback.ts";

interface JudgeResult {
  action: "continue" | "nudge" | "abort";
  message: string;
  compact: boolean;
}

/** A hung judge must never block a watchdog tick. */
const JUDGE_TIMEOUT_MS = 30_000;

function formatSessionSummary(ctx: ExtensionContext): string {
  const entries: any[] = ctx.sessionManager.getBranch();
  const recent = entries.slice(-20);

  const lines: string[] = [];
  let totalChars = 0;
  const CAP = 4000;

  // Context usage header
  const usage = ctx.getContextUsage();
  if (usage?.tokens != null) {
    lines.push(`[CONTEXT] ${usage.tokens} tokens used`);
  }

  for (const entry of recent) {
    if (totalChars >= CAP) break;
    if (entry.type !== "message" || !entry.message) continue;

    const msg = entry.message;
    const ts = entry.timestamp
      ? new Date(entry.timestamp).toISOString().substring(11, 19)
      : "";
    const prefix = ts ? `[${ts}] ` : "";

    let line = "";

    if (msg.role === "user") {
      const text =
        typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content.map((b: any) => b.text ?? "").join(" ")
            : "";
      line = `${prefix}[USER] ${text.substring(0, 200)}`;
    } else if (msg.role === "assistant") {
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (totalChars >= CAP) break;
          if (block.type === "text") {
            line = `${prefix}[ASSISTANT] ${block.text.substring(0, 200)}`;
          } else if (block.type === "toolCall") {
            const args = JSON.stringify(block.arguments ?? {});
            line = `${prefix}[TOOL_CALL] ${block.name}(${args.substring(0, 100)})`;
          }
          if (line) {
            lines.push(line);
            totalChars += line.length;
            line = "";
          }
        }
        continue;
      }
    } else if (msg.role === "toolResult") {
      const content = Array.isArray(msg.content)
        ? msg.content.map((b: any) => b.text ?? "").join(" ")
        : String(msg.content ?? "");
      const status = msg.isError ? "error" : "success";
      line = `${prefix}[TOOL_RESULT] ${msg.toolName ?? ""}: ${status} - ${content.substring(0, 200)}`;
    } else {
      continue;
    }

    if (line) {
      lines.push(line);
      totalChars += line.length;
    }
  }

  return lines.join("\n");
}

const JUDGE_SYSTEM_PROMPT = `You are monitoring an AI coding agent session. Analyze the recent activity and determine if the agent needs intervention.

## Analysis Instructions
Determine one of:
- **continue**: Agent is making progress (just slow) — no intervention needed
- **nudge**: Agent appears stuck — suggest what it should try differently in your message
- **abort**: Agent is looping (same errors/approaches repeated) — situation is unrecoverable without user input

Also consider:
- If context token count is high (>150k), set compact: true to recommend compaction
- If the agent is looping on the same errors or approaches, recommend abort
- Your message should be actionable: what specifically should the agent try?

Respond ONLY with valid JSON, no other text, no markdown fences:
{ "action": "continue" | "nudge" | "abort", "message": "explanation", "compact": true | false }`;

function judgeUserText(
  summary: string,
  idleSecs: number,
  consecutiveInterventions: number
): string {
  return `## Recent Session Activity\n${summary}\n\n## Situation\n- The agent has not produced any new activity for ${idleSecs} seconds\n- There have been ${consecutiveInterventions} previous watchdog interventions in this session`;
}

function parseJudge(text: string): JudgeResult | null {
  // Extract JSON — handle optional markdown code fences
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let parsed: { action?: unknown; message?: unknown; compact?: unknown };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }

  if (
    parsed.action !== "continue" &&
    parsed.action !== "nudge" &&
    parsed.action !== "abort"
  ) {
    return null;
  }

  return {
    action: parsed.action,
    message: String(parsed.message ?? ""),
    compact: Boolean(parsed.compact),
  };
}

type JudgeAttempt =
  | { status: "ok"; result: JudgeResult }
  | { status: "failed"; failure: string };

/**
 * One request to the judge model, normalised into a result the tick can act on.
 * Candidates come from `watchdog.models`, then the session model, then the
 * first other authenticated model — a judge that cannot answer is a judge that
 * cannot intervene. Requests go through the registry so provider routing and
 * request-time authentication apply, and each uses a throwaway session id so
 * judging never shares cache state with the conversation it is judging.
 */
async function callJudge(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  summary: string,
  timeSinceActivityMs: number,
  consecutiveInterventions: number
): Promise<JudgeAttempt> {
  const models = candidateModels(pi, ctx, "watchdog", {
    includeAnyAvailable: true,
  });
  if (models.length === 0) {
    return { status: "failed", failure: "no model available" };
  }

  const userMessage: Message = {
    role: "user",
    content: [
      {
        type: "text",
        text: judgeUserText(
          summary,
          Math.round(timeSinceActivityMs / 1000),
          consecutiveInterventions
        ),
      },
    ],
    timestamp: Date.now(),
  };

  const failures: string[] = [];

  for (const model of models) {
    const label = modelLabel(model);

    let response: AssistantMessage;
    try {
      response = await ctx.modelRegistry.complete(
        model,
        { systemPrompt: JUDGE_SYSTEM_PROMPT, messages: [userMessage] },
        {
          signal: AbortSignal.timeout(JUDGE_TIMEOUT_MS),
          cacheRetention: "none",
          sessionId: uuidv7(),
        }
      );
    } catch (err) {
      failures.push(`${label}: ${describeError(err)}`);
      continue;
    }

    if (response.stopReason === "aborted") {
      failures.push(`${label}: request timed out`);
      continue;
    }

    if (response.stopReason === "error") {
      failures.push(
        `${label}: ${describeError(response.errorMessage ?? "request failed")}`
      );
      continue;
    }

    const text = response.content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    const result = parseJudge(text);
    if (!result) {
      failures.push(`${label}: unparsable verdict`);
      continue;
    }

    return { status: "ok", result };
  }

  return { status: "failed", failure: failures.join(" | ") };
}

export default function (pi: ExtensionAPI) {
  // State
  let lastActivityTimestamp: number = Date.now();
  let consecutiveInterventions: number = 0;
  let enabled: boolean = false;
  let checkIntervalMs: number = 5 * 60 * 1000; // 5 minutes
  let stuckThresholdMs: number = 5 * 60 * 1000; // same as check interval
  const maxInterventions: number = 3;

  let checkInterval: ReturnType<typeof setInterval> | null = null;
  let sessionCtx: ExtensionContext | null = null;
  let judgeInProgress: boolean = false;
  let judgeFailureReported: boolean = false;

  /**
   * A judge that cannot run is a silent no-op, so report it once per enable
   * instead of every tick.
   */
  function reportJudgeFailure(failure: string) {
    if (judgeFailureReported) return;
    judgeFailureReported = true;
    sessionCtx?.ui.notify(`Watchdog judge unavailable — ${failure}`, "warning");
  }

  function updateActivity() {
    lastActivityTimestamp = Date.now();
    consecutiveInterventions = 0;
  }

  function getIntervalMinutes(): number {
    return Math.round(checkIntervalMs / 60_000);
  }

  function updateStatusBar() {
    if (!sessionCtx) return;
    if (enabled) {
      sessionCtx.ui.setStatus("watchdog", `🐵 ${getIntervalMinutes()}m`);
    } else {
      sessionCtx.ui.setStatus("watchdog", "🙈");
    }
  }

  function startTimer(ctx: ExtensionContext) {
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(async () => {
      if (!enabled || !ctx) return;

      // CRITICAL: Idle agent is never stuck — skip entirely
      if (ctx.isIdle()) return;

      const timeSinceActivity = Date.now() - lastActivityTimestamp;

      // Recent activity — no problem
      if (timeSinceActivity < stuckThresholdMs) return;

      // Guard against re-entrant judge calls
      if (judgeInProgress) return;

      judgeInProgress = true;
      try {
        // Consecutive limit check — give up before even calling judge
        if (consecutiveInterventions >= maxInterventions) {
          await ctx.abort();
          pi.sendUserMessage(
            "[Watchdog] Giving up after " + maxInterventions + " intervention attempts. The current operation was cancelled. Please review and decide how to proceed.",
            { deliverAs: "followUp" }
          );
          enabled = false;
          updateStatusBar();
          return;
        }

        const summary = formatSessionSummary(ctx);
        const judged = await callJudge(
          pi,
          ctx,
          summary,
          timeSinceActivity,
          consecutiveInterventions
        );

        if (judged.status === "failed") {
          // Leave the activity timestamp alone so the next tick retries, but
          // surface the reason once — a dead judge must not look like progress.
          reportJudgeFailure(judged.failure);
          return;
        }

        const judgment = judged.result;

        if (judgment.action === "continue") {
          // No intervention needed — reset timestamp so we don't immediately re-trigger
          lastActivityTimestamp = Date.now();
        } else if (judgment.action === "nudge") {
          await ctx.abort();
          pi.sendUserMessage(
            "[Watchdog] " + judgment.message + " The blocked operation was cancelled. Try a different approach.",
            { deliverAs: "followUp" }
          );
          consecutiveInterventions++;
          lastActivityTimestamp = Date.now();
          if (judgment.compact) {
            ctx.compact();
          }
        } else if (judgment.action === "abort") {
          await ctx.abort();
          pi.sendUserMessage(
            "[Watchdog] " + judgment.message + " Session stopped to avoid wasting resources.",
            { deliverAs: "followUp" }
          );
          enabled = false;
          updateStatusBar();
          if (judgment.compact) {
            ctx.compact();
          }
        }
      } catch (err) {
        // The watchdog must never crash the session, but a swallowed throw here
        // would look exactly like a healthy agent — surface it instead.
        reportJudgeFailure(describeError(err));
      } finally {
        judgeInProgress = false;
      }
    }, checkIntervalMs);
  }

  // Activity tracking events
  pi.on("turn_end", async (_event, _ctx) => {
    updateActivity();
  });

  pi.on("tool_execution_end", async (_event, _ctx) => {
    updateActivity();
  });

  pi.on("tool_execution_update", async (_event, _ctx) => {
    updateActivity();
  });

  pi.on("message_end", async (_event, _ctx) => {
    updateActivity();
  });

  pi.on("agent_end", async (_event, _ctx) => {
    // Agent finished normally — reset activity so watchdog knows it's safe
    updateActivity();
  });

  pi.on("session_start", async (_event, ctx) => {
    sessionCtx = ctx;
    lastActivityTimestamp = Date.now();
    consecutiveInterventions = 0;
    judgeFailureReported = false;
    updateStatusBar();
    if (enabled) startTimer(ctx);
  });

  pi.on("session_shutdown", async () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    sessionCtx = null;
  });

  pi.registerCommand("watchdog", {
    description:
      "Toggle watchdog or set interval in minutes (e.g., /watchdog off, /watchdog on, /watchdog 3)",
    handler: async (args, ctx) => {
      sessionCtx = ctx;
      const arg = (args ?? "").trim().toLowerCase();

      if (arg === "off") {
        enabled = false;
        updateStatusBar();
        ctx.ui.notify("Watchdog disabled (🙈)", "info");
        return;
      }

      if (arg === "on") {
        enabled = true;
        consecutiveInterventions = 0;
        judgeFailureReported = false;
        lastActivityTimestamp = Date.now();
        updateStatusBar();
        startTimer(ctx);
        ctx.ui.notify(`Watchdog enabled (🐵 ${getIntervalMinutes()}m)`, "info");
        return;
      }

      if (arg === "") {
        enabled = !enabled;
        if (enabled) {
          consecutiveInterventions = 0;
          judgeFailureReported = false;
          lastActivityTimestamp = Date.now();
          startTimer(ctx);
        }
        updateStatusBar();
        ctx.ui.notify(
          enabled
            ? `Watchdog enabled (🐵 ${getIntervalMinutes()}m)`
            : "Watchdog disabled (🙈)",
          "info"
        );
        return;
      }

      const minutes = parseInt(arg, 10);
      if (!isNaN(minutes) && minutes > 0) {
        checkIntervalMs = minutes * 60_000;
        stuckThresholdMs = checkIntervalMs;
        enabled = true;
        judgeFailureReported = false;
        updateStatusBar();
        // Restart timer with new interval
        startTimer(ctx);
        ctx.ui.notify(`Watchdog set to ${minutes}m interval (🐵 ${minutes}m)`, "info");
        return;
      }

      ctx.ui.notify(
        `Unknown argument: "${arg}". Usage: /watchdog [off|on|<minutes>]`,
        "error"
      );
    },
  });
}
