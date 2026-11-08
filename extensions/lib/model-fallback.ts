/**
 * Ordered model fallback for extensions that call a model.
 *
 * A spec list lives in settings under the extension's own key, so `/handoff`
 * reads `handoff.models`, `/answer` reads `answer.models`, and so on:
 *
 *   "handoff": { "models": ["provider/id", "bare-model-id"] }
 *
 * Candidates are tried in order; specs that no longer match a model, or whose
 * provider has no credentials, are skipped silently; the session model is the
 * last resort so a stale list is a preference and never a hard requirement.
 *
 * This file is not an extension. The loader looks for `index.ts`/`index.js`
 * inside a subdirectory and never recurses further, so `lib/` is only ever
 * imported by the extensions that use it.
 */

import type { Api, Model } from "@earendil-works/pi-ai";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";

/** Cap error text so a single failure cannot swallow the notification line. */
export const MAX_ERROR_CHARS = 120;

/** One-line, stack-free, length-capped description of an error for UI display. */
export function describeError(err: unknown): string {
	const raw = err instanceof Error ? err.message : String(err);
	const firstLine = raw.split("\n")[0].trim();
	if (firstLine.length === 0) {
		return "request failed";
	}
	return firstLine.length > MAX_ERROR_CHARS
		? `${firstLine.slice(0, MAX_ERROR_CHARS)}…`
		: firstLine;
}

export function modelLabel(model: Model<Api>): string {
	return `${model.provider}/${model.id}`;
}

/**
 * Ordered, de-duplicated model spec list from settings: `<key>.models`.
 *
 * `getSettings()` returns raw deep-merged JSON with no schema validation, so
 * unknown keys arrive intact but untyped — hence the record cast.
 */
export function configuredModelSpecs(
	pi: ExtensionAPI,
	key: string,
): string[] {
	const settings = pi.getSettings() as Record<string, unknown>;
	const section = settings[key] as { models?: unknown } | undefined;
	const specs = section?.models;
	if (!Array.isArray(specs)) {
		return [];
	}
	return specs
		.filter((spec): spec is string => typeof spec === "string")
		.map((spec) => spec.trim())
		.filter((spec) => spec.length > 0);
}

/**
 * Resolve `provider/id`, or a bare id, to a model with credentials configured.
 * `getAvailable()` is auth-filtered; `find()` is not, so it is only trusted when
 * the provider itself is authenticated.
 */
export function resolveModel(
	ctx: ExtensionContext,
	spec: string,
): Model<Api> | undefined {
	const registry = ctx.modelRegistry;
	const available = registry.getAvailable();

	const slash = spec.indexOf("/");
	if (slash > 0) {
		const provider = spec.slice(0, slash);
		const id = spec.slice(slash + 1);
		const known = registry.find(provider, id);
		return (
			available.find((m) => m.provider === provider && m.id === id) ??
			(known && registry.hasConfiguredAuth(known) ? known : undefined)
		);
	}

	return (
		available.find((m) => `${m.provider}/${m.id}` === spec) ??
		available.find((m) => m.id === spec)
	);
}

export interface CandidateOptions {
	/**
	 * After the session model, append the first other authenticated model.
	 * For extensions that had no fallback at all, a second chance beats a
	 * failure; for those with a documented model order it would silently add
	 * a tier the docs do not mention.
	 */
	includeAnyAvailable?: boolean;
}

/** Candidate models: configured specs first, session model next, then any. */
export function candidateModels(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	key: string,
	options: CandidateOptions = {},
): Model<Api>[] {
	const models: Model<Api>[] = [];
	const push = (model: Model<Api> | undefined) => {
		if (!model) {
			return;
		}
		if (
			!models.some((m) => m.provider === model.provider && m.id === model.id)
		) {
			models.push(model);
		}
	};

	for (const spec of configuredModelSpecs(pi, key)) {
		push(resolveModel(ctx, spec));
	}
	push(ctx.model);

	if (options.includeAnyAvailable) {
		// The first model that is not already a candidate: `getAvailable()[0]` is
		// usually the session model, which would add nothing.
		push(
			ctx.modelRegistry
				.getAvailable()
				.find(
					(m) =>
						!models.some((x) => x.provider === m.provider && x.id === m.id),
				),
		);
	}

	return models;
}
