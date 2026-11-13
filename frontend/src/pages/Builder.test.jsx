import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Builder from "./Builder";
import { ThemeProvider } from "../context/ThemeContext";
import { ModalProvider } from "../context/ModalContext";
import { api } from "../api/client";

// Mock resize observer for jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("../api/client", () => ({
  api: {
    getWorkflow: vi.fn(),
    updateWorkflow: vi.fn(),
    publishWorkflow: vi.fn(),
    validateWorkflow: vi.fn(),
    triggerWorkflowRun: vi.fn(),
  },
}));

describe("Workflow Builder Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockWorkflow = {
    id: "7f48547a-6a97-4fd2-853c-7b4a73f65680",
    name: "Customer Support Pipeline",
    state: "draft",
    draft_definition: {
      nodes: [
        {
          id: "node_1",
          type: "trigger",
          name: "Support Webhook",
          position: { x: 250, y: 100 },
          config: { trigger_type: "api" },
        },
        {
          id: "node_2",
          type: "ai_classify",
          name: "Ticket Intent Classifier",
          position: { x: 250, y: 220 },
          config: { categories: ["billing", "technical"] },
        },
      ],
      edges: [
        {
          id: "e1",
          source_node_id: "node_1",
          target_node_id: "node_2",
        },
      ],
    },
  };

  it("renders workflow canvas without crashing or blank screen", async () => {
    api.getWorkflow.mockResolvedValueOnce(mockWorkflow);

    render(
      <MemoryRouter initialEntries={["/workflows/7f48547a-6a97-4fd2-853c-7b4a73f65680"]}>
        <ThemeProvider>
          <ModalProvider>
            <Routes>
              <Route path="/workflows/:id" element={<Builder />} />
            </Routes>
          </ModalProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    // Initial loading indicator
    expect(screen.getByText("Loading workflow canvas...")).toBeInTheDocument();

    // After loading, workflow details and canvas elements should be rendered
    await waitFor(() => {
      expect(screen.getByText("Customer Support Pipeline")).toBeInTheDocument();
      expect(screen.getByText("Support Webhook")).toBeInTheDocument();
      expect(screen.getByText("Ticket Intent Classifier")).toBeInTheDocument();
      expect(screen.getByText("Validate")).toBeInTheDocument();
      expect(screen.getByText("Publish")).toBeInTheDocument();
      expect(screen.getByText("Run")).toBeInTheDocument();
    });
  });

  it("handles workflow load errors gracefully", async () => {
    api.getWorkflow.mockRejectedValueOnce(new Error("Workflow not found"));

    render(
      <MemoryRouter initialEntries={["/workflows/invalid-id"]}>
        <ThemeProvider>
          <ModalProvider>
            <Routes>
              <Route path="/workflows/:id" element={<Builder />} />
            </Routes>
          </ModalProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load workflow: Workflow not found/i)
      ).toBeInTheDocument();
    });
  });
});
