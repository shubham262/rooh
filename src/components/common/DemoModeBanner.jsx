"use client";

import { Alert } from "antd";
import { SOURCE_TYPE } from "@/constants";

/**
 * Fixture disclosure.
 *
 * When live extraction fails we fall back to bundled sample content so the tool
 * stays demonstrable. That is only acceptable if it is impossible to mistake
 * for a real result — hence a banner that names the fixture and says plainly
 * that the data did not come from the submitted URL.
 */
export default function DemoModeBanner({ sourceType }) {
	if (sourceType !== SOURCE_TYPE.FIXTURE) return null;

	return (
		<Alert
			type="warning"
			showIcon
			title="Demo fixture — not a live extraction"
			description="Live extraction was unavailable, so this record was built from bundled sample content rather than the URL you submitted. The AI, validation and scoring steps ran for real on that sample, and source quality is scored low to reflect it."
			style={{ marginBottom: 16 }}
		/>
	);
}
