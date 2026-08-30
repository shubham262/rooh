/** Review lifecycle. Every new record starts at PENDING. */
export const STATUS = Object.freeze({
	PENDING: "pending_review",
	APPROVED: "approved",
	REJECTED: "rejected",
});

export const STATUS_VALUES = Object.freeze(Object.values(STATUS));

/** Audit-trail actions recorded against an experience. */
export const REVIEW_ACTION = Object.freeze({
	APPROVE: "approve",
	REJECT: "reject",
	EDIT: "edit",
});

/** Which extractor produced the content. `fixture` is demo mode and is labelled in the UI. */
export const SOURCE_TYPE = Object.freeze({
	TINYFISH: "tinyfish",
	READABILITY: "readability",
	FIXTURE: "fixture",
});

/**
 * Fields that matter for completeness scoring, and how much each is worth.
 *
 * Weights are relative, not percentages — completeness is (sum of present
 * weights / sum of all weights). Title and description carry the most because a
 * record without them is unusable; pricing carries least because plenty of
 * genuine experiences simply don't publish a price.
 */
export const FIELD_WEIGHTS = Object.freeze({
	title: 3,
	description: 3,
	category: 2,
	"provider.name": 2,
	"location.city": 2,
	"schedule.start": 2,
	"pricing.amount": 1,
});

/**
 * Fields whose extracted value must be backed by a verbatim source snippet.
 *
 * These are the fields most damaging to get wrong — a hallucinated price or
 * date sends a real person to the wrong place at the wrong time for the wrong
 * money. Evidence coverage is measured over exactly this set.
 */
export const EVIDENCE_REQUIRED_FIELDS = Object.freeze([
	"pricing.amount",
	"schedule.start",
	"location.address",
	"location.city",
	"provider.name",
]);

/** Upper bound on content handed to the model. Truncation is logged, never silent. */
export const MAX_CONTENT_CHARS = 24000;

/** Below this, the page yielded nothing worth analysing. */
export const MIN_CONTENT_CHARS = 200;
