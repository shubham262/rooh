/**
 * Extraction probe.
 *
 * GET /api/selftest/extract?url=https://...
 *
 * Runs the URL guard and the extractor chain and returns what the model would
 * actually be shown — which provider won, how much text it produced, and a
 * preview. Useful for diagnosing a bad extraction without spending a model
 * call, since "the AI got it wrong" is usually "the extractor returned a
 * cookie banner".
 */
import { extractContent } from "@/server/extraction";
import { assertSafeUrl } from "@/server/urlGuard";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request) {
	const url = new URL(request.url).searchParams.get("url");
	try {
		const safe = await assertSafeUrl(url);
		const content = await extractContent(safe.toString());
		return Response.json({
			provider: content.provider,
			title: content.title,
			siteName: content.siteName,
			finalUrl: content.finalUrl,
			chars: content.markdown.length,
			preview: content.markdown.slice(0, 700),
		});
	} catch (error) {
		return Response.json({ error: error.message, code: error.code }, { status: error.status ?? 500 });
	}
}
