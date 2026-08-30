"use client";

import React, { useState } from "react";
import { StyleProvider, extractStyle, createCache } from "@ant-design/cssinjs";
import { useServerInsertedHTML } from "next/navigation";
import { ConfigProvider } from "antd";

const theme = {
	token: {
		colorPrimary: "#2764ff",
		colorLink: "#2764ff",
		fontFamily:
			"'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
		borderRadius: 14,
	},
};

export default function AntdProvider({ children }) {
	const [cache] = useState(() => createCache());

	useServerInsertedHTML(() => (
		<style
			id="antd"
			dangerouslySetInnerHTML={{
				__html: extractStyle(cache, true),
			}}
		/>
	));

	return (
		<StyleProvider cache={cache} hashPriority="high">
			<ConfigProvider theme={theme}>{children}</ConfigProvider>
		</StyleProvider>
	);
}
