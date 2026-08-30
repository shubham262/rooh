/**
 * Typed application errors.
 *
 * Every failure the pipeline can produce carries a message written for a human
 * reviewer, not a stack trace. Route handlers map `status` onto the HTTP
 * response and send `userMessage` to the client; the underlying `cause` is
 * logged server-side only.
 */

export class AppError extends Error {
	constructor(message, { status = 500, code = "internal_error", cause } = {}) {
		super(message);
		this.name = this.constructor.name;
		this.status = status;
		this.code = code;
		this.userMessage = message;
		if (cause) this.cause = cause;
	}
}

export class InvalidUrlError extends AppError {
	constructor(detail = "That doesn't look like a valid public web address.", cause) {
		super(detail, { status: 400, code: "invalid_url", cause });
	}
}

export class UnreachableError extends AppError {
	constructor(detail = "We couldn't reach that page. Check the URL is public and try again.", cause) {
		super(detail, { status: 502, code: "unreachable", cause });
	}
}

export class EmptyContentError extends AppError {
	constructor(
		detail = "We couldn't extract usable content from this page. Please verify that the URL is publicly accessible and contains readable text.",
		cause
	) {
		super(detail, { status: 422, code: "empty_content", cause });
	}
}

export class AiUnavailableError extends AppError {
	constructor(detail = "The analysis service is unavailable right now. Please try again shortly.", cause) {
		super(detail, { status: 503, code: "ai_unavailable", cause });
	}
}

export class MalformedAiOutputError extends AppError {
	constructor(detail = "The analysis returned data we couldn't validate. This page may be an unusual format.", cause) {
		super(detail, { status: 502, code: "malformed_ai_output", cause });
	}
}

export class NotFoundError extends AppError {
	constructor(detail = "That experience no longer exists.", cause) {
		super(detail, { status: 404, code: "not_found", cause });
	}
}

/**
 * Convert any thrown value into a JSON response body + status.
 *
 * Unknown errors deliberately do NOT leak their message to the client — an
 * upstream SDK error can contain credentials or internal hostnames.
 */
export function toErrorResponse(error) {
	if (error instanceof AppError) {
		return {
			status: error.status,
			body: { error: { code: error.code, message: error.userMessage } },
		};
	}

	console.error("[rooh] unhandled error:", error);
	return {
		status: 500,
		body: {
			error: {
				code: "internal_error",
				message: "Something went wrong on our side. Please try again.",
			},
		},
	};
}
