import "server-only";
import { isValidDate, isPast, isEndBeforeStart, formatDate } from "@/helpers/dateHelpers";

/**
 * Everything a reviewer should know before approving, in plain language.
 *
 * These are warnings, not rejections. The system's job is to surface doubt, not
 * to make the publishing decision — so nothing here blocks a record, and
 * nothing is silently dropped or auto-corrected.
 */

const FIELD_LABELS = {
	"pricing.amount": "Price",
	"schedule.start": "Start date",
	"location.address": "Address",
	"location.city": "City",
	"provider.name": "Provider",
};

/** Rough ISO 4217 shape — we can't validate the code, only its form. */
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

/**
 * @returns {{issues: string[], validationScore: number}}
 *   validationScore is 0-100 and feeds the confidence calculation.
 */
export function buildIssues({ extraction, unsupportedFields, conflicts, duplicate }) {
	const issues = [];
	let checksRun = 0;
	let checksFailed = 0;

	const check = (failed, message) => {
		checksRun += 1;
		if (failed) {
			checksFailed += 1;
			issues.push(message);
		}
	};

	// --- Unsupported claims: a value with no verbatim quote behind it --------
	for (const field of unsupportedFields) {
		const label = FIELD_LABELS[field] ?? field;
		checksRun += 1;
		checksFailed += 1;
		issues.push(`${label} could not be verified from source evidence.`);
	}

	// --- Conflicts the model reported ---------------------------------------
	for (const conflict of conflicts ?? []) {
		checksRun += 1;
		checksFailed += 1;
		issues.push(`Conflicting information: ${conflict}`);
	}

	// --- Semantic validation Zod can't express ------------------------------
	const { schedule, pricing } = extraction;

	if (schedule?.start) {
		check(!isValidDate(schedule.start), `Start date "${schedule.start}" could not be parsed as a real date.`);

		if (isValidDate(schedule.start)) {
			check(
				isPast(schedule.start),
				`This experience appears to have already taken place (${formatDate(schedule.start)}). It may be out of date.`
			);
		}
	}

	if (schedule?.end) {
		check(!isValidDate(schedule.end), `End date "${schedule.end}" could not be parsed as a real date.`);
	}

	if (schedule?.start && schedule?.end) {
		check(
			isEndBeforeStart(schedule.start, schedule.end),
			"The end time is before the start time."
		);
	}

	if (pricing?.amount !== null && pricing?.amount !== undefined) {
		check(pricing.amount < 0, "Price is negative, which is not a valid value.");
		check(
			!pricing.currency,
			"A price was extracted but no currency was stated, so the amount is ambiguous."
		);
		if (pricing.currency) {
			check(
				!CURRENCY_PATTERN.test(pricing.currency),
				`Currency "${pricing.currency}" is not a recognised three-letter code.`
			);
		}
	}

	if (extraction.provider?.website) {
		let validUrl = true;
		try {
			new URL(extraction.provider.website);
		} catch {
			validUrl = false;
		}
		check(!validUrl, `Provider website "${extraction.provider.website}" is not a valid URL.`);
	}

	// --- Duplicates ---------------------------------------------------------
	// Flagged, never auto-merged or deleted: deciding two records are the same
	// thing is a judgement call, and getting it wrong silently loses data.
	if (duplicate) {
		issues.push(
			duplicate.reason === "url"
				? "Potential duplicate: this URL has already been analysed."
				: "Potential duplicate: an existing experience has the same title, provider, date and city."
		);
	}

	// --- Relevance ----------------------------------------------------------
	if (!extraction.relevance?.isRelevant) {
		issues.push("Flagged as not relevant to rooh — review before approving.");
	}

	const validationScore = checksRun === 0 ? 100 : Math.round(((checksRun - checksFailed) / checksRun) * 100);

	return { issues, validationScore };
}
