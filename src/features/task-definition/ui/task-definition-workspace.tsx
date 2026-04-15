"use client";

import { InlineFeedback, ListStatePanel } from "@/components/feedback/status-feedback";
import { TaskListPanel } from "@/features/task-definition/ui/task-list-panel";
import { ExecutionTrackingPanel } from "@/features/task-definition/ui/execution-tracking-panel";
import { TaskDetailsPanel } from "@/features/task-definition/ui/task-details-panel";
import { TaskRolePanels } from "@/features/task-definition/ui/task-role-panels";
import { useTaskDefinitionWorkspace } from "@/features/task-definition/ui/use-task-definition-workspace";

type Props = {
  hasActiveConnection: boolean;
};

export function TaskDefinitionWorkspace({ hasActiveConnection }: Props) {
  const {
    applyQuickRange,
    applyRunnerFilters,
    clearRunnerFilters,
    details,
    dismissNotice,
    executorOptions,
    expandedRoles,
    formatDateDisplay,
    formatDateTimeDisplay,
    handleCancelRole,
    handleCancelTaskMetadata,
    handleRoleBooleanFieldChange,
    handleRoleExecutorClassChange,
    handleRoleFieldRevert,
    handleRoleFieldValueChange,
    handleSaveRole,
    handleSaveTaskMetadata,
    handleTaskDescriptionChange,
    handleTaskNameChange,
    isLoadingRunnerInstances,
    isLoadingTasks,
    isSavingRole,
    isSavingTask,
    isTaskMetadataDirty,
    isTasksPanelCollapsed,
    lastLoadedAt,
    loadingRunnerLogIds,
    maxComparableInstances,
    notice,
    reloadTaskList,
    roleDrafts,
    roleValidationMessages,
    runnerFilters,
    runnerInstances,
    runnerLogErrorByInstanceId,
    runnerLogsByInstanceId,
    runnerStartTimeBounds,
    selectedRunnerInstanceIds,
    selectedRunnerInstances,
    selectedTaskId,
    selectTask,
    setRunnerFilters,
    statusTone,
    taskDraft,
    taskValidationMessage,
    tasks,
    toggleRoleExpanded,
    toggleRunnerInstanceSelection,
    toggleTasksPanelCollapsed,
  } = useTaskDefinitionWorkspace(hasActiveConnection);

  return (
    <section className="mt-6 rounded-[1.5rem] border border-border bg-card/85 p-6 shadow-[0_10px_40px_color-mix(in_oklch,var(--foreground)_8%,transparent)]" id="task-definitions">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Task list and executor configuration workspace
          </h2>
          {lastLoadedAt ? (
            <p className="mt-2 text-sm font-medium text-muted-foreground">Last loaded at: {lastLoadedAt}</p>
          ) : null}
        </div>
      </div>

      {notice ? (
        <InlineFeedback
          className="mt-4"
          message={notice.message}
          onDismiss={dismissNotice}
          tone={notice.tone}
        />
      ) : null}

      <div className={`mt-5 grid items-stretch gap-5 ${isTasksPanelCollapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[300px_minmax(0,1fr)]"}`}>
        <TaskListPanel
          hasActiveConnection={hasActiveConnection}
          isLoadingTasks={isLoadingTasks}
          isTasksPanelCollapsed={isTasksPanelCollapsed}
          onReloadTasks={reloadTaskList}
          onSelectTask={selectTask}
          onToggleCollapsed={toggleTasksPanelCollapsed}
          selectedTaskId={selectedTaskId}
          tasks={tasks}
        />

        <div className="rounded-2xl border border-border bg-card p-5">
          {details ? (
            <>
              <TaskDetailsPanel
                details={details}
                isSavingTask={isSavingTask}
                isTaskMetadataDirty={isTaskMetadataDirty}
                onCancelTaskMetadata={handleCancelTaskMetadata}
                onSaveTaskMetadata={handleSaveTaskMetadata}
                onTaskDescriptionChange={handleTaskDescriptionChange}
                onTaskNameChange={handleTaskNameChange}
                taskDraft={taskDraft}
                taskValidationMessage={taskValidationMessage}
              />

              <TaskRolePanels
                details={details}
                executorOptions={executorOptions}
                expandedRoles={expandedRoles}
                isSavingRole={isSavingRole}
                onBooleanFieldChange={handleRoleBooleanFieldChange}
                onCancelRole={handleCancelRole}
                onChangeExecutorClass={handleRoleExecutorClassChange}
                onFieldValueChange={handleRoleFieldValueChange}
                onRevertField={handleRoleFieldRevert}
                onSaveRole={handleSaveRole}
                onToggleExpanded={toggleRoleExpanded}
                roleDrafts={roleDrafts}
                roleValidationMessages={roleValidationMessages}
              />

              <ExecutionTrackingPanel
                formatDateDisplay={formatDateDisplay}
                formatDateTimeDisplay={formatDateTimeDisplay}
                isLoadingRunnerInstances={isLoadingRunnerInstances}
                loadingRunnerLogIds={loadingRunnerLogIds}
                maxComparableInstances={maxComparableInstances}
                onApplyQuickRange={applyQuickRange}
                onApplyRunnerFilters={applyRunnerFilters}
                onChangeRunnerFilters={setRunnerFilters}
                onClearRunnerFilters={clearRunnerFilters}
                onToggleRunnerInstanceSelection={toggleRunnerInstanceSelection}
                runnerFilters={runnerFilters}
                runnerInstances={runnerInstances}
                runnerLogErrorByInstanceId={runnerLogErrorByInstanceId}
                runnerLogsByInstanceId={runnerLogsByInstanceId}
                runnerStartTimeBounds={runnerStartTimeBounds}
                selectedRunnerInstanceIds={selectedRunnerInstanceIds}
                selectedRunnerInstances={selectedRunnerInstances}
                statusTone={statusTone}
              />
            </>
          ) : (
            <ListStatePanel
              className="rounded-[calc(var(--radius)+0.25rem)] bg-muted/60 px-4 py-8"
              description={hasActiveConnection
                ? "Select a task from the list to view executor details."
                : "Activate a session connection first to initialize task-definition UI."}
            />
          )}
        </div>
      </div>
    </section>
  );
}
