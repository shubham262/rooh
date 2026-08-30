import "server-only";

/**
 * Extraction provider contract.
 *
 * Every provider resolves to the same shape so the pipeline never knows or
 * cares which one ran. Swapping TinyFish for another service, or adding a
 * headless-browser provider later, means adding one file here — nothing
 * downstream changes.
 *
 * @typedef {Object} ExtractedContent
 * @property {string}      markdown  Cleaned page content as markdown.
 * @property {string|null} title     Page title, if the source exposed one.
 * @property {string|null} siteName  Publisher/site name, if available.
 * @property {string}      finalUrl  URL after redirects.
 * @property {"tinyfish"|"readability"|"fixture"} provider Which extractor ran.
 *
 * @typedef {Object} ExtractionProvider
 * @property {string} name
 * @property {() => boolean} isAvailable  Whether config allows this provider.
 * @property {(url: string) => Promise<ExtractedContent>} extract
 */

/** Collapse whitespace and strip artefacts that add tokens but no meaning. */
export function normalizeMarkdown(markdown) {
	if (!markdown) return "";
	return markdown
		.replace(/\r\n/g, "\n")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images carry no extractable facts
		.replace(/\n{3,}/g, "\n\n")
		.replace(/[ \t]{2,}/g, " ")
		.trim();
}
