import "server-only";
import dns from "node:dns/promises";
import net from "node:net";
import { InvalidUrlError } from "@/helpers/errors";

/**
 * URL validation for server-side fetching (SSRF guard).
 *
 * The user hands us an arbitrary URL and we fetch it from inside our own
 * network. Without this, someone could point the analyser at 169.254.169.254
 * (cloud metadata) or an internal host and read the response back out of the
 * extracted content. So: public HTTP(S) only, and the resolved IP must be
 * globally routable.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** RFC1918 + loopback + link-local + CGNAT + unique-local v6. */
function isPrivateAddress(ip) {
	if (net.isIPv4(ip)) {
		const [a, b] = ip.split(".").map(Number);
		if (a === 10) return true;
		if (a === 127) return true;
		if (a === 0) return true;
		if (a === 169 && b === 254) return true; // link-local / cloud metadata
		if (a === 172 && b >= 16 && b <= 31) return true;
		if (a === 192 && b === 168) return true;
		if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
		if (a >= 224) return true; // multicast + reserved
		return false;
	}

	if (net.isIPv6(ip)) {
		const addr = ip.toLowerCase();
		if (addr === "::1" || addr === "::") return true;
		if (addr.startsWith("fe80")) return true; // link-local
		if (addr.startsWith("fc") || addr.startsWith("fd")) return true; // unique-local
		// IPv4-mapped (::ffff:10.0.0.1) — re-check the embedded v4 address.
		const mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
		if (mapped) return isPrivateAddress(mapped[1]);
		return false;
	}

	return true; // unparseable: refuse rather than guess
}

/**
 * Parse and validate a user-supplied URL.
 *
 * Returns the parsed URL. Throws InvalidUrlError with a reviewer-readable
 * message on anything suspicious.
 */
export async function assertSafeUrl(rawUrl) {
	let parsed;
	try {
		// Bare domains are a common paste; assume https rather than reject.
		const candidate = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
		parsed = new URL(candidate);
	} catch (cause) {
		throw new InvalidUrlError("That doesn't look like a valid web address.", cause);
	}

	if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
		throw new InvalidUrlError("Only http and https addresses can be analysed.");
	}

	if (parsed.username || parsed.password) {
		throw new InvalidUrlError("URLs containing credentials aren't supported.");
	}

	const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

	// A literal IP needs no lookup — check it directly.
	if (net.isIP(hostname)) {
		if (isPrivateAddress(hostname)) {
			throw new InvalidUrlError("That address is not publicly reachable.");
		}
		return parsed;
	}

	if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".internal")) {
		throw new InvalidUrlError("That address is not publicly reachable.");
	}

	let records;
	try {
		records = await dns.lookup(hostname, { all: true });
	} catch (cause) {
		throw new InvalidUrlError(
			`We couldn't find a site at "${hostname}". Check the address and try again.`,
			cause
		);
	}

	// Every resolved address must be public — a hostname that resolves to both
	// a public and a private IP is a classic DNS-rebinding shape.
	if (records.some((r) => isPrivateAddress(r.address))) {
		throw new InvalidUrlError("That address resolves to a private network and can't be analysed.");
	}

	return parsed;
}
