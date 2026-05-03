/**
 * Q&A extraction hook - extracts questions from assistant responses
 *
 * Custom interactive TUI for answering questions.
 *
 * Demonstrates the "prompt generator" pattern with custom TUI:
 * 1. /answer command gets the last assistant message
 * 2. Shows a spinner while extracting questions as structured JSON
 * 3. Presents an interactive TUI to navigate and answer questions
 * 4. Submits the compiled answers when done
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
import {
	type Component,
	Editor,
	type EditorTheme,
	Key,
	matchesKey,
	SelectList,
	type TUI,
	truncateToWidth,
	visibleWidth,
	wrapTextWithAnsi,
} from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

export interface QuestionOption {
	label: string;
	value: string;
	description?: string;
}

export interface Question {
	id: string;
	type: "text" | "choice" | "multi-choice";
	question: string;
	context?: string;
	options?: QuestionOption[];
	initialValue?: string | string[];
}

export class PolishedQuestionnaire implements Component {
	private questions: Question[];
	private answers: (string | string[])[];
	private currentIndex: number = 0;
	private editor: Editor;
	private selectList?: SelectList;
	private tui: TUI;
	private onDone: (result: any | null) => void;
	private showingConfirmation: boolean = false;

	private cachedWidth?: number;
	private cachedLines?: string[];

	private dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
	private bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
	private cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
	private green = (s: string) => `\x1b[32m${s}\x1b[0m`;
	private yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
	private gray = (s: string) => `\x1b[90m${s}\x1b[0m`;

	constructor(
		questions: Question[],
		tui: TUI,
		onDone: (result: any | null) => void,
	) {
		this.questions = questions;
		this.answers = questions.map(
			(q) => q.initialValue || (q.type === "multi-choice" ? [] : ""),
		);
		this.tui = tui;
		this.onDone = onDone;

		const editorTheme: EditorTheme = {
			borderColor: this.dim,
			selectList: {
				selectedBg: (s: string) => `\x1b[44m${s}\x1b[0m`,
				matchHighlight: this.cyan,
				itemSecondary: this.gray,
			},
		};

		this.editor = new Editor(tui, editorTheme);
		this.editor.disableSubmit = true;
		this.editor.onChange = () => {
			this.invalidate();
			this.tui.requestRender();
		};

		this.initCurrentQuestion();
	}

	private initCurrentQuestion(): void {
		const q = this.questions[this.currentIndex];
		const currentAnswer = this.answers[this.currentIndex];

		if (q.type === "text") {
			this.editor.setText(
				typeof currentAnswer === "string" ? currentAnswer : "",
			);
			this.selectList = undefined;
		} else {
			const items = (q.options || []).map((opt) => ({
				label: opt.label,
				value: opt.value,
				description: opt.description,
			}));

			this.selectList = new SelectList(items, 10, {
				selectedPrefix: (t) => this.cyan(t),
				selectedText: (t) => this.cyan(this.bold(t)),
				description: (t) => this.dim(t),
			});

			const updateMultiChoiceLabels = () => {
				if (q.type !== "multi-choice") return;
				const currentSelection = this.answers[this.currentIndex] as string[];
				items.forEach((item, i) => {
					const opt = q.options![i];
					const isSelected = currentSelection.includes(opt.value);
					item.label = `${isSelected ? this.green("[x]") : this.dim("[ ]")} ${opt.label}`;
				});
			};

			updateMultiChoiceLabels();

			this.selectList.onSelect = (item) => {
				if (q.type === "choice") {
					this.answers[this.currentIndex] = item.value as string;
					this.nextOrSubmit();
				} else {
					const current = this.answers[this.currentIndex] as string[];
					const val = item.value as string;
					const idx = current.indexOf(val);
					if (idx >= 0) current.splice(idx, 1);
					else current.push(val);
					updateMultiChoiceLabels();
					this.invalidate();
					this.tui.requestRender();
				}
			};
		}
	}

	private saveCurrentAnswer(): void {
		const q = this.questions[this.currentIndex];
		if (q.type === "text") {
			this.answers[this.currentIndex] = this.editor.getText();
		}
	}

	private nextOrSubmit(): void {
		this.saveCurrentAnswer();
		if (this.currentIndex < this.questions.length - 1) {
			this.currentIndex++;
			this.initCurrentQuestion();
		} else {
			if (this.questions.length === 1) {
				this.submit();
				return;
			}
			this.showingConfirmation = true;
		}
		this.invalidate();
		this.tui.requestRender();
	}

	private navigateTo(index: number): void {
		if (index < 0 || index >= this.questions.length) return;
		this.saveCurrentAnswer();
		this.currentIndex = index;
		this.initCurrentQuestion();
		this.invalidate();
	}

	private submit(): void {
		this.saveCurrentAnswer();
		const results = this.questions.map((q, i) => ({
			question: q.question,
			answer: this.answers[i],
			id: q.id,
		}));
		this.onDone(results);
	}

	invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}

	handleInput(data: string): void {
		if (this.showingConfirmation) {
			if (matchesKey(data, Key.enter) || data.toLowerCase() === "y") {
				this.submit();
				return;
			}
			if (
				matchesKey(data, Key.escape) ||
				matchesKey(data, Key.ctrl("c")) ||
				data.toLowerCase() === "n"
			) {
				this.showingConfirmation = false;
				this.invalidate();
				this.tui.requestRender();
				return;
			}
			return;
		}

		if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c"))) {
			this.onDone(null);
			return;
		}

		const q = this.questions[this.currentIndex];

		if (this.questions.length > 1) {
			if (matchesKey(data, Key.tab)) {
				this.navigateTo((this.currentIndex + 1) % this.questions.length);
				this.tui.requestRender();
				return;
			}
			if (matchesKey(data, Key.shift("tab"))) {
				this.navigateTo(
					(this.currentIndex - 1 + this.questions.length) %
						this.questions.length,
				);
				this.tui.requestRender();
				return;
			}
		}

		if (q.type === "text") {
			if (
				matchesKey(data, Key.enter) &&
				!matchesKey(data, Key.shift("enter"))
			) {
				this.nextOrSubmit();
				return;
			}
			this.editor.handleInput(data);
		} else {
			if (q.type === "multi-choice") {
				if (matchesKey(data, Key.enter)) {
					this.nextOrSubmit();
					return;
				}
				if (data === " ") {
					const item = this.selectList?.getSelectedItem();
					if (item && this.selectList?.onSelect) {
						this.selectList.onSelect(item);
					}
					return;
				}
			}
			this.selectList?.handleInput(data);
		}

		this.invalidate();
		this.tui.requestRender();
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) return this.cachedLines;

		const lines: string[] = [];
		const boxWidth = Math.min(width - 4, 100);
		const contentWidth = boxWidth - 4;

		const horizontalLine = (count: number) => "─".repeat(count);
		const boxLine = (content: string, leftPad: number = 2): string => {
			const safeContent = truncateToWidth(content, boxWidth - 2 - leftPad);
			const paddedContent = " ".repeat(leftPad) + safeContent;
			const contentLen = visibleWidth(paddedContent);
			const rightPad = Math.max(0, boxWidth - contentLen - 2);
			return (
				this.dim("│") + paddedContent + " ".repeat(rightPad) + this.dim("│")
			);
		};
		const emptyBoxLine = () =>
			this.dim("│") + " ".repeat(boxWidth - 2) + this.dim("│");
		const padToWidth = (line: string) =>
			line + " ".repeat(Math.max(0, width - visibleWidth(line)));

		lines.push(padToWidth(this.dim("╭" + horizontalLine(boxWidth - 2) + "╮")));
		const title = `${this.bold(this.cyan("Input Required"))}${this.questions.length > 1 ? this.dim(` (${this.currentIndex + 1}/${this.questions.length})`) : ""}`;
		lines.push(padToWidth(boxLine(title)));
		lines.push(padToWidth(this.dim("├" + horizontalLine(boxWidth - 2) + "┤")));

		if (this.questions.length > 1) {
			const progressParts = this.questions.map((q, i) => {
				const hasAns =
					q.type === "multi-choice"
						? (this.answers[i] as string[]).length > 0
						: (this.answers[i] as string).length > 0;
				if (i === this.currentIndex) return this.cyan("●");
				return hasAns ? this.green("●") : this.dim("○");
			});
			lines.push(padToWidth(boxLine(progressParts.join(" "))));
			lines.push(padToWidth(emptyBoxLine()));
		}

		const q = this.questions[this.currentIndex];
		const wrappedQ = wrapTextWithAnsi(
			`${this.bold("?")} ${q.question}`,
			contentWidth,
		);
		wrappedQ.forEach((l) => lines.push(padToWidth(boxLine(l))));

		if (q.context) {
			lines.push(padToWidth(emptyBoxLine()));
			wrapTextWithAnsi(this.gray(`> ${q.context}`), contentWidth - 2).forEach(
				(l) => lines.push(padToWidth(boxLine(l, 4))),
			);
		}

		lines.push(padToWidth(emptyBoxLine()));

		if (q.type === "text") {
			const editorLines = this.editor.render(contentWidth - 4);
			for (let i = 1; i < editorLines.length - 1; i++) {
				lines.push(padToWidth(boxLine(editorLines[i], 4)));
			}
		} else {
			const currentSelection = this.answers[this.currentIndex] as
				| string
				| string[];
			const selectLines = this.selectList?.render(contentWidth - 2) || [];
			selectLines.forEach((l) => {
				lines.push(padToWidth(boxLine(l, 2)));
			});

			if (q.type === "multi-choice") {
				lines.push(padToWidth(emptyBoxLine()));
				const selectedCount = (currentSelection as string[]).length;
				lines.push(
					padToWidth(
						boxLine(
							this.dim(
								`Selected: ${this.green(selectedCount.toString())} items.`,
							),
						),
					),
				);
			}
		}

		lines.push(padToWidth(emptyBoxLine()));

		lines.push(padToWidth(this.dim("├" + horizontalLine(boxWidth - 2) + "┤")));
		let controls = "";
		if (this.showingConfirmation) {
			controls = truncateToWidth(
				`${this.yellow("Confirm?")} ${this.dim("(Enter/y: yes, Esc/n: no)")}`,
				contentWidth,
			);
		} else {
			const parts = [];
			if (this.questions.length > 1) parts.push(`${this.dim("Tab")} next/prev`);
			if (q.type === "text") parts.push(`${this.dim("Enter")} done`);
			else if (q.type === "multi-choice")
				parts.push(`${this.dim("Space")} toggle · ${this.dim("Enter")} finish`);
			else parts.push(`${this.dim("Enter")} select`);
			parts.push(`${this.dim("Esc")} cancel`);
			controls = truncateToWidth(parts.join(" · "), contentWidth);
		}
		lines.push(padToWidth(boxLine(controls)));
		lines.push(padToWidth(this.dim("╰" + horizontalLine(boxWidth - 2) + "╯")));

		this.cachedWidth = width;
		this.cachedLines = lines;
		return lines;
	}
}

interface ExtractedQuestion {
	question: string;
	context?: string;
	options?: string[];
	multiSelect?: boolean;
}

interface ExtractionResult {
	questions: ExtractedQuestion[];
}

const SYSTEM_PROMPT = `You are a question extractor. Given text from a conversation, extract any questions that need answering.

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
- Extract all questions that require user input
- Keep questions in the order they appeared
- Be concise with question text
- Include context only when it provides essential information for answering
- If the question provides multiple choices, extract them into the "options" array
- Use "multiSelect": true when the user can/should select multiple options (e.g., "which of these apply?", "select all that apply", lists of items where multiple answers make sense)
- If no questions are found, return {"questions": []}

Example output:
{
  "questions": [
    {
      "question": "What is your preferred database?",
      "context": "We can only configure MySQL and PostgreSQL because of what is implemented.",
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

// Modelos preferidos para extracción de preguntas (proveedor, modelo)
// Se busca el primero que esté disponible y tenga API key
const EXTRACTION_MODELS: [string, string][] = [
	["openrouter", "opencode-go/deepseek-v4-flash"],
	["openai-codex", "gpt-5.1-codex-mini"],
	["anthropic", "claude-haiku-4-5"],
	["google-gemini-cli", "gemini-2.0-flash"],
];

async function selectExtractionModel(
	currentModel: Model<Api>,
	modelRegistry: {
		find: (provider: string, modelId: string) => Model<Api> | undefined;
		getApiKey: (model: Model<Api>) => Promise<string | undefined>;
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

	console.log(
		`[answer] No preferred extraction model found, using current model: ${currentModel.id}`,
	);
	return currentModel;
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

export default function (pi: ExtensionAPI) {
	// Register the ask_user tool
	pi.registerTool({
		name: "ask_user",
		label: "Ask User",
		description:
			"Ask the user a multiple-choice question with descriptions and trade-offs.",
		parameters: Type.Object({
			question: Type.String({ description: "The question to ask." }),
			options: Type.Array(
				Type.Object({
					label: Type.String({ description: "The label for this option." }),
					description: Type.Optional(
						Type.String({
							description:
								"A detailed description or trade-off for this option.",
						}),
					),
					value: Type.Optional(
						Type.String({
							description:
								"The value to return if selected (defaults to label).",
						}),
					),
				}),
				{ description: "The list of options to choose from." },
			),
			multiSelect: Type.Optional(
				Type.Boolean({
					description:
						"Whether the user can select multiple options. Defaults to false.",
					default: false,
				}),
			),
		}),

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			if (!ctx.hasUI) {
				return {
					content: [
						{
							type: "text",
							text: "Error: `ask_user` tool requires interactive mode.",
						},
					],
					isError: true,
				};
			}

			const questions: Question[] = [
				{
					id: "ask_user",
					type: params.multiSelect ? "multi-choice" : "choice",
					question: params.question,
					options: params.options.map((opt) => ({
						label: opt.label,
						value: opt.value || opt.label,
						description: opt.description,
					})),
				},
			];

			const results = await ctx.ui.custom<any[] | null>(
				(tui, _theme, _kb, done) => {
					return new PolishedQuestionnaire(questions, tui, done);
				},
			);

			if (results === null) {
				return {
					content: [{ type: "text", text: "User cancelled selection." }],
					details: { cancelled: true },
				};
			}

			const answer = results[0].answer;

			if (params.multiSelect) {
				const selections = answer as string[];
				return {
					content: [
						{
							type: "text",
							text: `User selected: ${selections.join(", ") || "nothing"}`,
						},
					],
					details: { selections },
				};
			} else {
				const selection = answer as string;
				return {
					content: [{ type: "text", text: `User selected: ${selection}` }],
					details: { selection },
				};
			}
		},
	});

	const answerHandler = async (ctx: ExtensionContext) => {
		if (!ctx.hasUI) {
			ctx.ui.notify("answer requires interactive mode", "error");
			return;
		}

		if (!ctx.model) {
			ctx.ui.notify("No model selected", "error");
			return;
		}

		const branch = ctx.sessionManager.getBranch();
		let lastAssistantText: string | undefined;

		for (let i = branch.length - 1; i >= 0; i--) {
			const entry = branch[i];
			if (entry.type === "message") {
				const msg = entry.message;
				if ("role" in msg && msg.role === "assistant") {
					if (msg.stopReason !== "stop") {
						ctx.ui.notify(
							`Last assistant message incomplete (${msg.stopReason})`,
							"error",
						);
						return;
					}
					const textParts = msg.content
						.filter(
							(c): c is { type: "text"; text: string } => c.type === "text",
						)
						.map((c) => c.text);
					if (textParts.length > 0) {
						lastAssistantText = textParts.join("\n");
						break;
					}
				}
			}
		}

		if (!lastAssistantText) {
			ctx.ui.notify("No assistant messages found", "error");
			return;
		}

		const extractionModel = await selectExtractionModel(
			ctx.model,
			ctx.modelRegistry,
		);

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
						content: [{ type: "text", text: lastAssistantText! }],
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
			ctx.ui.notify("No questions found in the last message", "info");
			return;
		}

		const questions: Question[] = extractionResult.questions.map((q, i) => {
			if (q.options && q.options.length > 0) {
				return {
					id: `q${i}`,
					type: q.multiSelect ? "multi-choice" : "choice",
					question: q.question,
					context: q.context,
					options: q.options.map((opt) => ({ label: opt, value: opt })),
				};
			}
			return {
				id: `q${i}`,
				type: "text",
				question: q.question,
				context: q.context,
			};
		});

		const answersResult = await ctx.ui.custom<any[] | null>(
			(tui, _theme, _kb, done) => {
				return new PolishedQuestionnaire(questions, tui, done);
			},
		);

		if (answersResult === null) {
			ctx.ui.notify("Cancelled", "info");
			return;
		}

		const responseParts = answersResult.map((res) => {
			const q = questions.find(
				(question) => question.question === res.question,
			);
			let part = `Q: ${res.question}\n`;
			if (q?.context) part += `> ${q.context}\n`;
			part += `A: ${res.answer || "(no answer)"}`;
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
			"Extract questions from last assistant message into interactive Q&A",
		handler: (_args, ctx) => answerHandler(ctx),
	});

	pi.registerShortcut("ctrl+.", {
		description: "Extract and answer questions",
		handler: answerHandler,
	});

	// Listen for trigger from other extensions (e.g., execute_command tool)
	pi.events.on("trigger:answer", (ctx: ExtensionContext) => {
		answerHandler(ctx);
	});
}
