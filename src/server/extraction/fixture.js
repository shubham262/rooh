import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { SOURCE_TYPE } from "@/constants";
import { normalizeMarkdown } from "./provider";

/**
 * Deterministic demo fixture.
 *
 * Used when live extraction is impossible (no keys, no network, a blocked
 * page) and ALLOW_FIXTURE_FALLBACK=1. It supplies *extraction output only* —
 * the AI, validation and scoring stages then run for real on top of it, so a
 * fixture run genuinely exercises the pipeline instead of replaying a canned
 * result.
 *
 * Two honesty rules, enforced downstream:
 *   - provider is tagged `fixture`, and the review UI shows a banner saying so.
 *   - source quality scores low for fixtures, so demo mode can never present
 *     itself as a high-confidence live extraction.
 *
 * `finalUrl` deliberately keeps the fixture's own URL rather than adopting the
 * URL the user typed — we must never imply this content came from their page.
 */

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "sample-experience.json");

let cached = null;

export const fixtureProvider = {
	name: SOURCE_TYPE.FIXTURE,

	isAvailable() {
		return true;
	},

	async extract() {
		if (!cached) {
			cached = JSON.parse(await fs.readFile(FIXTURE_PATH, "utf8"));
		}

		return {
			markdown: normalizeMarkdown(cached.markdown),
			title: cached.title ?? null,
			siteName: cached.siteName ?? null,
			finalUrl: cached.finalUrl,
			provider: SOURCE_TYPE.FIXTURE,
		};
	},
};
