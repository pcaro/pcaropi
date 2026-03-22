/**
 * Hooks Extension
 *
 * Wires together all hooks for the defaults-features extension set.
 * Imports and registers: terminal-title, session-name, and system-prompt hooks.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { setupTerminalTitleHook } from "./terminal-title";
import { setupSessionNameHook } from "./session-name";
import { setupSystemPromptHook } from "./system-prompt";

/**
 * Sets up all hooks by registering them with the ExtensionAPI.
 * Called during extension initialization.
 */
export function setupHooks(pi: ExtensionAPI): void {
	setupSessionNameHook(pi);
	setupTerminalTitleHook(pi);
	setupSystemPromptHook(pi);
}

/**
 * Default export follows the pi extension factory pattern.
 */
export default function (pi: ExtensionAPI): void {
	setupHooks(pi);
}
