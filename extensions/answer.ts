/**
 * Q&A extraction fallback — extracts questions from assistant responses
 * and presents them via native UI dialogs when the model forgot to use ask_user.
 *
 * Models: the current session model is used by default. To pin a primary
 * model plus fallbacks, add to settings.json:
 *
 *   "answer": { "models": ["opencode-go-console/deepseek-v4.1-flash", "openrouter/google/gemini-3.1-pro-preview"] }
 *
 * Candidates are tried in order; unmatched or unauthenticated specs are
 * skipped, and the session model is always the last resort. The assistant
 * messages are selected within pi's own token budget for the chosen model.
 */

import type { Api, AssistantMessage, Message, Model } from "@mariozechner/pi-ai";
import { uuidv7 } from "@mariozechner/pi-ai";
import type {
	BranchPreparation,
	ExtensionAPI,
	ExtensionCommandContext,
	ExtensionContext,
	SessionEntry,
} from "@mariozechner/pi-coding-agent";
import {
	BorderedLoader,
	prepareBranchEntries,
} from "@mariozechner/pi-coding-agent";
import {
	candidateModels,
	describeError,
	modelLabel,
} from "./lib/model-fallback.ts";

interface ExtractedQuestion {
	question: string;
	context?: string;
	options?: string[];
	multiSelect?: boolean;
}

interface ExtractionResult {
	questions: ExtractedQuestion[];
}

const SYSTEM_PROMPT = `You are a question extractor. Given one or more assistant messages from a conversation, extract any questions that genuinely require user input.

The input may contain multiple messages separated by "--- Message N ---". Preserve chronological order (Message 1 first, then Message 2, etc.).

Output a JSON object with this structure:
{
  "questions": [
    {
      "question": "The question text",
      "context": "Optional context that helps answer the question",
      "options": ["Option 1", "Option 2"],
      "multiSelect": true
    }
  ]
}

Rules:
- Extract only questions that require an explicit answer or decision from the user
- Skip rhetorical questions, hypothetical examples, and questions the assistant answers itself
- Keep questions in chronological order as they appeared across messages
- Be concise with question text
- Include context only when it provides essential information for answering
- If the question provides multiple choices, extract them into the "options" array
- Use "multiSelect": true when the user can/should select multiple options
- If no questions are found, return {"questions": []}
- Output the JSON object only, no prose and no markdown fences

Example output:
{
  "questions": [
    {
      "question": "What is your preferred database?",
      "context": "We can only configure MySQL and PostgreSQL.",
      "options": ["MySQL", "PostgreSQL"]
    },
    {
      "question": "Which languages do you speak?",
      "options": ["Spanish", "English", "French", "German"],
      "multiSelect": true
    },
    {
      "question": "What is your name?"
    }
  ]
}`;

/** Space kept free for the system prompt and the response. */
const RESERVE_TOKENS = 16_384;

type ExtractionAttempt =
	| { status: "ok"; result: ExtractionResult; truncated: boolean }
	| { status: "aborted" }
	| { status: "failed"; failure: string };

type ExtractionOutcome =
	| {
			status: "ok";
			questions: ExtractedQuestion[];
			modelLabel: string;
			truncated: boolean;
	  }
	| { status: "cancelled" }
	| { status: "error"; message: string };

/** Text of an assistant message, or "" when it carried no prose. */
function textContent(content: unknown): string {
	if (typeof content === "string") {
		return content.trim();
	}
	if (!Array.isArray(content)) {
		return "";
	}
	return content
		.filter(
			(c): c is { type: "text"; text: string } =>
				c?.type === "text" && typeof c.text === "string",
		)
		.map((c) => c.text)
		.join("\n")
		.trim();
}

/**
 * The last `limit` assistant messages, oldest first. The most recent assistant
 * message must be complete — extracting questions from a half-written reply
 * picks up questions the agent was still in the middle of answering.
 */
function assistantTexts(
	messages: BranchPreparation["messages"],
	limit: number,
): string[] {
	const texts: string[] = [];
	let checkedNewest = false;

	for (let i = messages.length - 1; i >= 0 && texts.length < limit; i--) {
		const message = messages[i];
		if (message.role !== "assistant") continue;

		if (!checkedNewest) {
			checkedNewest = true;
			if (message.stopReason !== "stop") {
				return [];
			}
		}

		const text = textContent(message.content);
		if (text.length > 0) {
			texts.unshift(text);
		}
	}

	return texts;
}

/**
 * Build the extraction input for one model. pi's own branch selection keeps the
 * newest entries that fit the model's context window, folds in compaction and
 * branch summaries, honours context edits and skips tool results - the same
 * budget logic /compact uses.
 */
function buildExtractionText(
	branch: SessionEntry[],
	messageCount: number,
	model: Model<Api>,
): string {
	const budget = Math.max(0, model.contextWindow - RESERVE_TOKENS);
	const { messages } = prepareBranchEntries(branch, budget);
	const texts = assistantTexts(messages, messageCount);
	if (texts.length === 0) {
		throw new Error("no complete assistant message in the recent branch");
	}
	return texts
		.map((text, i) => `--- Message ${i + 1} ---\n${text}`)
		.join("\n\n");
}

function parseExtractionResult(text: string): ExtractionResult | null {
	try {
		let jsonStr = text;
		const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
		if (jsonMatch) jsonStr = jsonMatch[1].trim();
		const parsed = JSON.parse(jsonStr);
		if (!parsed || !Array.isArray(parsed.questions)) {
			return null;
		}
		const questions = parsed.questions.filter(
			(q: unknown): q is ExtractedQuestion =>
				typeof q === "object" &&
				q !== null &&
				typeof (q as ExtractedQuestion).question === "string",
		);
		return { questions };
	} catch {
		return null;
	}
}

function buildPrompt(
	question: ExtractedQuestion,
	index: number,
	total: number,
): string {
	let prompt = `[${index + 1}/${total}] ${question.question}`;
	if (question.context) {
		prompt += `\n\nContext: ${question.context}`;
	}
	if (question.options && question.options.length > 0) {
		prompt += `\n\nOptions:\n${question.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
	}
	return prompt;
}

/**
 * One request to one model, normalised into a result the loop can act on.
 * A thrown error, `stopReason: "error"`, an abort, an empty reply and a reply
 * that is not the expected JSON all collapse into three cases so the caller
 * never has to guess whether "nothing happened" meant cancel or failure.
 */
async function requestExtraction(
	ctx: ExtensionContext,
	model: Model<Api>,
	userText: string,
	signal: AbortSignal,
): Promise<ExtractionAttempt> {
	const userMessage: Message = {
		role: "user",
		content: [{ type: "text", text: userText }],
		timestamp: Date.now(),
	};

	let response: AssistantMessage;
	try {
		response = await ctx.modelRegistry.complete(
			model,
			{ systemPrompt: SYSTEM_PROMPT, messages: [userMessage] },
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

	const text = textContent(response.content);
	if (text.length === 0) {
		return {
			status: "failed",
			failure: `${modelLabel(model)}: empty response`,
		};
	}

	const result = parseExtractionResult(text);
	if (!result) {
		return {
			status: "failed",
			failure: `${modelLabel(model)}: ${
				response.stopReason === "length"
					? "reply hit the output limit before the JSON closed"
					: "unparsable reply"
			}`,
		};
	}

	return {
		status: "ok",
		result,
		truncated: response.stopReason === "length",
	};
}

export default function (pi: ExtensionAPI) {
	const answerHandler = async (
		ctx: ExtensionContext,
		messageCount: number = 1,
	) => {
		if (!ctx.hasUI) {
			ctx.ui.notify("answer requires interactive mode", "error");
			return;
		}

		const models = candidateModels(pi, ctx, "answer");
		if (models.length === 0) {
			ctx.ui.notify("No model available for question extraction", "error");
			return;
		}

		const branch = ctx.sessionManager.getBranch();
		if (branch.length === 0) {
			ctx.ui.notify("No conversation to extract questions from", "error");
			return;
		}

		// The input is built per candidate because the budget depends on the
		// model's window; memoise by window size so a 3-model list with two
		// equal windows builds twice, not three times.
		const textByWindow = new Map<number, string>();
		const extractionTextFor = (model: Model<Api>): string => {
			const cached = textByWindow.get(model.contextWindow);
			if (cached !== undefined) {
				return cached;
			}
			const text = buildExtractionText(branch, messageCount, model);
			textByWindow.set(model.contextWindow, text);
			return text;
		};

		const outcome = await ctx.ui.custom<ExtractionOutcome>(
			(tui, theme, _kb, done) => {
				const loader = new BorderedLoader(
					tui,
					theme,
					"Extracting questions...",
				);
				loader.onAbort = () => done({ status: "cancelled" });

				const doExtract = async (): Promise<ExtractionOutcome> => {
					const failures: string[] = [];

					for (const model of models) {
						if (loader.signal.aborted) {
							return { status: "cancelled" };
						}

						let userText: string;
						try {
							userText = extractionTextFor(model);
						} catch (err) {
							failures.push(`${modelLabel(model)}: ${describeError(err)}`);
							continue;
						}

						const attempt = await requestExtraction(
							ctx,
							model,
							userText,
							loader.signal,
						);

						if (attempt.status === "aborted") {
							return { status: "cancelled" };
						}
						if (attempt.status === "failed") {
							failures.push(attempt.failure);
							continue;
						}

						return {
							status: "ok",
							questions: attempt.result.questions,
							modelLabel: modelLabel(model),
							truncated: attempt.truncated,
						};
					}

					return {
						status: "error",
						message:
							failures.join(" | ") || "no usable model for extraction",
					};
				};

				doExtract()
					.then(done)
					.catch((err) => done({ status: "error", message: describeError(err) }));

				return loader;
			},
		);

		if (outcome.status === "cancelled") {
			ctx.ui.notify("Cancelled", "info");
			return;
		}

		if (outcome.status === "error") {
			ctx.ui.notify(`Extraction failed — ${outcome.message}`, "error");
			return;
		}

		if (outcome.truncated) {
			ctx.ui.notify(
				`Questions extracted with ${outcome.modelLabel} — reply hit its output limit, some may be missing`,
				"warning",
			);
		}

		if (outcome.questions.length === 0) {
			const scope =
				messageCount === 1
					? "the last message"
					: `the last ${messageCount} messages`;
			ctx.ui.notify(`No questions found in ${scope}`, "info");
			return;
		}

		// Collect answers using native UI dialogs
		const answers: { question: string; answer: string; context?: string }[] =
			[];
		const questions = outcome.questions;

		for (let i = 0; i < questions.length; i++) {
			const q = questions[i];
			const prompt = buildPrompt(q, i, questions.length);
			let answer = "";

			if (q.options && q.options.length > 0) {
				if (q.multiSelect) {
					// Multi-select: use repeated single-select with confirmation
					const selections: string[] = [];
					let selecting = true;
					while (selecting) {
						const remaining = q.options.filter((o) => !selections.includes(o));
						if (remaining.length === 0) break;
						const opts = [...remaining, "Done"];
						const choice = await ctx.ui.select(
							`${prompt}\n\nSelected so far: ${selections.join(", ") || "none"}`,
							opts,
						);
						if (!choice) {
							ctx.ui.notify("Cancelled", "info");
							return;
						}
						if (choice === "Done") {
							selecting = false;
						} else {
							selections.push(choice);
						}
					}
					answer = selections.join(", ") || "(no selection)";
				} else {
					// Single-select
					const choice = await ctx.ui.select(prompt, q.options);
					if (choice === undefined) {
						ctx.ui.notify("Cancelled", "info");
						return;
					}
					answer = choice;
				}
			} else {
				// Free text
				const text = await ctx.ui.input(prompt, "Type your answer...");
				if (text === undefined) {
					ctx.ui.notify("Cancelled", "info");
					return;
				}
				answer = text || "(no answer)";
			}

			answers.push({ question: q.question, answer, context: q.context });
		}

		// Compile and send back
		const responseParts = answers.map((res) => {
			let part = `Q: ${res.question}\n`;
			if (res.context) part += `> ${res.context}\n`;
			part += `A: ${res.answer}`;
			return part;
		});

		pi.sendMessage(
			{
				customType: "answers",
				content:
					"I answered your questions in the following way:\n\n" +
					responseParts.join("\n\n"),
				display: true,
			},
			{ triggerTurn: true },
		);
	};

	pi.registerCommand("answer", {
		description:
			"Extract questions from last N assistant messages into interactive Q&A. Usage: /answer or /answer 3",
		handler: async (args, ctx: ExtensionCommandContext) => {
			const trimmed = args.trim();
			const count = trimmed ? Number.parseInt(trimmed, 10) : 1;
			if (Number.isNaN(count) || count < 1) {
				ctx.ui.notify(
					"Usage: /answer [N] — N must be a positive integer",
					"error",
				);
				return;
			}
			await answerHandler(ctx, count);
		},
	});

	pi.registerShortcut("ctrl+.", {
		description: "Extract and answer questions from last assistant message",
		handler: (ctx) => answerHandler(ctx, 1),
	});

	// Listen for trigger from other extensions (e.g., execute_command tool)
	pi.events.on("trigger:answer", (data) => {
		if (
			typeof data === "object" &&
			data !== null &&
			"sessionManager" in data &&
			"modelRegistry" in data &&
			"ui" in data
		) {
			void answerHandler(data as ExtensionContext, 1);
		}
	});
}
