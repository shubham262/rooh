import "server-only";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { SOURCE_TYPE } from "@/constants";
import { UnreachableError } from "@/helpers/errors";
import { normalizeMarkdown } from "./provider";

/**
 * Keyless fallback extractor: fetch → Readability → markdown.
 *
 * Runs when TinyFish has no key or fails. It can't execute JavaScript, so it
 * returns little on client-rendered pages — that's fine, the caller treats thin
 * output as a failure and falls through.
 *
 * Note we never execute page scripts: JSDOM is constructed without
 * `runScripts`, so hostile markup can't run code in our process.
 */

const FETCH_TIMEOUT_MS = 15000;
const MAX_BYTES = 5 * 1024 * 1024;
const USER_AGENT =
	"Mozilla/5.0 (compatible; roohbot/0.1; +https://withrooh.com) AppleWebKit/537.36 Chrome/122 Safari/537.36";

let turndown = null;
function getTurndown() {
	if (!turndown) {
		turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
		turndown.remove(["script", "style", "noscript", "iframe", "svg"]);
	}
	return turndown;
}

async function fetchHtml(url) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	let response;
	try {
		response = await fetch(url, {
			redirect: "follow",
			signal: controller.signal,
			headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
		});
	} catch (cause) {
		clearTimeout(timer);
		throw new UnreachableError(
			"We couldn't reach that page. Check the URL is public and try again.",
			cause
		);
	}

	try {
		if (!response.ok) {
			throw new UnreachableError(
				`That page returned ${response.status}. It may be private, moved, or blocking automated access.`
			);
		}

		const contentType = response.headers.get("content-type") || "";
		if (!contentType.includes("html")) {
			throw new UnreachableError("That URL doesn't point at a readable web page.");
		}

		// Guard against multi-hundred-MB responses filling memory.
		const declared = Number(response.headers.get("content-length") || 0);
		if (declared > MAX_BYTES) {
			throw new UnreachableError("That page is too large to analyse.");
		}

		const html = await response.text();
		return { html: html.slice(0, MAX_BYTES), finalUrl: response.url || url };
	} finally {
		clearTimeout(timer);
	}
}

export const readabilityProvider = {
	name: SOURCE_TYPE.READABILITY,

	isAvailable() {
		return true;
	},

	async extract(url) {
		const { html, finalUrl } = await fetchHtml(url);

		const dom = new JSDOM(html, { url: finalUrl });
		const doc = dom.window.document;

		const siteName =
			doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content") || null;
		const docTitle = doc.title || null;

		const article = new Readability(doc).parse();

		// Readability returns null on pages it can't find an article in; fall
		// back to the body so the caller can judge the content on length alone.
		const contentHtml = article?.content || doc.body?.innerHTML || "";
		const markdown = normalizeMarkdown(getTurndown().turndown(contentHtml));

		return {
			markdown,
			title: article?.title || docTitle,
			siteName: article?.siteName || siteName,
			finalUrl,
			provider: SOURCE_TYPE.READABILITY,
		};
	},
};
