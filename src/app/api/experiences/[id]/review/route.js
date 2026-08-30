import { ReviewRequestSchema } from "@/schemas/experience";
import { AppError, toErrorResponse } from "@/helpers/errors";
import { recordReview } from "@/server/store/experienceStore";

/**
 * POST /api/experiences/[id]/review  { action: "approve"|"reject", notes? }
 *
 * The only way a record leaves pending_review. Every call appends to the audit
 * trail, so we can always answer who accepted what the model proposed.
 */

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
	try {
		const { id } = await params;

		const parsed = ReviewRequestSchema.safeParse(await request.json());
		if (!parsed.success) {
			throw new AppError("A review action must be either approve or reject.", {
				status: 400,
				code: "invalid_review",
			});
		}

		const experience = recordReview(id, parsed.data.action, parsed.data.notes);
		return Response.json({ experience });
	} catch (error) {
		const { status, body } = toErrorResponse(error);
		return Response.json(body, { status });
	}
}
