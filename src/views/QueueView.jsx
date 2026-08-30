"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Empty, Progress, Segmented, Space, Table, Tag, Typography, Statistic, Row, Col } from "antd";
import { LuTriangleAlert } from "react-icons/lu";
import StatusTag from "@/components/common/StatusTag";
import { STATUS } from "@/constants";
import { useExperienceStore } from "@/stores/experienceStore";
import { useHydrated } from "@/stores/useHydrated";
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
	const hydrated = useHydrated();

	// Reading straight from the store means no fetch, no loading race, and the
	// list updates the moment a record is approved or edited elsewhere.
	const experiences = useExperienceStore((s) => s.experiences);

	const { rows, stats } = useMemo(() => {
		const all = Object.values(experiences).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		return {
			rows: filter === "all" ? all : all.filter((e) => e.status === filter),
			stats: {
				total: all.length,
				pending: all.filter((e) => e.status === STATUS.PENDING).length,
				approved: all.filter((e) => e.status === STATUS.APPROVED).length,
				rejected: all.filter((e) => e.status === STATUS.REJECTED).length,
			},
		};
	}, [experiences, filter]);

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

			{hydrated ? (
				<Row gutter={16}>
					{[
						{ title: "Total", value: stats.total },
						{ title: "Pending review", value: stats.pending },
						{ title: "Approved", value: stats.approved },
						{ title: "Rejected", value: stats.rejected },
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
					loading={!hydrated}
					dataSource={rows}
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
