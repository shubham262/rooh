import "server-only";
import { LlmExtractionSchema } from "@/schemas/experience";
import { CATEGORY_PROMPT_LIST } from "@/helpers/taxonomy";
import { MAX_CONTENT_CHARS } from "@/constants";
import { AiUnavailableError, MalformedAiOutputError } from "@/helpers/errors";
import { assertAiConfigured } from "@/server/env";
import { claudeSonnet46, getBedrockModel } from "./bedrock";

/**
 * The single AI step in the pipeline.
 *
 * The model does exactly four things: pull facts out of the page, write a
 * concise description, pick a category from a fixed list, and judge whether the
 * experience belongs on rooh. It does NOT score its own confidence, decide
 * duplicates, or set status — those are computed deterministically afterwards,
 * so a confident-sounding model can't talk its way past our quality gate.
 *
 * Structured output is enforced via Bedrock Converse tool-calling (that's what
 * withStructuredOutput compiles to), so we get JSON shaped like the schema
 * rather than prose we'd have to parse.
 */

const SYSTEM_PROMPT = `You extract structured data about personal-growth experiences from web page content for rooh, a platform for intentional personal growth.

You will be given the cleaned text content of a single web page. Extract only what that content actually states.

## The rule that matters most

If the page does not explicitly state something, return null for it. Do not infer, estimate, or complete it from world knowledge.

Never invent: price, currency, dates, times, timezone, street address, city, country, provider name, provider website, duration, or availability.

A missing field is a correct answer. A plausible guess is a serious error — a reviewer trusts these values, and a wrong price or date sends a real person to the wrong place at the wrong time.

Specifically:
- "Every Saturday" is not a date. schedule.start stays null unless a specific date is given.
- A city named only in a phrase like "serving the Berlin area" is not a venue location.
- Do not convert currencies or normalise prices. Record the number and currency as stated.
- If the page gives a price range or several ticket tiers, record the lowest headline price and note the range in conflicts.

## Dates without a year

Event pages routinely give a date with no year ("Monday, September 7"). You are told today's date below. Resolve such a date to the next occurrence on or after today, and use the weekday as a check: if the page names a weekday, pick the year in which that date actually falls on that weekday.

Never default to the current year without checking the weekday. Getting the year wrong makes a future event look expired.

If the page gives no year and no weekday, and more than one year is plausible, still return your best resolution — and add a note to conflicts saying the year was inferred.

## Evidence

For every non-null value of these fields — pricing.amount, schedule.start, location.address, location.city, provider.name — you must include an entry in "evidence" containing:
- field: the dotted field path, e.g. "pricing.amount"
- value: the value you extracted, as a string
- snippet: a short quote COPIED CHARACTER-FOR-CHARACTER from the page content that supports it

The snippet must appear verbatim in the content you were given. Do not paraphrase, tidy, reflow, or translate it. Copy it exactly, including its punctuation and currency symbols. Keep it under about 200 characters.

This is checked automatically against the source text. A snippet that does not appear in the content is treated as a fabrication and the value is flagged for the reviewer.

If you cannot find a verbatim quote supporting a value, set that field to null instead of inventing a snippet.

## Conflicts

"conflicts" is ONLY for genuine contradictions: the page states two different values for the same thing — two dates, two prices, two venues. Do not silently pick one. Extract the one that appears most authoritative and add a plain-language note describing the disagreement, e.g. "The header says 12 September but the booking section says 19 September."

Do NOT put missing information in conflicts. If the page simply doesn't state a price, a timezone or an end time, the correct response is null for that field and nothing in conflicts — absent fields are already reported separately. Filling conflicts with "no price was shown" buries the real contradictions a reviewer needs to see.

An empty conflicts array is the normal, expected result for a well-formed page.

## Category

Choose exactly one category from this list, and nothing else:
${CATEGORY_PROMPT_LIST}

Use "Other" when the experience is genuinely growth-oriented but fits none of the specific categories. Do not invent new categories.

## Relevance

Judge whether this experience meaningfully supports intentional personal growth — the kind of thing someone would seek out to develop themselves: meditation, breathwork, yoga, therapy, coaching, personal-development workshops, wellness and growth-oriented retreats.

Being an event is NOT evidence of relevance. A concert, a product launch, a trade show, a sports fixture, a restaurant booking, or a tech conference is not a personal-growth experience, even when it is well-run and enjoyable.

Set relevance.score from 0 to 100 to express how central this is to personal growth, set isRelevant to whether it belongs on rooh at all, and give a one-or-two-sentence reason citing what the page actually says.

If the page is not an experience at all — a homepage, a blog post, a listing index, a product page — set isRelevant to false and say so in the reason.

## Description

Write 2-4 sentences describing what a participant would actually experience. Ground it in the page content. Do not use marketing language the page itself doesn't use, and do not add benefits the page doesn't claim.

## Tags

Up to 8 short lowercase tags drawn from what the page describes, e.g. "beginner-friendly", "silent", "weekend", "residential".`;

function buildUserPrompt({ url, title, siteName, markdown }) {
	// The model has no clock. Without today's date it cannot resolve a year-less
	// date like "Monday, September 7", and a wrong year makes an upcoming event
	// look expired.
	const today = new Date();
	const todayLine = `Today's date: ${today.toISOString().slice(0, 10)} (${today.toLocaleDateString("en-GB", { weekday: "long" })})`;

	return `${todayLine}
Source URL: ${url}
${title ? `Page title: ${title}\n` : ""}${siteName ? `Site name: ${siteName}\n` : ""}
--- BEGIN PAGE CONTENT ---
${markdown}
--- END PAGE CONTENT ---

Extract the experience described by this page. Remember: null for anything the content does not explicitly state, and every evidence snippet must be copied verbatim from between the markers above.`;
}

function selectModel() {
	const override = process.env.BEDROCK_MODEL_ID;
	return override ? getBedrockModel(override) : claudeSonnet46;
}

/**
 * @param {{url: string, title: string|null, siteName: string|null, markdown: string}} source
 * @returns {Promise<import("zod").infer<typeof LlmExtractionSchema>>}
 */
export async function extractExperience(source) {
	assertAiConfigured();

	let markdown = source.markdown;
	if (markdown.length > MAX_CONTENT_CHARS) {
		console.warn(
			`[rooh] content truncated for ${source.url}: ${markdown.length} -> ${MAX_CONTENT_CHARS} chars`
		);
		markdown = markdown.slice(0, MAX_CONTENT_CHARS);
	}

	const model = selectModel().withStructuredOutput(LlmExtractionSchema, {
		name: "extract_experience",
	});

	let raw;
	try {
		raw = await model.invoke([
			{ role: "system", content: SYSTEM_PROMPT },
			{ role: "user", content: buildUserPrompt({ ...source, markdown }) },
		]);
	} catch (cause) {
		console.error("[rooh] Bedrock call failed:", cause);
		throw new AiUnavailableError(
			"The analysis service is unavailable right now. Please try again shortly.",
			cause
		);
	}

	// Re-validate independently of the helper: it is a convenience, not a
	// guarantee, and everything downstream assumes this shape holds.
	const parsed = LlmExtractionSchema.safeParse(raw);
	if (!parsed.success) {
		console.error("[rooh] AI output failed validation:", parsed.error.issues);
		throw new MalformedAiOutputError(
			"The analysis returned data we couldn't validate. This page may use an unusual format.",
			parsed.error
		);
	}

	// The truncated text is what evidence must be verified against — returning
	// it keeps verification honest when a long page was cut.
	return { extraction: parsed.data, analysedContent: markdown };
}
