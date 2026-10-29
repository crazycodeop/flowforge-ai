import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "./App";
import { api } from "./api/client";

vi.mock("./api/client", () => ({
  api: {
    getReadiness: vi.fn(),
  },
}));

describe("App Foundation Component", () => {
  it("renders header and navigation elements", async () => {
    api.getReadiness.mockResolvedValueOnce({
      status: "ready",
      database: { healthy: true, details: "PostgreSQL connection active" },
      redis: { healthy: true, details: "Redis connection active" },
      celery: { healthy: true, details: "Celery broker reachable" },
    });

    render(<App />);

    expect(screen.getByText("FlowForge AI")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("Platform Foundation & Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Workflows")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("PostgreSQL connection active")).toBeInTheDocument();
    });
  });

  it("displays service health status from API", async () => {
    api.getReadiness.mockResolvedValueOnce({
      status: "ready",
      database: { healthy: true, details: "PostgreSQL connection active" },
      redis: { healthy: true, details: "Redis connection active" },
      celery: { healthy: true, details: "Celery broker reachable" },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("PostgreSQL connection active")).toBeInTheDocument();
      expect(screen.getByText("Redis connection active")).toBeInTheDocument();
      expect(screen.getByText("Celery broker reachable")).toBeInTheDocument();
    });
  });

  it("handles backend connectivity error gracefully", async () => {
    api.getReadiness.mockRejectedValueOnce(new Error("Network Error"));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to connect to backend: Network Error/i)).toBeInTheDocument();
    });
  });
});
