"use client";

import { useState } from "react";
import { Button, Input, Space, Typography } from "antd";
import { LuLink, LuSparkles } from "react-icons/lu";

const EXAMPLES = [
	"https://www.eventbrite.com/e/breathwork-journey-tickets-1234567890",
	"https://www.meetup.com/mindfulness-group/events/301234567/",
];

export default function UrlForm({ onSubmit, loading }) {
	const [url, setUrl] = useState("");

	const submit = () => {
		const trimmed = url.trim();
		if (trimmed) onSubmit(trimmed);
	};

	return (
		<Space orientation="vertical" size={12} style={{ width: "100%" }}>
			<Space.Compact style={{ width: "100%" }}>
				<Input
					size="large"
					prefix={<LuLink style={{ color: "#98a2b3" }} />}
					placeholder="https://example.com/events/breathwork-workshop"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					onPressEnter={submit}
					disabled={loading}
					allowClear
				/>
				<Button
					type="primary"
					size="large"
					icon={<LuSparkles />}
					onClick={submit}
					loading={loading}
					disabled={!url.trim()}
				>
					Analyze
				</Button>
			</Space.Compact>

			<Typography.Text style={{ fontSize: 12, color: "#98a2b3" }}>
				Paste any public experience page — an event listing, a retreat page, a workshop, a studio
				timetable. The page must be reachable without a login.
			</Typography.Text>

			<div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
				<Typography.Text style={{ fontSize: 12, color: "#98a2b3" }}>Try:</Typography.Text>
				{EXAMPLES.map((example) => (
					<Button
						key={example}
						size="small"
						type="text"
						disabled={loading}
						onClick={() => setUrl(example)}
						style={{ fontSize: 12, color: "#2764ff", padding: "0 4px", height: 22 }}
					>
						{new URL(example).hostname.replace(/^www\./, "")}
					</Button>
				))}
			</div>
		</Space>
	);
}
