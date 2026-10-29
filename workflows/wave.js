// wave.js — ready-queue scheduler over a plan file.
//
// args: {
//   plan:   "/abs/path/to/plan.md",           // read by every child, not by this script
//   tasks:  [{ id, agent, deps?, files?, extra?, model?, timeoutMs? }],
//   review: { agent?: string, model?: string, timeoutMs?: number, skip?: boolean, brief?: string },
//   maxOutputChars?: number
// }
//
// `model` and `timeoutMs` are pass-through: this script never chooses a model.
// Rule for callers: mechanical PASS/FAIL checks get a fast cheap model and a
// deadline; judgement-heavy review keeps the strong model and no deadline.
//
// Each child receives: the plan path, its own task id, the files it owns, and a
// contract to read its block from the plan. Nothing about the graph is retyped
// into prompts, so the plan stays the single source of truth.

const cfg = args ?? {};
const plan = cfg.plan;
const tasks = Array.isArray(cfg.tasks) ? cfg.tasks : [];

if (!plan) return { error: "args.plan is required" };
if (!tasks.length) return { error: "args.tasks must be a non-empty array" };

const byId = new Map();
for (const t of tasks) {
	if (!t || typeof t.id !== "string" || !t.id) return { error: "every task needs a string id" };
	if (byId.has(t.id)) return { error: `duplicate task id ${t.id}` };
	if (!t.agent) return { error: `task ${t.id} needs an agent` };
	byId.set(t.id, t);
}
for (const t of tasks) {
	for (const d of t.deps ?? []) {
		if (!byId.has(d)) return { error: `task ${t.id} depends on unknown task ${d}` };
		if (d === t.id) return { error: `task ${t.id} depends on itself` };
	}
}

const limit = Number.isInteger(cfg.maxOutputChars) ? cfg.maxOutputChars : 2500;

function clip(value) {
	const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
	if (text.length <= limit) return text;
	return text.slice(0, limit) + `\n[clipped ${text.length - limit} chars]`;
}

function launch(t, key, task, label) {
	const child = { key, label, agent: t.agent, task };
	if (t.model) child.model = t.model;
	if (t.timeoutMs) child.timeoutMs = t.timeoutMs;
	return child;
}

function brief(t, note) {
	const lines = [
		`Read the plan at ${plan} and implement the task block "${t.id}" exactly as written.`,
		"Other agents are building the other tasks in parallel: do not implement, edit or create anything outside the paths you own.",
	];
	if (t.files) lines.push(`Own only: ${t.files}`);
	if (t.extra) lines.push(t.extra);
	lines.push(
		"Run the verification command named in your task block and read its output.",
		"Never run git, never commit, never touch .git.",
		"Reply in under 120 words: STATUS DONE or STATUS BLOCKED, the files you wrote, and the verification command with its result.",
	);
	if (note) lines.push(`\nA previous attempt at this task failed: ${note}\nFix the cause and complete the task.`);
	return lines.join("\n");
}

const done = new Set();
const failed = new Map();
const skipped = new Set();
const reports = {};
const waves = [];

while (true) {
	for (const t of tasks) {
		if (done.has(t.id) || failed.has(t.id) || skipped.has(t.id)) continue;
		if ((t.deps ?? []).some((d) => skipped.has(d) || failed.has(d))) skipped.add(t.id);
	}

	const ready = tasks.filter(
		(t) =>
			!done.has(t.id) &&
			!failed.has(t.id) &&
			!skipped.has(t.id) &&
			(t.deps ?? []).every((d) => done.has(d)),
	);
	if (!ready.length) break;

	console.log(`wave ${waves.length + 1}: ${ready.map((t) => t.id).join(" ")}`);
	waves.push(ready.map((t) => t.id));

	const batch = await runs.all(
		ready.map((t) => launch(t, t.id, brief(t), `${t.id} ${t.files ?? ""}`.trim())),
	);

	const retry = [];
	ready.forEach((t, i) => {
		const result = batch[i];
		if (result && result.ok) {
			done.add(t.id);
			reports[t.id] = clip(result.output);
			return;
		}
		failed.set(t.id, (result && result.error) || "child reported failure");
		retry.push(t);
	});

	if (retry.length) {
		console.log(`retry: ${retry.map((t) => t.id).join(" ")}`);
		const notes = new Map(retry.map((t) => [t.id, failed.get(t.id)]));
		const fixes = await runs.all(
			retry.map((t) => launch(t, `${t.id}.fix`, brief(t, notes.get(t.id)), `${t.id} retry`)),
		);
		retry.forEach((t, i) => {
			const result = fixes[i];
			if (result && result.ok) {
				done.add(t.id);
				reports[t.id] = clip(result.output);
				failed.delete(t.id);
			}
		});
	}
}

const reviewCfg = cfg.review ?? {};
let review = null;
if (!reviewCfg.skip && done.size) {
	const built = tasks.filter((t) => done.has(t.id));
	const packet = built.map((t) => `### ${t.id} (${t.files ?? "no files declared"})\n${reports[t.id]}`).join("\n\n");
	const reviewer = await runs.run(
		"review",
		launch(
			{ agent: reviewCfg.agent ?? "reviewer", model: reviewCfg.model, timeoutMs: reviewCfg.timeoutMs },
			"review",
			[
				`Review the wave described by the plan at ${plan}.`,
				"Read the plan, then check the files the children report against their contracts and verification commands.",
				reviewCfg.brief ?? "Report findings only, each as `file:line - problem - fix`. Do not edit anything. If there are no real findings, say so in one line.",
				`\nChild reports:\n${packet}`.slice(0, 60000),
			].join("\n"),
			"final review",
		),
	);
	review = reviewer && reviewer.ok ? clip(reviewer.output) : `review failed: ${(reviewer && reviewer.error) || "unknown"}`;
}

const stuck = tasks.filter((t) => !done.has(t.id) && !failed.has(t.id) && !skipped.has(t.id)).map((t) => t.id);

return {
	plan,
	waves,
	done: [...done],
	failed: [...failed].map(([id, reason]) => ({ id, reason })),
	skipped: [...skipped],
	stuck,
	review,
	reports,
};
