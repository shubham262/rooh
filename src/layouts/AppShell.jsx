"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, Menu, Typography } from "antd";
import { LuSparkles, LuInbox } from "react-icons/lu";

const { Header, Content } = Layout;

/**
 * App chrome. Two destinations only — ingest something new, or work the queue —
 * which is the whole surface of an internal curation tool at this stage.
 */
export default function AppShell({ children }) {
	const pathname = usePathname();

	const items = [
		{ key: "/", icon: <LuSparkles />, label: <Link href="/">Analyze</Link> },
		{ key: "/queue", icon: <LuInbox />, label: <Link href="/queue">Review queue</Link> },
	];

	// Review pages belong to the queue as far as nav highlighting goes.
	const selected = pathname.startsWith("/review") || pathname.startsWith("/queue") ? "/queue" : "/";

	return (
		<Layout style={{ minHeight: "100vh", background: "transparent" }}>
			<Header
				style={{
					display: "flex",
					alignItems: "center",
					gap: 32,
					background: "#fff",
					borderBottom: "1px solid #eaecf0",
					paddingInline: 24,
					position: "sticky",
					top: 0,
					zIndex: 10,
				}}
			>
				<Link href="/" style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
					<Typography.Text
						style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: "#101828" }}
					>
						rooh
					</Typography.Text>
					<Typography.Text style={{ fontSize: 13, color: "#667085" }}>
						Experience Intelligence
					</Typography.Text>
				</Link>

				<Menu
					mode="horizontal"
					selectedKeys={[selected]}
					items={items}
					style={{ flex: 1, borderBottom: "none", background: "transparent" }}
				/>
			</Header>

			<Content style={{ padding: "32px 24px 64px" }}>
				<div style={{ maxWidth: 1100, margin: "0 auto" }}>{children}</div>
			</Content>
		</Layout>
	);
}
