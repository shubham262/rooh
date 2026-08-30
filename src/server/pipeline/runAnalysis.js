import "server-only";
import crypto from "node:crypto";
import { STATUS } from "@/constants";
import { ExperienceSchema } from "@/schemas/experience";
import { MalformedAiOutputError } from "@/helpers/errors";
import { assertSafeUrl } from "@/server/urlGuard";
import { extractContent } from "@/server/extraction";
import { extractExperience } from "@/server/ai/extractExperience";
import { verifyEvidence, findUnsupportedFields, scoreEvidenceCoverage } from "@/server/quality/evidence";
import { scoreCompleteness, findMissingFields } from "@/server/quality/completeness";
import { buildIssues } from "@/server/quality/issues";
import { scoreConfidence, scoreSourceQuality } from "@/server/quality/confidence";
import { normalizeUrl } from "@/server/dedupe/normalizeUrl";
import { buildFingerprint } from "@/server/dedupe/fingerprint";
import { findDuplicate } from "@/server/dedupe/findDuplicate";

/**
 * The whole ingestion flow, in order.
 *
 * Exactly one step involves a model. Everything after it is deterministic, so
 * the same extraction always produces the same scores, issues and duplicate
 * verdict — which is what makes the output reviewable rather than merely
 * plausible.
 *
 * This function is pure with respect to storage: it returns a finished record
 * and persists nothing. The client owns the store (see stores/experienceStore),
 * because on serverless there is no reliable server-side memory between one
 * request and the next.
 *
 * @param {string} rawUrl
 * @param {Array<{id: string, normalizedUrl: string, fingerprint: string}>} knownRecords
 *   The caller's existing records, used for duplicate detection. Empty is fine —
 *   it just means nothing can be recognised as a repeat.
 *
 * Every failure mode throws a typed AppError carrying a message written for a
 * human; the route handler turns that into a status code.
 */
export async function runAnalysis(rawUrl, knownRecords = []) {
	// 1. Validate the URL and refuse anything pointing inside our network.
	const safeUrl = await assertSafeUrl(rawUrl);
	const url = safeUrl.toString();

	// 2. Fetch and clean the page.
	const content = await extractContent(url);

	// 3. The single AI step. Returns the exact text it analysed, so evidence is
	//    verified against what the model actually saw rather than the full page.
	const { extraction, analysedContent } = await extractExperience({
		url,
		title: content.title,
		siteName: content.siteName,
		markdown: content.markdown,
	});

	// 4. Verify each claimed quote really appears in the source.
	const evidence = verifyEvidence(extraction.evidence, analysedContent);
	const unsupportedFields = findUnsupportedFields(extraction, evidence);

	// 5. Deduplicate against the caller's existing records: normalised URL first
	//    (the stronger signal — the same address is the same page), then content
	//    fingerprint for the same event published at two different URLs.
	const normalizedUrl = normalizeUrl(content.finalUrl || url);
	const fingerprint = buildFingerprint(extraction);
	const duplicate = findDuplicate(knownRecords, { normalizedUrl, fingerprint });

	// 6. Assemble reviewer-facing issues and the validation sub-score.
	const { issues, validationScore } = buildIssues({
		extraction,
		unsupportedFields,
		conflicts: extraction.conflicts,
		duplicate,
	});

	// 7. Score confidence deterministically from what we could verify.
	const { confidence, breakdown } = scoreConfidence({
		completeness: scoreCompleteness(extraction),
		evidenceCoverage: scoreEvidenceCoverage(extraction, evidence),
		validation: validationScore,
		sourceQuality: scoreSourceQuality({
			provider: content.provider,
			markdown: content.markdown,
			title: content.title,
			url: content.finalUrl || url,
		}),
	});

	const retrievedAt = new Date().toISOString();

	const record = {
		id: crypto.randomUUID(),

		title: extraction.title,
		description: extraction.description,
		provider: extraction.provider,
		category: extraction.category,
		tags: extraction.tags,
		location: extraction.location,
		schedule: extraction.schedule,
		pricing: extraction.pricing,
		relevance: extraction.relevance,

		source: {
			// The URL the user gave, not the fixture's — except in fixture mode,
			// where finalUrl stays the fixture's own so we never imply the
			// content came from their page.
			url: content.provider === "fixture" ? content.finalUrl : url,
			normalizedUrl,
			retrievedAt,
			type: content.provider,
			contentHash: crypto.createHash("sha256").update(content.markdown).digest("hex"),
		},

		evidence,
		quality: {
			confidence,
			breakdown,
			missingFields: findMissingFields(extraction),
			issues,
		},

		fingerprint,
		duplicateOf: duplicate?.id ?? null,

		// Nothing is ever auto-published. Every record waits for a human.
		status: STATUS.PENDING,
		createdAt: retrievedAt,
		updatedAt: retrievedAt,
	};

	// Final gate: our own assembled record must satisfy the persisted schema.
	const validated = ExperienceSchema.safeParse(record);
	if (!validated.success) {
		console.error("[rooh] assembled record failed validation:", validated.error.issues);
		throw new MalformedAiOutputError(
			"We produced a record we couldn't validate. This page may use an unusual format.",
			validated.error
		);
	}

	return validated.data;
}
