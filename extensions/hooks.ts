/**
 * Hooks Extension
 *
 * Wires together all hooks for the defaults-features extension set.
 * Imports and registers: system-prompt.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { setupSystemPromptHook } from "./system-prompt";

/**
 * Sets up all hooks by registering them with the ExtensionAPI.
 * Called during extension initialization.
 */
export function setupHooks(pi: ExtensionAPI): void {
	setupSystemPromptHook(pi);
}

/**
 * Default export follows the pi extension factory pattern.
 */
export default function (pi: ExtensionAPI): void {
	setupHooks(pi);
}
