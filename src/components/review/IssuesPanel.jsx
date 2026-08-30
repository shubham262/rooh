"use client";

import { Alert, Card, Tag, Typography } from "antd";
import { LuTriangleAlert, LuCircleCheck } from "react-icons/lu";

/**
 * What the reviewer needs to know before deciding, above the fold.
 *
 * Issues are warnings, not blocks — the system surfaces doubt and a human makes
 * the call. Missing fields are separated from issues on purpose: an absent
 * price is an honest gap in the source, whereas an unverified price is a
 * problem with our extraction, and conflating them would train reviewers to
 * ignore both.
 */
export default function IssuesPanel({ issues, missingFields }) {
	const hasIssues = issues?.length > 0;
	const hasMissing = missingFields?.length > 0;

	if (!hasIssues && !hasMissing) {
		return (
			<Alert
				type="success"
				showIcon
				icon={<LuCircleCheck />}
				title="No issues detected"
				description="Every extracted value is backed by source evidence and passed all automated checks."
			/>
		);
	}

	return (
		<Card size="small" style={{ borderColor: hasIssues ? "#ffd591" : undefined }}>
			{hasIssues ? (
				<div style={{ marginBottom: hasMissing ? 16 : 0 }}>
					<Typography.Text
						strong
						style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "#d46b08" }}
					>
						<LuTriangleAlert size={15} />
						Potential issues ({issues.length})
					</Typography.Text>

					<ul style={{ margin: 0, paddingLeft: 22 }}>
						{issues.map((issue, i) => (
							<li key={i} style={{ fontSize: 13, color: "#475467", marginBottom: 4 }}>
								{issue}
							</li>
						))}
					</ul>
				</div>
			) : null}

			{hasMissing ? (
				<div>
					<Typography.Text strong style={{ display: "block", marginBottom: 8, fontSize: 13 }}>
						Not stated on the source page
					</Typography.Text>
					<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
						{missingFields.map((field) => (
							<Tag key={field} style={{ marginInlineEnd: 0 }}>
								{field}
							</Tag>
						))}
					</div>
					<Typography.Text style={{ fontSize: 12, color: "#98a2b3", marginTop: 8, display: "block" }}>
						These were left empty rather than guessed. Fill them in below if you know them.
					</Typography.Text>
				</div>
			) : null}
		</Card>
	);
}
