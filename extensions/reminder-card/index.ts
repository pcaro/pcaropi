/**
 * Reminder Card — one short tip card per fresh interactive session.
 *
 * Wiring only: parsing and box rendering live in cards.ts (pure, zero pi
 * imports). The card is a custom transcript entry (`reminder-card:card`), so
 * it never enters LLM context. A broken or missing cards.md is always silent
 * here — only /remind reports it, startup must never fail because of it.
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseCards, renderCard, type Card } from "./cards.ts";

const EXTENSION_DIR = path.dirname(fileURLToPath(import.meta.url));
const CARDS_PATH = path.join(EXTENSION_DIR, "cards.md");
const SKILLS_PATH = path.join(EXTENSION_DIR, "skills");
const CARD_TYPE = "reminder-card:card";

/** Read cards.md. A missing or unreadable file means "no cards", never an error. */
function loadCards(): Card[] {
	try {
		return parseCards(readFileSync(CARDS_PATH, "utf8"));
	} catch {
		return [];
	}
}

function appendCard(pi: ExtensionAPI, card: Card): void {
	pi.appendEntry<Card>(CARD_TYPE, { index: card.index, title: card.title, lines: card.lines });
}

export default function reminderCardExtension(pi: ExtensionAPI) {
	// Ship the update-reminders skill with the plugin; the directory is scanned
	// for skills, same as the pi.skills entries in package.json.
	pi.on("resources_discover", () => ({ skillPaths: [SKILLS_PATH] }));

	pi.registerEntryRenderer<Card>(CARD_TYPE, (entry, _options, theme) => {
		const card = entry.data;
		if (!card || typeof card.title !== "string" || !Array.isArray(card.lines)) return undefined;
		return {
			render(width: number) {
				return renderCard(card, width, (color, s) => theme.fg(color, s));
			},
			invalidate() {
				// Static content, nothing to invalidate.
			},
		};
	});

	pi.on("session_start", (event, ctx) => {
		try {
			if (!ctx.hasUI) return;
			if (event.reason !== "startup" && event.reason !== "new") return;
			const cards = loadCards();
			if (cards.length === 0) return;
			appendCard(pi, cards[Math.floor(Math.random() * cards.length)]);
		} catch {
			// Never let card problems break session startup.
		}
	});

	pi.registerCommand("remind", {
		description: "Show a reminder card",
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			const cards = loadCards();
			if (cards.length === 0) {
				ctx.ui.notify("reminder-card: cards.md is missing or empty", "warning");
				return;
			}

			const trimmed = args.trim();
			if (trimmed === "list") {
				ctx.ui.notify(cards.map((card) => `${card.index}. ${card.title}`).join(" · "));
				return;
			}

			if (/^\d+$/.test(trimmed)) {
				const card = cards.find((c) => c.index === Number(trimmed));
				if (!card) {
					ctx.ui.notify(`card ${trimmed} not found (${cards.length} cards)`, "warning");
					return;
				}
				appendCard(pi, card);
				return;
			}

			if (trimmed === "") {
				appendCard(pi, cards[Math.floor(Math.random() * cards.length)]);
				return;
			}

			ctx.ui.notify(`usage: /remind [n | list] (${cards.length} cards)`, "warning");
		},
	});
}
