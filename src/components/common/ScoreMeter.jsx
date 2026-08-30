"use client";

import { Progress, Tooltip, Typography } from "antd";
import { LuInfo } from "react-icons/lu";
import { scoreColor, scoreLabel } from "@/helpers/formatHelpers";

/**
 * One score, shown as a number rather than a bare bar.
 *
 * `hint` explains what the score actually measures — relevance and confidence
 * are easy to conflate, and a reviewer acting on the wrong one makes bad calls.
 */
export default function ScoreMeter({ title, score, hint, children }) {
	return (
		<div>
			<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
				<Typography.Text style={{ fontSize: 13, color: "#667085", fontWeight: 600 }}>
					{title}
				</Typography.Text>
				{hint ? (
					<Tooltip title={hint}>
						<span style={{ color: "#98a2b3", display: "flex", cursor: "help" }}>
							<LuInfo size={13} />
						</span>
					</Tooltip>
				) : null}
			</div>

			<div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
				<Typography.Text style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: scoreColor(score) }}>
					{score}
					<span style={{ fontSize: 15, fontWeight: 500 }}>%</span>
				</Typography.Text>
				<Typography.Text style={{ fontSize: 12, color: "#667085" }}>
					{scoreLabel(score)}
				</Typography.Text>
			</div>

			<Progress
				percent={score}
				showInfo={false}
				strokeColor={scoreColor(score)}
				size="small"
				style={{ marginTop: 4, marginBottom: 0 }}
			/>

			{children}
		</div>
	);
}
