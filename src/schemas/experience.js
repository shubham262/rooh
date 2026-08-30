import { z } from "zod";
import { CATEGORIES } from "@/helpers/taxonomy";
import { STATUS_VALUES, SOURCE_TYPE } from "@/constants";

/**
 * Two schemas, deliberately kept apart.
 *
 * `LlmExtractionSchema` is the ONLY thing the model is allowed to assert. It
 * covers observable facts plus the model's own relevance judgement.
 *
 * `ExperienceSchema` is the record we persist. Everything the model cannot be
 * trusted with — confidence, issues, duplicate flags, status, identifiers — is
 * added by server code after validation. Keeping these separate is what stops
 * a persuasive model from writing its own quality score.
 */

const nullableString = z.string().trim().min(1).nullable();

// ---------------------------------------------------------------------------
// What the model returns
// ---------------------------------------------------------------------------

/**
 * A verbatim quote from the source backing one extracted field.
 *
 * `snippet` must be copied character-for-character from the page content —
 * `quality/evidence.js` verifies it really appears there, which is how we
 * detect fabricated values.
 */
export const EvidenceSchema = z.object({
	field: z.string(),
	value: z.string(),
	snippet: z.string(),
});

export const LlmExtractionSchema = z.object({
	title: z.string().trim().min(1),
	description: z.string().trim().min(1),

	provider: z.object({
		name: nullableString,
		website: nullableString,
	}),

	category: z.enum(CATEGORIES),
	tags: z.array(z.string().trim().min(1)).max(12).default([]),

	location: z.object({
		name: nullableString,
		address: nullableString,
		city: nullableString,
		country: nullableString,
	}),

	schedule: z.object({
		// ISO 8601 where the source states one. Format is checked semantically
		// in quality/issues.js so a near-miss becomes a reviewer warning
		// rather than a hard pipeline failure.
		start: nullableString,
		end: nullableString,
		timezone: nullableString,
	}),

	pricing: z.object({
		amount: z.number().nonnegative().nullable(),
		currency: nullableString,
	}),

	relevance: z.object({
		isRelevant: z.boolean(),
		score: z.number().min(0).max(100),
		reason: z.string().trim().min(1),
	}),

	evidence: z.array(EvidenceSchema).default([]),

	/** Contradictions the model spotted, e.g. two different dates on one page. */
	conflicts: z.array(z.string()).default([]),
});

// ---------------------------------------------------------------------------
// What we persist
// ---------------------------------------------------------------------------

export const QualitySchema = z.object({
	confidence: z.number().min(0).max(100),
	/** Sub-scores are stored so the number stays explainable to a reviewer. */
	breakdown: z.object({
		completeness: z.number().min(0).max(100),
		evidenceCoverage: z.number().min(0).max(100),
		validation: z.number().min(0).max(100),
		sourceQuality: z.number().min(0).max(100),
	}),
	missingFields: z.array(z.string()).default([]),
	issues: z.array(z.string()).default([]),
});

export const ExperienceSchema = LlmExtractionSchema.omit({
	evidence: true,
	conflicts: true,
}).extend({
	id: z.string(),

	source: z.object({
		url: z.string().url(),
		normalizedUrl: z.string(),
		retrievedAt: z.string(),
		type: z.enum(Object.values(SOURCE_TYPE)),
	}),

	/** Evidence is carried through to the review UI, with verification applied. */
	evidence: z.array(EvidenceSchema.extend({ verified: z.boolean() })).default([]),

	quality: QualitySchema,

	/** Hash of title + provider + start + city, for deterministic dedupe. */
	fingerprint: z.string(),
	duplicateOf: z.string().nullable().default(null),

	status: z.enum(STATUS_VALUES),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/** Fields a human reviewer is allowed to correct before approving. */
export const ExperienceEditSchema = z
	.object({
		title: z.string().trim().min(1),
		description: z.string().trim().min(1),
		category: z.enum(CATEGORIES),
		tags: z.array(z.string().trim().min(1)).max(12),
		provider: z.object({ name: nullableString, website: nullableString }),
		location: z.object({
			name: nullableString,
			address: nullableString,
			city: nullableString,
			country: nullableString,
		}),
		schedule: z.object({
			start: nullableString,
			end: nullableString,
			timezone: nullableString,
		}),
		pricing: z.object({
			amount: z.number().nonnegative().nullable(),
			currency: nullableString,
		}),
	})
	.partial();

export const AnalyzeRequestSchema = z.object({
	url: z.string().trim().min(1),
});

export const ReviewRequestSchema = z.object({
	action: z.enum(["approve", "reject"]),
	notes: z.string().trim().max(2000).optional(),
});
