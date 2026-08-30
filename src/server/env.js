import "server-only";
import { AiUnavailableError } from "@/helpers/errors";

/**
 * Server-side configuration.
 *
 * Nothing here is prefixed NEXT_PUBLIC_, so none of it can reach the browser.
 * Validation is lazy rather than at module load: the app should still boot and
 * render a useful error page when a key is missing, instead of crashing the
 * whole dev server on import.
 */

function required(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(
			`Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in.`
		);
	}
	return value;
}

export const env = {
	/** Bedrock long-term API key — a bearer token, not an AWS access key pair. */
	get bedrockToken() {
		return required("AWS_BEARER_TOKEN_BEDROCK");
	},
	get bedrockRegion() {
		return process.env.BEDROCK_AWS_REGION || "us-east-1";
	},
	/** Optional override, e.g. us.anthropic.claude-opus-4-6-v1 */
	get bedrockModelId() {
		return process.env.BEDROCK_MODEL_ID || null;
	},

	/** TinyFish Fetch API — browser-rendered extraction. */
	get tinyfishKey() {
		return process.env.TINYFISH_API_KEY || null;
	},

	/** When true, a failed live extraction falls back to the bundled fixture. */
	get allowFixtureFallback() {
		return process.env.ALLOW_FIXTURE_FALLBACK === "1";
	},
};

/**
 * Cheap pre-flight so the pipeline fails with a clear message, not an SDK stack
 * trace. Throws a typed error so the route maps it to a real status code and
 * the operator is told exactly which variable is missing — a generic 500 here
 * sends someone hunting through logs for a one-line config problem.
 */
export function assertAiConfigured() {
	if (!process.env.AWS_BEARER_TOKEN_BEDROCK) {
		throw new AiUnavailableError(
			"Analysis isn't configured: AWS_BEARER_TOKEN_BEDROCK is not set. Add it to .env.local and restart the server."
		);
	}
}
