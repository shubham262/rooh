"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Typography, Space } from "antd";
import UrlForm from "@/components/ingest/UrlForm";
import AnalyzingState from "@/components/ingest/AnalyzingState";
import ErrorState from "@/components/common/ErrorState";
import { analyzeUrl } from "@/services/experienceService";

export default function IngestView() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [pendingUrl, setPendingUrl] = useState("");

	async function handleSubmit(url) {
		setLoading(true);
		setError(null);
		setPendingUrl(url);

		try {
			const experience = await analyzeUrl(url);
			// Straight to review — an analysed record has no value until a human
			// has looked at it, so the review page is the natural next screen.
			router.push(`/review/${experience.id}`);
		} catch (err) {
			setError(err);
			setLoading(false);
		}
	}

	return (
		<Space orientation="vertical" size={24} style={{ width: "100%" }}>
			<div style={{ textAlign: "center", paddingTop: 32 }}>
				<Typography.Title level={2} style={{ marginBottom: 8, letterSpacing: -0.5 }}>
					Experience Intelligence
				</Typography.Title>
				<Typography.Paragraph style={{ color: "#667085", fontSize: 15, maxWidth: 560, margin: "0 auto" }}>
					Turn experience sources into structured, review-ready rooh content. Every value is checked
					against the source page before a human sees it.
				</Typography.Paragraph>
			</div>

			{loading ? (
				<AnalyzingState url={pendingUrl} />
			) : (
				<Card>
					<UrlForm onSubmit={handleSubmit} loading={loading} />
				</Card>
			)}

			<ErrorState error={error} onRetry={pendingUrl ? () => handleSubmit(pendingUrl) : undefined} />
		</Space>
	);
}
