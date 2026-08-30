/**
 * Display formatting shared across the review UI.
 *
 * Everything here handles null, because null is a legitimate and common value:
 * the pipeline records "the page didn't say" rather than guessing.
 */

import { STATUS } from "@/constants";

/** The em-dash placeholder for a field the source never stated. */
export const NOT_STATED = "—";

export function formatPrice(amount, currency) {
	if (amount === null || amount === undefined) return NOT_STATED;
	if (amount === 0) return "Free";

	if (currency) {
		try {
			return new Intl.NumberFormat("en-GB", {
				style: "currency",
				currency,
				maximumFractionDigits: 2,
			}).format(amount);
		} catch {
			// Unrecognised currency code — show it verbatim rather than lose it.
			return `${amount} ${currency}`;
		}
	}
	return String(amount);
}

export function formatLocation(location) {
	if (!location) return NOT_STATED;
	const parts = [location.name, location.address, location.city, location.country].filter(Boolean);
	return parts.length ? parts.join(", ") : NOT_STATED;
}

export function orDash(value) {
	return value === null || value === undefined || value === "" ? NOT_STATED : value;
}

/** antd colour tokens per status. */
export const STATUS_META = {
	[STATUS.PENDING]: { label: "Pending review", color: "gold" },
	[STATUS.APPROVED]: { label: "Approved", color: "green" },
	[STATUS.REJECTED]: { label: "Rejected", color: "red" },
};

/**
 * Score colouring, shared by both meters so the thresholds stay consistent.
 * Deliberately conservative: anything under 50 is red, because a mid score on
 * extracted data means real doubt, not a passing grade.
 */
export function scoreColor(score) {
	if (score >= 80) return "#52c41a";
	if (score >= 50) return "#faad14";
	return "#ff4d4f";
}

export function scoreLabel(score) {
	if (score >= 80) return "High";
	if (score >= 50) return "Moderate";
	return "Low";
}

export function hostnameOf(url) {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}
