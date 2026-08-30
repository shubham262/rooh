"use client";

import { useState } from "react";
import { Button, Input, Space, Typography } from "antd";
import { LuLink, LuSparkles } from "react-icons/lu";

/**
 * Real, publicly reachable pages — verified working, no login required.
 *
 * The first two are genuine experiences that extract cleanly. The third is a
 * well-run professional event that the pipeline should *reject*: it exists to
 * show that relevance is a judgement about fit, not about page quality.
 *
 * These are live third-party pages and will eventually go stale — an event
 * page outlives its date by a while, but not forever. If one starts returning
 * the demo-fixture banner, it has expired; swap in a current URL.
 */
const EXAMPLES = [
	{ label: "Sound bath", url: "https://cranleigharts.org/event/sound-bath-september-2026/" },
	{
		label: "Equinox sound bath",
		url: "https://www.chelseaphysicgarden.co.uk/event/summer-sound-bath-3/",
	},
	{ label: "Not relevant", url: "https://luma.com/sdvrbram" },
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
						key={example.url}
						size="small"
						type="text"
						disabled={loading}
						onClick={() => setUrl(example.url)}
						title={example.url}
						style={{ fontSize: 12, color: "#2764ff", padding: "0 4px", height: 22 }}
					>
						{example.label}
					</Button>
				))}
			</div>
		</Space>
	);
}
