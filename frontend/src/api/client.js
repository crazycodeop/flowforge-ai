/**
 * FlowForge AI API Client Layer
 * Communicates with FastAPI backend versioned REST endpoints.
 */

const BASE_URL = "/api/v1";

/**
 * Common request helper.
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
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      if (typeof errorBody.detail === "string") {
        errorMessage = errorBody.detail;
      } else if (errorBody.detail && errorBody.detail.message) {
        errorMessage = errorBody.detail.message;
      }
    } catch {
      // Fallback to default message
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  // --- Diagnostics & Health ---
  async getHealth() {
    return request("/health");
  },

  async getReadiness() {
    return request("/ready");
  },

  // --- Workflows ---
  async listNodeTypes() {
    return request("/workflows/nodes");
  },

  async listWorkflows() {
    return request("/workflows/");
  },

  async getWorkflow(workflowId) {
    return request(`/workflows/${workflowId}`);
  },

  async createWorkflow(payload) {
    return request("/workflows/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateWorkflow(workflowId, payload) {
    return request(`/workflows/${workflowId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteWorkflow(workflowId) {
    return request(`/workflows/${workflowId}`, {
      method: "DELETE",
    });
  },

  async validateWorkflow(workflowId, overrideDefinition = null) {
    return request(`/workflows/${workflowId}/validate`, {
      method: "POST",
      body: overrideDefinition ? JSON.stringify(overrideDefinition) : undefined,
    });
  },

  async publishWorkflow(workflowId, changelog = null) {
    return request(`/workflows/${workflowId}/publish`, {
      method: "POST",
      body: JSON.stringify({ changelog }),
    });
  },

  async listWorkflowVersions(workflowId) {
    return request(`/workflows/${workflowId}/versions`);
  },

  async getWorkflowVersion(workflowId, versionNumber) {
    return request(`/workflows/${workflowId}/versions/${versionNumber}`);
  },

  // --- Executions ---
  async triggerRun(workflowId, payload = {}) {
    return request(`/workflows/${workflowId}/runs`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async listRuns(workflowId = null) {
    if (workflowId) {
      return request(`/workflows/${workflowId}/runs`);
    }
    return request("/runs");
  },

  async getRun(runId) {
    return request(`/runs/${runId}`);
  },

  async getRunSteps(runId) {
    return request(`/runs/${runId}/steps`);
  },

  async getRunEvents(runId) {
    return request(`/runs/${runId}/events`);
  },

  async cancelRun(runId) {
    return request(`/runs/${runId}/cancel`, {
      method: "POST",
    });
  },

  // --- Human Approvals ---
  async listPendingApprovals() {
    return request("/approvals/pending");
  },

  async getApproval(approvalId) {
    return request(`/approvals/${approvalId}`);
  },

  async decideApproval(approvalId, decision, comment = null) {
    return request(`/approvals/${approvalId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, comment }),
    });
  },

  // --- Evaluations ---
  async listEvaluationDatasets() {
    return request("/evaluations/datasets");
  },

  async createEvaluationDataset(payload) {
    return request("/evaluations/datasets", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async seedEvaluationBenchmark() {
    return request("/evaluations/seed", {
      method: "POST",
    });
  },

  async listEvaluationRuns() {
    return request("/evaluations/runs");
  },

  async triggerEvaluationRun(payload) {
    return request("/evaluations/runs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getEvaluationRun(runId) {
    return request(`/evaluations/runs/${runId}`);
  },

  // --- Knowledge Collections ---
  async listKnowledgeCollections() {
    return request("/knowledge/collections");
  },

  async seedKnowledge() {
    return request("/knowledge/seed", {
      method: "POST",
    });
  },
};
