"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Empty, Progress, Segmented, Space, Table, Tag, Typography, Statistic, Row, Col } from "antd";
import { LuTriangleAlert } from "react-icons/lu";
import StatusTag from "@/components/common/StatusTag";
import { STATUS } from "@/constants";
import { listExperiences } from "@/services/experienceService";
import { scoreColor, hostnameOf } from "@/helpers/formatHelpers";
import { formatRelative } from "@/helpers/dateHelpers";

const FILTERS = [
	{ label: "All", value: "all" },
	{ label: "Pending", value: STATUS.PENDING },
	{ label: "Approved", value: STATUS.APPROVED },
	{ label: "Rejected", value: STATUS.REJECTED },
];

export default function QueueView() {
	const router = useRouter();
	const [filter, setFilter] = useState("all");

	// The loaded filter is stored alongside the data, so `loading` is derived
	// rather than a separate state we'd have to set synchronously in the effect.
	// Switching filters shows the spinner immediately, on the same render.
	const [data, setData] = useState({ experiences: [], stats: null, filter: null });
	const loading = data.filter !== filter;

	useEffect(() => {
		let active = true;

		listExperiences(filter === "all" ? undefined : filter)
			.then((result) => {
				if (active) setData({ ...result, filter });
			})
			.catch(() => {
				if (active) setData({ experiences: [], stats: null, filter });
			});

		return () => {
			active = false;
		};
	}, [filter]);

	const columns = [
		{
			title: "Experience",
			dataIndex: "title",
			render: (title, record) => (
				<div>
					<Typography.Text strong style={{ fontSize: 13 }}>
						{title}
					</Typography.Text>
					<div style={{ fontSize: 12, color: "#98a2b3" }}>{hostnameOf(record.source.url)}</div>
				</div>
			),
		},
		{
			title: "Category",
			dataIndex: "category",
			width: 150,
			render: (category) => <Tag color="blue">{category}</Tag>,
		},
		{
			title: "Relevance",
			dataIndex: ["relevance", "score"],
			width: 120,
			sorter: (a, b) => a.relevance.score - b.relevance.score,
			render: (score) => (
				<Progress percent={score} size="small" strokeColor={scoreColor(score)} format={(v) => `${v}%`} />
			),
		},
		{
			title: "Confidence",
			dataIndex: ["quality", "confidence"],
			width: 120,
			sorter: (a, b) => a.quality.confidence - b.quality.confidence,
			render: (score) => (
				<Progress percent={score} size="small" strokeColor={scoreColor(score)} format={(v) => `${v}%`} />
			),
		},
		{
			title: "Issues",
			dataIndex: ["quality", "issues"],
			width: 90,
			render: (issues) =>
				issues.length ? (
					<Space size={4} style={{ color: "#d46b08", fontSize: 13 }}>
						<LuTriangleAlert size={13} />
						{issues.length}
					</Space>
				) : (
					<Typography.Text style={{ color: "#98a2b3" }}>—</Typography.Text>
				),
		},
		{
			title: "Status",
			dataIndex: "status",
			width: 140,
			render: (status) => <StatusTag status={status} />,
		},
		{
			title: "Analysed",
			dataIndex: "createdAt",
			width: 130,
			render: (value) => (
				<Typography.Text style={{ fontSize: 12, color: "#667085" }}>
					{formatRelative(value)}
				</Typography.Text>
			),
		},
	];

	return (
		<Space orientation="vertical" size={16} style={{ width: "100%" }}>
			<div>
				<Typography.Title level={3} style={{ marginBottom: 4 }}>
					Review queue
				</Typography.Title>
				<Typography.Text style={{ color: "#667085", fontSize: 13 }}>
					Every analysed experience waits here until a human approves or rejects it.
				</Typography.Text>
			</div>

			{data.stats ? (
				<Row gutter={16}>
					{[
						{ title: "Total", value: data.stats.total },
						{ title: "Pending review", value: data.stats.pending },
						{ title: "Approved", value: data.stats.approved },
						{ title: "Rejected", value: data.stats.rejected },
					].map((stat) => (
						<Col span={6} key={stat.title}>
							<Card size="small">
								<Statistic
									title={stat.title}
									value={stat.value}
									styles={{ content: { fontSize: 22 } }}
								/>
							</Card>
						</Col>
					))}
				</Row>
			) : null}

			<Segmented options={FILTERS} value={filter} onChange={setFilter} />

			<Card size="small" styles={{ body: { padding: 0 } }}>
				<Table
					rowKey="id"
					loading={loading}
					dataSource={data.experiences}
					columns={columns}
					pagination={{ pageSize: 10, hideOnSinglePage: true }}
					onRow={(record) => ({
						onClick: () => router.push(`/review/${record.id}`),
						style: { cursor: "pointer" },
					})}
					locale={{
						emptyText: (
							<Empty
								image={Empty.PRESENTED_IMAGE_SIMPLE}
								description="Nothing analysed yet. Paste a URL on the Analyze page to get started."
							/>
						),
					}}
				/>
			</Card>
		</Space>
	);
}
