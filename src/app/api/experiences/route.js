import { toErrorResponse } from "@/helpers/errors";
import { listExperiences, getStats } from "@/server/store/experienceStore";

/** GET /api/experiences?status=pending_review -> { experiences, stats } */

export const dynamic = "force-dynamic";

export async function GET(request) {
	try {
		const status = new URL(request.url).searchParams.get("status") || undefined;
		return Response.json({
			experiences: listExperiences({ status }),
			stats: getStats(),
		});
	} catch (error) {
		const { status: code, body } = toErrorResponse(error);
		return Response.json(body, { status: code });
	}
}
