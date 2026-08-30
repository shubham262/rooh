"use client";

import { useState } from "react";
import { Alert, Button, Card, Input, Space, Typography, message } from "antd";
import { LuCheck, LuX } from "react-icons/lu";
import { STATUS } from "@/constants";
import StatusTag from "@/components/common/StatusTag";
import { reviewExperience } from "@/services/experienceService";

/**
 * The publishing decision.
 *
 * Nothing in this system publishes on its own — a record sits in
 * pending_review until a person acts here, however high its scores. The note
 * field feeds the audit trail, so a later question about why something was
 * approved has an answer.
 */
export default function ReviewActions({ experience, onReviewed }) {
	const [notes, setNotes] = useState("");
	const [pending, setPending] = useState(null);

	const decided = experience.status !== STATUS.PENDING;

	async function submit(action) {
		setPending(action);
		try {
			const updated = await reviewExperience(experience.id, action, notes || undefined);
			message.success(action === "approve" ? "Experience approved" : "Experience rejected");
			onReviewed?.(updated);
		} catch (error) {
			message.error(error.message);
		} finally {
			setPending(null);
		}
	}

	if (decided) {
		return (
			<Card size="small">
				<Space orientation="vertical" size={8} style={{ width: "100%" }}>
					<Space>
						<Typography.Text style={{ fontSize: 13, color: "#667085" }}>
							This experience has been reviewed:
						</Typography.Text>
						<StatusTag status={experience.status} />
					</Space>
					<Button size="small" onClick={() => submit(experience.status === STATUS.APPROVED ? "reject" : "approve")} loading={Boolean(pending)}>
						{experience.status === STATUS.APPROVED ? "Change to rejected" : "Change to approved"}
					</Button>
				</Space>
			</Card>
		);
	}

	return (
		<Card size="small">
			<Alert
				type="info"
				showIcon
				title="This is an AI-generated draft"
				description="Every value above was extracted automatically and may be wrong. Nothing is published until you approve it."
				style={{ marginBottom: 16 }}
			/>

			<Input.TextArea
				rows={2}
				placeholder="Review notes (optional) — recorded in the audit trail"
				value={notes}
				onChange={(e) => setNotes(e.target.value)}
				style={{ marginBottom: 12 }}
			/>

			<Space style={{ width: "100%", justifyContent: "flex-end" }}>
				<Button
					danger
					icon={<LuX />}
					loading={pending === "reject"}
					disabled={pending === "approve"}
					onClick={() => submit("reject")}
				>
					Reject
				</Button>
				<Button
					type="primary"
					icon={<LuCheck />}
					loading={pending === "approve"}
					disabled={pending === "reject"}
					onClick={() => submit("approve")}
				>
					Approve
				</Button>
			</Space>
		</Card>
	);
}
