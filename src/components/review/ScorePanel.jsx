"use client";

import { Card, Col, Divider, Popover, Progress, Row, Typography } from "antd";
import ScoreMeter from "@/components/common/ScoreMeter";
import { scoreColor } from "@/helpers/formatHelpers";

/**
 * Relevance and confidence, side by side and clearly distinguished.
 *
 * These answer different questions and are computed differently: relevance is
 * the model's judgement about fit, confidence is our own arithmetic over what
 * we could verify. Showing them together without labelling that difference
 * would invite a reviewer to read one as the other.
 */

const CONFIDENCE_ROWS = [
	{ key: "completeness", label: "Completeness", weight: 30, hint: "How many important fields the page actually gave us." },
	{ key: "evidenceCoverage", label: "Evidence coverage", weight: 30, hint: "How many extracted values are backed by a quote found in the source." },
	{ key: "validation", label: "Validation", weight: 20, hint: "How many automated data checks passed." },
	{ key: "sourceQuality", label: "Source quality", weight: 20, hint: "How substantial and trustworthy the fetched page was." },
];

function ConfidenceBreakdown({ breakdown }) {
	return (
		<div style={{ width: 300 }}>
			<Typography.Text style={{ fontSize: 12, color: "#667085" }}>
				Confidence is calculated in code from four measurable signals — the model never scores its
				own output.
			</Typography.Text>
			<Divider style={{ margin: "10px 0" }} />
			{CONFIDENCE_ROWS.map((row) => (
				<div key={row.key} style={{ marginBottom: 10 }}>
					<div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
						<span>
							{row.label}{" "}
							<Typography.Text style={{ color: "#98a2b3" }}>({row.weight}%)</Typography.Text>
						</span>
						<Typography.Text strong>{breakdown[row.key]}%</Typography.Text>
					</div>
					<Progress
						percent={breakdown[row.key]}
						showInfo={false}
						size="small"
						strokeColor={scoreColor(breakdown[row.key])}
					/>
					<Typography.Text style={{ fontSize: 11, color: "#98a2b3" }}>{row.hint}</Typography.Text>
				</div>
			))}
		</div>
	);
}

export default function ScorePanel({ relevance, quality }) {
	return (
		<Card size="small">
			<Row gutter={24}>
				<Col span={12}>
					<ScoreMeter
						title="RELEVANCE"
						score={relevance.score}
						hint="Does this experience belong on rooh? Judged by the model from the page content."
					/>
					<Typography.Paragraph
						style={{ fontSize: 12, color: "#667085", marginTop: 10, marginBottom: 0 }}
					>
						{relevance.reason}
					</Typography.Paragraph>
				</Col>

				<Col span={12}>
					<Popover
						content={<ConfidenceBreakdown breakdown={quality.breakdown} />}
						title="How this score is calculated"
						trigger="hover"
						placement="bottomRight"
					>
						<div style={{ cursor: "help" }}>
							<ScoreMeter
								title="CONFIDENCE"
								score={quality.confidence}
								hint="How reliable is the extracted data? Calculated deterministically from completeness, evidence, validation and source quality."
							/>
							<Typography.Text
								style={{ fontSize: 12, color: "#2764ff", marginTop: 10, display: "block" }}
							>
								Hover for the breakdown
							</Typography.Text>
						</div>
					</Popover>
				</Col>
			</Row>
		</Card>
	);
}
