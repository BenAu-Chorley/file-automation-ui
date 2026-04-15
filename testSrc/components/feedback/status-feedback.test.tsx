/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { InlineFeedback, ListStatePanel } from "@/components/feedback/status-feedback";

describe("status-feedback", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders inline feedback title/action and dismiss callback", () => {
    const onDismiss = vi.fn();

    render(
      <InlineFeedback
        title="Saved"
        message={"Configuration saved"}
        tone="success"
        action={<button type="button">Undo</button>}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));

    expect(screen.getByText("Saved")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders list state with optional title and action", () => {
    render(
      <ListStatePanel
        title="No rows"
        description="Try a broader date range"
        tone="error"
        action={<button type="button">Reload</button>}
      />,
    );

    expect(screen.getByText("No rows")).toBeTruthy();
    expect(screen.getByText("Try a broader date range")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
  });

  it("renders without optional blocks", () => {
    render(<InlineFeedback message={"Heads up"} />);

    expect(screen.getByText("Heads up")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Dismiss notification" })).toBeNull();
  });
});
