/**
 * API client layer for FlowForge AI backend.
 */

const BASE_URL = "/api/v1";

/**
 * Executes an HTTP fetch request against the FlowForge backend.
 * @param {string} endpoint
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  /**
   * Fetches the backend liveness status.
   */
  async getHealth() {
    return request("/health");
  },

  /**
   * Fetches readiness status including DB and Redis health.
   */
  async getReadiness() {
    return request("/ready");
  },
};
