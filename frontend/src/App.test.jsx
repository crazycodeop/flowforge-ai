import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "./App";
import { api } from "./api/client";

vi.mock("./api/client", () => ({
  api: {
    getHealth: vi.fn(),
    getReadiness: vi.fn(),
    listWorkflows: vi.fn(),
    listNodeTypes: vi.fn(),
    listOrganizations: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

describe("FlowForge AI Modern UI & Shell", () => {
  beforeEach(() => {
    localStorage.setItem("token", "mock-jwt-token");
    localStorage.setItem("org_id", "org-test-1");
    localStorage.setItem("org_name", "Production Workspace");
    localStorage.setItem("org_role", "owner");
    localStorage.setItem(
      "user",
      JSON.stringify({ full_name: "Platform Engineer", email: "engineer@flowforge.ai", role: "admin" })
    );

    api.listOrganizations.mockResolvedValue([
      { id: "org-test-1", name: "Production Workspace", role: "owner" },
    ]);
  });

  it("renders dark navigation shell and navigation items", async () => {
    api.listWorkflows.mockResolvedValueOnce([]);
    api.getReadiness.mockResolvedValueOnce({
      status: "ready",
      database: { healthy: true, details: "PostgreSQL connection active" },
      redis: { healthy: true, details: "Redis connection active" },
      celery: { healthy: true, details: "Celery broker reachable" },
    });

    render(<App />);

    expect(screen.getAllByTitle("FlowForge AI")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Production Workspace")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Overview")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Workflows")[0]).toBeInTheDocument();
    expect(screen.getByText("Executions")).toBeInTheDocument();
    expect(screen.getByText("Approvals")).toBeInTheDocument();
    expect(screen.getByText("Evaluations")).toBeInTheDocument();
    expect(screen.getAllByText("System Status")[0]).toBeInTheDocument();
    expect(screen.getByText("Use Cases")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Workflows & Services")).toBeInTheDocument();
    });
  });

  it("renders live operational metrics on Overview", async () => {
    api.listWorkflows.mockResolvedValueOnce([
      {
        id: "wf-1",
        name: "Customer Support Triage",
        description: "Support ticket routing",
        draft_definition: { nodes: [{}, {}] },
        latest_version: 1,
        updated_at: new Date().toISOString(),
      },
    ]);
    api.getReadiness.mockResolvedValueOnce({
      status: "ready",
      database: { healthy: true, details: "PostgreSQL connection active" },
      redis: { healthy: true, details: "Redis connection active" },
      celery: { healthy: true, details: "Celery broker reachable" },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText("Customer Support Triage").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Deployed (v1)")).toBeInTheDocument();
    });
  });
});
