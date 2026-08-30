"use client";

import Link from "next/link";
import { Alert, Button, Col, Row, Skeleton, Space, Timeline, Card, Typography } from "antd";
import { LuArrowLeft } from "react-icons/lu";
import ExperienceHeader from "@/components/review/ExperienceHeader";
import ScorePanel from "@/components/review/ScorePanel";
import IssuesPanel from "@/components/review/IssuesPanel";
import EvidenceList from "@/components/review/EvidenceList";
import FieldEditor from "@/components/review/FieldEditor";
import ReviewActions from "@/components/review/ReviewActions";
import DemoModeBanner from "@/components/common/DemoModeBanner";
import { useExperienceStore } from "@/stores/experienceStore";
import { useHydrated } from "@/stores/useHydrated";
import { formatDateTime } from "@/helpers/dateHelpers";

export default function ReviewView({ id }) {
	const hydrated = useHydrated();

	// Subscribing to the record itself means an edit or a review action
	// re-renders this page immediately — no refetch, and the audit trail below
	// can never drift out of step with the record above it.
	const experience = useExperienceStore((s) => s.experiences[id] ?? null);
	const reviews = useExperienceStore((s) => s.reviews)
		.filter((r) => r.experienceId === id)
		.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

	// Hold the skeleton until localStorage has loaded, otherwise a valid record
	// briefly looks missing.
	if (!hydrated) return <Skeleton active paragraph={{ rows: 10 }} />;

	if (!experience) {
		return (
			<Space orientation="vertical" size={16} style={{ width: "100%" }}>
				<Alert
					type="error"
					showIcon
					title="We couldn't find that experience"
					description="Records are stored in this browser, so a link won't open on another device or after clearing site data. Analyze the URL again to recreate it."
				/>
				<Link href="/queue">
					<Button icon={<LuArrowLeft />}>Back to queue</Button>
				</Link>
			</Space>
		);
	}

	return (
		<Space orientation="vertical" size={16} style={{ width: "100%" }}>
			<Link href="/queue" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
				<LuArrowLeft size={14} /> Back to queue
			</Link>

			<DemoModeBanner sourceType={experience.source.type} />

			{experience.duplicateOf ? (
				<Alert
					type="warning"
					showIcon
					title="Potential duplicate"
					description={
						<span>
							An existing record looks like the same experience.{" "}
							<Link href={`/review/${experience.duplicateOf}`}>Compare it</Link> before approving.
							Nothing has been merged or deleted automatically.
						</span>
					}
				/>
			) : null}

			<ExperienceHeader experience={experience} />

			<ScorePanel relevance={experience.relevance} quality={experience.quality} />

			<IssuesPanel issues={experience.quality.issues} missingFields={experience.quality.missingFields} />

			<Row gutter={16}>
				<Col xs={24} lg={13}>
					<FieldEditor experience={experience} />
				</Col>
				<Col xs={24} lg={11}>
					<EvidenceList evidence={experience.evidence} />
				</Col>
			</Row>

			<ReviewActions experience={experience} />

			{reviews.length ? (
				<Card title="Audit trail" size="small">
					<Timeline
						items={reviews.map((r) => ({
							content: (
								<div>
									<Typography.Text strong style={{ fontSize: 13, textTransform: "capitalize" }}>
										{r.action}
									</Typography.Text>
									<Typography.Text style={{ fontSize: 12, color: "#98a2b3", marginLeft: 8 }}>
										{formatDateTime(r.createdAt)}
									</Typography.Text>
									{r.notes ? (
										<div style={{ fontSize: 12, color: "#667085", marginTop: 2 }}>{r.notes}</div>
									) : null}
								</div>
							),
						}))}
					/>
				</Card>
			) : null}
		</Space>
	);
}
