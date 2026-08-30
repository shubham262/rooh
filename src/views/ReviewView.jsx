"use client";

import { useEffect, useState } from "react";
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
import { getExperience } from "@/services/experienceService";
import { formatDateTime } from "@/helpers/dateHelpers";

export default function ReviewView({ id }) {
	const [state, setState] = useState({
		loading: true,
		experience: null,
		reviews: [],
		error: null,
	});

	// After an edit or a review the audit trail has changed too, so we refetch
	// rather than patching local state and letting the timeline drift. Bumping
	// this key re-runs the effect; state is only ever set from the async
	// callbacks, never synchronously in the effect body.
	const [reloadKey, setReloadKey] = useState(0);

	useEffect(() => {
		let active = true;

		getExperience(id)
			.then((data) => {
				if (active)
					setState({
						loading: false,
						experience: data.experience,
						reviews: data.reviews,
						error: null,
					});
			})
			.catch((err) => {
				if (active) setState({ loading: false, experience: null, reviews: [], error: err });
			});

		return () => {
			active = false;
		};
	}, [id, reloadKey]);

	const handleChanged = () => setReloadKey((k) => k + 1);
	const { loading, experience, reviews, error } = state;

	if (loading) return <Skeleton active paragraph={{ rows: 10 }} />;

	if (error) {
		return (
			<Space orientation="vertical" size={16} style={{ width: "100%" }}>
				<Alert type="error" showIcon title="Couldn't load this experience" description={error.message} />
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
					<FieldEditor experience={experience} onSaved={handleChanged} />
				</Col>
				<Col xs={24} lg={11}>
					<EvidenceList evidence={experience.evidence} />
				</Col>
			</Row>

			<ReviewActions experience={experience} onReviewed={handleChanged} />

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
