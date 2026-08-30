import "server-only";
import { SOURCE_TYPE, MIN_CONTENT_CHARS } from "@/constants";

/**
 * Confidence: how much we trust the extracted data.
 *
 * Computed here, in ordinary code, and never asked of the model. A model asked
 * to rate its own output rates its own fluency — it is confident precisely when
 * it has produced something coherent, which is exactly when a hallucination is
 * hardest to spot. So we score the things we can actually check.
 *
 * Confidence is NOT relevance. Relevance asks "does this belong on rooh"; the
 * model answers that from the content. Confidence asks "is this data right",
 * and a page can be highly relevant yet barely extractable, or trivially
 * extractable yet entirely irrelevant.
 *
 * Weights: completeness 30, evidence 30, validation 20, source quality 20.
 * Evidence and completeness dominate because they measure the two failure modes
 * that actually reach a reviewer — invented values and missing ones.
 */

const WEIGHTS = { completeness: 0.3, evidenceCoverage: 0.3, validation: 0.2, sourceQuality: 0.2 };

/**
 * How much the source itself inspires trust.
 *
 * Fixture content is capped low on purpose: demo mode must never be able to
 * present itself as a high-confidence live extraction.
 */
export function scoreSourceQuality({ provider, markdown, title, url }) {
	if (provider === SOURCE_TYPE.FIXTURE) return 25;

	let score = 0;

	// Enough text to have said something substantive.
	const length = markdown?.length ?? 0;
	if (length >= 4000) score += 40;
	else if (length >= 1500) score += 30;
	else if (length >= MIN_CONTENT_CHARS) score += 15;

	// A real <title> suggests a real page rather than an error or shell.
	if (title && title.trim().length > 3) score += 20;

	// JS-rendered pages give Readability almost nothing; TinyFish renders them.
	if (provider === SOURCE_TYPE.TINYFISH) score += 25;
	else if (provider === SOURCE_TYPE.READABILITY) score += 15;

	if (typeof url === "string" && url.startsWith("https://")) score += 15;

	return Math.min(100, score);
}

/**
 * @returns {{confidence: number, breakdown: {completeness: number, evidenceCoverage: number, validation: number, sourceQuality: number}}}
 */
export function scoreConfidence({ completeness, evidenceCoverage, validation, sourceQuality }) {
	const breakdown = {
		completeness: Math.round(completeness),
		evidenceCoverage: Math.round(evidenceCoverage),
		validation: Math.round(validation),
		sourceQuality: Math.round(sourceQuality),
	};

	const confidence = Math.round(
		breakdown.completeness * WEIGHTS.completeness +
			breakdown.evidenceCoverage * WEIGHTS.evidenceCoverage +
			breakdown.validation * WEIGHTS.validation +
			breakdown.sourceQuality * WEIGHTS.sourceQuality
	);

	return { confidence: Math.max(0, Math.min(100, confidence)), breakdown };
}

