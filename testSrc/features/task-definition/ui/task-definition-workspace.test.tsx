/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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
import { TaskDefinitionWorkspace } from "@/features/task-definition/ui/task-definition-workspace";
import type { TaskDefinitionDetails, TaskDefinitionSummary } from "@/features/task-definition/types";

function createTaskSummaries(): TaskDefinitionSummary[] {
  return [
    {
      id: 1,
      name: "Task Alpha",
      descp: "Alpha description",
      extractorClass: "LocalFileCopy",
      transformerClass: "NoOp",
      loaderClass: "NoOp",
    },
    {
      id: 2,
      name: "Task Beta",
      descp: "Beta description",
      extractorClass: "LocalFileCopy",
      transformerClass: "NoOp",
      loaderClass: "NoOp",
    },
  ];
}

function createTaskDetails(taskId: number): TaskDefinitionDetails {
  if (taskId === 2) {
    return {
      id: 2,
      name: "Task Beta",
      descp: "Beta description",
      extractorClass: "LocalFileCopy",
      transformerClass: "NoOp",
      loaderClass: "NoOp",
      assignments: [
        {
          role: "extractor",
          executorClass: "LocalFileCopy",
          config: {
            taskId: 2,
            role: "extractor",
            values: {
              src_path_pattern: "C:/beta/in/*.csv",
              dest_path_pattern: "C:/beta/out/*.csv",
              overwrite_dest: false,
              delete_src_after_copy: false,
            },
          },
        },
        { role: "transformer", executorClass: "NoOp", config: null },
        { role: "loader", executorClass: "NoOp", config: null },
      ],
    };
  }

  return {
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
            src_path_pattern: "C:/alpha/in/*.csv",
            dest_path_pattern: "C:/alpha/out/*.csv",
            overwrite_dest: true,
            delete_src_after_copy: false,
          },
        },
      },
      { role: "transformer", executorClass: "NoOp", config: null },
      { role: "loader", executorClass: "NoOp", config: null },
    ],
  };
}

async function findEnabledButton(container: HTMLElement, name: string): Promise<HTMLButtonElement> {
  return await waitFor(() => {
    const candidates = within(container).getAllByRole("button", { name });
    const enabled = candidates.find((button) => !(button as HTMLButtonElement).disabled);
    expect(enabled).toBeTruthy();
    return enabled as HTMLButtonElement;
  });
}

describe("task-definition workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    listTaskDefinitionsActionMock.mockResolvedValue({
      ok: true,
      message: "Loaded task definitions.",
      data: createTaskSummaries(),
    });
    getTaskDefinitionDetailsActionMock.mockImplementation(async (taskId: number) => ({
      ok: true,
      message: `Loaded task ${taskId}.`,
      data: createTaskDetails(taskId),
    }));
    listRunnerInstancesActionMock.mockResolvedValue({
      ok: true,
      message: "Loaded runner instances.",
      data: [],
    });
    listRunnerLogsActionMock.mockResolvedValue({ ok: true, message: "Loaded logs.", data: [] });
    saveRoleExecutorActionMock.mockResolvedValue({ ok: true, message: "Saved role.", data: null });
    updateTaskMetadataActionMock.mockResolvedValue({ ok: true, message: "Saved task.", data: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("loads the first task and refreshes details when another task is selected", async () => {
    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection />
      </ConfirmProvider>,
    );

    await waitFor(() => {
      expect(listTaskDefinitionsActionMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole("heading", { name: /#1 Task Alpha/i })).toBeTruthy();

    await waitFor(() => {
      expect(getTaskDefinitionDetailsActionMock).toHaveBeenCalledWith(1);
      expect(listRunnerInstancesActionMock).toHaveBeenCalledWith({
        taskId: 1,
        startTimeFrom: undefined,
        startTimeBefore: undefined,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /#2 Task Beta/i }));

    expect(await screen.findByRole("heading", { name: /#2 Task Beta/i })).toBeTruthy();
    expect(screen.getByDisplayValue("Task Beta")).toBeTruthy();

    await waitFor(() => {
      expect(getTaskDefinitionDetailsActionMock).toHaveBeenCalledWith(2);
      expect(listRunnerInstancesActionMock).toHaveBeenCalledWith({
        taskId: 2,
        startTimeFrom: undefined,
        startTimeBefore: undefined,
      });
    });
  });

  it("opens confirm modal and saves extractor changes after confirmation", async () => {
    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection />
      </ConfirmProvider>,
    );

    expect(await screen.findByRole("heading", { name: /#1 Task Alpha/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Expand extractor panel/i }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /overwrite_dest/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save Extractor" }));

    expect(await screen.findByRole("dialog", { name: "Save Extractor changes" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(saveRoleExecutorActionMock).toHaveBeenCalledWith({
        taskId: 1,
        role: "extractor",
        executorClass: "LocalFileCopy",
        values: {
          src_path_pattern: "C:/alpha/in/*.csv",
          dest_path_pattern: "C:/alpha/out/*.csv",
          overwrite_dest: false,
          delete_src_after_copy: false,
        },
      });
    });

    await waitFor(() => {
      expect(getTaskDefinitionDetailsActionMock).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText("Saved role.")).toBeTruthy();
  });

  it("keeps editing when role cancel confirmation is dismissed", async () => {
    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection />
      </ConfirmProvider>,
    );

    expect(await screen.findByRole("heading", { name: /#1 Task Alpha/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Expand extractor panel/i }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /overwrite_dest/i }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Extractor" }));

    expect(await screen.findByRole("dialog", { name: "Discard Extractor changes" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Discard Extractor changes" })).toBeNull();
    });

    expect(screen.getByText("1 field change (unsaved)")).toBeTruthy();
    expect(saveRoleExecutorActionMock).not.toHaveBeenCalled();
  });

  it("discards role changes when cancel confirmation is accepted", async () => {
    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection />
      </ConfirmProvider>,
    );

    expect(await screen.findByRole("heading", { name: /#1 Task Alpha/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Expand extractor panel/i }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /overwrite_dest/i }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Extractor" }));

    expect(await screen.findByRole("dialog", { name: "Discard Extractor changes" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    await waitFor(() => {
      expect(screen.queryByText("1 field change (unsaved)")).toBeNull();
    });

    expect(await screen.findByText("Extractor changes were discarded.")).toBeTruthy();
    expect((screen.getByRole("checkbox", { name: /overwrite_dest/i }) as HTMLInputElement).checked).toBe(true);
    expect(saveRoleExecutorActionMock).not.toHaveBeenCalled();
  });

  it("shows onboarding guidance when no active connection is present", async () => {
    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection={false} />
      </ConfirmProvider>,
    );

    expect(await screen.findByText("Activate a session connection to load task definitions.")).toBeTruthy();
    expect(screen.getByText("Activate a session connection first to initialize task-definition UI.")).toBeTruthy();
    expect(listTaskDefinitionsActionMock).not.toHaveBeenCalled();
  });

  it("shows an error notice when task list loading fails", async () => {
    listTaskDefinitionsActionMock.mockResolvedValueOnce({
      ok: false,
      message: "Could not load task definitions.",
      data: null,
    });

    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection />
      </ConfirmProvider>,
    );

    expect(await screen.findByText("Could not load task definitions.")).toBeTruthy();
    expect(screen.getByText("Select a task from the list to view executor details.")).toBeTruthy();
  });

  it("shows empty state notice when task list is empty", async () => {
    listTaskDefinitionsActionMock.mockResolvedValueOnce({
      ok: true,
      message: "Loaded task definitions.",
      data: [],
    });

    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection />
      </ConfirmProvider>,
    );

    expect(await screen.findByText("No tasks were found for this database.")).toBeTruthy();
    expect(screen.getByText("No tasks available for this connection.")).toBeTruthy();
  });

  it("shows an error notice when task details fail to load", async () => {
    getTaskDefinitionDetailsActionMock.mockResolvedValueOnce({
      ok: false,
      message: "Could not load task details.",
      data: null,
    });

    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection />
      </ConfirmProvider>,
    );

    expect(await screen.findByText("Could not load task details.")).toBeTruthy();
    expect(screen.getByText("Select a task from the list to view executor details.")).toBeTruthy();
  });

  it("applies and clears runner filters with explicit date values", async () => {
    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection />
      </ConfirmProvider>,
    );

    expect(await screen.findByRole("heading", { name: /#1 Task Alpha/i })).toBeTruthy();

    const executionTrackingPanel = document.getElementById("execution-tracking");
    expect(executionTrackingPanel).toBeTruthy();

    const dateInputs = executionTrackingPanel!.querySelectorAll("input[type='date']");
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);

    fireEvent.change(dateInputs[0] as HTMLInputElement, { target: { value: "2026-04-01" } });
    fireEvent.change(dateInputs[1] as HTMLInputElement, { target: { value: "2026-04-30" } });

    fireEvent.click(await findEnabledButton(executionTrackingPanel!, "Apply"));

    await waitFor(() => {
      expect(listRunnerInstancesActionMock).toHaveBeenCalledWith({
        taskId: 1,
        startTimeFrom: "2026-04-01",
        startTimeBefore: "2026-04-30",
      });
    });

    fireEvent.click(await findEnabledButton(executionTrackingPanel!, "Clear"));

    await waitFor(() => {
      expect(listRunnerInstancesActionMock).toHaveBeenCalledWith({
        taskId: 1,
        startTimeFrom: undefined,
        startTimeBefore: undefined,
      });
    });
  });

  it("loads and sorts runner logs when selecting an instance", async () => {
    listRunnerInstancesActionMock.mockResolvedValue({
      ok: true,
      message: "Loaded runner instances.",
      data: [
        {
          id: 700,
          taskId: 1,
          runnerId: "runner-x",
          startTime: "2026-04-20T10:00:00.000Z",
          endTime: null,
          status: "Success",
        },
      ],
    });
    listRunnerLogsActionMock.mockResolvedValue({
      ok: true,
      message: "Loaded logs.",
      data: [
        {
          id: 9,
          runnerInstanceId: 700,
          startTime: "2026-04-20T10:02:00.000Z",
          endTime: null,
          status: "Success",
          remarks: "later",
        },
        {
          id: 2,
          runnerInstanceId: 700,
          startTime: "2026-04-20T10:01:00.000Z",
          endTime: null,
          status: "Success",
          remarks: "earlier",
        },
      ],
    });

    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection />
      </ConfirmProvider>,
    );

    expect(await screen.findByRole("heading", { name: /#1 Task Alpha/i })).toBeTruthy();

    fireEvent.click(await screen.findByText(/Instance #700/i));

    expect(await screen.findByText("Log #2")).toBeTruthy();
    expect(screen.getByText("Log #9")).toBeTruthy();
    expect(listRunnerLogsActionMock).toHaveBeenCalledWith(700);
  });

  it("shows runner log error notice when log loading fails", async () => {
    listRunnerInstancesActionMock.mockResolvedValue({
      ok: true,
      message: "Loaded runner instances.",
      data: [
        {
          id: 701,
          taskId: 1,
          runnerId: "runner-error",
          startTime: "2026-04-20T10:00:00.000Z",
          endTime: null,
          status: "Failed",
        },
      ],
    });
    listRunnerLogsActionMock.mockResolvedValue({
      ok: false,
      message: "Could not load logs for instance 701.",
      data: null,
    });

    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection />
      </ConfirmProvider>,
    );

    expect(await screen.findByRole("heading", { name: /#1 Task Alpha/i })).toBeTruthy();

    fireEvent.click(await screen.findByText(/Instance #701/i));

    expect(await screen.findByText("Could not load logs for instance 701.")).toBeTruthy();
  });

  it("validates task metadata and role drafts before saving", async () => {
    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection />
      </ConfirmProvider>,
    );

    expect(await screen.findByRole("heading", { name: /#1 Task Alpha/i })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("name*"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Save task details" }));

    expect(await screen.findByText("Task name is required.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Expand extractor panel/i }));
    fireEvent.change(screen.getByDisplayValue("C:/alpha/in/*.csv"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Extractor" }));

    expect(await screen.findByText("Required fields missing: src_path_pattern")).toBeTruthy();
  });

  it("shows error notice when task metadata update fails", async () => {
    updateTaskMetadataActionMock.mockResolvedValueOnce({
      ok: false,
      message: "Task metadata update failed.",
      data: null,
    });

    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection />
      </ConfirmProvider>,
    );

    expect(await screen.findByRole("heading", { name: /#1 Task Alpha/i })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("name*"), { target: { value: "Task Alpha v2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save task details" }));

    expect(await screen.findByText("Task metadata update failed.")).toBeTruthy();
    expect(updateTaskMetadataActionMock).toHaveBeenCalledWith({
      taskId: 1,
      name: "Task Alpha v2",
      descp: "Alpha description",
    });
  });

  it("applies quick-range filter values before loading runner instances", async () => {
    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection />
      </ConfirmProvider>,
    );

    expect(await screen.findByRole("heading", { name: /#1 Task Alpha/i })).toBeTruthy();

    const executionTrackingPanel = document.getElementById("execution-tracking");
    expect(executionTrackingPanel).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Last 7 days" }));
    fireEvent.click(await findEnabledButton(executionTrackingPanel!, "Apply"));

    await waitFor(() => {
      expect(listRunnerInstancesActionMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          taskId: 1,
          startTimeFrom: expect.any(String),
          startTimeBefore: expect.any(String),
        }),
      );
    });
  });

  it("shows error notice when runner instance list fails", async () => {
    listRunnerInstancesActionMock.mockResolvedValueOnce({
      ok: false,
      message: "Runner instance query failed.",
      data: null,
    });

    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection />
      </ConfirmProvider>,
    );

    expect(await screen.findByRole("heading", { name: /#1 Task Alpha/i })).toBeTruthy();
    expect(await screen.findByText("Runner instance query failed.")).toBeTruthy();
  });

  it("limits comparison selection count on narrow viewports", async () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });

    listRunnerInstancesActionMock.mockResolvedValue({
      ok: true,
      message: "Loaded runner instances.",
      data: [
        {
          id: 801,
          taskId: 1,
          runnerId: "r1",
          startTime: "2026-04-20T10:00:00.000Z",
          endTime: null,
          status: "Success",
        },
        {
          id: 802,
          taskId: 1,
          runnerId: "r2",
          startTime: "2026-04-20T11:00:00.000Z",
          endTime: null,
          status: "Success",
        },
        {
          id: 803,
          taskId: 1,
          runnerId: "r3",
          startTime: "2026-04-20T12:00:00.000Z",
          endTime: null,
          status: "Success",
        },
      ],
    });

    render(
      <ConfirmProvider>
        <TaskDefinitionWorkspace hasActiveConnection />
      </ConfirmProvider>,
    );

    expect(await screen.findByRole("heading", { name: /#1 Task Alpha/i })).toBeTruthy();

    fireEvent.click(await screen.findByText(/Instance #801/i));
    fireEvent.click(await screen.findByText(/Instance #802/i));
    fireEvent.click(await screen.findByText(/Instance #803/i));

    expect(await screen.findByText(/You can compare up to 2 runner instances/i)).toBeTruthy();

    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalInnerWidth });
  });
});