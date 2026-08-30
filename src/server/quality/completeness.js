import "server-only";
import { FIELD_WEIGHTS } from "@/constants";
import { getFieldValue } from "./evidence";

/**
 * Completeness: how much of the record we actually managed to fill.
 *
 * Weighted rather than a flat count, because the fields are not equally
 * important — a record missing its title is unusable, one missing a price is
 * merely incomplete.
 *
 * This measures how much we know, not whether the page was any good. A studio
 * that publishes no price still produces a legitimate record; the reviewer just
 * sees an honest gap rather than an invented number.
 */

const HUMAN_LABELS = {
	title: "title",
	description: "description",
	category: "category",
	"provider.name": "provider name",
	"location.city": "city",
	"schedule.start": "start date",
	"pricing.amount": "price",
};

function isPresent(value) {
	return value !== null && value !== undefined && value !== "";
}

export function scoreCompleteness(extraction) {
	const entries = Object.entries(FIELD_WEIGHTS);
	const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
	const earned = entries.reduce(
		(sum, [field, weight]) => (isPresent(getFieldValue(extraction, field)) ? sum + weight : sum),
		0
	);

	return Math.round((earned / total) * 100);
}

/** Human-readable list of what's absent, for the review UI. */
export function findMissingFields(extraction) {
	const missing = Object.keys(FIELD_WEIGHTS)
		.filter((field) => !isPresent(getFieldValue(extraction, field)))
		.map((field) => HUMAN_LABELS[field] ?? field);

	// Not weighted, but worth telling the reviewer about explicitly — these are
	// the two gaps that most often send someone back to the source page.
	if (!isPresent(getFieldValue(extraction, "schedule.end"))) missing.push("end time");
	if (!isPresent(getFieldValue(extraction, "location.address"))) missing.push("exact address");

	return missing;
}
