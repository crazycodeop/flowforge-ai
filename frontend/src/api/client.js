/**
 * FlowForge AI API Client Layer
 * Communicates with FastAPI backend versioned REST endpoints.
 * Automatically injects JWT Bearer token and X-Organization-ID header.
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
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = localStorage.getItem("token");
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const orgId = localStorage.getItem("org_id");
  if (orgId && !headers["X-Organization-ID"]) {
    headers["X-Organization-ID"] = orgId;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      if (typeof errorBody.detail === "string") {
        errorMessage = errorBody.detail;
      } else if (errorBody.detail && errorBody.detail.message) {
        errorMessage = errorBody.detail.message;
      } else if (Array.isArray(errorBody.detail)) {
        errorMessage = errorBody.detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
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

  // --- Authentication ---
  async login(email, password) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async register(email, password, full_name = "", role = "developer") {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name, role }),
    });
  },

  async getCurrentUser() {
    return request("/auth/me");
  },

  // --- Organizations & Tenancy ---
  async listOrganizations() {
    return request("/organizations/");
  },

  async createOrganization(payload) {
    return request("/organizations/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getOrganization(orgId) {
    return request(`/organizations/${orgId}`);
  },

  async updateOrganization(orgId, payload) {
    return request(`/organizations/${orgId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async listOrganizationMembers(orgId) {
    return request(`/organizations/${orgId}/members`);
  },

  async addOrganizationMember(orgId, payload) {
    return request(`/organizations/${orgId}/members`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async removeOrganizationMember(orgId, userId) {
    return request(`/organizations/${orgId}/members/${userId}`, {
      method: "DELETE",
    });
  },

  // --- Settings ---
  async getProfile() {
    return request("/settings/profile");
  },

  async updateProfile(payload) {
    return request("/settings/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload) {
    return request("/settings/password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getAISettings() {
    return request("/settings/ai");
  },

  async testAIConnection() {
    return request("/settings/ai/test", {
      method: "POST",
    });
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
