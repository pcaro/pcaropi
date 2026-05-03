/**
 * Session Name Extension - Auto-generates session names using AI
 *
 * Automatically generates a descriptive session name after the first
 * assistant turn completes successfully. Uses a lightweight AI model
 * to summarize the conversation into a 3-7 word title.
 */

import { complete, type UserMessage } from "@mariozechner/pi-ai";
import type {
	ExtensionAPI,
	ExtensionContext,
	SessionShutdownEvent,
	SessionStartEvent,
	SessionSwitchEvent,
	TurnEndEvent,
} from "@mariozechner/pi-coding-agent";

// Model for title generation (lightweight, fast, cheap)
const TITLE_MODEL = "opencode-go/deepseek-v4-flash";
const TITLE_PROVIDER = "openrouter";

// Title constraints
const MAX_TITLE_LENGTH = 50;
const MIN_TITLE_WORDS = 3;
const MAX_TITLE_WORDS = 7;

// System prompt for title generation
const TITLE_SYSTEM_PROMPT = `You are a session title generator. Your task is to create a concise, descriptive title for a coding session.

Requirements:
- 3-7 words maximum
- Capture the main topic or intent
- Use sentence case (capitalize first word, proper nouns)
- No quotes, no punctuation at the end
- Be specific but concise

Examples:
- "Add user authentication to API"
- "Refactor database connection pool"
- "Fix memory leak in parser"
- "Implement dark mode toggle"

Respond with ONLY the title text, no markdown, no explanation.`;

/**
 * State tracking for auto-naming sessions.
 */
interface SessionNamingState {
	hasAutoNamed: boolean;
}

// Map to track naming state per session (using sessionId as key)
const sessionStates = new Map<string, SessionNamingState>();

/**
 * Get or create state for a session.
 */
function getSessionState(ctx: ExtensionContext): SessionNamingState {
	const sessionId = ctx.sessionManager.getSessionId();
	if (!sessionStates.has(sessionId)) {
		sessionStates.set(sessionId, { hasAutoNamed: false });
	}
	return sessionStates.get(sessionId)!;
}

/**
 * Check if session already has a name set.
 */
function hasSessionName(ctx: ExtensionContext): boolean {
	const name = ctx.sessionManager.getSessionName();
	return name !== undefined && name.trim().length > 0;
}

/**
 * Build a fallback title from the first user message.
 * Truncates to MAX_TITLE_LENGTH and appends ellipsis if needed.
 */
function buildFallbackTitle(ctx: ExtensionContext): string {
	const entries = ctx.sessionManager.getEntries();

	for (const entry of entries) {
		if (entry.type === "message" && entry.message.role === "user") {
			const content = entry.message.content;
			let text = "";

			if (typeof content === "string") {
				text = content;
			} else if (Array.isArray(content)) {
				// Extract text from content blocks
				text = content
					.filter((c): c is { type: "text"; text: string } => c.type === "text")
					.map((c) => c.text)
					.join(" ");
			}

			// Clean up and truncate
			text = text.trim().replace(/\s+/g, " ");
			if (text.length > MAX_TITLE_LENGTH) {
				text = text.substring(0, MAX_TITLE_LENGTH - 3) + "...";
			}

			return text || "New Session";
		}
	}

	return "New Session";
}

/**
 * Post-process the AI-generated title:
 * - Remove quotes
 * - Trim whitespace
 * - Ensure sentence case
 * - Remove trailing punctuation
 */
function postProcessTitle(title: string): string {
	title = title.trim();

	// Remove surrounding quotes
	title = title.replace(/^["'`]+|["'`]+$/g, "");

	// Remove trailing punctuation
	title = title.replace(/[.!?:;,]+$/g, "");

	// Trim again after cleaning
	title = title.trim();

	// Ensure sentence case (capitalize first letter, lowercase rest of words unless proper nouns)
	const words = title.split(/\s+/);
	if (words.length === 0) return title;

	// Capitalize first word
	words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();

	// Keep rest lowercase (simple approach - proper nouns won't be capitalized, but that's OK)
	for (let i = 1; i < words.length; i++) {
		words[i] = words[i].toLowerCase();
	}

	return words.join(" ");
}

/**
 * Extract conversation text for title generation.
 * Collects the first user message and first assistant response.
 */
function extractConversationText(ctx: ExtensionContext): string {
	const entries = ctx.sessionManager.getEntries();
	const lines: string[] = [];

	for (const entry of entries) {
		if (entry.type !== "message" || !entry.message) continue;

		const msg = entry.message;

		if (msg.role === "user") {
			let text = "";
			if (typeof msg.content === "string") {
				text = msg.content;
			} else if (Array.isArray(msg.content)) {
				text = msg.content
					.filter((c): c is { type: "text"; text: string } => c.type === "text")
					.map((c) => c.text)
					.join(" ");
			}
			if (text.trim()) {
				lines.push(`User: ${text.trim()}`);
			}
		} else if (msg.role === "assistant") {
			if (Array.isArray(msg.content)) {
				const textBlocks = msg.content
					.filter((c): c is { type: "text"; text: string } => c.type === "text")
					.map((c) => c.text)
					.join(" ");
				if (textBlocks.trim()) {
					lines.push(`Assistant: ${textBlocks.trim()}`);
				}
			}
		}

		// Stop after we have both user and assistant messages
		if (lines.length >= 2) break;
	}

	return lines.join("\n\n");
}

/**
 * Generate a session title using AI.
 * Falls back to truncated first message on error.
 */
async function generateSessionTitle(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	signal?: AbortSignal,
): Promise<string> {
	const conversationText = extractConversationText(ctx);

	if (!conversationText.trim()) {
		return buildFallbackTitle(ctx);
	}

	try {
		// Get the title generation model
		const model = ctx.modelRegistry.find(TITLE_PROVIDER, TITLE_MODEL);
		if (!model) {
			return buildFallbackTitle(ctx);
		}

		const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
		if (!auth.ok) {
			return buildFallbackTitle(ctx);
		}

		const userMessage: UserMessage = {
			role: "user",
			content: `Generate a title for this coding session:\n\n${conversationText}`,
			timestamp: Date.now(),
		};

		const response = await complete(
			model,
			{ systemPrompt: TITLE_SYSTEM_PROMPT, messages: [userMessage] },
			{ apiKey: auth.apiKey, headers: auth.headers, signal },
		);

		if (response.stopReason === "aborted" || response.stopReason === "error") {
			return buildFallbackTitle(ctx);
		}

		// Extract text from response
		const responseText = response.content
			.filter((c): c is { type: "text"; text: string } => c.type === "text")
			.map((c) => c.text)
			.join("\n")
			.trim();

		if (!responseText) {
			return buildFallbackTitle(ctx);
		}

		let title = postProcessTitle(responseText);

		// Validate word count
		const wordCount = title.split(/\s+/).length;
		if (wordCount < MIN_TITLE_WORDS || wordCount > MAX_TITLE_WORDS) {
			// Still use it if it looks reasonable, otherwise fallback
			if (title.length < 10 || title.length > MAX_TITLE_LENGTH) {
				return buildFallbackTitle(ctx);
			}
		}

		// Truncate if still too long
		if (title.length > MAX_TITLE_LENGTH) {
			title = title.substring(0, MAX_TITLE_LENGTH - 3) + "...";
		}

		return title;
	} catch {
		return buildFallbackTitle(ctx);
	}
}

/**
 * Reset naming state when a new session starts.
 */
function handleSessionStart(
	_event: SessionStartEvent,
	ctx: ExtensionContext,
): void {
	const sessionId = ctx.sessionManager.getSessionId();
	sessionStates.set(sessionId, { hasAutoNamed: false });
}

/**
 * Reset naming state when switching sessions.
 */
function handleSessionSwitch(
	_event: SessionSwitchEvent,
	ctx: ExtensionContext,
): void {
	const sessionId = ctx.sessionManager.getSessionId();
	sessionStates.set(sessionId, { hasAutoNamed: false });
}

/**
 * Clean up state when a session shuts down to prevent memory leak.
 */
function handleSessionShutdown(event: SessionShutdownEvent): void {
	sessionStates.delete(event.sessionId);
}

/**
 * Handle turn end event to trigger auto-naming.
 * Only generates a name if:
 * - The turn completed successfully (stopReason === "stop")
 * - No name has been set yet
 * - We haven't already auto-named this session
 */
async function handleTurnEnd(
	event: TurnEndEvent,
	ctx: ExtensionContext,
	pi: ExtensionAPI,
): Promise<void> {
	// Only name on successful completion
	if (event.message.role !== "assistant") return;
	if (event.message.stopReason !== "stop") return;

	// Check if already named or already auto-named
	if (hasSessionName(ctx)) return;

	const state = getSessionState(ctx);
	if (state.hasAutoNamed) return;

	// Mark as named to prevent duplicate attempts
	state.hasAutoNamed = true;

	// Generate and set the title
	const title = await generateSessionTitle(pi, ctx);
	pi.setSessionName(title);
}

/**
 * Sets up the session name auto-generation hook.
 */
export function setupSessionNameHook(pi: ExtensionAPI): void {
	// Reset state on session lifecycle events
	pi.on("session_start", handleSessionStart);
	pi.on("session_switch", handleSessionSwitch);
	pi.on("session_shutdown", handleSessionShutdown);

	// Generate name after first successful assistant turn
	pi.on("turn_end", (event, ctx) => handleTurnEnd(event, ctx, pi));
}

/**
 * Default export follows the pi extension factory pattern.
 */
export default function (pi: ExtensionAPI): void {
	setupSessionNameHook(pi);
}
