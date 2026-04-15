/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const {
  getTaskDefinitionDetailsActionMock,
  listRunnerInstancesActionMock,
  listRunnerLogsActionMock,
  listTaskDefinitionsActionMock,
  saveRoleExecutorActionMock,
  updateTaskMetadataActionMock,
} = vi.hoisted(() => ({
  getTaskDefinitionDetailsActionMock: vi.fn(),
  listRunnerInstancesActionMock: vi.fn(),
  listRunnerLogsActionMock: vi.fn(),
  listTaskDefinitionsActionMock: vi.fn(),
  saveRoleExecutorActionMock: vi.fn(),
  updateTaskMetadataActionMock: vi.fn(),
}));

vi.mock("@/features/task-definition/actions", () => ({
  getTaskDefinitionDetailsAction: getTaskDefinitionDetailsActionMock,
  listRunnerInstancesAction: listRunnerInstancesActionMock,
  listRunnerLogsAction: listRunnerLogsActionMock,
  listTaskDefinitionsAction: listTaskDefinitionsActionMock,
  saveRoleExecutorAction: saveRoleExecutorActionMock,
  updateTaskMetadataAction: updateTaskMetadataActionMock,
}));

import { ConfirmProvider } from "@/components/ui/confirm-provider";
import { useTaskDefinitionWorkspace } from "@/features/task-definition/ui/use-task-definition-workspace";

function wrapper({ children }: { children: ReactNode }) {
  return <ConfirmProvider>{children}</ConfirmProvider>;
}

describe("use-task-definition-workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    listTaskDefinitionsActionMock.mockResolvedValue({
      ok: true,
      message: "Loaded task definitions.",
      data: [
        {
          id: 1,
          name: "Task Alpha",
          descp: "Alpha description",
          extractorClass: "LocalFileCopy",
          transformerClass: "NoOp",
          loaderClass: "NoOp",
        },
      ],
    });

    getTaskDefinitionDetailsActionMock.mockResolvedValue({
      ok: true,
      message: "Loaded task details.",
      data: {
        id: 1,
        name: "Task Alpha",
        descp: "Alpha description",
        extractorClass: "LocalFileCopy",
        transformerClass: "NoOp",
        loaderClass: "NoOp",
        assignments: [
          {
            role: "extractor",
            executorClass: "LocalFileCopy",
            config: {
              taskId: 1,
              role: "extractor",
              values: {
                src_path_pattern: "C:/in",
                dest_path_pattern: "C:/out",
                overwrite_dest: true,
                delete_src_after_copy: false,
              },
            },
          },
          { role: "transformer", executorClass: "NoOp", config: null },
          { role: "loader", executorClass: "NoOp", config: null },
        ],
      },
    });

    listRunnerInstancesActionMock.mockResolvedValue({ ok: true, message: "Loaded instances.", data: [] });
    listRunnerLogsActionMock.mockResolvedValue({ ok: true, message: "Loaded logs.", data: [] });
    saveRoleExecutorActionMock.mockResolvedValue({ ok: true, message: "Saved role.", data: null });
    updateTaskMetadataActionMock.mockResolvedValue({ ok: true, message: "Saved task.", data: null });
  });

  it("resets workspace and shows guidance when no active connection", async () => {
    const { result } = renderHook(() => useTaskDefinitionWorkspace(false), { wrapper });

    await waitFor(() => {
      expect(result.current.tasks).toEqual([]);
      expect(result.current.details).toBeNull();
      expect(result.current.notice?.message).toContain("Activate a session connection");
    });
  });

  it("handles early returns for actions that require selected details", async () => {
    const { result } = renderHook(() => useTaskDefinitionWorkspace(false), { wrapper });

    await act(async () => {
      await result.current.handleSaveRole("extractor");
      await result.current.handleCancelRole("extractor");
      result.current.handleSaveTaskMetadata();
      result.current.handleCancelTaskMetadata();
      result.current.applyRunnerFilters();
      result.current.clearRunnerFilters();
    });

    expect(saveRoleExecutorActionMock).not.toHaveBeenCalled();
    expect(updateTaskMetadataActionMock).not.toHaveBeenCalled();
    expect(listRunnerInstancesActionMock).not.toHaveBeenCalled();
  });

  it("loads tasks/details and supports no-op notices for unchanged save/cancel paths", async () => {
    const { result } = renderHook(() => useTaskDefinitionWorkspace(true), { wrapper });

    await waitFor(() => {
      expect(result.current.details?.id).toBe(1);
    });

    await act(async () => {
      await result.current.handleSaveRole("extractor");
    });

    expect(result.current.notice?.message).toContain("No pending changes for Extractor");

    await act(async () => {
      await result.current.handleCancelRole("extractor");
    });

    expect(result.current.notice?.message).toContain("No pending changes to cancel for Extractor");

    act(() => {
      result.current.handleSaveTaskMetadata();
      result.current.handleCancelTaskMetadata();
    });

    expect(result.current.notice?.message).toContain("No pending task detail changes");
  });

  it("handles role draft updates for NoOp and value changes", async () => {
    const { result } = renderHook(() => useTaskDefinitionWorkspace(true), { wrapper });

    await waitFor(() => {
      expect(result.current.details?.id).toBe(1);
    });

    act(() => {
      result.current.handleRoleExecutorClassChange("extractor", "NoOp");
      result.current.handleRoleBooleanFieldChange("extractor", "overwrite_dest", false);
      result.current.handleRoleFieldValueChange("extractor", "src_path_pattern", "X");
    });

    const draft = result.current.roleDrafts?.extractor;
    expect(draft?.selectedExecutorClass).toBe("NoOp");

    act(() => {
      result.current.handleRoleExecutorClassChange("extractor", "LocalFileCopy");
      result.current.handleRoleFieldValueChange("extractor", "src_path_pattern", "C:/new");
      result.current.handleRoleFieldRevert("extractor", {
        key: "src_path_pattern",
        required: true,
        type: "string",
      });
    });

    expect(result.current.roleDrafts?.extractor.draftsByExecutor.LocalFileCopy?.src_path_pattern).toBe("C:/in");
  });

  it("supports notice dismissal, panel toggles, quick range, and runner selection limit", async () => {
    const { result } = renderHook(() => useTaskDefinitionWorkspace(true), { wrapper });

    await waitFor(() => {
      expect(result.current.details?.id).toBe(1);
    });

    act(() => {
      result.current.toggleTasksPanelCollapsed();
      result.current.toggleRoleExpanded("extractor");
      result.current.dismissNotice();
      result.current.applyQuickRange(14);
    });

    expect(result.current.isTasksPanelCollapsed).toBe(true);
    expect(result.current.expandedRoles.extractor).toBe(true);
    expect(result.current.notice).toBeNull();
    expect(result.current.runnerFilters.startTimeFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    act(() => {
      result.current.setRunnerFilters({ startTimeFrom: "", startTimeBefore: "" });
      result.current.toggleRunnerInstanceSelection(1);
      result.current.toggleRunnerInstanceSelection(2);
      result.current.toggleRunnerInstanceSelection(3);
    });

    expect(result.current.notice?.message).toContain("You can compare up to");
  });
});
