import { AnalyzeRequestSchema } from "@/schemas/experience";
import { InvalidUrlError, toErrorResponse } from "@/helpers/errors";
import { runAnalysis } from "@/server/pipeline/runAnalysis";

/**
 * POST /api/analyze  { url, known? } -> { experience }
 *
 * The only server endpoint that does real work, and it is stateless: it takes a
 * URL, returns a finished record, and stores nothing. The browser owns the
 * review queue (see stores/experienceStore), because a serverless function has
 * no memory to rely on between one request and the next.
 *
 * `known` carries the caller's existing records so duplicate detection still
 * works without the server holding state it would only lose.
 *
 * Synchronous by design: fetch plus one model call is typically 5-15s, which is
 * short enough to wait on and far simpler than a job queue.
 */

// Fetch + model call can exceed the default serverless limit on a slow page.
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(request) {
	try {
		let body;
		try {
			body = await request.json();
		} catch {
			throw new InvalidUrlError("Expected a JSON body containing a url.");
		}

		const parsed = AnalyzeRequestSchema.safeParse(body);
		if (!parsed.success) {
			throw new InvalidUrlError("Please provide a URL to analyse.");
		}

		const experience = await runAnalysis(parsed.data.url, parsed.data.known);
		return Response.json({ experience }, { status: 201 });
	} catch (error) {
		const { status, body } = toErrorResponse(error);
		return Response.json(body, { status });
	}
}
