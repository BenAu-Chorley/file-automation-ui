/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { TaskListPanel } from "@/features/task-definition/ui/task-list-panel";

describe("task-list-panel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders expanded task cards and forwards task selection", () => {
    const onSelectTask = vi.fn();

    render(
      <TaskListPanel
        hasActiveConnection
        isLoadingTasks={false}
        isTasksPanelCollapsed={false}
        onReloadTasks={vi.fn()}
        onSelectTask={onSelectTask}
        onToggleCollapsed={vi.fn()}
        selectedTaskId={2}
        tasks={[
          { id: 1, name: "Task One", descp: "First", extractorClass: "NoOp", transformerClass: "NoOp", loaderClass: "NoOp" },
          { id: 2, name: "Task Two", descp: null, extractorClass: "NoOp", transformerClass: "NoOp", loaderClass: "NoOp" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /#1 Task One/i }));

    expect(onSelectTask).toHaveBeenCalledWith(1);
    expect(screen.getByText("No description")).toBeTruthy();
  });

  it("renders collapsed controls and empty state message", () => {
    const onToggleCollapsed = vi.fn();
    const onReloadTasks = vi.fn();

    render(
      <TaskListPanel
        hasActiveConnection={false}
        isLoadingTasks
        isTasksPanelCollapsed
        onReloadTasks={onReloadTasks}
        onSelectTask={vi.fn()}
        onToggleCollapsed={onToggleCollapsed}
        selectedTaskId={null}
        tasks={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand tasks panel" }));

    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
    const reloadButtons = screen.getAllByRole("button", { name: "Reload tasks" });
    expect((reloadButtons[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows no-task state when connected and idle", () => {
    render(
      <TaskListPanel
        hasActiveConnection
        isLoadingTasks={false}
        isTasksPanelCollapsed={false}
        onReloadTasks={vi.fn()}
        onSelectTask={vi.fn()}
        onToggleCollapsed={vi.fn()}
        selectedTaskId={null}
        tasks={[]}
      />,
    );

    expect(screen.getByText("No tasks available for this connection.")).toBeTruthy();
  });
});
