/**
 * Reminder Card — pure parser and renderer for the texts in cards.md.
 *
 * Zero runtime imports from pi packages or pi-tui, so this module runs under
 * plain Node (the quickcheck renders real cards as evidence) and never needs
 * a session. Geometry is ANSI-naive: lines are padded to their exact visible
 * width first and colorized second, so wrapping never sees escape codes.
 */

export type Card = { index: number; title: string; lines: string[] };
export type Fg = (color: string, s: string) => string;

/** Narrower render requests are clamped up to this before subtracting the box padding. */
const MIN_WIDTH = 24;

const SEPARATOR_RE = /^---\s*$/;
const TITLE_RE = /^#\s+(.+)$/;
/** Inline tokens that get accent color inside an otherwise "text" body line. */
const TOKEN_RE = /(`[^`]+`|\/[^\s`]+)/g;

const FOOTER = "/remind for another";

const isBlank = (line: string): boolean => line.trim() === "";

/** Word-wrap one source line; blank lines stay blank, overlong words hard-split. */
function wrapLine(line: string, contentWidth: number): string[] {
	if (isBlank(line)) return [""];
	const out: string[] = [];
	let current = "";
	for (const word of line.split(" ").filter((w) => w !== "")) {
		if (word.length > contentWidth) {
			if (current !== "") {
				out.push(current);
				current = "";
			}
			for (let i = 0; i < word.length; i += contentWidth) {
				out.push(word.slice(i, i + contentWidth));
			}
			continue;
		}
		if (current === "") {
			current = word;
		} else if (current.length + 1 + word.length <= contentWidth) {
			current += " " + word;
		} else {
			out.push(current);
			current = word;
		}
	}
	if (current !== "") out.push(current);
	return out;
}

/** Reflow paragraphs: join soft-wrapped source lines so the renderer wraps to its own width. */
function reflowParagraphs(lines: string[]): string[] {
	const out: string[] = [];
	let paragraph: string[] = [];
	const flush = () => {
		if (paragraph.length === 0) return;
		if (out.length > 0) out.push("");
		out.push(paragraph.join(" "));
		paragraph = [];
	};
	for (const line of lines) {
		if (isBlank(line)) flush();
		else paragraph.push(line.trim());
	}
	flush();
	return out;
}

/**
 * Parse cards.md into cards. Blocks are separated by lines of `---`; the first
 * non-blank line of a block must be a `# Title` heading. Blocks without a
 * heading or with an all-blank body are dropped; indexes are assigned 1..n
 * after filtering.
 */
export function parseCards(raw: string): Card[] {
	const blocks: string[][] = [[]];
	for (const line of raw.split(/\r?\n/)) {
		if (SEPARATOR_RE.test(line)) blocks.push([]);
		else blocks[blocks.length - 1].push(line);
	}

	const cards: Card[] = [];
	for (const block of blocks) {
		while (block.length > 0 && isBlank(block[0])) block.shift();
		while (block.length > 0 && isBlank(block[block.length - 1])) block.pop();
		if (block.length === 0) continue;

		const title = block[0].match(TITLE_RE);
		if (!title) continue;

		const lines = reflowParagraphs(block.slice(1));
		if (lines.length === 0) continue;

		cards.push({ index: 0, title: title[1].trim(), lines });
	}
	cards.forEach((card, i) => (card.index = i + 1));
	return cards;
}

/** Colorize one wrapped body line: `/commands` and `` `code` `` in accent, the rest in text. */
function colorBodyLine(content: string, fg: Fg): string {
	let colored = "";
	let last = 0;
	for (const match of content.matchAll(TOKEN_RE)) {
		const before = content.slice(last, match.index);
		if (before !== "") colored += fg("text", before);
		colored += fg("accent", match[0]);
		last = match.index + match[0].length;
	}
	const rest = content.slice(last);
	if (rest !== "") colored += fg("text", rest);
	return colored;
}

/**
 * Render a card as a rounded box. Every line is exactly max(MIN_WIDTH, width)
 * visible characters (ANSI codes, if any, never change that). The default fg
 * is the identity, so plain-text output contains no ANSI at all.
 */
export function renderCard(card: Card, width: number, fg: Fg = (_color, s) => s): string[] {
	const boxWidth = Math.max(MIN_WIDTH, width);
	const contentWidth = boxWidth - 4;
	const line = (inner: string): string => fg("dim", "│ ") + inner + fg("dim", " │");

	const out: string[] = [];
	out.push(fg("dim", "╭─ ") + fg("accent", "Reminder") + fg("dim", ` ${"─".repeat(boxWidth - 13)}╮`));
	for (const titleLine of wrapLine(card.title, contentWidth)) {
		out.push(line(fg("accent", titleLine) + " ".repeat(contentWidth - titleLine.length)));
	}
	out.push(line(" ".repeat(contentWidth)));
	for (const paragraph of card.lines) {
		for (const wrapped of wrapLine(paragraph, contentWidth)) {
			out.push(line(colorBodyLine(wrapped, fg) + " ".repeat(contentWidth - wrapped.length)));
		}
	}
	out.push(line(" ".repeat(contentWidth)));
	out.push(line(fg("dim", FOOTER) + " ".repeat(contentWidth - FOOTER.length)));
	out.push(fg("dim", `╰${"─".repeat(boxWidth - 2)}╯`));
	return out;
}
