/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { ExecutionTrackingPanel } from "@/features/task-definition/ui/execution-tracking-panel";
import { RoleEditorPanel } from "@/features/task-definition/ui/role-editor-panel";
import { TaskDetailsPanel } from "@/features/task-definition/ui/task-details-panel";
import type { RoleDraftState, TaskMetadataDraft } from "@/features/task-definition/ui/task-definition-ui-types";
import type { RunnerInstance, TaskDefinitionDetails } from "@/features/task-definition/types";

afterEach(() => {
  cleanup();
});

function createTaskDetails(): TaskDefinitionDetails {
  return {
    id: 7,
    name: "Payroll import",
    descp: "Imports starter records",
    extractorClass: "LocalFileCopy",
    transformerClass: "NoOp",
    loaderClass: "NoOp",
    assignments: [
      {
        role: "extractor",
        executorClass: "LocalFileCopy",
        config: {
          taskId: 7,
          role: "extractor",
          values: {
            src_path_pattern: "C:/inbox/*.csv",
            dest_path_pattern: "C:/archive/*.csv",
            overwrite_dest: true,
            delete_src_after_copy: false,
          },
        },
      },
      {
        role: "transformer",
        executorClass: "NoOp",
        config: null,
      },
      {
        role: "loader",
        executorClass: "NoOp",
        config: null,
      },
    ],
  };
}

function createRoleDraft(): RoleDraftState {
  return {
    loadedExecutorClass: "LocalFileCopy",
    selectedExecutorClass: "LocalFileCopy",
    baselineByExecutor: {
      LocalFileCopy: {
        src_path_pattern: "C:/inbox/*.csv",
        dest_path_pattern: "C:/archive/*.csv",
        overwrite_dest: false,
        delete_src_after_copy: false,
      },
    },
    draftsByExecutor: {
      LocalFileCopy: {
        src_path_pattern: "C:/inbox/*.csv",
        dest_path_pattern: "C:/archive/*.csv",
        overwrite_dest: true,
        delete_src_after_copy: false,
      },
    },
  };
}

function createRunnerInstances(): RunnerInstance[] {
  return [
    {
      id: 21,
      runnerId: "runner-a",
      taskId: 7,
      startTime: "2026-04-20T10:00:00.000Z",
      endTime: null,
      status: "Running",
    },
    {
      id: 22,
      runnerId: "runner-b",
      taskId: 7,
      startTime: "2026-04-19T10:00:00.000Z",
      endTime: "2026-04-19T10:30:00.000Z",
      status: "Success",
    },
  ];
}

describe("task-definition UI panels", () => {
  it("shows dirty task metadata state and forwards name edits", () => {
    const onTaskNameChange = vi.fn();
    const onTaskDescriptionChange = vi.fn();
    const taskDraft: TaskMetadataDraft = {
      baselineName: "Payroll import",
      baselineDescp: "Imports starter records",
      name: "Payroll import v2",
      descp: "Imports starter records",
    };

    render(
      <TaskDetailsPanel
        details={createTaskDetails()}
        isSavingTask={false}
        isTaskMetadataDirty
        onCancelTaskMetadata={vi.fn()}
        onSaveTaskMetadata={vi.fn()}
        onTaskDescriptionChange={onTaskDescriptionChange}
        onTaskNameChange={onTaskNameChange}
        taskDraft={taskDraft}
        taskValidationMessage={null}
      />,
    );

    expect(screen.getByText("Task details changed (unsaved)")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Save task details" }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.change(screen.getByLabelText("name*"), { target: { value: "Payroll import v3" } });
    fireEvent.change(screen.getByLabelText("descp*"), { target: { value: "Updated description" } });

    expect(onTaskNameChange).toHaveBeenCalledWith("Payroll import v3");
    expect(onTaskDescriptionChange).toHaveBeenCalledWith("Updated description");
  });

  it("forwards role draft checkbox edits and enables save for dirty drafts", () => {
    const onBooleanFieldChange = vi.fn();

    render(
      <RoleEditorPanel
        executorOptions={["LocalFileCopy", "NoOp"]}
        isSavingRole={false}
        onBooleanFieldChange={onBooleanFieldChange}
        onCancelRole={vi.fn()}
        onChangeExecutorClass={vi.fn()}
        onFieldValueChange={vi.fn()}
        onRevertField={vi.fn()}
        onSaveRole={vi.fn()}
        role="extractor"
        roleDraft={createRoleDraft()}
        roleValidationMessage={null}
      />,
    );

    expect(screen.getByText("1 field change (unsaved)")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Save Extractor" }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole("checkbox", { name: /overwrite_dest/i }));

    expect(onBooleanFieldChange).toHaveBeenCalledWith("extractor", "overwrite_dest", false);
  });

  it("shows NoOp role content and emits executor-class change", () => {
    const onChangeExecutorClass = vi.fn();

    render(
      <RoleEditorPanel
        executorOptions={["LocalFileCopy", "NoOp"]}
        isSavingRole={false}
        onBooleanFieldChange={vi.fn()}
        onCancelRole={vi.fn()}
        onChangeExecutorClass={onChangeExecutorClass}
        onFieldValueChange={vi.fn()}
        onRevertField={vi.fn()}
        onSaveRole={vi.fn()}
        role="transformer"
        roleDraft={{
          loadedExecutorClass: "NoOp",
          selectedExecutorClass: "NoOp",
          baselineByExecutor: {},
          draftsByExecutor: {},
        }}
        roleValidationMessage={"Validation failed"}
      />,
    );

    expect(screen.getByText("NoOp placeholder")).toBeTruthy();
    expect(screen.getByText("Validation failed")).toBeTruthy();

    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "LocalFileCopy" } });
    expect(onChangeExecutorClass).toHaveBeenCalledWith("transformer", "LocalFileCopy");
  });

  it("renders select and input field paths and supports field revert", () => {
    const onFieldValueChange = vi.fn();
    const onRevertField = vi.fn();

    render(
      <RoleEditorPanel
        executorOptions={["ItrentNewJoiner2CSV", "NoOp"]}
        isSavingRole={false}
        onBooleanFieldChange={vi.fn()}
        onCancelRole={vi.fn()}
        onChangeExecutorClass={vi.fn()}
        onFieldValueChange={onFieldValueChange}
        onRevertField={onRevertField}
        onSaveRole={vi.fn()}
        role="extractor"
        roleDraft={{
          loadedExecutorClass: "ItrentNewJoiner2CSV",
          selectedExecutorClass: "ItrentNewJoiner2CSV",
          baselineByExecutor: {
            ItrentNewJoiner2CSV: {
              itrent_conn_str: "Server=db;",
              target_csv_path_pattern: "C:/out/*.csv",
              days_in_the_past: "2",
              with_header: "Y",
            },
          },
          draftsByExecutor: {
            ItrentNewJoiner2CSV: {
              itrent_conn_str: "Server=db;",
              target_csv_path_pattern: "C:/out/*.csv",
              days_in_the_past: "3",
              with_header: "N",
            },
          },
        }}
        roleValidationMessage={null}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("3"), { target: { value: "7" } });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "Y" } });

    fireEvent.click(screen.getByRole("button", { name: "Revert days_in_the_past" }));

    expect(onFieldValueChange).toHaveBeenCalledWith("extractor", "days_in_the_past", "7");
    expect(onFieldValueChange).toHaveBeenCalledWith("extractor", "with_header", "Y");
    expect(onRevertField).toHaveBeenCalled();
  });

  it("disables task save/cancel buttons when not dirty or saving", () => {
    render(
      <TaskDetailsPanel
        details={createTaskDetails()}
        isSavingTask
        isTaskMetadataDirty={false}
        onCancelTaskMetadata={vi.fn()}
        onSaveTaskMetadata={vi.fn()}
        onTaskDescriptionChange={vi.fn()}
        onTaskNameChange={vi.fn()}
        taskDraft={null}
        taskValidationMessage={"Task name is required."}
      />,
    );

    expect(screen.getByText("Task name is required.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Saving..." }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Cancel task details" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("forwards runner selection and quick range interactions", () => {
    const onToggleRunnerInstanceSelection = vi.fn();
    const onApplyQuickRange = vi.fn();

    render(
      <ExecutionTrackingPanel
        formatDateDisplay={(value) => value ?? "-"}
        formatDateTimeDisplay={(value) => value ?? "-"}
        isLoadingRunnerInstances={false}
        loadingRunnerLogIds={[]}
        maxComparableInstances={3}
        onApplyQuickRange={onApplyQuickRange}
        onApplyRunnerFilters={vi.fn()}
        onChangeRunnerFilters={vi.fn()}
        onClearRunnerFilters={vi.fn()}
        onToggleRunnerInstanceSelection={onToggleRunnerInstanceSelection}
        runnerFilters={{ startTimeFrom: "", startTimeBefore: "" }}
        runnerInstances={createRunnerInstances()}
        runnerLogErrorByInstanceId={{}}
        runnerLogsByInstanceId={{}}
        runnerStartTimeBounds={{ earliest: "2026-04-19", latest: "2026-04-20" }}
        selectedRunnerInstanceIds={[]}
        selectedRunnerInstances={[]}
        statusTone={() => "success"}
      />,
    );

    fireEvent.click(screen.getByLabelText(/instance #21/i));
    fireEvent.click(screen.getByRole("button", { name: "Last 14 days" }));

    expect(onToggleRunnerInstanceSelection).toHaveBeenCalledWith(21);
    expect(onApplyQuickRange).toHaveBeenCalledWith(14);
  });

  it("shows runner list empty state and selected logs panels", () => {
    const selected = createRunnerInstances();

    render(
      <ExecutionTrackingPanel
        formatDateDisplay={(value) => value ?? "-"}
        formatDateTimeDisplay={(value) => value ?? "-"}
        isLoadingRunnerInstances={false}
        loadingRunnerLogIds={[]}
        maxComparableInstances={2}
        onApplyQuickRange={vi.fn()}
        onApplyRunnerFilters={vi.fn()}
        onChangeRunnerFilters={vi.fn()}
        onClearRunnerFilters={vi.fn()}
        onToggleRunnerInstanceSelection={vi.fn()}
        runnerFilters={{ startTimeFrom: "", startTimeBefore: "" }}
        runnerInstances={selected}
        runnerLogErrorByInstanceId={{ 22: "Log load failed" }}
        runnerLogsByInstanceId={{
          21: [
            {
              id: 300,
              runnerInstanceId: 21,
              startTime: "2026-04-20T10:00:00.000Z",
              endTime: "2026-04-20T10:01:00.000Z",
              status: "Success",
              remarks: "ok",
            },
          ],
        }}
        runnerStartTimeBounds={{ earliest: null, latest: null }}
        selectedRunnerInstanceIds={[21, 22]}
        selectedRunnerInstances={selected}
        statusTone={(status) => (status?.toLowerCase().includes("fail") ? "error" : "success")}
      />,
    );

    expect(screen.getByText("Log load failed")).toBeTruthy();
    expect(screen.getByText("Log #300")).toBeTruthy();
  });

  it("shows no instances message when result set is empty", () => {
    render(
      <ExecutionTrackingPanel
        formatDateDisplay={(value) => value ?? "-"}
        formatDateTimeDisplay={(value) => value ?? "-"}
        isLoadingRunnerInstances={false}
        loadingRunnerLogIds={[]}
        maxComparableInstances={3}
        onApplyQuickRange={vi.fn()}
        onApplyRunnerFilters={vi.fn()}
        onChangeRunnerFilters={vi.fn()}
        onClearRunnerFilters={vi.fn()}
        onToggleRunnerInstanceSelection={vi.fn()}
        runnerFilters={{ startTimeFrom: "", startTimeBefore: "" }}
        runnerInstances={[]}
        runnerLogErrorByInstanceId={{}}
        runnerLogsByInstanceId={{}}
        runnerStartTimeBounds={{ earliest: null, latest: null }}
        selectedRunnerInstanceIds={[]}
        selectedRunnerInstances={[]}
        statusTone={() => "neutral"}
      />,
    );

    expect(screen.getByText("No runner instances match the selected range.")).toBeTruthy();
    expect(screen.getByText("Select up to 3 runner instances to compare logs side by side.")).toBeTruthy();
  });

  it("renders clean role draft with disabled actions", () => {
    render(
      <RoleEditorPanel
        executorOptions={["LocalFileCopy", "NoOp"]}
        isSavingRole={false}
        onBooleanFieldChange={vi.fn()}
        onCancelRole={vi.fn()}
        onChangeExecutorClass={vi.fn()}
        onFieldValueChange={vi.fn()}
        onRevertField={vi.fn()}
        onSaveRole={vi.fn()}
        role="extractor"
        roleDraft={{
          loadedExecutorClass: "LocalFileCopy",
          selectedExecutorClass: "LocalFileCopy",
          baselineByExecutor: {
            LocalFileCopy: {
              src_path_pattern: "C:/in",
              dest_path_pattern: "C:/out",
              overwrite_dest: false,
              delete_src_after_copy: false,
            },
          },
          draftsByExecutor: {
            LocalFileCopy: {
              src_path_pattern: "C:/in",
              dest_path_pattern: "C:/out",
              overwrite_dest: false,
              delete_src_after_copy: false,
            },
          },
        }}
        roleValidationMessage={null}
      />,
    );

    expect(screen.queryByText("Pending executor switch (unsaved)")).toBeNull();
    expect(screen.queryByText(/field change/)).toBeNull();
    expect((screen.getByRole("button", { name: "Save Extractor" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Cancel Extractor" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders uiOptions select without empty option when default exists", () => {
    render(
      <RoleEditorPanel
        executorOptions={["LocalFolder2Sftp", "NoOp"]}
        isSavingRole={false}
        onBooleanFieldChange={vi.fn()}
        onCancelRole={vi.fn()}
        onChangeExecutorClass={vi.fn()}
        onFieldValueChange={vi.fn()}
        onRevertField={vi.fn()}
        onSaveRole={vi.fn()}
        role="loader"
        roleDraft={{
          loadedExecutorClass: "LocalFolder2Sftp",
          selectedExecutorClass: "LocalFolder2Sftp",
          baselineByExecutor: {
            LocalFolder2Sftp: {
              sftp_url: "sftp://x",
              sftp_port: "22",
              sftp_username: "user",
              sftp_password_or_private_key_path: "/tmp/key",
              sftp_credential_type: "PasswordAuthentication",
              local_path_pattern: "C:/in",
              remote_path_pattern: "/out",
              delete_local_after_copy: false,
              key_passphrase: "",
              tree_traversal_strategy: "DFS_PreOrder",
              transactional_strategy: "NonTxn",
              continuation_strategy: "FailSafe",
              root_folder_inclusion_strategy: "IncludeRoot",
              file_upload_strategy: "Overwrite",
              folder_upload_strategy: "Merge",
            },
          },
          draftsByExecutor: {
            LocalFolder2Sftp: {
              sftp_url: "sftp://x",
              sftp_port: "22",
              sftp_username: "user",
              sftp_password_or_private_key_path: "/tmp/key",
              sftp_credential_type: "PasswordAuthentication",
              local_path_pattern: "C:/in",
              remote_path_pattern: "/out",
              delete_local_after_copy: false,
              key_passphrase: "",
              tree_traversal_strategy: "DFS_PreOrder",
              transactional_strategy: "NonTxn",
              continuation_strategy: "FailSafe",
              root_folder_inclusion_strategy: "IncludeRoot",
              file_upload_strategy: "Overwrite",
              folder_upload_strategy: "Merge",
            },
          },
        }}
        roleValidationMessage={null}
      />,
    );

    const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
    const overwriteSelect = selects.find((select) =>
      Array.from(select.options).some((option) => option.textContent === "Overwrite"),
    );

    expect(overwriteSelect).toBeTruthy();
    expect(Array.from((overwriteSelect as HTMLSelectElement).options).some((option) => option.textContent === "-- Select --")).toBe(false);
  });

  it("shows pending switch badge when selected executor differs from loaded", () => {
    render(
      <RoleEditorPanel
        executorOptions={["LocalFileCopy", "NoOp"]}
        isSavingRole={false}
        onBooleanFieldChange={vi.fn()}
        onCancelRole={vi.fn()}
        onChangeExecutorClass={vi.fn()}
        onFieldValueChange={vi.fn()}
        onRevertField={vi.fn()}
        onSaveRole={vi.fn()}
        role="loader"
        roleDraft={{
          loadedExecutorClass: "NoOp",
          selectedExecutorClass: "LocalFileCopy",
          baselineByExecutor: {},
          draftsByExecutor: {
            LocalFileCopy: {
              src_path_pattern: "",
              dest_path_pattern: "",
              overwrite_dest: false,
              delete_src_after_copy: false,
            },
          },
        }}
        roleValidationMessage={null}
      />,
    );

    expect(screen.getByText("Pending executor switch (unsaved)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save Loader" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel Loader" })).toBeTruthy();
  });

  it("renders uiOptions with select placeholder when field has no default", () => {
    render(
      <RoleEditorPanel
        executorOptions={["LocalFile2Sftp", "NoOp"]}
        isSavingRole={false}
        onBooleanFieldChange={vi.fn()}
        onCancelRole={vi.fn()}
        onChangeExecutorClass={vi.fn()}
        onFieldValueChange={vi.fn()}
        onRevertField={vi.fn()}
        onSaveRole={vi.fn()}
        role="loader"
        roleDraft={{
          loadedExecutorClass: "LocalFile2Sftp",
          selectedExecutorClass: "LocalFile2Sftp",
          baselineByExecutor: {
            LocalFile2Sftp: {},
          },
          draftsByExecutor: {
            LocalFile2Sftp: {
              sftp_url: "",
              sftp_port: "",
              sftp_username: "",
              sftp_password_or_private_key_path: "",
              sftp_credential_type: "",
              local_path_pattern: "",
              remote_path_pattern: "",
              delete_local_after_copy: false,
              key_passphrase: "",
            },
          },
        }}
        roleValidationMessage={null}
      />,
    );

    expect(screen.getAllByRole("option", { name: "-- Select --" }).length).toBeGreaterThan(0);
  });
});