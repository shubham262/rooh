import "server-only";

/**
 * Match a newly analysed record against the ones the caller already holds.
 *
 * URL is checked before fingerprint because it is the stronger signal — the
 * same normalised address is the same page, full stop. The fingerprint catches
 * the harder case: one event published at two different URLs.
 *
 * Returns the matched record plus why it matched, so the reviewer can be told
 * which of the two it was. Null when nothing matches.
 *
 * @param {Array<{id: string, normalizedUrl: string, fingerprint: string}>} known
 * @param {{normalizedUrl: string, fingerprint: string}} candidate
 * @returns {{id: string, reason: "url"|"fingerprint"}|null}
 */
export function findDuplicate(known, { normalizedUrl, fingerprint }) {
	const byUrl = known.find((r) => r.normalizedUrl === normalizedUrl);
	if (byUrl) return { id: byUrl.id, reason: "url" };

	const byFingerprint = known.find((r) => r.fingerprint === fingerprint);
	if (byFingerprint) return { id: byFingerprint.id, reason: "fingerprint" };

	return null;
}
