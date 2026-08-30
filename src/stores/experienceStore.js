"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STATUS, REVIEW_ACTION } from "@/constants";

/**
 * Review state, owned by the browser.
 *
 * The analysis pipeline runs on the server because it needs API keys, but the
 * resulting records live here. That's a deliberate consequence of deploying to
 * serverless: each invocation may run on a different instance, so a server-side
 * in-memory store loses records between "analyse this URL" and "show me the
 * review page". Keeping state client-side makes the server genuinely stateless,
 * which is what serverless actually is.
 *
 * The trade-off, stated plainly: the queue is per-browser. Two reviewers don't
 * share a work queue, and clearing site data clears the records. That is the
 * right shape for a POC demo and the wrong shape for production — where this
 * store is replaced by the Postgres schema in docs/architecture.md, and the
 * server owns persistence again. The action names below deliberately mirror
 * that future repository so the swap is contained.
 */

const now = () => new Date().toISOString();

export const useExperienceStore = create(
	persist(
		(set, get) => ({
			/** id -> experience */
			experiences: {},
			/** append-only audit trail */
			reviews: [],

			addExperience: (experience) =>
				set((state) => ({
					experiences: { ...state.experiences, [experience.id]: experience },
				})),

			updateExperience: (id, patch) =>
				set((state) => {
					const existing = state.experiences[id];
					if (!existing) return state;

					// Merge nested objects rather than replacing them, so editing one
					// field of `location` doesn't wipe the rest.
					const merged = { ...existing };
					for (const [key, value] of Object.entries(patch)) {
						merged[key] =
							value && typeof value === "object" && !Array.isArray(value)
								? { ...existing[key], ...value }
								: value;
					}
					merged.updatedAt = now();

					return {
						experiences: { ...state.experiences, [id]: merged },
						reviews: [
							...state.reviews,
							{
								id: crypto.randomUUID(),
								experienceId: id,
								action: REVIEW_ACTION.EDIT,
								notes: `Edited fields: ${Object.keys(patch).join(", ")}`,
								createdAt: now(),
							},
						],
					};
				}),

			recordReview: (id, action, notes) =>
				set((state) => {
					const existing = state.experiences[id];
					if (!existing) return state;

					const status = action === REVIEW_ACTION.APPROVE ? STATUS.APPROVED : STATUS.REJECTED;

					return {
						experiences: {
							...state.experiences,
							[id]: { ...existing, status, updatedAt: now() },
						},
						reviews: [
							...state.reviews,
							{
								id: crypto.randomUUID(),
								experienceId: id,
								action,
								notes: notes ?? null,
								createdAt: now(),
							},
						],
					};
				}),

			// --- reads ---------------------------------------------------------

			getExperience: (id) => get().experiences[id] ?? null,

			listExperiences: (status) => {
				const all = Object.values(get().experiences);
				const filtered = status ? all.filter((e) => e.status === status) : all;
				return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
			},

			listReviews: (experienceId) =>
				get()
					.reviews.filter((r) => r.experienceId === experienceId)
					.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),

			getStats: () => {
				const all = Object.values(get().experiences);
				return {
					total: all.length,
					pending: all.filter((e) => e.status === STATUS.PENDING).length,
					approved: all.filter((e) => e.status === STATUS.APPROVED).length,
					rejected: all.filter((e) => e.status === STATUS.REJECTED).length,
				};
			},

			/**
			 * The dedupe index sent to the server with each analyse request.
			 *
			 * The server can no longer see what we've already stored, so we hand it
			 * the minimum it needs to spot a repeat: the normalised URL and content
			 * fingerprint of everything we hold. Small — a few dozen bytes per
			 * record — and it keeps duplicate detection working without giving the
			 * server state it would only lose again.
			 */
			getDedupeIndex: () =>
				Object.values(get().experiences).map((e) => ({
					id: e.id,
					normalizedUrl: e.source.normalizedUrl,
					fingerprint: e.fingerprint,
				})),

			clearAll: () => set({ experiences: {}, reviews: [] }),
		}),
		{
			name: "rooh-experiences",
			// Persist data only — functions would be serialised as undefined.
			partialize: (state) => ({ experiences: state.experiences, reviews: state.reviews }),
		}
	)
);
