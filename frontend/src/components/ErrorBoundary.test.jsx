import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

function ProblemComponent() {
  throw new Error("Simulated canvas render fault");
}

describe("ErrorBoundary", () => {
  it("catches render errors and displays fallback UI without crashing the whole application", () => {
    // Suppress console.error in test output for intentional error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Unable to Render Component")).toBeInTheDocument();
    expect(screen.getByText(/Simulated canvas render fault/)).toBeInTheDocument();
    expect(screen.getByText("Reload Page")).toBeInTheDocument();
    expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();

    spy.mockRestore();
  });
});
