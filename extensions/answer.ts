/**
 * Q&A extraction fallback — extracts questions from assistant responses
 * and presents them via native UI dialogs when the model forgot to use ask_user.
 */

import {
	type Api,
	complete,
	type Model,
	type UserMessage,
} from "@mariozechner/pi-ai";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { BorderedLoader } from "@mariozechner/pi-coding-agent";

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

// Prefer cheaper/faster models for extraction
const EXTRACTION_MODELS: [string, string][] = [
	["opencode-go", "deepseek-v4-flash"],
	["opencode-go", "minimax-m2.7"],
	["openrouter", "opencode-go/deepseek-v4-flash"],
	["openai-codex", "gpt-5.1-codex-mini"],
	["anthropic", "claude-haiku-4-5"],
	["google-gemini-cli", "gemini-2.0-flash"],
];

class NoExtractionModelError extends Error {
	constructor() {
		super(
			"No extraction model available. " +
				"Tried: " +
				EXTRACTION_MODELS.map(([p, m]) => `${p}/${m}`).join(", ") +
				". " +
				"None found with a valid API key. " +
				"Add one via PI_MODELS settings or ensure your provider config has API credentials for any of these models.",
		);
		this.name = "NoExtractionModelError";
	}
}

async function selectExtractionModel(
	currentModel: Model<Api>,
	modelRegistry: {
		find: (provider: string, modelId: string) => Model<Api> | undefined;
		getApiKeyAndHeaders: (model: Model<Api>) => Promise<{
			ok: boolean;
			apiKey?: string;
			headers?: Record<string, string>;
		}>;
	},
): Promise<Model<Api>> {
	for (const [provider, modelId] of EXTRACTION_MODELS) {
		const model = modelRegistry.find(provider, modelId);
		if (model) {
			const auth = await modelRegistry.getApiKeyAndHeaders(model);
			if (auth.ok) {
				console.log(`[answer] Using extraction model: ${provider}/${modelId}`);
				return model;
			}
		}
	}
	// Fallback: check if currentModel actually has credentials
	const auth = await modelRegistry.getApiKeyAndHeaders(currentModel);
	if (auth.ok) {
		console.log(
			`[answer] No preferred extraction model, using: ${currentModel.id}`,
		);
		return currentModel;
	}

	throw new NoExtractionModelError();
}

function parseExtractionResult(text: string): ExtractionResult | null {
	try {
		let jsonStr = text;
		const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
		if (jsonMatch) jsonStr = jsonMatch[1].trim();
		const parsed = JSON.parse(jsonStr);
		if (parsed && Array.isArray(parsed.questions))
			return parsed as ExtractionResult;
		return null;
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

function collectLastNAssistantMessages(branch: any[], n: number): string[] {
	const texts: string[] = [];
	let skippedLast = false;

	for (let i = branch.length - 1; i >= 0 && texts.length < n; i--) {
		const entry = branch[i];
		if (entry.type !== "message") continue;
		const msg = entry.message;
		if (!("role" in msg) || msg.role !== "assistant") continue;

		// The most recent assistant message must be complete; older ones are lenient
		if (!skippedLast) {
			if (msg.stopReason !== "stop") {
				return []; // signal incomplete latest message
			}
			skippedLast = true;
		}

		const textParts = msg.content
			.filter(
				(c: any): c is { type: "text"; text: string } => c.type === "text",
			)
			.map((c: { type: "text"; text: string }) => c.text);
		if (textParts.length > 0) {
			texts.unshift(textParts.join("\n")); // prepend to keep chronological order
		}
	}

	return texts;
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

		if (!ctx.model) {
			ctx.ui.notify("No model selected", "error");
			return;
		}

		const branch = ctx.sessionManager.getBranch();
		const assistantTexts = collectLastNAssistantMessages(branch, messageCount);

		if (assistantTexts.length === 0) {
			ctx.ui.notify("No assistant messages found", "error");
			return;
		}

		const combinedText = assistantTexts
			.map((text, i) => `--- Message ${i + 1} ---\n${text}`)
			.join("\n\n");

		let extractionModel: Model<Api>;
		try {
			extractionModel = await selectExtractionModel(
				ctx.model,
				ctx.modelRegistry,
			);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			ctx.ui.notify(msg, "error");
			return;
		}

		const extractionResult = await ctx.ui.custom<ExtractionResult | null>(
			(tui, theme, _kb, done) => {
				const loader = new BorderedLoader(
					tui,
					theme,
					`Extracting questions using ${extractionModel.id}...`,
				);
				loader.onAbort = () => done(null);

				const doExtract = async () => {
					const auth =
						await ctx.modelRegistry.getApiKeyAndHeaders(extractionModel);
					if (!auth.ok) return null;
					const userMessage: UserMessage = {
						role: "user",
						content: [{ type: "text", text: combinedText }],
						timestamp: Date.now(),
					};

					const response = await complete(
						extractionModel,
						{ systemPrompt: SYSTEM_PROMPT, messages: [userMessage] },
						{
							apiKey: auth.apiKey,
							headers: auth.headers,
							signal: loader.signal,
						},
					);

					if (response.stopReason === "aborted") return null;

					const responseText = response.content
						.filter(
							(c): c is { type: "text"; text: string } => c.type === "text",
						)
						.map((c) => c.text)
						.join("\n");

					return parseExtractionResult(responseText);
				};

				doExtract()
					.then(done)
					.catch(() => done(null));
				return loader;
			},
		);

		if (extractionResult === null) {
			ctx.ui.notify("Cancelled", "info");
			return;
		}

		if (extractionResult.questions.length === 0) {
			const scope =
				assistantTexts.length === 1
					? "the last message"
					: `the last ${assistantTexts.length} messages`;
			ctx.ui.notify(`No questions found in ${scope}`, "info");
			return;
		}

		// Collect answers using native UI dialogs
		const answers: { question: string; answer: string; context?: string }[] =
			[];
		const questions = extractionResult.questions;

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
		handler: (args, ctx) => {
			const trimmed = args.trim();
			const count = trimmed ? Number.parseInt(trimmed, 10) : 1;
			if (Number.isNaN(count) || count < 1) {
				ctx.ui.notify(
					"Usage: /answer [N] — N must be a positive integer",
					"error",
				);
				return;
			}
			return answerHandler(ctx, count);
		},
	});

	pi.registerShortcut("ctrl+.", {
		description: "Extract and answer questions from last assistant message",
		handler: (ctx) => answerHandler(ctx, 1),
	});

	// Listen for trigger from other extensions (e.g., execute_command tool)
	pi.events.on("trigger:answer", (ctx: ExtensionContext) => {
		answerHandler(ctx, 1);
	});
}
