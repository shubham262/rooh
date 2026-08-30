import "server-only";
import { EVIDENCE_REQUIRED_FIELDS } from "@/constants";

/**
 * Evidence verification — the anti-hallucination check.
 *
 * The model claims a value and supplies a quote it says came from the page. We
 * check the quote is actually there. If it isn't, the model either paraphrased
 * (sloppy) or invented the value outright (dangerous), and either way the
 * reviewer needs to know before that price or date reaches the platform.
 *
 * This is the one place where "the LLM proposes, deterministic code decides"
 * becomes literal, and it costs a string comparison.
 */

/**
 * Normalise for comparison without destroying meaning.
 *
 * Markdown extraction reflows whitespace and converts quotes, so a model
 * copying faithfully from what it was shown can still differ byte-for-byte
 * from our stored text. We forgive exactly those differences and nothing more:
 * a changed number or word still fails.
 */
function normalizeForMatch(text) {
	return text
		.toLowerCase()
		.replace(/[‘’‛]/g, "'")
		.replace(/[“”]/g, '"')
		.replace(/[–—]/g, "-")
		.replace(/ /g, " ")
		.replace(/[*_`#>]/g, "") // markdown emphasis the model may have dropped
		.replace(/\s+/g, " ")
		.trim();
}

/** Read "location.city" style paths off the extraction object. */
export function getFieldValue(obj, dottedPath) {
	return dottedPath.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function isPresent(value) {
	return value !== null && value !== undefined && value !== "";
}

/**
 * Verify every evidence entry against the exact content the model was shown.
 *
 * @param {Array<{field: string, value: string, snippet: string}>} evidence
 * @param {string} sourceContent The markdown passed to the model (post-truncation).
 * @returns {Array<{field: string, value: string, snippet: string, verified: boolean}>}
 */
export function verifyEvidence(evidence, sourceContent) {
	const haystack = normalizeForMatch(sourceContent);

	return (evidence ?? []).map((item) => {
		const needle = normalizeForMatch(item.snippet ?? "");

		// The minimum only rejects empty or single-character junk. It used to be
		// higher, to stop short snippets matching by luck — but that produced
		// false positives on legitimately short evidence: a price quoted as
		// "£20.00" is six characters and genuinely unambiguous, yet was being
		// reported as unverifiable. Sending a reviewer to chase a value that is
		// plainly on the page costs more trust than the coincidence risk it
		// avoided. Snippet quality is enforced in the prompt instead, which asks
		// for a full phrase rather than a bare value.
		const verified = needle.length >= 4 && haystack.includes(needle);
		return { ...item, verified };
	});
}

/**
 * Which important fields carry a value but no verified quote.
 *
 * These are the candidates for "could not be verified from source evidence"
 * issues, and they drag the confidence score down.
 */
export function findUnsupportedFields(extraction, verifiedEvidence) {
	const verifiedFields = new Set(
		verifiedEvidence.filter((e) => e.verified).map((e) => e.field)
	);

	return EVIDENCE_REQUIRED_FIELDS.filter(
		(field) => isPresent(getFieldValue(extraction, field)) && !verifiedFields.has(field)
	);
}

/**
 * Evidence coverage, 0-100.
 *
 * Measured only over important fields that actually have a value: a page that
 * genuinely states no price shouldn't be penalised for having no price
 * evidence. When none of the important fields were extracted there is nothing
 * to verify, and we return 0 rather than a free 100 — an empty extraction is
 * not a well-evidenced one.
 */
export function scoreEvidenceCoverage(extraction, verifiedEvidence) {
	const populated = EVIDENCE_REQUIRED_FIELDS.filter((field) =>
		isPresent(getFieldValue(extraction, field))
	);

	if (populated.length === 0) return 0;

	const verifiedFields = new Set(
		verifiedEvidence.filter((e) => e.verified).map((e) => e.field)
	);
	const covered = populated.filter((field) => verifiedFields.has(field)).length;

	return Math.round((covered / populated.length) * 100);
}
