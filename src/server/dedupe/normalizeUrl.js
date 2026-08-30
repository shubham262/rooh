import "server-only";

/**
 * URL normalisation for duplicate detection.
 *
 * The same experience reaches us through a newsletter link, a social share and
 * a direct paste, differing only in tracking parameters. Normalising first
 * means the cheapest possible duplicate check catches the most common case
 * before we spend anything on the model.
 */

const TRACKING_PARAMS = [
	/^utm_/i,
	/^fbclid$/i,
	/^gclid$/i,
	/^gbraid$/i,
	/^wbraid$/i,
	/^msclkid$/i,
	/^mc_(cid|eid)$/i,
	/^igshid$/i,
	/^ref$/i,
	/^ref_src$/i,
	/^source$/i,
	/^_ga$/i,
	/^yclid$/i,
];

export function normalizeUrl(rawUrl) {
	let url;
	try {
		url = new URL(rawUrl);
	} catch {
		return rawUrl.trim().toLowerCase();
	}

	url.protocol = url.protocol.toLowerCase();
	url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
	url.hash = "";

	for (const key of [...url.searchParams.keys()]) {
		if (TRACKING_PARAMS.some((pattern) => pattern.test(key))) {
			url.searchParams.delete(key);
		}
	}
	// Stable ordering so ?a=1&b=2 and ?b=2&a=1 collapse together.
	url.searchParams.sort();

	// Path case is significant on many servers, so only the trailing slash goes.
	if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
		url.pathname = url.pathname.slice(0, -1);
	}

	// Drop the default port, which is noise rather than identity.
	if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
		url.port = "";
	}

	return url.toString();
}
