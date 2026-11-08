import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	type BranchSummaryResult,
	generateBranchSummary,
	getMarkdownTheme,
} from "@earendil-works/pi-coding-agent";
import { Box, Markdown, Text } from "@earendil-works/pi-tui";
import {
	candidateModels,
	describeError,
	modelLabel,
} from "./lib/model-fallback.ts";

type BranchInfo = {
	count: number;
	totalChars: number;
	estimatedTokens: number;
	contextPercent: number | null;
	summaries: { index: number; chars: number; tokens: number; preview: string }[];
};

function getBranchInfo(ctx: ExtensionContext): BranchInfo {
	const leafId = ctx.sessionManager.getLeafId();
	if (!leafId) return { count: 0, totalChars: 0, estimatedTokens: 0, contextPercent: null, summaries: [] };

	const path = ctx.sessionManager.getBranch(leafId);
	const summaries: BranchInfo["summaries"] = [];
	let totalChars = 0;
	let branchIndex = 0;

	for (const entry of path) {
		if (entry.type === "branch_summary") {
			branchIndex++;
			const chars = entry.summary.length;
			const tokens = Math.ceil(chars / 4);
			totalChars += chars;
			const preview = entry.summary.slice(0, 120).replace(/\n/g, " ").trim();
			summaries.push({ index: branchIndex, chars, tokens, preview: preview + (chars > 120 ? "…" : "") });
		}
	}

	const estimatedTokens = Math.ceil(totalChars / 4);

	// Get context usage for percentage calculation
	let contextPercent: number | null = null;
	const usage = ctx.getContextUsage();
	if (usage && usage.contextWindow > 0) {
		contextPercent = (estimatedTokens / usage.contextWindow) * 100;
	}

	return { count: summaries.length, totalChars, estimatedTokens, contextPercent, summaries };
}

/**
 * `generateBranchSummary` frames its output as an abandoned branch. A compressed
 * session is not a branch, so the framing is dropped before injection.
 */
const BRANCH_SUMMARY_PREAMBLE = `The user explored a different conversation branch before returning here.
Summary of that exploration:

`;

function formatTokens(tokens: number): string {
	if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
	return `${tokens}`;
}

function updateBranchStatus(ctx: ExtensionContext) {
	if (!ctx.hasUI) return;

	const info = getBranchInfo(ctx);

	if (info.count === 0) {
		ctx.ui.setStatus("branch-chain", undefined);
		return;
	}

	const tokenStr = formatTokens(info.estimatedTokens);
	const pctStr = info.contextPercent !== null ? ` (${info.contextPercent.toFixed(1)}%)` : "";
	const label = info.count === 1
		? `🌿 1 branch · ~${tokenStr} tokens${pctStr}`
		: `🌿 ${info.count} branches · ~${tokenStr} tokens${pctStr}`;

	ctx.ui.setStatus("branch-chain", ctx.ui.theme.fg("muted", label));
}

export default function (pi: ExtensionAPI) {
	// --- Status tracking ---

	pi.on("session_start", (_event, ctx) => {
		updateBranchStatus(ctx);
	});

	pi.on("session_tree", (_event, ctx) => {
		updateBranchStatus(ctx);
	});

	pi.on("agent_end", (_event, ctx) => {
		// Re-check after each agent turn since context usage may have changed
		updateBranchStatus(ctx);
	});

	// --- Custom renderer for compressed branch summaries ---

	pi.registerMessageRenderer("branch-compressed", (message, { expanded }, theme) => {
		const details = message.details as { count: number; tokens: number; percent: number | null } | undefined;
		const count = details?.count ?? "?";
		const tokenStr = details?.tokens ? formatTokens(details.tokens) : "?";
		const pctStr = details?.percent !== null && details?.percent !== undefined ? ` · ${details.percent.toFixed(1)}% context` : "";

		const box = new Box(1, 1, (t: string) => theme.bg("customMessageBg", t));

		const label = theme.fg("customMessageLabel", `\x1b[1m[${count}x branches · ~${tokenStr} tokens${pctStr}]\x1b[22m`);
		box.addChild(new Text(label, 0, 0));

		if (expanded) {
			const content = typeof message.content === "string" ? message.content : "";
			const mdTheme = getMarkdownTheme();
			box.addChild(new Markdown("\n" + content, 0, 0, mdTheme, {
				color: (text: string) => theme.fg("customMessageText", text),
			}));
		} else {
			box.addChild(new Text(theme.fg("dim", "  expand to see full summary"), 0, 0));
		}

		return box;
	});

	// --- /branch command ---

	pi.registerCommand("branch", {
		description: "Summarize the current conversation and start a fresh branch",
		handler: async (_args, ctx) => {
			await ctx.waitForIdle();

			const leafId = ctx.sessionManager.getLeafId();
			if (!leafId) {
				ctx.ui.notify("No conversation to branch from", "warning");
				return;
			}

			const path = ctx.sessionManager.getBranch(leafId);
			if (path.length === 0) {
				ctx.ui.notify("No conversation to branch from", "warning");
				return;
			}

			// Find the last branch_summary in the current path, or fall back to root
			let branchFromId: string | null = null;
			for (let i = path.length - 1; i >= 0; i--) {
				if (path[i].type === "branch_summary") {
					branchFromId = path[i].id;
					break;
				}
			}
			if (branchFromId === null) {
				branchFromId = path[0].id;
			}

			if (leafId === branchFromId) {
				ctx.ui.notify("Already at a branch point — nothing to branch from", "info");
				return;
			}

			ctx.ui.notify("Summarizing and branching...", "info");

			const result = await ctx.navigateTree(branchFromId, {
				summarize: true,
			});

			if (result.cancelled) {
				ctx.ui.notify("Branch cancelled", "info");
			} else {
				updateBranchStatus(ctx);
			}
		},
	});

	// --- /compress command ---

	pi.registerCommand("compress", {
		description: "Summarize the entire session and start a new session with the summary (original session is preserved)",
		handler: async (_args, ctx) => {
			await ctx.waitForIdle();

			const leafId = ctx.sessionManager.getLeafId();
			if (!leafId) {
				ctx.ui.notify("No conversation to compress", "warning");
				return;
			}

			const path = ctx.sessionManager.getBranch(leafId);
			if (path.length < 2) {
				ctx.ui.notify("Not enough conversation to compress", "info");
				return;
			}

			const models = candidateModels(pi, ctx, "branch", {
				includeAnyAvailable: true,
			});
			if (models.length === 0) {
				ctx.ui.notify("No model available to summarize", "warning");
				return;
			}

			const usage = ctx.getContextUsage();
			const sizeLabel = usage?.tokens != null
				? `~${formatTokens(usage.tokens)} tokens of conversation`
				: "the current conversation";

			const ok = await ctx.ui.confirm(
				"Compress to new session",
				`Summarize ${sizeLabel} and start a fresh session?\nThe original session will be preserved.`,
			);
			if (!ok) return;

			ctx.ui.notify("Generating summary...", "info");

			// Try each candidate in order: a summary from a fallback model beats no
			// summary at all, and the notification names whichever one ran.
			const failures: string[] = [];
			let summary: string | null = null;
			let usedModel: string | null = null;

			for (const model of models) {
				if (ctx.signal?.aborted) {
					ctx.ui.notify("Compress cancelled", "info");
					return;
				}

				let result: BranchSummaryResult;
				try {
					result = await generateBranchSummary(path, {
						model,
						signal: ctx.signal ?? new AbortController().signal,
						// Route through the configured provider so custom providers and resolved auth are used.
						streamFn: (streamModel, context, options) => ctx.modelRegistry.streamSimple(streamModel, context, options),
						...(ctx.thinkingLevel ? { thinkingLevel: ctx.thinkingLevel } : {}),
					});
				} catch (err) {
					failures.push(`${modelLabel(model)}: ${describeError(err)}`);
					continue;
				}

				if (result.aborted) {
					ctx.ui.notify("Compress cancelled", "info");
					return;
				}
				if (result.error || !result.summary) {
					failures.push(`${modelLabel(model)}: ${describeError(result.error ?? "empty summary")}`);
					continue;
				}

				summary = result.summary;
				usedModel = modelLabel(model);
				break;
			}

			if (summary === null) {
				ctx.ui.notify(
					`Compress failed — ${failures.join(" | ") || "no usable model"}`,
					"error",
				);
				return;
			}

			const summaryText = summary.replace(BRANCH_SUMMARY_PREAMBLE, "");
			const info = getBranchInfo(ctx);
			const parentSession = ctx.sessionManager.getSessionFile();

			// Create a new session with the summary injected as the initial context
			const newSessionResult = await ctx.newSession({
				parentSession,
				setup: async (sessionManager) => {
					sessionManager.appendCustomMessageEntry(
						"branch-compressed",
						summaryText,
						true,
						{
							count: info.count || 1,
							tokens: Math.ceil(summaryText.length / 4),
							percent: null,
						},
					);
				},
				// The original ctx is stale after a successful session replacement.
				withSession: async (replacementCtx) => {
					updateBranchStatus(replacementCtx);
					replacementCtx.ui.notify(
						`Started fresh session with conversation summary (${usedModel})`,
						"info",
					);
				},
			});

			if (newSessionResult.cancelled) {
				ctx.ui.notify("Compress cancelled", "info");
			}
		},
	});

	// --- /branches command (inspect) ---

	pi.registerCommand("branches", {
		description: "Show branch summary chain details",
		handler: async (_args, ctx) => {
			const info = getBranchInfo(ctx);

			if (info.count === 0) {
				ctx.ui.notify("No branch summaries in current path", "info");
				return;
			}

			const lines: string[] = [];
			for (const s of info.summaries) {
				const tokenStr = formatTokens(s.tokens);
				lines.push(`  ${s.index}. ~${tokenStr} tokens — ${s.preview}`);
			}

			const totalStr = formatTokens(info.estimatedTokens);
			const pctStr = info.contextPercent !== null ? ` (${info.contextPercent.toFixed(1)}% context)` : "";
			const header = `🌿 ${info.count} branch${info.count === 1 ? "" : "es"} · ~${totalStr} tokens${pctStr}`;

			ctx.ui.notify(header + "\n" + lines.join("\n"), "info");
		},
	});
}
