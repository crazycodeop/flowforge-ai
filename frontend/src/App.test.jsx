import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "./App";
import { api } from "./api/client";

vi.mock("./api/client", () => ({
  api: {
    getHealth: vi.fn(),
    getReadiness: vi.fn(),
    listWorkflows: vi.fn(),
    listNodeTypes: vi.fn(),
  },
}));

describe("FlowForge AI Modern UI & Shell", () => {
  it("renders dark navigation shell and navigation items", async () => {
    api.listWorkflows.mockResolvedValueOnce([]);
    api.getReadiness.mockResolvedValueOnce({
      status: "ready",
      database: { healthy: true, details: "PostgreSQL connection active" },
      redis: { healthy: true, details: "Redis connection active" },
      celery: { healthy: true, details: "Celery broker reachable" },
    });

    render(<App />);

    expect(screen.getByText("FlowForge AI")).toBeInTheDocument();
    expect(screen.getByText("Orchestration Platform")).toBeInTheDocument();
    expect(screen.getByText("Production Workspace")).toBeInTheDocument();
    expect(screen.getAllByText("Overview")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Workflows")[0]).toBeInTheDocument();
    expect(screen.getByText("Executions")).toBeInTheDocument();
    expect(screen.getByText("Approvals")).toBeInTheDocument();
    expect(screen.getByText("Evaluations")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("FlowForge Operational Control")).toBeInTheDocument();
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
      expect(screen.getByText("Customer Support Triage")).toBeInTheDocument();
      expect(screen.getByText("v1 Published")).toBeInTheDocument();
    });
  });
});
