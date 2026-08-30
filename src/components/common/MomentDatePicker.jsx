"use client";

import generatePicker from "antd/es/date-picker/generatePicker";
import momentGenerateConfig from "@rc-component/picker/generate/moment";

/**
 * antd's DatePicker, bound to moment instead of dayjs.
 *
 * antd ships a dayjs-backed picker by default, so handing it a moment object
 * silently misbehaves. Rather than run two date libraries — moment for our
 * parsing and formatting, dayjs only here — we rebuild the picker against the
 * moment generate config antd already exposes for exactly this case.
 *
 * The result is one date library across the whole app, and `helpers/dateHelpers`
 * stays the single place that knows how dates are parsed.
 */
const MomentDatePicker = generatePicker(momentGenerateConfig);

export default MomentDatePicker;
