/**
 * UV + CWD Extension - Unified bash tool with uv interception and cwd support
 *
 * This extension combines two functionalities:
 * 1. Intercepts Python tooling (pip, poetry, python) → redirects to uv
 * 2. Adds optional cwd parameter to bash for directory-specific commands
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createBashTool } from "@mariozechner/pi-coding-agent";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { Type } from "@sinclair/typebox";

const __dirname = dirname(fileURLToPath(import.meta.url));
const interceptedCommandsPath = join(__dirname, "..", "intercepted-commands");

export default function (pi: ExtensionAPI) {
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
		name: "bash",
		description: "Execute bash commands with optional directory support and uv interception",
		parameters: extendedSchema,
		promptGuidelines: [
			"Use the cwd parameter instead of 'cd dir && command' when you need to run a command in a specific directory.",
		],

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			// Resolve cwd relative to context's current working directory
			const effectiveCwd = params.cwd ? resolve(ctx.cwd, params.cwd) : ctx.cwd;

			// Create bash tool with effective cwd and uv interception via PATH
			const bashTool = createBashTool(effectiveCwd, {
				commandPrefix: `export PATH="${interceptedCommandsPath}:$PATH"`,
			});

			// Execute with native bash schema (stripping our custom cwd param)
			return bashTool.execute(
				toolCallId,
				{
					command: params.command,
					timeout: params.timeout,
				},
				signal,
				onUpdate,
				ctx
			);
		},
	});

	pi.on("session_start", (_event, ctx) => {
		ctx.ui.notify("UV interceptor + cwd loaded", "info");
	});
}
