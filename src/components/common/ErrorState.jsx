"use client";

import { Alert, Button } from "antd";

/**
 * Failures are shown as guidance, never as a stack trace — the server already
 * translated each error into something a reviewer can act on.
 */
export default function ErrorState({ error, onRetry }) {
	if (!error) return null;

	return (
		<Alert
			type="error"
			showIcon
			title="We couldn't analyse that page"
			description={
				<div style={{ whiteSpace: "pre-line" }}>
					{error.message}
					{onRetry ? (
						<div style={{ marginTop: 12 }}>
							<Button size="small" onClick={onRetry}>
								Try again
							</Button>
						</div>
					) : null}
				</div>
			}
		/>
	);
}
