/**
 * Terminal Title Extension - Updates terminal window title with project context
 *
 * Hooks into session lifecycle events to keep the terminal title informative,
 * showing the current project and directory context.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

// Project root markers (in order of preference)
const ROOT_MARKERS = [".git", ".root", "pnpm-workspace.yaml"];

/**
 * Find the project root by looking for marker files.
 * Walks up from cwd until a marker is found or filesystem root is reached.
 */
function findProjectRoot(cwd: string): string | undefined {
	let current = cwd;

	while (true) {
		// Check for any root marker
		for (const marker of ROOT_MARKERS) {
			if (fs.existsSync(path.join(current, marker))) {
				return current;
			}
		}

		// Move up one directory
		const parent = path.dirname(current);
		if (parent === current) {
			// Reached filesystem root without finding a marker
			return undefined;
		}
		current = parent;
	}
}

/**
 * Build a breadcrumb context name from root to cwd.
 * Shows up to 2 levels of subdirectory depth.
 * Example: "myproject > src > components"
 */
function getContextName(root: string, cwd: string): string {
	const rootName = path.basename(root);

	if (cwd === root) {
		return rootName;
	}

	// Get relative path from root to cwd
	const relativePath = path.relative(root, cwd);
	const parts = relativePath.split(path.sep).filter(Boolean);

	// Take at most 2 levels of subdirectories
	const displayParts = parts.slice(0, 2);

	if (parts.length > 2) {
		// Truncate if more than 2 levels
		return `${rootName} > ... > ${displayParts.join(" > ")}`;
	}

	return `${rootName} > ${displayParts.join(" > ")}`;
}

/**
 * Format the terminal title.
 * @param cwd - Current working directory
 * @param detail - Optional detail to append (e.g., tool name)
 * @returns Formatted title like "pi: project > subdir (detail)"
 */
function formatTerminalTitle(cwd: string, detail?: string): string {
	const root = findProjectRoot(cwd);

	if (!root) {
		// No project root found, just show basename of cwd
		const basename = path.basename(cwd) || cwd;
		return detail ? `pi: ${basename} (${detail})` : `pi: ${basename}`;
	}

	const contextName = getContextName(root, cwd);
	return detail ? `pi: ${contextName} (${detail})` : `pi: ${contextName}`;
}

/**
 * Update the terminal title if UI is available.
 */
function updateTitle(ctx: ExtensionContext, detail?: string): void {
	if (!ctx.hasUI) return;
	const title = formatTerminalTitle(ctx.cwd, detail);
	ctx.ui.setTitle(title);
}

/**
 * Sets up all terminal title hooks.
 */
export function setupTerminalTitleHook(pi: ExtensionAPI): void {
	// Update title on session start
	pi.on("session_start", (_event, ctx) => {
		updateTitle(ctx);
	});

	// Update title on session switch
	pi.on("session_switch", (_event, ctx) => {
		updateTitle(ctx);
	});

	// Update title when agent starts (clear any tool detail)
	pi.on("agent_start", (_event, ctx) => {
		updateTitle(ctx);
	});

	// Update title during tool calls to show what's running
	pi.on("tool_call", (event, ctx) => {
		updateTitle(ctx, event.toolName);
	});

	// Update title when agent ends (clear tool detail)
	pi.on("agent_end", (_event, ctx) => {
		updateTitle(ctx);
	});

	// Reset title on shutdown
	pi.on("session_shutdown", (_event, ctx) => {
		if (!ctx.hasUI) return;
		ctx.ui.setTitle("Terminal");
	});
}

/**
 * Default export follows the pi extension factory pattern.
 */
export default function (pi: ExtensionAPI): void {
	setupTerminalTitleHook(pi);
}
