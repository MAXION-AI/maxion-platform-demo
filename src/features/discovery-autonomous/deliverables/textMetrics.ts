// Inter's advance widths, in thousandths of an em, measured in SVG text from the
// self-hosted variable font (public/fonts/inter-variable.woff2) at the three
// weights the design system allows. Exhibits lay out their text from this table,
// so a label wraps before it reaches an edge and the layout is the same on every
// render and under test. The widths hold at the exhibit text size, 12px: Inter's
// optical-size axis sets small text about 8% wider than display text.
const GLYPHS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~·—×–→≠’‘“”…é"

export type TextWeight = 400 | 500 | 600

const ADVANCE: Record<TextWeight, readonly number[]> = {
	400: [
		281, 288, 466, 633, 642, 982, 644, 300, 365, 365, 645, 662, 288, 460, 288, 360, 631, 407, 610,
		618, 646, 593, 620, 585, 619, 620, 288, 302, 662, 662, 662, 511, 966, 704, 654, 730, 722, 601,
		590, 746, 743, 269, 571, 672, 565, 903, 753, 765, 639, 765, 644, 642, 646, 744, 704, 1009, 682,
		679, 629, 365, 314, 365, 471, 458, 323, 562, 612, 571, 612, 583, 333, 613, 591, 242, 242, 549,
		242, 876, 591, 600, 612, 612, 392, 528, 328, 591, 563, 818, 546, 563, 552, 426, 333, 426, 662,
		288, 1000, 662, 500, 954, 662, 261, 261, 440, 440, 864, 583,
	],
	500: [
		267, 304, 494, 638, 646, 993, 653, 313, 369, 369, 654, 667, 303, 463, 303, 370, 645, 415, 616,
		627, 656, 603, 630, 590, 629, 630, 303, 315, 667, 667, 667, 527, 983, 723, 657, 734, 722, 603,
		589, 748, 744, 273, 575, 688, 565, 913, 756, 767, 642, 769, 648, 646, 653, 740, 723, 1025, 701,
		696, 641, 369, 323, 369, 476, 465, 337, 568, 618, 577, 618, 587, 342, 619, 602, 252, 252, 559,
		252, 888, 601, 604, 618, 618, 400, 539, 338, 602, 575, 829, 557, 576, 559, 441, 346, 441, 667,
		303, 1000, 667, 500, 954, 667, 277, 277, 474, 471, 910, 587,
	],
	600: [
		253, 321, 523, 644, 650, 1004, 663, 326, 373, 373, 664, 673, 319, 465, 319, 379, 660, 423, 623,
		636, 666, 612, 640, 595, 640, 640, 319, 329, 673, 673, 673, 543, 999, 742, 659, 737, 722, 605,
		588, 749, 746, 277, 580, 703, 565, 922, 759, 769, 645, 773, 652, 650, 660, 736, 742, 1042, 720,
		714, 652, 373, 333, 373, 482, 472, 351, 574, 624, 583, 624, 591, 350, 626, 612, 262, 262, 570,
		262, 900, 612, 609, 624, 624, 407, 549, 347, 612, 588, 839, 569, 589, 566, 455, 359, 455, 673,
		319, 1000, 673, 500, 954, 673, 294, 294, 507, 501, 956, 591,
	],
}

const INDEX = new Map([...GLYPHS].map((glyph, index) => [glyph, index]))
// A glyph outside the table is costed as a wide capital, so a line only ever errs short.
const FALLBACK = 922
// Figures set with tabular-nums share one advance, whatever the digit (measured the same way).
const TABULAR_DIGIT: Record<TextWeight, number> = { 400: 648, 500: 648, 600: 647 }

// A face is a weight, or a weight with tabular figures for text styled with tabular-nums.
export type TextFace = TextWeight | { weight: TextWeight; tabular: true }
export const figures = (weight: TextWeight): TextFace => ({ weight, tabular: true })

export function textWidth(text: string, size: number, face: TextFace = 400) {
	const weight = typeof face === "number" ? face : face.weight
	const tabular = typeof face !== "number"
	const advances = ADVANCE[weight]
	let total = 0
	for (const glyph of text) {
		if (tabular && glyph >= "0" && glyph <= "9") {
			total += TABULAR_DIGIT[weight]
			continue
		}
		const index = INDEX.get(glyph)
		total += index === undefined ? FALLBACK : advances[index]
	}
	return (total * size) / 1000
}

// Greedy word wrap. A word wider than the line is split between characters
// rather than left to overflow. With maxLines, the last kept line ends in an
// ellipsis; the caller keeps the full text in the accessible name.
export function wrapText(text: string, maxWidth: number, size: number, weight: TextFace = 400, maxLines = Infinity): string[] {
	const fits = (line: string) => textWidth(line, size, weight) <= maxWidth
	const lines: string[] = []
	let line = ""
	for (const word of text.split(/\s+/).filter(Boolean)) {
		const candidate = line ? `${line} ${word}` : word
		if (fits(candidate)) {
			line = candidate
			continue
		}
		if (line) lines.push(line)
		line = word
		while (!fits(line)) {
			let cut = line.length - 1
			while (cut > 1 && !fits(line.slice(0, cut))) cut -= 1
			lines.push(line.slice(0, cut))
			line = line.slice(cut)
		}
	}
	if (line) lines.push(line)
	if (lines.length <= maxLines) return lines
	const kept = lines.slice(0, maxLines)
	let last = kept[maxLines - 1]
	while (last && !fits(`${last}…`)) last = last.slice(0, -1)
	kept[maxLines - 1] = `${last.trimEnd()}…`
	return kept
}

// A detail line such as "3 deploys/month · 41% coverage" breaks at its
// separators first, one part per line, before any part is broken between words.
export function wrapParts(text: string, maxWidth: number, size: number, weight: TextFace = 400, maxLines = Infinity, separator = " · "): string[] {
	if (textWidth(text, size, weight) <= maxWidth || !text.includes(separator)) return wrapText(text, maxWidth, size, weight, maxLines)
	const lines = text.split(separator).flatMap((part) => wrapText(part, maxWidth, size, weight))
	return lines.length <= maxLines ? lines : wrapText(text, maxWidth, size, weight, maxLines)
}
