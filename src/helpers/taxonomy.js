/**
 * Controlled category taxonomy.
 *
 * The model is not allowed to invent categories — it must pick from this list.
 * Both the Zod enum and the prompt text are derived from this single array so
 * the two can never drift apart.
 */

export const CATEGORIES = Object.freeze([
	"Meditation",
	"Breathwork",
	"Yoga",
	"Therapy",
	"Coaching",
	"Personal Development",
	"Spirituality",
	"Fitness",
	"Other",
]);

/** Rendered into the system prompt so the allowed values are stated once. */
export const CATEGORY_PROMPT_LIST = CATEGORIES.join(", ");

export function isValidCategory(value) {
	return CATEGORIES.includes(value);
}
