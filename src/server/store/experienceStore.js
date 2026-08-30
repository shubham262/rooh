import "server-only";
import crypto from "node:crypto";
import { STATUS, REVIEW_ACTION } from "@/constants";
import { NotFoundError } from "@/helpers/errors";

/**
 * In-memory repository.
 *
 * Deliberately a POC choice: it keeps the demo to `npm run dev` with no
 * database to provision. Everything below is written against the same
 * operations a Postgres-backed implementation would expose, so swapping it out
 * means replacing this file and nothing else. The equivalent DDL is in
 * docs/architecture.md.
 *
 * Known limitation, stated plainly: data does not survive a server restart.
 *
 * State is pinned to globalThis because Next.js hot-reloads modules in dev —
 * without this, editing any file silently empties the store mid-demo.
 */

const GLOBAL_KEY = Symbol.for("rooh.store");

function getState() {
	if (!globalThis[GLOBAL_KEY]) {
		globalThis[GLOBAL_KEY] = {
			experiences: new Map(), // id -> experience
			sources: [],
			reviews: [],
			byNormalizedUrl: new Map(), // normalizedUrl -> id
			byFingerprint: new Map(), // fingerprint -> id
		};
	}
	return globalThis[GLOBAL_KEY];
}

const now = () => new Date().toISOString();

// --- Duplicate lookup -------------------------------------------------------

/**
 * Find an existing record matching this URL or content fingerprint.
 *
 * URL match is checked first because it's the stronger signal — the same
 * address is the same page. Returns null when nothing matches.
 */
export function findDuplicate({ normalizedUrl, fingerprint }) {
	const state = getState();

	const byUrl = state.byNormalizedUrl.get(normalizedUrl);
	if (byUrl) return { id: byUrl, reason: "url" };

	const byPrint = state.byFingerprint.get(fingerprint);
	if (byPrint) return { id: byPrint, reason: "fingerprint" };

	return null;
}

// --- Writes -----------------------------------------------------------------

export function createExperience(experience, sourceRecord) {
	const state = getState();
	state.experiences.set(experience.id, experience);

	// Index for future duplicate checks. First writer wins, so the original
	// record stays the canonical one and later copies are flagged against it.
	if (!state.byNormalizedUrl.has(experience.source.normalizedUrl)) {
		state.byNormalizedUrl.set(experience.source.normalizedUrl, experience.id);
	}
	if (!state.byFingerprint.has(experience.fingerprint)) {
		state.byFingerprint.set(experience.fingerprint, experience.id);
	}

	state.sources.push({
		id: crypto.randomUUID(),
		experienceId: experience.id,
		url: sourceRecord.url,
		contentHash: sourceRecord.contentHash,
		retrievedAt: sourceRecord.retrievedAt,
		sourceType: sourceRecord.sourceType,
	});

	return experience;
}

export function updateExperience(id, patch) {
	const state = getState();
	const existing = state.experiences.get(id);
	if (!existing) throw new NotFoundError();

	const updated = { ...existing, ...patch, id, updatedAt: now() };
	state.experiences.set(id, updated);

	state.reviews.push({
		id: crypto.randomUUID(),
		experienceId: id,
		action: REVIEW_ACTION.EDIT,
		notes: `Edited fields: ${Object.keys(patch).join(", ")}`,
		createdAt: now(),
	});

	return updated;
}

export function recordReview(id, action, notes) {
	const state = getState();
	const existing = state.experiences.get(id);
	if (!existing) throw new NotFoundError();

	const status = action === REVIEW_ACTION.APPROVE ? STATUS.APPROVED : STATUS.REJECTED;
	const updated = { ...existing, status, updatedAt: now() };
	state.experiences.set(id, updated);

	state.reviews.push({
		id: crypto.randomUUID(),
		experienceId: id,
		action,
		notes: notes ?? null,
		createdAt: now(),
	});

	return updated;
}

// --- Reads ------------------------------------------------------------------

export function getExperience(id) {
	const found = getState().experiences.get(id);
	if (!found) throw new NotFoundError();
	return found;
}

export function listExperiences({ status } = {}) {
	const all = [...getState().experiences.values()];
	const filtered = status ? all.filter((e) => e.status === status) : all;
	return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Audit trail for one experience, oldest first. */
export function listReviews(experienceId) {
	return getState()
		.reviews.filter((r) => r.experienceId === experienceId)
		.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getStats() {
	const all = [...getState().experiences.values()];
	return {
		total: all.length,
		pending: all.filter((e) => e.status === STATUS.PENDING).length,
		approved: all.filter((e) => e.status === STATUS.APPROVED).length,
		rejected: all.filter((e) => e.status === STATUS.REJECTED).length,
	};
}
