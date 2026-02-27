import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { DynamicBorder } from "@mariozechner/pi-coding-agent";
import { Container, type SelectItem, SelectList, Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "ask_user",
		label: "Ask User",
		description: "Ask the user a multiple-choice question with descriptions and trade-offs.",
		parameters: Type.Object({
			question: Type.String({ description: "The question to ask." }),
			options: Type.Array(
				Type.Object({
					label: Type.String({ description: "The label for this option." }),
					description: Type.Optional(Type.String({ description: "A detailed description or trade-off for this option." })),
					value: Type.Optional(Type.String({ description: "The value to return if selected (defaults to label)." })),
				}),
				{ description: "The list of options to choose from." },
			),
			multiSelect: Type.Optional(
				Type.Boolean({
					description: "Whether the user can select multiple options. Defaults to false.",
					default: false,
				}),
			),
		}),

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			if (!ctx.hasUI) {
				return {
					content: [{ type: "text", text: "Error: `ask_user` tool requires interactive mode." }],
					isError: true,
				};
			}

			const items: SelectItem[] = params.options.map((opt) => ({
				value: opt.value || opt.label,
				label: opt.label,
				description: opt.description,
			}));

			if (params.multiSelect) {
				// Multi-select implementation using a custom loop or component
				// For now, let's keep it simple and implement a basic multi-select loop
				// or just use SelectList and ask "Done?"
				// Since implementing a full multi-select UI takes time, let's use a simpler approach:
				// Append a "Done" option.
				items.push({ value: "__DONE__", label: "DONE / FINISHED SELECTING", description: "Select this when you are finished." });
				const selections: string[] = [];

				while (true) {
					const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
						const container = new Container();
						container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
						container.addChild(new Text(theme.fg("accent", theme.bold(params.question)), 1, 0));
						if (selections.length > 0) {
							container.addChild(new Text(theme.fg("success", "Current selections: " + selections.join(", ")), 1, 0));
						}

						const selectList = new SelectList(items, Math.min(items.length, 10), {
							selectedPrefix: (t) => theme.fg("accent", t),
							selectedText: (t) => theme.fg("accent", t),
							description: (t) => theme.fg("muted", t),
							scrollInfo: (t) => theme.fg("dim", t),
							noMatch: (t) => theme.fg("warning", t),
						});
						selectList.onSelect = (item) => done(item.value as string);
						selectList.onCancel = () => done(null);
						container.addChild(selectList);
						container.addChild(new Text(theme.fg("dim", "↑↓ navigate • enter select • esc cancel"), 1, 0));
						container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

						return {
							render: (w) => container.render(w),
							invalidate: () => container.invalidate(),
							handleInput: (data) => {
								selectList.handleInput(data);
								tui.requestRender();
							},
						};
					});

					if (result === null || result === "__DONE__") break;
					if (!selections.includes(result)) {
						selections.push(result);
					} else {
						// Remove if already selected (toggle)
						const index = selections.indexOf(result);
						selections.splice(index, 1);
					}
				}

				return {
					content: [{ type: "text", text: `User selected: ${selections.join(", ") || "nothing"}` }],
					details: { selections },
				};
			} else {
				// Single select
				const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
					const container = new Container();
					container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
					container.addChild(new Text(theme.fg("accent", theme.bold(params.question)), 1, 0));

					const selectList = new SelectList(items, Math.min(items.length, 10), {
						selectedPrefix: (t) => theme.fg("accent", t),
						selectedText: (t) => theme.fg("accent", t),
						description: (t) => theme.fg("muted", t),
						scrollInfo: (t) => theme.fg("dim", t),
						noMatch: (t) => theme.fg("warning", t),
					});
					selectList.onSelect = (item) => done(item.value as string);
					selectList.onCancel = () => done(null);
					container.addChild(selectList);
					container.addChild(new Text(theme.fg("dim", "↑↓ navigate • enter select • esc cancel"), 1, 0));
					container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

					return {
						render: (w) => container.render(w),
						invalidate: () => container.invalidate(),
						handleInput: (data) => {
							selectList.handleInput(data);
							tui.requestRender();
						},
					};
				});

				if (result === null) {
					return {
						content: [{ type: "text", text: "User cancelled selection." }],
						details: { cancelled: true },
					};
				}

				return {
					content: [{ type: "text", text: `User selected: ${result}` }],
					details: { selection: result },
				};
			}
		},
	});
}
