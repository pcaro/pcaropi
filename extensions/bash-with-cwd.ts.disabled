/**
 * Bash with CWD Extension - Override bash tool with cwd parameter
 *
 * This extension wraps the native bash tool to add an optional `cwd` parameter.
 * When provided, commands execute in the specified directory (resolved relative
 * to the current context cwd). When omitted, behavior is identical to the
 * native bash tool.
 *
 * Prompt guidelines encourage using the cwd parameter instead of 'cd dir && command'.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createBashTool } from "@mariozechner/pi-coding-agent";
import { resolve } from "node:path";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
	// Get native bash tool with current process cwd as fallback
	const nativeBash = createBashTool(process.cwd());

	// Create extended schema with optional cwd parameter
	const extendedSchema = Type.Object({
		command: Type.String({
			description: "The bash command to execute",
		}),
		timeout: Type.Optional(
			Type.Number({
				description: "Timeout in seconds (optional, no default timeout)",
			})
		),
		cwd: Type.Optional(
			Type.String({
				description:
					"Working directory for the command (resolved relative to current context cwd)",
			})
		),
	});

	pi.registerTool({
		...nativeBash,
		parameters: extendedSchema,
		promptGuidelines: [
			"Use the cwd parameter instead of 'cd dir && command' when you need to run a command in a specific directory.",
		],

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			// Resolve cwd relative to context's current working directory
			const effectiveCwd = params.cwd
				? resolve(ctx.cwd, params.cwd)
				: ctx.cwd;

			// Create a new bash tool with the effective working directory
			const bashTool = createBashTool(effectiveCwd);

			// Execute with native bash schema (stripping our custom cwd param)
			const bashParams = {
				command: params.command,
				timeout: params.timeout,
			};

			return bashTool.execute(toolCallId, bashParams, signal, onUpdate, ctx);
		},
	});
}
