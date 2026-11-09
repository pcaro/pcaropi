/**
 * Handoff extension - transfer context to a new focused session
 *
 * Instead of compacting (which is lossy), handoff extracts what matters
 * for your next task and creates a new session with a generated prompt.
 *
 * Usage:
 *   /handoff now implement this for teams as well
 *   /handoff execute phase one of the plan
 *   /handoff check other places that need this fix
 *
 * The generated prompt appears as a draft in the editor for review/editing.
 *
 * Models: the current session model is used by default. To pin a primary
 * model plus fallbacks, add to settings.json:
 *
 *   "handoff": { "models": ["opencode-go/deepseek-v4.1-flash", "claude-bridge/claude-sonnet-5"] }
 *
 * Candidates are tried in order; unmatched or unauthenticated specs are
 * skipped, and the session model is always the last resort. The branch is
 * selected with pi's own token budget for the chosen model, and an oversized
 * draft gets one compression pass.
 */

import type { Api, AssistantMessage, Model } from "@earendil-works/pi-ai";
import { type Message, uuidv7 } from "@earendil-works/pi-ai";
import type {
	ExtensionAPI,
	ExtensionCommandContext,
	FileOperations,
	SessionEntry,
} from "@earendil-works/pi-coding-agent";
import {
	BorderedLoader,
	convertToLlm,
	prepareBranchEntries,
	serializeConversation,
} from "@earendil-works/pi-coding-agent";
import {
	candidateModels,
	describeError,
	modelLabel,
} from "./lib/model-fallback.ts";

const SYSTEM_PROMPT = `You are a context transfer assistant. Given a conversation history and the user's goal for a new thread, generate a focused prompt that:

1. Summarizes relevant context from the conversation (decisions made, approaches taken, key findings)
2. Lists any relevant files that were discussed or modified
3. Clearly states the next task based on the user's goal
4. Is self-contained - the new thread should be able to proceed without the old conversation
5. Stays under 6000 characters - omit anything that does not change what happens next

Format your response as a prompt the user can send to start the new thread. Be concise but include all necessary context. Do not include any preamble like "Here's the prompt" - just output the prompt itself. A "Files touched" section is provided when pi recorded file operations; use it for the file list.

Example output format:
## Context
We've been working on X. Key decisions:
- Decision 1
- Decision 2

Files involved:
- path/to/file1.ts
- path/to/file2.ts

## Task
[Clear description of what to do next based on user's goal]`;

const REPAIR_SYSTEM_PROMPT = `You compress draft prompts. Rewrite the given prompt so it fits the requested character limit, keeping every decision, file path, symbol, error message and next task. Drop redundancy and prose, never facts. Output only the rewritten prompt.`;

/** Space kept free for the system prompt and the response. */
const RESERVE_TOKENS = 16_384;

/** Drafts longer than this get one compression pass. */
const MAX_DRAFT_CHARS = 8_000;

type GenerationResult =
	| { status: "ok"; text: string; modelLabel: string; truncated: boolean }
	| { status: "cancelled" }
	| { status: "error"; message: string };

type Attempt =
	| { status: "ok"; text: string; stopReason: AssistantMessage["stopReason"] }
	| { status: "aborted" }
	| { status: "failed"; failure: string };

function fileSummary(fileOps: FileOperations): string {
	const modified = [...fileOps.edited, ...fileOps.written];
	return [
		modified.length > 0 ? `Modified: ${modified.join(", ")}` : "",
		fileOps.read.size > 0 ? `Read: ${[...fileOps.read].join(", ")}` : "",
	]
		.filter((line) => line.length > 0)
		.join("\n");
}

/**
 * Build the user message for one model. pi's own branch selection keeps the
 * newest entries that fit the model's context window, folds in compaction and
 * branch summaries, honours context edits and skips tool results - the same
 * budget logic /compact uses.
 */
function handoffText(
	branch: SessionEntry[],
	goal: string,
	model: Model<Api>,
): string {
	const budget = Math.max(0, model.contextWindow - RESERVE_TOKENS);
	const { messages, fileOps } = prepareBranchEntries(branch, budget);
	if (messages.length === 0) {
		throw new Error("no conversation content fits the context window");
	}

	const files = fileSummary(fileOps);
	return [
		"## Conversation History",
		serializeConversation(convertToLlm(messages)),
		...(files.length > 0 ? ["## Files touched", files] : []),
		"## User's Goal for New Thread",
		goal,
	].join("\n\n");
}

function repairText(draft: string): string {
	return `## Draft prompt\n\n${draft}\n\n## Requirement\n\nRewrite it to at most ${MAX_DRAFT_CHARS} characters.`;
}

/** One request to one model, normalised into a result the loop can act on. */
async function requestHandoff(
	ctx: ExtensionCommandContext,
	model: Model<Api>,
	systemPrompt: string,
	userText: string,
	signal: AbortSignal,
): Promise<Attempt> {
	const userMessage: Message = {
		role: "user",
		content: [{ type: "text", text: userText }],
		timestamp: Date.now(),
	};

	let response: AssistantMessage;
	try {
		response = await ctx.modelRegistry.complete(
			model,
			{ systemPrompt, messages: [userMessage] },
			{ signal, cacheRetention: "none", sessionId: uuidv7() },
		);
	} catch (err) {
		if (signal.aborted) {
			return { status: "aborted" };
		}
		return {
			status: "failed",
			failure: `${modelLabel(model)}: ${describeError(err)}`,
		};
	}

	if (signal.aborted || response.stopReason === "aborted") {
		return { status: "aborted" };
	}

	if (response.stopReason === "error") {
		return {
			status: "failed",
			failure: `${modelLabel(model)}: ${describeError(
				response.errorMessage ?? "request failed",
			)}`,
		};
	}

	const text = response.content
		.filter((c): c is { type: "text"; text: string } => c.type === "text")
		.map((c) => c.text)
		.join("\n")
		.trim();

	if (text.length === 0) {
		return { status: "failed", failure: `${modelLabel(model)}: empty response` };
	}

	return { status: "ok", text, stopReason: response.stopReason };
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("handoff", {
		description: "Transfer context to a new focused session",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("handoff requires interactive mode", "error");
				return;
			}

			const goal = args.trim();
			if (!goal) {
				ctx.ui.notify("Usage: /handoff <goal for new thread>", "error");
				return;
			}

			const models = candidateModels(pi, ctx, "handoff");
			if (models.length === 0) {
				ctx.ui.notify("No model selected", "error");
				return;
			}

			// pi's branch selection keeps the newest entries that fit the model's
			// context window, so the text is built per candidate and memoised by
			// window size. Build it once up front to fail fast on an unreadable branch.
			const branch = ctx.sessionManager.getBranch();
			if (branch.length === 0) {
				ctx.ui.notify("No conversation to hand off", "error");
				return;
			}

			const textByWindow = new Map<number, string>();
			const handoffTextFor = (model: Model<Api>): string => {
				const cached = textByWindow.get(model.contextWindow);
				if (cached !== undefined) {
					return cached;
				}
				const text = handoffText(branch, goal, model);
				textByWindow.set(model.contextWindow, text);
				return text;
			};

			try {
				handoffTextFor(models[0]);
			} catch (err) {
				ctx.ui.notify(
					`Handoff failed: could not read conversation (${describeError(err)})`,
					"error",
				);
				return;
			}

			const currentSessionFile = ctx.sessionManager.getSessionFile();

			// Generate the handoff prompt with loader UI
			const result = await ctx.ui.custom<GenerationResult>(
				(tui, theme, _kb, done) => {
					const loader = new BorderedLoader(
						tui,
						theme,
						`Generating handoff prompt...`,
					);
					loader.onAbort = () => done({ status: "cancelled" });

					const doGenerate = async (): Promise<GenerationResult> => {
						const failures: string[] = [];

						for (const model of models) {
							if (loader.signal.aborted) {
								return { status: "cancelled" };
							}

							let userText: string;
							try {
								userText = handoffTextFor(model);
							} catch (err) {
								failures.push(
									`${modelLabel(model)}: ${describeError(err)}`,
								);
								continue;
							}

							const drafted = await requestHandoff(
								ctx,
								model,
								SYSTEM_PROMPT,
								userText,
								loader.signal,
							);

							if (drafted.status === "aborted") {
								return { status: "cancelled" };
							}
							if (drafted.status === "failed") {
								failures.push(drafted.failure);
								continue;
							}

							let { text, stopReason } = drafted;

							// One compression pass when the draft is too long to read. A
							// failed repair is not fatal: the long draft is still usable.
							if (text.length > MAX_DRAFT_CHARS) {
								const repaired = await requestHandoff(
									ctx,
									model,
									REPAIR_SYSTEM_PROMPT,
									repairText(text),
									loader.signal,
								);
								if (repaired.status === "aborted") {
									return { status: "cancelled" };
								}
								if (
									repaired.status === "ok" &&
									repaired.text.length < text.length
								) {
									text = repaired.text;
									stopReason = repaired.stopReason;
								}
							}

							return {
								status: "ok",
								text,
								modelLabel: modelLabel(model),
								truncated: stopReason === "length",
							};
						}

						return {
							status: "error",
							message: failures.join(" | ") || "no usable model for handoff",
						};
					};

					doGenerate()
						.then(done)
						.catch((err) =>
							done({ status: "error", message: describeError(err) }),
						);

					return loader;
				},
			);

			if (result.status === "cancelled") {
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			if (result.status === "error") {
				ctx.ui.notify(`Handoff failed — ${result.message}`, "error");
				return;
			}

			if (result.truncated) {
				ctx.ui.notify(
					`Handoff draft ready (${result.modelLabel}) — model hit its output limit, check for truncation`,
					"warning",
				);
			} else {
				ctx.ui.notify(`Handoff draft ready (${result.modelLabel})`, "info");
			}

			// Let user edit the generated prompt
			const editedPrompt = await ctx.ui.editor(
				"Edit handoff prompt",
				result.text,
			);

			if (editedPrompt === undefined || editedPrompt.trim().length === 0) {
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			// Create new session with parent tracking. Use the replacement-session
			// context for post-switch UI work; the original ctx is stale after a
			// successful session replacement.
			const newSessionResult = await ctx.newSession({
				parentSession: currentSessionFile,
				withSession: async (replacementCtx) => {
					replacementCtx.ui.setEditorText(editedPrompt);
					replacementCtx.ui.notify("Handoff ready. Submit when ready.", "info");
				},
			});

			if (newSessionResult.cancelled) {
				ctx.ui.notify("New session cancelled", "info");
			}
		},
	});
}
