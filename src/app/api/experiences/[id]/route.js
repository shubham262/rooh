import { ExperienceEditSchema } from "@/schemas/experience";
import { AppError, toErrorResponse } from "@/helpers/errors";
import { getExperience, updateExperience, listReviews } from "@/server/store/experienceStore";

/**
 * GET   /api/experiences/[id] -> { experience, reviews }
 * PATCH /api/experiences/[id] -> { experience }   (reviewer corrections)
 *
 * Note `params` is a Promise in Next 16 and must be awaited.
 */

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
	try {
		const { id } = await params;
		return Response.json({ experience: getExperience(id), reviews: listReviews(id) });
	} catch (error) {
		const { status, body } = toErrorResponse(error);
		return Response.json(body, { status });
	}
}

export async function PATCH(request, { params }) {
	try {
		const { id } = await params;
		const existing = getExperience(id);

		const parsed = ExperienceEditSchema.safeParse(await request.json());
		if (!parsed.success) {
			throw new AppError("Those changes aren't valid. Check the highlighted fields and try again.", {
				status: 400,
				code: "invalid_edit",
			});
		}

		// Merge nested objects rather than replacing them, so editing one field
		// of `location` doesn't wipe the others.
		const patch = {};
		for (const [key, value] of Object.entries(parsed.data)) {
			patch[key] =
				value && typeof value === "object" && !Array.isArray(value)
					? { ...existing[key], ...value }
					: value;
		}

		return Response.json({ experience: updateExperience(id, patch) });
	} catch (error) {
		const { status, body } = toErrorResponse(error);
		return Response.json(body, { status });
	}
}
