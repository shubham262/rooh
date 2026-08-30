import moment from "moment";

/**
 * Date handling, shared by the server pipeline and the review UI.
 *
 * The model returns dates as strings copied or inferred from arbitrary pages,
 * so nothing here assumes a valid ISO 8601 value. Parsing is non-strict on
 * purpose: "September 12, 2026" from a real page should be usable, and it is
 * the reviewer's job — not a regex's — to reject something genuinely wrong.
 */

/** @returns {moment.Moment|null} */
export function parseDate(value) {
	if (!value) return null;
	const parsed = moment(value, moment.ISO_8601, true);
	if (parsed.isValid()) return parsed;

	// Fall back to loose parsing for pages that don't publish ISO dates.
	const loose = moment(new Date(value));
	return loose.isValid() ? loose : null;
}

export function isValidDate(value) {
	return parseDate(value) !== null;
}

/** True when the date has already passed — the record is stale. */
export function isPast(value) {
	const parsed = parseDate(value);
	return parsed ? parsed.isBefore(moment()) : false;
}

/** True when `end` precedes `start`, which is always a data error. */
export function isEndBeforeStart(start, end) {
	const s = parseDate(start);
	const e = parseDate(end);
	if (!s || !e) return false;
	return e.isBefore(s);
}

export function formatDateTime(value) {
	const parsed = parseDate(value);
	return parsed ? parsed.format("D MMM YYYY, HH:mm") : null;
}

export function formatDate(value) {
	const parsed = parseDate(value);
	return parsed ? parsed.format("D MMM YYYY") : null;
}

export function formatRelative(value) {
	const parsed = parseDate(value);
	return parsed ? parsed.fromNow() : null;
}

/** ISO 8601 string for a moment/Date, or null. Used when saving reviewer edits. */
export function toIso(value) {
	if (!value) return null;
	const parsed = moment.isMoment(value) ? value : parseDate(value);
	return parsed && parsed.isValid() ? parsed.toISOString() : null;
}
