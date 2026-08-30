import "server-only";
import { env } from "@/server/env";
import { MIN_CONTENT_CHARS } from "@/constants";
import { EmptyContentError } from "@/helpers/errors";
import { tinyfishProvider } from "./tinyfish";
import { readabilityProvider } from "./readability";
import { fixtureProvider } from "./fixture";

/**
 * Provider chain: TinyFish → Readability → (optionally) fixture.
 *
 * "Failure" includes returning too little text, not just throwing — a page that
 * renders its content with JavaScript will hand Readability a valid but nearly
 * empty document, and that should fall through rather than be analysed.
 */

function isUsable(result) {
	return Boolean(result?.markdown) && result.markdown.length >= MIN_CONTENT_CHARS;
}

export async function extractContent(url) {
	const attempts = [];
	const chain = [tinyfishProvider, readabilityProvider].filter((p) => p.isAvailable());

	for (const provider of chain) {
		try {
			const result = await provider.extract(url);
			if (isUsable(result)) return result;

			attempts.push(`${provider.name}: returned ${result?.markdown?.length ?? 0} chars`);
		} catch (error) {
			attempts.push(`${provider.name}: ${error.message}`);
		}
	}

	if (env.allowFixtureFallback) {
		console.warn(`[rooh] live extraction failed for ${url}; using fixture. ${attempts.join(" | ")}`);
		return fixtureProvider.extract();
	}

	console.warn(`[rooh] extraction failed for ${url}: ${attempts.join(" | ")}`);

	// A specific upstream failure (404, unreachable host) is more useful to the
	// reviewer than the generic "no content" message, so surface it if we have one.
	const specific = attempts.find((a) => a.includes(":"));
	throw new EmptyContentError(
		"We couldn't extract usable content from this page. Please verify that the URL is publicly accessible and isn't behind a login or paywall." +
			(specific ? `\n\nDetail: ${specific}` : "")
	);
}
