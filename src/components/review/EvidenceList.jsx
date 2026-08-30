"use client";

import { Card, Empty, Tag, Tooltip, Typography } from "antd";
import { LuCircleCheck, LuTriangleAlert } from "react-icons/lu";

/**
 * Source evidence — where each value came from.
 *
 * This is the panel that makes the whole tool trustworthy. For every important
 * field the model extracted, it shows the quote it claimed to be working from,
 * and whether that quote was actually found in the fetched page.
 *
 * A reviewer can therefore check a price without opening the source, and an
 * unverified marker means precisely one thing: the model produced a value it
 * could not back up. That is the signal worth acting on.
 */

const FIELD_LABELS = {
	"pricing.amount": "Price",
	"schedule.start": "Start date",
	"schedule.end": "End date",
	"location.address": "Address",
	"location.city": "City",
	"location.name": "Venue",
	"provider.name": "Provider",
	title: "Title",
};

export default function EvidenceList({ evidence }) {
	if (!evidence?.length) {
		return (
			<Card title="Source evidence" size="small">
				<Empty
					image={Empty.PRESENTED_IMAGE_SIMPLE}
					description="No evidence was returned for this record."
				/>
			</Card>
		);
	}

	const unverifiedCount = evidence.filter((e) => !e.verified).length;

	return (
		<Card
			title="Source evidence"
			size="small"
			extra={
				<Typography.Text style={{ fontSize: 12, color: unverifiedCount ? "#d46b08" : "#667085" }}>
					{unverifiedCount
						? `${unverifiedCount} of ${evidence.length} unverified`
						: `All ${evidence.length} verified`}
				</Typography.Text>
			}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
				{evidence.map((item, index) => (
					<div key={`${item.field}-${index}`}>
						<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
							<Typography.Text strong style={{ fontSize: 13 }}>
								{FIELD_LABELS[item.field] ?? item.field}
							</Typography.Text>

							<Tag style={{ marginInlineEnd: 0, fontSize: 12 }}>{item.value}</Tag>

							<Tooltip
								title={
									item.verified
										? "This quote was found in the fetched page content."
										: "This quote could NOT be found in the page content. The value may be paraphrased or fabricated — verify it against the source before approving."
								}
							>
								<span
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: 4,
										fontSize: 12,
										color: item.verified ? "#52c41a" : "#fa8c16",
										cursor: "help",
									}}
								>
									{item.verified ? <LuCircleCheck size={14} /> : <LuTriangleAlert size={14} />}
									{item.verified ? "Verified" : "Unverified"}
								</span>
							</Tooltip>
						</div>

						<blockquote
							className="evidence-snippet"
							style={{
								margin: 0,
								padding: "8px 12px",
								background: item.verified ? "#f6ffed" : "#fff7e6",
								borderLeft: `3px solid ${item.verified ? "#b7eb8f" : "#ffd591"}`,
								borderRadius: 4,
								color: "#475467",
							}}
						>
							{item.snippet}
						</blockquote>
					</div>
				))}
			</div>
		</Card>
	);
}
