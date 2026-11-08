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
 * skipped, and the session model is always the last resort. The conversation
 * is capped so a long session still fits the summarising model.
 */

import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { Api, Model } from "@earendil-works/pi-ai";
import { type Message, uuidv7 } from "@earendil-works/pi-ai";
import type {
	ExtensionAPI,
	ExtensionCommandContext,
	SessionEntry,
} from "@earendil-works/pi-coding-agent";
import {
	BorderedLoader,
	convertToLlm,
	serializeConversation,
} from "@earendil-works/pi-coding-agent";

const SYSTEM_PROMPT = `You are a context transfer assistant. Given a conversation history and the user's goal for a new thread, generate a focused prompt that:

1. Summarizes relevant context from the conversation (decisions made, approaches taken, key findings)
2. Lists any relevant files that were discussed or modified
3. Clearly states the next task based on the user's goal
4. Is self-contained - the new thread should be able to proceed without the old conversation

Format your response as a prompt the user can send to start the new thread. Be concise but include all necessary context. Do not include any preamble like "Here's the prompt" - just output the prompt itself.

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

/** Keep handoff requests within a sane budget; the recent tail matters most. */
const MAX_CONVERSATION_CHARS = 120_000;

/** Cap error text so a single failure cannot swallow the notification line. */
const MAX_ERROR_CHARS = 120;

type GenerationResult =
	| { status: "ok"; text: string; modelLabel: string; truncated: boolean }
	| { status: "cancelled" }
	| { status: "error"; message: string };

function trimConversation(text: string): string {
	if (text.length <= MAX_CONVERSATION_CHARS) {
		return text;
	}
	const omitted = text.length - MAX_CONVERSATION_CHARS;
	return `[earlier conversation truncated: ${omitted} characters omitted]\n\n${text.slice(-MAX_CONVERSATION_CHARS)}`;
}

function entryToMessage(entry: SessionEntry): AgentMessage | undefined {
	if (entry.type === "message") {
		return entry.message;
	}
	if (entry.type === "compaction") {
		return {
			role: "compactionSummary",
			summary: entry.summary,
			tokensBefore: entry.tokensBefore,
			timestamp: new Date(entry.timestamp).getTime(),
		};
	}
	return undefined;
}

function getHandoffMessages(branch: SessionEntry[]): AgentMessage[] {
	let compactionIndex = -1;
	for (let i = branch.length - 1; i >= 0; i--) {
		if (branch[i].type === "compaction") {
			compactionIndex = i;
			break;
		}
	}
	if (compactionIndex < 0) {
		return branch
			.map(entryToMessage)
			.filter((message) => message !== undefined);
	}

	const compaction = branch[compactionIndex];
	const firstKeptIndex =
		compaction.type === "compaction"
			? branch.findIndex((entry) => entry.id === compaction.firstKeptEntryId)
			: -1;
	const compactedBranch = [
		compaction,
		...(firstKeptIndex >= 0
			? branch.slice(firstKeptIndex, compactionIndex)
			: []),
		...branch.slice(compactionIndex + 1),
	];
	return compactedBranch
		.map(entryToMessage)
		.filter((message) => message !== undefined);
}

function modelLabel(model: Model<Api>): string {
	return `${model.provider}/${model.id}`;
}

/** One-line, stack-free, length-capped description of an error for UI display. */
function describeError(err: unknown): string {
	const raw = err instanceof Error ? err.message : String(err);
	const firstLine = raw.split("\n")[0].trim();
	if (firstLine.length === 0) {
		return "request failed";
	}
	return firstLine.length > MAX_ERROR_CHARS
		? `${firstLine.slice(0, MAX_ERROR_CHARS)}…`
		: firstLine;
}

/** Ordered, de-duplicated model spec list from settings: `handoff.models`. */
function configuredModelSpecs(pi: ExtensionAPI): string[] {
	const settings = pi.getSettings() as Record<string, unknown>;
	const handoff = settings.handoff as { models?: unknown } | undefined;
	const specs = handoff?.models;
	if (!Array.isArray(specs)) {
		return [];
	}
	return specs
		.filter((spec): spec is string => typeof spec === "string")
		.map((spec) => spec.trim())
		.filter((spec) => spec.length > 0);
}

/**
 * Resolve `provider/id`, or a bare id, to a model with credentials configured.
 * `getAvailable()` is auth-filtered; `find()` is not, so it is only trusted when
 * the provider itself is authenticated.
 */
function resolveModel(
	ctx: ExtensionCommandContext,
	spec: string,
): Model<Api> | undefined {
	const registry = ctx.modelRegistry;
	const available = registry.getAvailable();

	const slash = spec.indexOf("/");
	if (slash > 0) {
		const provider = spec.slice(0, slash);
		const id = spec.slice(slash + 1);
		const known = registry.find(provider, id);
		return (
			available.find((m) => m.provider === provider && m.id === id) ??
			(known && registry.hasConfiguredAuth(known) ? known : undefined)
		);
	}

	return (
		available.find((m) => `${m.provider}/${m.id}` === spec) ??
		available.find((m) => m.id === spec)
	);
}

/** Candidate models: configured specs first, session model last. */
function candidateModels(
	pi: ExtensionAPI,
	ctx: ExtensionCommandContext,
): Model<Api>[] {
	const models: Model<Api>[] = [];
	const push = (model: Model<Api> | undefined) => {
		if (!model) {
			return;
		}
		if (
			!models.some((m) => m.provider === model.provider && m.id === model.id)
		) {
			models.push(model);
		}
	};

	for (const spec of configuredModelSpecs(pi)) {
		push(resolveModel(ctx, spec));
	}
	push(ctx.model);

	return models;
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

			const models = candidateModels(pi, ctx);
			if (models.length === 0) {
				ctx.ui.notify("No model selected", "error");
				return;
			}

			// Gather conversation context from current branch. If the branch was compacted,
			// include the compaction summary plus entries from firstKeptEntryId onward.
			const messages = getHandoffMessages(ctx.sessionManager.getBranch());

			if (messages.length === 0) {
				ctx.ui.notify("No conversation to hand off", "error");
				return;
			}

			// Convert to LLM format and serialize
			let conversationText: string;
			try {
				const llmMessages = convertToLlm(messages);
				conversationText = trimConversation(
					serializeConversation(llmMessages),
				);
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

					const userMessage: Message = {
						role: "user",
						content: [
							{
								type: "text",
								text: `## Conversation History\n\n${conversationText}\n\n## User's Goal for New Thread\n\n${goal}`,
							},
						],
						timestamp: Date.now(),
					};

					const doGenerate = async (): Promise<GenerationResult> => {
						const failures: string[] = [];

						for (const model of models) {
							if (loader.signal.aborted) {
								return { status: "cancelled" };
							}

							let response;
							try {
								response = await ctx.modelRegistry.complete(
									model,
									{ systemPrompt: SYSTEM_PROMPT, messages: [userMessage] },
									{
										signal: loader.signal,
										cacheRetention: "none",
										sessionId: uuidv7(),
									},
								);
							} catch (err) {
								if (loader.signal.aborted) {
									return { status: "cancelled" };
								}
								failures.push(
									`${modelLabel(model)}: ${describeError(err)}`,
								);
								continue;
							}

							if (loader.signal.aborted || response.stopReason === "aborted") {
								return { status: "cancelled" };
							}

							if (response.stopReason === "error") {
								failures.push(
									`${modelLabel(model)}: ${describeError(
										response.errorMessage ?? "request failed",
									)}`,
								);
								continue;
							}

							const text = response.content
								.filter(
									(c): c is { type: "text"; text: string } =>
										c.type === "text",
								)
								.map((c) => c.text)
								.join("\n")
								.trim();

							if (!text) {
								failures.push(`${modelLabel(model)}: empty response`);
								continue;
							}

							return {
								status: "ok",
								text,
								modelLabel: modelLabel(model),
								truncated: response.stopReason === "length",
							};
						}

						return {
							status: "error",
							message:
								failures.join(" | ") || "no usable model for handoff",
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
