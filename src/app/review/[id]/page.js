import AppShell from "@/layouts/AppShell";
import ReviewView from "@/views/ReviewView";

// Next 16: `params` is a Promise and must be awaited.
export default async function ReviewPage({ params }) {
	const { id } = await params;

	return (
		<AppShell>
			<ReviewView id={id} />
		</AppShell>
	);
}
