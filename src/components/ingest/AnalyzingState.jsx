"use client";

import { Card, Spin, Typography } from "antd";
import { hostnameOf } from "@/helpers/formatHelpers";

/**
 * The wait.
 *
 * Deliberately a single indeterminate state rather than a stepper. The pipeline
 * has six stages but four of them finish in under 50ms — only the fetch and the
 * model call are perceptible — so a step-by-step bar would be animation rather
 * than information. We say what is happening and roughly how long it takes.
 */
export default function AnalyzingState({ url }) {
	return (
		<Card style={{ textAlign: "center", padding: "32px 0" }}>
			<Spin size="large" />
			<Typography.Title level={5} style={{ marginTop: 24, marginBottom: 4 }}>
				Analyzing {hostnameOf(url)}
			</Typography.Title>
			<Typography.Text style={{ color: "#667085", fontSize: 13 }}>
				Fetching the page, extracting the experience, and verifying every value against the source.
			</Typography.Text>
			<div style={{ marginTop: 8 }}>
				<Typography.Text style={{ color: "#98a2b3", fontSize: 12 }}>
					This usually takes 5–15 seconds.
				</Typography.Text>
			</div>
		</Card>
	);
}
