/**
 * CI Index Extension
 *
 * Adds Coding Index (CI) scores to the model selection experience.
 * Shows CI scores in the status bar when you switch models.
 * Provides /ci command to look up any model.
 *
 * CI scores are derived from Artificial Analysis coding benchmarks.
 * Higher scores = better coding performance.
 *
 * Data source: pi-free-providers (github.com/apmantza/pi-free)
 */

import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";

// =============================================================================
// Compact benchmark data: model_id → codingIndex
// =============================================================================

const BENCHMARKS: Record<string, number> = {
	"gpt-oss-120b-high": 28.6,
	"gpt-5.4-mini-xhigh": 51.5,
	"gpt-5.4-nano-xhigh": 43.9,
	"gpt-5.4-mini-high": 49.6,
	"gpt-5.4-nano-high": 41.5,
	"gpt-5.4-mini": 43.3,
	"gpt-5.4-nano": 35.8,
	"gpt-oss-120b-reasoning": 26,
	"gpt-oss-120b": 21.8,
	"gpt-5.4-mini-low": 34.3,
	"gpt-5.4-nano-low": 30.4,
	"gpt-oss-nano-reasoning": 24.8,
	"gpt-oss-nano": 20.3,
	"gemini-2.5-flash": 52.7,
	"gemini-2.5-pro": 63.9,
	"gemini-2.5-pro-preview": 61.4,
	"gemini-2.5-flash-preview": 50.5,
	"gemini-2.0-flash": 35.8,
	"gemini-2.0-flash-lite": 22.6,
	"gemini-1.5-flash": 13.6,
	"gemini-1.5-pro": 33.7,
	"claude-sonnet-4": 69.7,
	"claude-sonnet-4-reasoning": 61.5,
	"claude-3.5-sonnet-v2": 66.5,
	"claude-3.5-sonnet": 59.9,
	"claude-4-opus-reasoning": 68.3,
	"claude-4-opus": 57.5,
	"claude-3-haiku": 34.2,
	"claude-3.5-haiku": 20.7,
	"claude-opus-4.5": 59.7,
	"claude-3-opus": 45.2,
	"claude-3-sonnet": 42.8,
	"claude-opus-4.5-reasoning": 59.9,
	"claude-3.5-sonnet-oct-24": 59.9,
	"deepseek-v3.2": 68.5,
	"deepseek-v3.2-reasoning": 73.6,
	"deepseek-r1": 73.6,
	"deepseek-v3": 56.9,
	"deepseek-v2.5": 31.9,
	"deepseek-v3.2-non-reasoning": 59.4,
	"llama-4-maverick": 55.3,
	"llama-4-maverick-reasoning": 55.1,
	"llama-4-scout": 44,
	"llama-4-scout-reasoning": 46.5,
	"llama-3.1-instruct-405b": 52.3,
	"llama-3.1-instruct-70b": 46.7,
	"llama-3.1-instruct-8b": 25.3,
	"llama-3.3-instruct-70b": 48.5,
	"llama-3.2-instruct-90b": 24.5,
	"llama-3.2-instruct-11b": 14.7,
	"llama-3.2-instruct-3b": 13.8,
	"llama-3.2-instruct-1b": 7.6,
	"mistral-large-2411": 53.2,
	"mistral-small-3.1": 49.2,
	"mistral-small-3": 41.2,
	"mistral-small": 33.2,
	"mistral-nemo": 26.1,
	"mistral-7b": 13.4,
	"codestral-2501": 52.7,
	"codestral-mamba": 18.7,
	"mixtral-8x22b": 32.1,
	"mixtral-8x7b": 17.7,
	"qwen3-235b": 64.3,
	"qwen3-235b-reasoning": 68.5,
	"qwen3-30b": 53.5,
	"qwen3-30b-reasoning": 58.4,
	"qwen3-8b": 29.9,
	"qwen3-8b-reasoning": 40.6,
	"qwen2.5-instruct-72b": 43.1,
	"qwen2.5-coder-32b": 40.1,
	"qwen2.5-instruct-32b": 35.2,
	"qwen2.5-instruct-14b": 24.4,
	"qwen2.5-instruct-7b": 20.7,
	"qwen2.5-coder-7b": 16.6,
	"qwen2.5-instruct-3b": 9.6,
	"qwen2.5-coder-1.5b": 5.1,
	"qwen2.5-instruct-1.5b": 4.4,
	"qwen2.5-instruct-0.5b": 2.9,
	"gpt-4o": 56.5,
	"gpt-4o-mini": 42.5,
	"gpt-4-turbo": 47.8,
	"gpt-4": 33.9,
	"gpt-4o-aug-24": 56.5,
	"gpt-3.5-turbo": 19.8,
	o1: 60.4,
	"o1-mini": 38.5,
	"o3-mini": 62.6,
	o3: 67.2,
	"o4-mini": 65.8,
	"o4-mini-high": 67.7,
	"grok-3": 57.6,
	"grok-3-reasoning": 62.4,
	"grok-3-mini": 30.4,
	"grok-3-mini-reasoning": 55.4,
	"grok-2": 38.4,
	"command-r-plus": 27.4,
	"command-r": 15.3,
	"command-r7b": 7.5,
	"dbrx-instruct": 21.5,
	"reka-core": 37.2,
	"reka-flash": 19.1,
	"phi-4": 33.4,
	"phi-3-medium": 23.6,
	"phi-3-mini": 12.1,
	"phi-3-small": 18.2,
	"nemotron-4": 23.2,
	"nemotron-mini": 8.4,
	"ministral-8b": 25.3,
	"ministral-3b": 13.5,
	"aya-expanse-32b": 26.6,
	"aya-expanse-8b": 11.5,
	"cohere-embed": 0,
	"jamba-1.5-mini": 22.1,
	"jamba-1.5-large": 28.3,
	"granite-3.1-8b": 19.3,
	"granite-3.1-2b": 6.4,
	"granite-3-dense": 14.6,
	"granite-3.1-dense": 14.6,
	"olmo-2-32b": 11.1,
	"olmo-2-13b": 8.5,
	"olmo-2-7b": 4.9,
	"solar-open-100b-reasoning": 30.8,
	"solar-open-100b": 20.7,
	"solar-pro": 31,
	"solar-mini": 3.3,
	"gemma-2-27b": 15.6,
	"gemma-2-9b": 11.8,
	"gemma-2-2b": 5,
	"gemma-3-12b": 28.5,
	"gemma-3-27b": 38.5,
	"gemma-3-1b": 6.2,
	"gemma-4-27b": 51.5,
	"gemma-4-9b": 26.9,
	"yi-lightning": 16.2,
	"yi-large": 18.1,
	"yi-medium": 6.7,
	"yi-34b": 14.8,
	"yi-1.5-34b": 15.2,
	"yi-1.5-9b": 8.2,
	"yi-1.5-6b": 3.5,
	"deepseek-coder-33b": 16.4,
	"deepseek-coder-6.7b": 11.8,
	"deepseek-coder-1.3b": 5,
	"deepseek-coder-v2": 48.5,
	"deepseek-chat-67b": 17.1,
	"deepseek-math-7b": 5.7,
	"dbrx-132b": 21.5,
	"mixtral-8x7b-dpo": 17.7,
	"mistral-medium": 24.7,
	"opt-66b": 4.6,
	"opt-13b": 2.9,
	"opt-6.7b": 2.4,
	"opt-2.7b": 1.9,
	"opt-1.3b": 1.2,
	"opt-350m": 0.5,
	"bloom-176b": 5.5,
	"bloom-7b": 1.5,
	"bloomz-7b": 3.5,
	"falcon-180b": 7.3,
	"falcon-40b": 6.2,
	"falcon-7b": 3,
	"starling-lm-7b": 5.3,
	"starling-lm-34b": 10.7,
	"tulu-2-dpo-70b": 8.7,
	"tulu-2-dpo-13b": 6.5,
	"tulu-2-dpo-7b": 3.9,
	"zephyr-7b": 4.1,
	"zephyr-3b": 2.1,
	"xwin-lm-70b": 8.4,
	"xwin-lm-13b": 5.1,
	"openchat-3.5": 6.7,
	"openchat-3.6": 8.1,
	"wizardcoder-34b": 11.8,
	"wizardcoder-15b": 8.7,
	"wizardcoder-7b": 4.8,
	"wizardcoder-1b": 0.9,
	"wizardlm-2-8x22b": 28.7,
	"wizardlm-2-7b": 14.3,
	"wizardlm-70b": 11.5,
	"wizardlm-33b": 6.5,
	"wizardlm-13b": 8.1,
	"wizardlm-7b": 4.9,
	"airoboros-70b": 9.1,
	"airoboros-33b": 5,
	"airoboros-13b": 3.1,
	"airoboros-7b": 1.3,
	"airoboros-3.1-70b": 10.5,
	"airoboros-3.1-33b": 6.8,
	"airoboros-3.1-13b": 4.3,
	"airoboros-3.1-7b": 2.5,
	"nous-hermes-2-70b": 14.6,
	"nous-hermes-2-34b": 11.9,
	"nous-hermes-2-7b": 5.5,
	"nous-hermes-2-mixtral": 14.9,
	"nous-hermes-2-solar": 12.6,
	"nous-hermes-2-yi-34b": 14.7,
	"nous-hermes-2-yi-30b": 7.8,
	"stripedhyena-nous-7b": 4.5,
	"stripedhyena-hess-7b": 3.8,
	"gpt-neox-20b": 4.8,
	"pythia-12b": 3.1,
	"pythia-6.9b": 2,
	"pythia-2.8b": 0.9,
	"pythia-1.4b": 0.5,
	"pythia-410m": 0.3,
	"stablelm-2-12b": 9.7,
	"stablelm-2-1.6b": 2.3,
	"stablelm-zephyr-3b": 3.4,
	"mpt-30b": 8.2,
	"mpt-7b": 3.5,
	"MPT-7B-Instruct": 3.5,
	"MPT-30B-Instruct": 8.2,
	"replit-code-v1.5-3b": 2.6,
	"codegen-16b": 5.2,
	"codegen-6b": 3.3,
	"codegen-2b": 1.5,
	"codegen-350m": 0.5,
	"codegen2-16b": 4.6,
	"codegen2-3.7b": 2.7,
	"incoder-6b": 2.8,
	"incoder-1b": 0.8,
	santacoder: 0.4,
	starcoder: 1.9,
	"starcoder2-15b": 12.4,
	"starcoder2-7b": 7.2,
	"starcoder2-3b": 3.3,
	"polyglot-12.8b": 2.7,
	"polyglot-5.8b": 1.9,
	"polyglot-3.8b": 1.3,
	"polyglot-1.3b": 0.5,
	"koala-13b": 2.4,
	"koala-7b": 1.2,
	"vicuna-33b": 5.8,
	"vicuna-13b": 4.3,
	"vicuna-7b": 2.5,
	"vicuna-1.5-13b": 5.2,
	"vicuna-1.5-7b": 2.9,
	"llama-2-70b": 8.1,
	"llama-2-13b": 4.8,
	"llama-2-7b": 3.1,
	"llama-2-7b-chat": 4.3,
	"llama-2-13b-chat": 5.9,
	"llama-2-70b-chat": 9.6,
	"llama-3-8b": 28.5,
	"llama-3-70b": 32.7,
	"llama-3-8b-instruct": 28.5,
	"llama-3-70b-instruct": 32.7,
	"llama-3.2-3b-instruct": 13.8,
	"llama-3.2-1b-instruct": 7.6,
	"qwen-72b": 12.9,
	"qwen-32b": 8.6,
	"qwen-14b": 6.3,
	"qwen-7b": 3.3,
	"qwen-4b": 0.8,
	"qwen-1.8b": 0.4,
	"qwen2-72b": 29.5,
	"qwen2-57b": 31.4,
	"qwen2-32b": 25.7,
	"qwen2-7b": 15.7,
	"qwen2-1.5b": 4.7,
	"qwen2-0.5b": 1.7,
	"qwen2.5-32b": 35.2,
	"qwen2.5-72b": 43.1,
	"qwen2.5-14b": 24.4,
	"qwen2.5-7b": 20.7,
	"qwen2.5-3b": 9.6,
	"qwen2.5-1.5b": 4.4,
	"qwen2.5-0.5b": 2.9,
	"kimi-k2.5": 54,
	"kimi-k2.6": 57.6,
	"kimi-k2": 54,
	"kimi-k2-reasoning": 60.1,
	"pi-3-mini": 10.5,
	"pi-3-mini-turbo": 15.5,
	"minimax-m1": 40.4,
	"minimax-m1-reasoning": 47.2,
	"minimax-m2.5": 52.1,
	"minimax-m2.5-reasoning": 56.1,
	"glm-4-flash": 27,
	"glm-4": 37.4,
	"glm-4v": 37.4,
	"GLM-4-9B": 15.5,
	"chatglm3-6b": 4.9,
	"chatglm-6b": 2.4,
	"baichuan2-13b": 5.3,
	"baichuan2-7b": 3.8,
	"internlm2-20b": 14.5,
	"internlm2-7b": 10.4,
	"internlm2-1.8b": 2.6,
	"mathstral-7b": 5.7,
	"nvidia-nemotron-3-super-120b-a12b": 62.5,
	"nvidia-nemotron-3-super-120b-a12b-reasoning": 67.5,
	"nemotron-3-super": 62.5,
	"yi-coder-1.5-9b": 10.5,
	"yi-coder-1.5-1b": 2,
	"exaone-3.5-32b": 23,
	"exaone-3.5-8b": 10.9,
	"exaone-3.5-2.4b": 4.1,
	"exaone-3.0-7.8b": 6.7,
	"solar-pro-preview": 31,
	"sailor2-20b": 14.4,
	"sailor2-8b": 8.5,
	"sailor2-1b": 2.9,
	"sailor2-0.5b": 1.4,
	"big-pickle": 20.3,
	"mimo-v2-pro": 25.6,
	"mimo-v2-omni": 19.3,
	"mimo-v2-flash": 15.8,
	"qwen3-32b": 53.5,
	"qwen3-32b-reasoning": 58.4,
	"qwen3-14b": 37.6,
	"qwen3-14b-reasoning": 48.9,
	"qwen3-7b": 24,
	"qwen3-7b-reasoning": 37.1,
	"qwen3-0.6b": 3.5,
	"qwen3-0.6b-reasoning": 8.7,
	"gpt-5.4-mini-medium": 46.5,
	"gpt-5.4-nano-medium": 38.8,
	"gpt-oss-120b-medium": 24.4,
	"gpt-oss-nano-medium": 22,
	"llama-4-maverick-early": 50.5,
	"llama-4-maverick-early-reasoning": 53.2,
	"mistral-small-3.1-24b": 42.5,
	"kimi-v3-chat": 50.5,
	"solar-mid": 17.2,
	"deepseek-chat": 56.9,
	"deepseek-reasoner": 73.6,
	"gemma-3-27b-it": 38.5,
	"gemma-3-12b-it": 28.5,
	"gemma-3-1b-it": 6.2,
	"gemini-2.5-flash-preview-05-06": 50.5,
	"llama-4-maverick-17b-128e": 55.3,
	"llama-4-maverick-17b-128e-reasoning": 55.1,
	"llama-4-scout-17b-16e": 44,
	"llama-4-scout-17b-16e-reasoning": 46.5,
} as const;

// =============================================================================
// Variant alias mappings for model name normalization
// =============================================================================

const MODEL_VARIANTS: Record<string, string[]> = {
	"gpt-4o-aug-24": ["gpt-4o", "gpt-4-o"],
	"gpt-4": ["gpt-4", "gpt4"],
	"claude-3.5-sonnet-oct-24": [
		"claude-3.5-sonnet",
		"claude-3-5-sonnet",
		"sonnet-3.5",
	],
	"claude-3-opus": ["claude-3-opus", "opus-3"],
	"llama-3.1-instruct-405b": ["llama-3.1-405b", "llama3.1-405b", "llama-405b"],
	"llama-3.1-instruct-70b": ["llama-3.1-70b", "llama3.1-70b", "llama-70b"],
	"gemini-1.5-pro": ["gemini-1.5-pro", "gemini1.5-pro", "gemini-pro-1.5"],
	"qwen2.5-instruct-72b": ["qwen2.5-72b", "qwen-2.5-72b"],
	"deepseek-v3.2-non-reasoning": ["deepseek-v3", "deepseekv3", "deepseek-chat"],
	"mimo-v2-pro": ["mimo-v2-pro", "mimo-v2-pro-free", "mimo-pro"],
	"mimo-v2-omni": ["mimo-v2-omni", "mimo-v2-omni-free", "mimo-omni"],
	"mimo-v2-flash": ["mimo-v2-flash", "mimo-v2-flash-free", "mimo-flash"],
	"big-pickle": ["big-pickle", "bigpickle"],
	"minimax-m2.5": ["minimax-m2.5", "minimax-m2.5-free", "minimax-m25"],
	"nvidia-nemotron-3-super-120b-a12b-reasoning": [
		"nemotron-3-super",
		"nemotron-3-super-free",
		"nemotron-super",
		"nemotron-3",
	],
};

// =============================================================================
// Provider-Specific Normalizers
// =============================================================================

function normalizeModelId(modelId: string, provider?: string): string {
	let normalized = modelId.toLowerCase();

	if (provider === "ollama" && normalized.includes(":")) {
		normalized = normalized.replaceAll(":", "-");
	}

	// Strip provider prefixes
	normalized = normalized.replaceAll(/^.*\//g, "");

	// Strip :free suffix
	normalized = normalized.replaceAll(/:free$/g, "");

	// Strip common suffixes
	normalized = normalized
		.replaceAll(/-versatile$/g, "")
		.replaceAll(/-latest$/g, "")
		.replaceAll(/-it$/g, "");

	// Strip date suffixes
	normalized = normalized.replaceAll(/-\d{8}$/g, "");

	// Strip version suffixes
	normalized = normalized.replaceAll(/-v\d+(\.\d+)?$/g, "");

	// Strip numeric suffixes like -32768
	normalized = normalized.replaceAll(/-\d{3,}$/g, "");

	// Strip GGUF suffixes
	normalized = normalized.replaceAll(/-q\d_[k\d]+$/g, "");

	return normalized;
}

// =============================================================================
// Lookup Logic
// =============================================================================

function isVariantQualifier(segment: string): boolean {
	const qualifiers = new Set([
		"reasoning",
		"non-reasoning",
		"high",
		"low",
		"medium",
		"xhigh",
		"preview",
		"adaptive",
		"fast",
	]);
	if (qualifiers.has(segment)) return true;
	if (/^\d{4,8}$/.test(segment)) return true;
	if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/.test(segment))
		return true;
	if (/^a?\d+(\.\d+)?b$/i.test(segment)) return true;
	if (/^v\d+(\.\d+)?$/.test(segment)) return true;
	if (/^\d{2}$/.test(segment)) return true;
	if (segment === "speciale" || segment === "chatgpt" || segment === "latest")
		return true;
	return false;
}

function extractBaseModelId(id: string): string {
	return id
		.toLowerCase()
		.replaceAll(/^.*\//g, "")
		.replaceAll(/:free$/g, "")
		.replaceAll(/-\d{8}$/g, "")
		.replaceAll(/-v\d+(\.\d+)?$/g, "")
		.replaceAll(/-\d{3,}$/g, "")
		.replaceAll(/-it$/g, "")
		.trim();
}

function tryDirectSearch(search: string): number | null {
	for (const [key, ci] of Object.entries(BENCHMARKS)) {
		if (search.includes(key.toLowerCase())) {
			return ci;
		}
	}
	return null;
}

function tryVariantAlias(search: string): number | null {
	for (const [canonical, names] of Object.entries(MODEL_VARIANTS)) {
		if (names.some((n) => search.includes(n.toLowerCase()))) {
			const ci = BENCHMARKS[canonical];
			if (ci !== undefined) return ci;
		}
	}
	return null;
}

function tryPrefixFallback(normalizedId: string): number | null {
	const baseId = extractBaseModelId(normalizedId);
	if (!baseId) return null;

	const prefixKey = baseId + "-";
	const candidates: { key: string; ci: number }[] = [];

	for (const [key, ci] of Object.entries(BENCHMARKS)) {
		if (key === baseId) return ci;
		if (key.startsWith(prefixKey)) {
			const remainder = key.slice(prefixKey.length);
			const firstSegment = remainder.split("-")[0]!;
			if (isVariantQualifier(firstSegment)) {
				candidates.push({ key, ci });
			}
		}
	}

	if (candidates.length === 0) return null;
	candidates.sort((a, b) => b.ci - a.ci);
	return candidates[0]!.ci;
}

/**
 * Look up the Coding Index for a model.
 * Returns a score from 0-73.6 (higher = better coding performance),
 * or null if no benchmark data is available for this model.
 */
export function getCodingIndex(
	modelName: string,
	modelId: string,
	provider?: string,
): number | null {
	const search = `${modelName} ${modelId}`.toLowerCase();

	// 1. Direct substring match
	const direct = tryDirectSearch(search);
	if (direct !== null) return direct;

	// 2. Variant alias matching
	const variant = tryVariantAlias(search);
	if (variant !== null) return variant;

	// 3. Provider-specific normalization
	const normalized = normalizeModelId(modelId, provider);
	if (normalized !== modelId.toLowerCase()) {
		const normalizedSearch = `${modelName} ${normalized}`.toLowerCase();
		const normalizedMatch = tryDirectSearch(normalizedSearch);
		if (normalizedMatch !== null) return normalizedMatch;
	}

	// 4. Prefix fallback
	return tryPrefixFallback(normalized);
}

// =============================================================================
// Rating label helpers
// =============================================================================

function getCodingLabel(ci: number): string {
	if (ci >= 68) return "🏆 Elite";
	if (ci >= 55) return "🥇 Excellent";
	if (ci >= 42) return "🥈 Great";
	if (ci >= 28) return "🥉 Good";
	if (ci >= 15) return "⚒️ Decent";
	return "🔧 Basic";
}

function formatCI(ci: number): string {
	return `🧑‍💻 CI: ${ci.toFixed(1)} ${getCodingLabel(ci)}`;
}

// =============================================================================
// Extension Entry Point
// =============================================================================

export default function (pi: ExtensionAPI) {
	// Show CI score in the status bar when model changes
	pi.on("model_select", async (event, ctx) => {
		const { model, previousModel, source } = event;
		if (source === "restore" && previousModel?.id === model.id) return;

		const ci = getCodingIndex(model.name ?? model.id, model.id, model.provider);
		if (ci !== null) {
			ctx.ui.setStatus("ci", `🧑‍💻 ${ci.toFixed(1)}`);
		} else {
			ctx.ui.setStatus("ci", undefined);
		}
	});

	// /ci command: show CI for a model (current or specified)
	pi.registerCommand("ci", {
		description:
			"Show Coding Index score for a model. Usage: /ci <model-id> or /ci for current model",
		handler: async (args, ctx) => {
			const current = ctx.model;
			if (!current) {
				ctx.ui.notify("No model selected", "warning");
				return;
			}

			const searchId = args?.trim() || current.id;
			const searchName = args?.trim() ? searchId : (current.name ?? current.id);

			const ci = getCodingIndex(searchName, searchId, current.provider);
			if (ci !== null) {
				ctx.ui.notify(`${searchId}\n${formatCI(ci)}`, "info");
			} else {
				ctx.ui.notify(`${searchId}\n❓ No CI score available`, "warning");
			}
		},
	});

	// /ci-top command: show top models by CI score
	pi.registerCommand("ci-top", {
		description: "Show top coding models by CI score",
		handler: async (_args, ctx) => {
			const sorted = Object.entries(BENCHMARKS)
				.sort(([, a], [, b]) => b - a)
				.slice(0, 20);

			const lines = [
				"🏆 Top 20 Coding Models:",
				"",
				...sorted.map(([name, ci], i) => {
					const rank = String(i + 1).padStart(2);
					return `${rank}. ${name.padEnd(40)} ${ci.toFixed(1)} ${getCodingLabel(ci)}`;
				}),
			];

			ctx.ui.notify(lines.join("\n"), "info");
		},
	});
}
