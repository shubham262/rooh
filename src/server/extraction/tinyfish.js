import "server-only";
import { env } from "@/server/env";
import { SOURCE_TYPE } from "@/constants";
import { UnreachableError } from "@/helpers/errors";
import { normalizeMarkdown } from "./provider";

/**
 * Primary extractor — TinyFish Fetch API.
 *
 * Renders pages in a real browser before extracting, which is the whole reason
 * to buy this rather than build it: a large share of event and retreat pages
 * are client-rendered, and a plain fetch returns an empty shell. Running and
 * maintaining headless browsers is a permanent infrastructure cost that is
 * nobody's differentiator.
 *
 * Errors propagate so the provider chain in index.js can fall back.
 */

const ENDPOINT = "https://api.fetch.tinyfish.ai";
const TIMEOUT_MS = 45000;

export const tinyfishProvider = {
	name: SOURCE_TYPE.TINYFISH,

	isAvailable() {
		return Boolean(env.tinyfishKey);
	},

	async extract(url) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

		let response;
		let payload;
		try {
			response = await fetch(ENDPOINT, {
				method: "POST",
				signal: controller.signal,
				headers: {
					"X-API-Key": env.tinyfishKey,
					"Content-Type": "application/json",
				},
				// The API accepts a batch of up to 10 URLs; we analyse one at a time.
				body: JSON.stringify({ urls: [url], format: "markdown" }),
			});
			payload = await response.json();
		} catch (cause) {
			throw new UnreachableError("The extraction service could not be reached.", cause);
		} finally {
			clearTimeout(timer);
		}

		if (!response.ok) {
			// Auth and quota failures are ours to fix, not the reviewer's — say so
			// distinctly rather than blaming their URL.
			const detail = payload?.error?.message || `HTTP ${response.status}`;
			throw new UnreachableError(`Extraction service error: ${detail}`);
		}

		// A failed page fetch comes back as HTTP 200 with an empty `results` and a
		// populated `errors` array. Checking only the status code would silently
		// treat a 404 as a successful empty extraction.
		const result = payload?.results?.[0];
		if (!result) {
			const failure = payload?.errors?.[0];
			throw new UnreachableError(
				failure
					? `That page could not be fetched (${failure.error}${failure.status ? `, HTTP ${failure.status}` : ""}).`
					: "That page returned no content."
			);
		}

		return {
			markdown: normalizeMarkdown(result.text ?? ""),
			title: result.title || null,
			// The Fetch API exposes no site name; the meta description is the
			// closest useful signal and gives the model a little extra context.
			siteName: result.description || null,
			finalUrl: result.final_url || result.url || url,
			provider: SOURCE_TYPE.TINYFISH,
		};
	},
};
