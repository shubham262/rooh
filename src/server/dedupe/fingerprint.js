import "server-only";
import crypto from "node:crypto";

/**
 * Content fingerprint for duplicate detection.
 *
 * Deliberately deterministic and exact-match. It catches the case that actually
 * matters at this stage — the same event submitted twice from different URLs —
 * without the cost or opacity of embeddings.
 *
 * It will NOT catch a genuine duplicate whose title was reworded ("Morning
 * Breathwork" vs "Breathwork: Morning Session"). That's the known limitation,
 * and it's why semantic dedupe with embeddings is the natural V4 upgrade. What
 * we get in exchange today is a check a reviewer can reason about: two records
 * collide only when their title, provider, date and city all agree.
 */

function normalizeToken(value) {
	if (value === null || value === undefined) return "";
	return String(value)
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "") // strip accents so "São Paulo" == "Sao Paulo"
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

/** Date-only, so a timezone-shifted or time-adjusted restatement still matches. */
function normalizeDate(value) {
	if (!value) return "";
	const match = String(value).match(/\d{4}-\d{2}-\d{2}/);
	return match ? match[0] : normalizeToken(value);
}

export function buildFingerprint(extraction) {
	const parts = [
		normalizeToken(extraction.title),
		normalizeToken(extraction.provider?.name),
		normalizeDate(extraction.schedule?.start),
		normalizeToken(extraction.location?.city),
	];

	return crypto.createHash("sha256").update(parts.join("|")).digest("hex");
}
