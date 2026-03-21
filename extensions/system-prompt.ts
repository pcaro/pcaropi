/**
 * System Prompt Extension - Appends tool usage guidance
 *
 * Hooks into before_agent_start to append practical tool usage guidance
 * to the system prompt, helping the agent make better decisions about
 * when and how to use available tools.
 */

import type { ExtensionAPI, BeforeAgentStartEvent } from "@mariozechner/pi-coding-agent";

/**
 * Tool usage guidance to append to the system prompt.
 * These guidelines help the agent use tools more effectively.
 */
const TOOL_USAGE_GUIDANCE = `

## Tool Usage Guidelines

When using the available tools, follow these best practices:

- **File Creation**: Use \`write\` instead of echo/heredoc for creating files. The write tool is purpose-built for file creation and handles path creation automatically.

- **Text Search**: Use \`grep\` instead of grep/rg in bash. The grep tool is optimized for searching within the pi environment.

- **Bash Tool**: Reserve bash for operations that truly need a shell: git commands, build/test scripts, package managers, ssh, curl, and process management.

- **Parallel Operations**: When running multiple independent operations that don't depend on each other, call them all in a single response to maximize efficiency.

- **Read-Only Parallelism**: Read-only operations (read, find, grep) are always safe to parallelize. Don't hesitate to make these calls concurrently when exploring code.
`;

/**
 * Handle before_agent_start event to append tool guidance.
 * Returns modified systemPrompt with additions appended.
 */
async function handleBeforeAgentStart(
	event: BeforeAgentStartEvent
): Promise<{ systemPrompt: string }> {
	return {
		systemPrompt: event.systemPrompt + TOOL_USAGE_GUIDANCE,
	};
}

/**
 * Sets up the system prompt additions hook.
 */
export function setupSystemPromptHook(pi: ExtensionAPI): void {
	pi.on("before_agent_start", handleBeforeAgentStart);
}

/**
 * Default export follows the pi extension factory pattern.
 */
export default function (pi: ExtensionAPI): void {
	setupSystemPromptHook(pi);
}
