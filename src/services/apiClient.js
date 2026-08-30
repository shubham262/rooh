import axios from "axios";

const apiClient = axios.create({
	baseURL: "/api",
	headers: { "Content-Type": "application/json" },

	timeout: 130000,
});

apiClient.interceptors.response.use(
	(response) => response.data,
	(error) => {
		if (error.code === "ECONNABORTED") {
			return Promise.reject(
				new Error(
					"That took too long to analyse. The page may be very large or slow to load."
				)
			);
		}

		const message = error.response?.data?.error?.message;
		const wrapped = new Error(
			message || "Something went wrong. Please try again."
		);
		wrapped.code = error.response?.data?.error?.code ?? "network_error";
		wrapped.status = error.response?.status;
		return Promise.reject(wrapped);
	}
);

export default apiClient;
