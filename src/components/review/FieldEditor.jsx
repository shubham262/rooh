"use client";

import { useState } from "react";
import {
	Button,
	Card,
	Descriptions,
	Form,
	Input,
	InputNumber,
	Select,
	Space,
	Typography,
	message,
} from "antd";
import moment from "moment";
import { LuPencil, LuSave, LuX } from "react-icons/lu";
import DatePicker from "@/components/common/MomentDatePicker";
import { CATEGORIES } from "@/helpers/taxonomy";
import { formatPrice, formatLocation, orDash, NOT_STATED } from "@/helpers/formatHelpers";
import { formatDateTime, toIso } from "@/helpers/dateHelpers";
import { updateExperience } from "@/services/experienceService";

/**
 * The extracted record, readable by default and editable on demand.
 *
 * Read mode is the default because most records need no correction, and an
 * always-editable form makes AI output look like a draft to be rewritten rather
 * than a proposal to be checked. Empty fields show an em-dash rather than a
 * blank, so "the page didn't say" reads as a deliberate answer.
 */
export default function FieldEditor({ experience, onSaved }) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [form] = Form.useForm();

	const startEditing = () => {
		form.setFieldsValue({
			title: experience.title,
			description: experience.description,
			category: experience.category,
			providerName: experience.provider.name,
			providerWebsite: experience.provider.website,
			venue: experience.location.name,
			address: experience.location.address,
			city: experience.location.city,
			country: experience.location.country,
			start: experience.schedule.start ? moment(experience.schedule.start) : null,
			end: experience.schedule.end ? moment(experience.schedule.end) : null,
			amount: experience.pricing.amount,
			currency: experience.pricing.currency,
		});
		setEditing(true);
	};

	async function handleSave() {
		let values;
		try {
			values = await form.validateFields();
		} catch {
			return; // antd renders the field-level errors
		}

		setSaving(true);
		try {
			const updated = await updateExperience(experience.id, {
				title: values.title,
				description: values.description,
				category: values.category,
				provider: { name: values.providerName || null, website: values.providerWebsite || null },
				location: {
					name: values.venue || null,
					address: values.address || null,
					city: values.city || null,
					country: values.country || null,
				},
				schedule: {
					start: toIso(values.start),
					end: toIso(values.end),
					timezone: experience.schedule.timezone,
				},
				pricing: {
					amount: values.amount ?? null,
					currency: values.currency || null,
				},
			});

			message.success("Changes saved");
			setEditing(false);
			onSaved?.(updated);
		} catch (error) {
			message.error(error.message);
		} finally {
			setSaving(false);
		}
	}

	if (!editing) {
		return (
			<Card
				title="Extracted data"
				size="small"
				extra={
					<Button size="small" icon={<LuPencil />} onClick={startEditing}>
						Edit
					</Button>
				}
			>
				<Typography.Paragraph style={{ color: "#475467", fontSize: 14 }}>
					{experience.description}
				</Typography.Paragraph>

				<Descriptions column={1} size="small" bordered>
					<Descriptions.Item label="Category">{experience.category}</Descriptions.Item>
					<Descriptions.Item label="Provider">
						{orDash(experience.provider.name)}
					</Descriptions.Item>
					<Descriptions.Item label="Location">
						{formatLocation(experience.location)}
					</Descriptions.Item>
					<Descriptions.Item label="Starts">
						{formatDateTime(experience.schedule.start) ?? NOT_STATED}
					</Descriptions.Item>
					<Descriptions.Item label="Ends">
						{formatDateTime(experience.schedule.end) ?? NOT_STATED}
					</Descriptions.Item>
					<Descriptions.Item label="Price">
						{formatPrice(experience.pricing.amount, experience.pricing.currency)}
					</Descriptions.Item>
				</Descriptions>
			</Card>
		);
	}

	return (
		<Card
			title="Edit experience"
			size="small"
			extra={
				<Space>
					<Button size="small" icon={<LuX />} onClick={() => setEditing(false)} disabled={saving}>
						Cancel
					</Button>
					<Button size="small" type="primary" icon={<LuSave />} loading={saving} onClick={handleSave}>
						Save
					</Button>
				</Space>
			}
		>
			<Form form={form} layout="vertical" size="small" requiredMark={false}>
				<Form.Item name="title" label="Title" rules={[{ required: true, message: "A title is required" }]}>
					<Input />
				</Form.Item>

				<Form.Item
					name="description"
					label="Description"
					rules={[{ required: true, message: "A description is required" }]}
				>
					<Input.TextArea rows={4} />
				</Form.Item>

				<Form.Item name="category" label="Category" rules={[{ required: true }]}>
					<Select options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
				</Form.Item>

				<Space size={12} style={{ display: "flex" }} align="start">
					<Form.Item name="providerName" label="Provider" style={{ flex: 1 }}>
						<Input placeholder="Not stated" />
					</Form.Item>
					<Form.Item
						name="providerWebsite"
						label="Provider website"
						style={{ flex: 1 }}
						rules={[{ type: "url", message: "Must be a valid URL" }]}
					>
						<Input placeholder="Not stated" />
					</Form.Item>
				</Space>

				<Space size={12} style={{ display: "flex" }} align="start">
					<Form.Item name="venue" label="Venue" style={{ flex: 1 }}>
						<Input placeholder="Not stated" />
					</Form.Item>
					<Form.Item name="address" label="Address" style={{ flex: 1 }}>
						<Input placeholder="Not stated" />
					</Form.Item>
				</Space>

				<Space size={12} style={{ display: "flex" }} align="start">
					<Form.Item name="city" label="City" style={{ flex: 1 }}>
						<Input placeholder="Not stated" />
					</Form.Item>
					<Form.Item name="country" label="Country" style={{ flex: 1 }}>
						<Input placeholder="Not stated" />
					</Form.Item>
				</Space>

				<Space size={12} style={{ display: "flex" }} align="start">
					<Form.Item name="start" label="Starts" style={{ flex: 1 }}>
						<DatePicker showTime style={{ width: "100%" }} />
					</Form.Item>
					<Form.Item name="end" label="Ends" style={{ flex: 1 }}>
						<DatePicker showTime style={{ width: "100%" }} />
					</Form.Item>
				</Space>

				<Space size={12} style={{ display: "flex" }} align="start">
					<Form.Item name="amount" label="Price" style={{ flex: 1 }}>
						<InputNumber min={0} style={{ width: "100%" }} placeholder="Not stated" />
					</Form.Item>
					<Form.Item
						name="currency"
						label="Currency"
						style={{ flex: 1 }}
						rules={[{ pattern: /^[A-Z]{3}$/, message: "Three-letter code, e.g. EUR" }]}
					>
						<Input placeholder="EUR" maxLength={3} />
					</Form.Item>
				</Space>
			</Form>
		</Card>
	);
}
