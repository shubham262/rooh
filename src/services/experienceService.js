import apiClient from "./apiClient";

export function analyzeUrl(url) {
	return apiClient.post("/analyze", { url }).then((data) => data.experience);
}

export function listExperiences(status) {
	return apiClient.get("/experiences", { params: status ? { status } : {} });
}

export function getExperience(id) {
	return apiClient.get(`/experiences/${id}`);
}

export function updateExperience(id, patch) {
	return apiClient
		.patch(`/experiences/${id}`, patch)
		.then((data) => data.experience);
}

export function reviewExperience(id, action, notes) {
	return apiClient
		.post(`/experiences/${id}/review`, { action, notes })
		.then((data) => data.experience);
}
