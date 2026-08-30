import apiClient from "./apiClient";

/**
 * The only server call the UI makes.
 *
 * Everything else — reading the queue, editing, approving, rejecting — happens
 * against the client store in stores/experienceStore, because the browser owns
 * the records. The server's job is analysis, not storage.
 *
 * @param {string} url
 * @param {Array<{id: string, normalizedUrl: string, fingerprint: string}>} known
 *   Existing records, so the server can flag duplicates it otherwise couldn't see.
 */
export function analyzeUrl(url, known = []) {
	return apiClient.post("/analyze", { url, known }).then((data) => data.experience);
}
