"use client";

import { Tag } from "antd";
import { STATUS_META } from "@/helpers/formatHelpers";

export default function StatusTag({ status }) {
	const meta = STATUS_META[status] ?? { label: status, color: "default" };
	return <Tag color={meta.color}>{meta.label}</Tag>;
}
