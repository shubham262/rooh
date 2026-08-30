"use client";

import { Space, Tag, Typography } from "antd";
import { LuExternalLink } from "react-icons/lu";
import StatusTag from "@/components/common/StatusTag";
import { hostnameOf } from "@/helpers/formatHelpers";

export default function ExperienceHeader({ experience }) {
	const { title, category, tags, status, source, relevance } = experience;

	return (
		<div>
			<Space size={8} wrap style={{ marginBottom: 8 }}>
				<StatusTag status={status} />
				<Tag color="blue" style={{ marginInlineEnd: 0 }}>
					{category}
				</Tag>
				{!relevance.isRelevant ? (
					<Tag color="red" style={{ marginInlineEnd: 0 }}>
						Not relevant
					</Tag>
				) : null}
			</Space>

			<Typography.Title level={3} style={{ marginTop: 0, marginBottom: 8, letterSpacing: -0.4 }}>
				{title}
			</Typography.Title>

			<Space size={12} wrap>
				<a
					href={source.url}
					target="_blank"
					rel="noopener noreferrer"
					style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}
				>
					{hostnameOf(source.url)}
					<LuExternalLink size={13} />
				</a>

				{tags?.length ? (
					<Space size={4} wrap>
						{tags.map((tag) => (
							<Tag key={tag} style={{ marginInlineEnd: 0, fontSize: 11 }} variant="filled">
								{tag}
							</Tag>
						))}
					</Space>
				) : null}
			</Space>
		</div>
	);
}
