"use client";

import { useSyncExternalStore } from "react";
import { useExperienceStore } from "./experienceStore";

/**
 * Whether the persisted store has finished loading from localStorage.
 *
 * The server renders with an empty store; the browser then rehydrates from
 * localStorage. Rendering real data before that completes causes a hydration
 * mismatch — and worse, a moment where the queue looks empty when it isn't.
 * Components use this to hold a skeleton until the store is truly ready.
 *
 * useSyncExternalStore rather than useEffect + useState: hydration can finish
 * *before* an effect would run, so the effect version needs a synchronous catch-up
 * check that React rightly warns about. This subscribes properly and takes an
 * explicit server snapshot of `false`, which is what the server always renders.
 */
export function useHydrated() {
	return useSyncExternalStore(
		(onChange) => useExperienceStore.persist.onFinishHydration(onChange),
		() => useExperienceStore.persist.hasHydrated(),
		() => false
	);
}
