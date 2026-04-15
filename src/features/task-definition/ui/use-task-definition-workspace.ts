"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import {
  getTaskDefinitionDetailsAction,
  listRunnerInstancesAction,
  listRunnerLogsAction,
  listTaskDefinitionsAction,
  saveRoleExecutorAction,
  updateTaskMetadataAction,
} from "../actions";
import {
  type ExecutorFieldSpec,
} from "../executor-config-schema";
import {
  EXECUTOR_CLASSES,
  type ExecutorClass,
  type RunnerInstance,
  type RunnerLog,
  type TaskDefinitionDetails,
  type TaskDefinitionSummary,
  type TaskRole,
} from "../types";
import { useConfirm } from "@/components/ui/confirm-provider";
import type {
  ExpandedRoles,
  RoleDraftState,
  RunnerFilters,
  TaskMetadataDraft,
} from "@/features/task-definition/ui/task-definition-ui-types";
import {
  buildFieldValueRecord,
  buildCancelConfirmationText,
  buildSaveConfirmationText,
  formatDateDisplay,
  formatDateTimeDisplay,
  formatTimestamp,
  initializeRoleDraft,
  isRoleDirty,
  isUpsertableExecutorClass,
  statusTone,
  toDateInputValue,
  toDefaultFieldValue,
  toRoleLabel,
  validateRoleDraft,
} from "@/features/task-definition/ui/task-definition-workspace-utils";

type Notice = {
  tone: "neutral" | "success" | "error";
  message: string;
} | null;

export const DEFAULT_EXPANDED_ROLES: ExpandedRoles = {
  extractor: false,
  transformer: false,
  loader: false,
};

export function useTaskDefinitionWorkspace(hasActiveConnection: boolean) {
  const [tasks, setTasks] = useState<TaskDefinitionSummary[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [details, setDetails] = useState<TaskDefinitionDetails | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<ExpandedRoles>(DEFAULT_EXPANDED_ROLES);
  const [isTasksPanelCollapsed, setIsTasksPanelCollapsed] = useState(false);
  const [roleDrafts, setRoleDrafts] = useState<Record<TaskRole, RoleDraftState> | null>(null);
  const [roleValidationMessages, setRoleValidationMessages] = useState<Partial<Record<TaskRole, string>>>({});
  const [taskDraft, setTaskDraft] = useState<TaskMetadataDraft | null>(null);
  const [taskValidationMessage, setTaskValidationMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const [runnerFilters, setRunnerFilters] = useState<RunnerFilters>({
    startTimeFrom: "",
    startTimeBefore: "",
  });
  const [maxComparableInstances, setMaxComparableInstances] = useState(3);
  const [runnerInstances, setRunnerInstances] = useState<RunnerInstance[]>([]);
  const [selectedRunnerInstanceIds, setSelectedRunnerInstanceIds] = useState<number[]>([]);
  const [runnerLogsByInstanceId, setRunnerLogsByInstanceId] = useState<Record<number, RunnerLog[]>>({});
  const [runnerLogErrorByInstanceId, setRunnerLogErrorByInstanceId] = useState<Record<number, string>>({});
  const [loadingRunnerLogIds, setLoadingRunnerLogIds] = useState<number[]>([]);
  const [isLoadingTasks, startLoadTasksTransition] = useTransition();
  const [isSavingRole, startSaveRoleTransition] = useTransition();
  const [isSavingTask, startSaveTaskTransition] = useTransition();
  const [isLoadingRunnerInstances, startLoadRunnerInstancesTransition] = useTransition();
  const [, startLoadDetailsTransition] = useTransition();
  const confirm = useConfirm();

  function setNeutralNotice(message: string) {
    setNotice({ tone: "neutral", message });
  }

  function setStatusNotice(message: string, tone: NonNullable<Notice>["tone"]) {
    setNotice({ tone, message });
  }

  function resetWorkspaceForMissingConnection() {
    setTasks([]);
    setSelectedTaskId(null);
    setDetails(null);
    setRoleDrafts(null);
    setRoleValidationMessages({});
    setTaskDraft(null);
    setTaskValidationMessage(null);
    setExpandedRoles(DEFAULT_EXPANDED_ROLES);
    setLastLoadedAt(null);
    setRunnerInstances([]);
    setSelectedRunnerInstanceIds([]);
    setRunnerLogsByInstanceId({});
    setRunnerLogErrorByInstanceId({});
    setLoadingRunnerLogIds([]);
  }

  function loadTaskList() {
    if (!hasActiveConnection) {
      resetWorkspaceForMissingConnection();
      setNeutralNotice("Activate a session connection to load task definitions.");
      return;
    }

    startLoadTasksTransition(async () => {
      const result = await listTaskDefinitionsAction();

      if (!result.ok || !result.data) {
        resetWorkspaceForMissingConnection();
        setStatusNotice(result.message, "error");
        return;
      }

      setTasks(result.data);
      setLastLoadedAt(formatTimestamp(new Date()));

      const nextTaskId = result.data.length === 0
        ? null
        : selectedTaskId && result.data.some((task) => task.id === selectedTaskId)
          ? selectedTaskId
          : result.data[0].id;

      setSelectedTaskId(nextTaskId);

      if (result.data.length === 0) {
        setDetails(null);
        setRoleDrafts(null);
        setRoleValidationMessages({});
        setTaskDraft(null);
        setTaskValidationMessage(null);
        setNeutralNotice("No tasks were found for this database.");
      } else {
        setNotice(null);
      }
    });
  }

  function loadTaskDetails(taskId: number) {
    startLoadDetailsTransition(async () => {
      const result = await getTaskDefinitionDetailsAction(taskId);

      if (!result.ok || !result.data) {
        setDetails(null);
        setRoleDrafts(null);
        setRoleValidationMessages({});
        setTaskDraft(null);
        setTaskValidationMessage(null);
        setStatusNotice(result.message, "error");
        return;
      }

      setDetails(result.data);
      setExpandedRoles(DEFAULT_EXPANDED_ROLES);
      setRoleValidationMessages({});
      setTaskValidationMessage(null);
      setRoleDrafts({
        extractor: initializeRoleDraft(result.data, "extractor"),
        transformer: initializeRoleDraft(result.data, "transformer"),
        loader: initializeRoleDraft(result.data, "loader"),
      });
      setTaskDraft({
        baselineName: result.data.name,
        baselineDescp: result.data.descp ?? "",
        name: result.data.name,
        descp: result.data.descp ?? "",
      });
      setSelectedRunnerInstanceIds([]);
      setRunnerLogsByInstanceId({});
      setRunnerLogErrorByInstanceId({});
      setLoadingRunnerLogIds([]);
    });
  }

  function loadRunnerInstances(taskId: number, filters: RunnerFilters) {
    startLoadRunnerInstancesTransition(async () => {
      const result = await listRunnerInstancesAction({
        taskId,
        startTimeFrom: filters.startTimeFrom || undefined,
        startTimeBefore: filters.startTimeBefore || undefined,
      });

      if (!result.ok || !result.data) {
        setRunnerInstances([]);
        setSelectedRunnerInstanceIds([]);
        setRunnerLogsByInstanceId({});
        setRunnerLogErrorByInstanceId({});
        setLoadingRunnerLogIds([]);
        setStatusNotice(result.message, "error");
        return;
      }

      setRunnerInstances(result.data);
      setSelectedRunnerInstanceIds([]);
      setRunnerLogsByInstanceId({});
      setRunnerLogErrorByInstanceId({});
      setLoadingRunnerLogIds([]);

      if (result.data.length === 0) {
        setNeutralNotice("No runner instances found for this task and date range.");
      }
    });
  }

  function ensureRunnerLogsLoaded(runnerInstanceId: number) {
    if (loadingRunnerLogIds.includes(runnerInstanceId) || runnerLogsByInstanceId[runnerInstanceId]) {
      return;
    }

    setLoadingRunnerLogIds((current) => [...current, runnerInstanceId]);

    void (async () => {
      const result = await listRunnerLogsAction(runnerInstanceId);

      if (!result.ok || !result.data) {
        setRunnerLogErrorByInstanceId((current) => ({
          ...current,
          [runnerInstanceId]: result.message,
        }));
      } else {
        const loadedLogs = [...result.data].sort((left, right) => left.id - right.id);

        setRunnerLogsByInstanceId((current) => ({
          ...current,
          [runnerInstanceId]: loadedLogs,
        }));
        setRunnerLogErrorByInstanceId((current) => {
          const next = { ...current };
          delete next[runnerInstanceId];
          return next;
        });
      }

      setLoadingRunnerLogIds((current) => current.filter((id) => id !== runnerInstanceId));
    })();
  }

  function toggleRunnerInstanceSelection(runnerInstanceId: number) {
    setSelectedRunnerInstanceIds((current) => {
      if (current.includes(runnerInstanceId)) {
        return current.filter((id) => id !== runnerInstanceId);
      }

      if (current.length >= maxComparableInstances) {
        setNeutralNotice(`You can compare up to ${maxComparableInstances} runner instances at this screen width.`);
        return current;
      }

      ensureRunnerLogsLoaded(runnerInstanceId);
      return [...current, runnerInstanceId];
    });
  }

  useEffect(() => {
    loadTaskList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveConnection]);

  useEffect(() => {
    if (!hasActiveConnection || selectedTaskId === null) {
      return;
    }

    loadTaskDetails(selectedTaskId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveConnection, selectedTaskId]);

  useEffect(() => {
    if (!hasActiveConnection || !details) {
      setRunnerInstances([]);
      setSelectedRunnerInstanceIds([]);
      setRunnerLogsByInstanceId({});
      setRunnerLogErrorByInstanceId({});
      setLoadingRunnerLogIds([]);
      return;
    }

    loadRunnerInstances(details.id, runnerFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveConnection, details?.id]);

  useEffect(() => {
    function syncMaxComparableByViewport() {
      setMaxComparableInstances(window.innerWidth >= 1280 ? 3 : 2);
    }

    syncMaxComparableByViewport();
    window.addEventListener("resize", syncMaxComparableByViewport);

    return () => {
      window.removeEventListener("resize", syncMaxComparableByViewport);
    };
  }, []);

  useEffect(() => {
    setSelectedRunnerInstanceIds((current) => {
      if (current.length <= maxComparableInstances) {
        return current;
      }

      return current.slice(0, maxComparableInstances);
    });
  }, [maxComparableInstances]);

  const executorOptions = useMemo(() => EXECUTOR_CLASSES, []);
  const selectedRunnerInstances = useMemo(
    () => selectedRunnerInstanceIds
      .map((id) => runnerInstances.find((instance) => instance.id === id))
      .filter((instance): instance is RunnerInstance => Boolean(instance)),
    [selectedRunnerInstanceIds, runnerInstances],
  );
  const runnerStartTimeBounds = useMemo(() => {
    if (runnerInstances.length === 0) {
      return { earliest: null as string | null, latest: null as string | null };
    }

    const times = runnerInstances
      .map((instance) => instance.startTime)
      .map((value) => new Date(value).getTime())
      .filter((value) => Number.isFinite(value));

    if (times.length === 0) {
      return { earliest: null as string | null, latest: null as string | null };
    }

    const earliest = new Date(Math.min(...times)).toISOString();
    const latest = new Date(Math.max(...times)).toISOString();

    return { earliest, latest };
  }, [runnerInstances]);

  function ensureDraftForExecutor(role: TaskRole, roleDraft: RoleDraftState, executorClass: ExecutorClass): RoleDraftState {
    if (!isUpsertableExecutorClass(executorClass)) {
      return {
        ...roleDraft,
        selectedExecutorClass: executorClass,
      };
    }

    if (roleDraft.draftsByExecutor[executorClass]) {
      return {
        ...roleDraft,
        selectedExecutorClass: executorClass,
      };
    }

    const emptyValues = buildFieldValueRecord(executorClass, null);

    return {
      ...roleDraft,
      selectedExecutorClass: executorClass,
      draftsByExecutor: {
        ...roleDraft.draftsByExecutor,
        [executorClass]: emptyValues,
      },
      baselineByExecutor: {
        ...roleDraft.baselineByExecutor,
        [executorClass]: emptyValues,
      },
    };
  }

  function updateRoleDraft(role: TaskRole, updater: (current: RoleDraftState) => RoleDraftState) {
    setRoleDrafts((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [role]: updater(current[role]),
      };
    });
  }

  function setRoleValidation(role: TaskRole, message: string | null) {
    setRoleValidationMessages((current) => {
      if (!message) {
        const rest = { ...current };
        delete rest[role];
        return rest;
      }

      return {
        ...current,
        [role]: message,
      };
    });
  }

  function resetRoleDraftToLoaded(role: TaskRole) {
    if (!details) {
      return;
    }

    updateRoleDraft(role, () => initializeRoleDraft(details, role));
    setRoleValidation(role, null);
  }

  async function handleSaveRole(role: TaskRole) {
    if (!details || !roleDrafts) {
      return;
    }

    const roleDraft = roleDrafts[role];

    if (!isRoleDirty(roleDraft)) {
      setStatusNotice(`No pending changes for ${toRoleLabel(role)}.`, "neutral");
      return;
    }

    const validationMessage = validateRoleDraft(roleDraft);

    if (validationMessage) {
      setRoleValidation(role, validationMessage);
      return;
    }

    setRoleValidation(role, null);

    const saveConfirmed = await confirm({
      title: `Save ${toRoleLabel(role)} changes`,
      message: buildSaveConfirmationText(details.id, role, roleDraft),
      confirmLabel: "Save",
      cancelLabel: "Cancel",
      tone: "default",
    });

    if (!saveConfirmed) {
      return;
    }

    startSaveRoleTransition(async () => {
      const values = isUpsertableExecutorClass(roleDraft.selectedExecutorClass)
        ? (roleDraft.draftsByExecutor[roleDraft.selectedExecutorClass] ?? {})
        : {};

      const result = await saveRoleExecutorAction({
        taskId: details.id,
        role,
        executorClass: roleDraft.selectedExecutorClass,
        values,
      });

      if (!result.ok) {
        setStatusNotice(result.message, "error");
        return;
      }

      setStatusNotice(result.message, "success");
      loadTaskDetails(details.id);
    });
  }

  async function handleCancelRole(role: TaskRole) {
    if (!details || !roleDrafts) {
      return;
    }

    const roleDraft = roleDrafts[role];

    if (!isRoleDirty(roleDraft)) {
      setStatusNotice(`No pending changes to cancel for ${toRoleLabel(role)}.`, "neutral");
      return;
    }

    const cancelConfirmed = await confirm({
      title: `Discard ${toRoleLabel(role)} changes`,
      message: buildCancelConfirmationText(details.id, role, roleDraft),
      confirmLabel: "Discard",
      cancelLabel: "Keep editing",
      tone: "danger",
    });

    if (!cancelConfirmed) {
      return;
    }

    resetRoleDraftToLoaded(role);
    setStatusNotice(`${toRoleLabel(role)} changes were discarded.`, "neutral");
  }

  function isTaskMetadataDirty(): boolean {
    if (!taskDraft) {
      return false;
    }

    return taskDraft.name !== taskDraft.baselineName || taskDraft.descp !== taskDraft.baselineDescp;
  }

  function validateTaskMetadataDraft(): string | null {
    if (!taskDraft) {
      return null;
    }

    const normalizedName = taskDraft.name.trim();
    const normalizedDescp = taskDraft.descp.trim();

    if (!normalizedName) {
      return "Task name is required.";
    }

    if (!normalizedDescp) {
      return "Task description is required.";
    }

    if (normalizedName.length > 50) {
      return "Task name exceeds max length 50.";
    }

    if (normalizedDescp.length > 200) {
      return "Task description exceeds max length 200.";
    }

    return null;
  }

  function handleSaveTaskMetadata() {
    if (!details || !taskDraft) {
      return;
    }

    if (!isTaskMetadataDirty()) {
      setStatusNotice("No pending task detail changes.", "neutral");
      return;
    }

    const validationMessage = validateTaskMetadataDraft();

    if (validationMessage) {
      setTaskValidationMessage(validationMessage);
      return;
    }

    setTaskValidationMessage(null);

    startSaveTaskTransition(async () => {
      const result = await updateTaskMetadataAction({
        taskId: details.id,
        name: taskDraft.name,
        descp: taskDraft.descp,
      });

      if (!result.ok) {
        setStatusNotice(result.message, "error");
        return;
      }

      setStatusNotice(result.message, "success");
      loadTaskDetails(details.id);
      loadTaskList();
    });
  }

  function handleCancelTaskMetadata() {
    if (!taskDraft) {
      return;
    }

    if (!isTaskMetadataDirty()) {
      setStatusNotice("No pending task detail changes to cancel.", "neutral");
      return;
    }

    setTaskValidationMessage(null);
    setTaskDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        name: current.baselineName,
        descp: current.baselineDescp,
      };
    });
    setStatusNotice("Task detail changes were discarded.", "neutral");
  }

  function applyRunnerFilters() {
    if (!details) {
      return;
    }

    loadRunnerInstances(details.id, runnerFilters);
  }

  function clearRunnerFilters() {
    if (!details) {
      return;
    }

    const cleared = { startTimeFrom: "", startTimeBefore: "" };
    setRunnerFilters(cleared);
    loadRunnerInstances(details.id, cleared);
  }

  function applyQuickRange(days: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));

    const exclusiveBefore = new Date(today);
    exclusiveBefore.setDate(exclusiveBefore.getDate() + 1);

    setRunnerFilters({
      startTimeFrom: toDateInputValue(start),
      startTimeBefore: toDateInputValue(exclusiveBefore),
    });
  }

  function handleRoleExecutorClassChange(role: TaskRole, nextExecutorClass: ExecutorClass) {
    updateRoleDraft(role, (current) => ensureDraftForExecutor(role, current, nextExecutorClass));
    setRoleValidation(role, null);
  }

  function handleRoleBooleanFieldChange(role: TaskRole, fieldKey: string, checked: boolean) {
    updateRoleDraft(role, (current) => {
      if (!isUpsertableExecutorClass(current.selectedExecutorClass)) {
        return current;
      }

      const currentClass = current.selectedExecutorClass;
      const existing = current.draftsByExecutor[currentClass] ?? {};

      return {
        ...current,
        draftsByExecutor: {
          ...current.draftsByExecutor,
          [currentClass]: {
            ...existing,
            [fieldKey]: checked,
          },
        },
      };
    });
  }

  function handleRoleFieldValueChange(role: TaskRole, fieldKey: string, value: string) {
    updateRoleDraft(role, (current) => {
      if (!isUpsertableExecutorClass(current.selectedExecutorClass)) {
        return current;
      }

      const currentClass = current.selectedExecutorClass;
      const existing = current.draftsByExecutor[currentClass] ?? {};

      return {
        ...current,
        draftsByExecutor: {
          ...current.draftsByExecutor,
          [currentClass]: {
            ...existing,
            [fieldKey]: value,
          },
        },
      };
    });
  }

  function handleRoleFieldRevert(role: TaskRole, field: ExecutorFieldSpec) {
    updateRoleDraft(role, (current) => {
      if (!isUpsertableExecutorClass(current.selectedExecutorClass)) {
        return current;
      }

      const currentClass = current.selectedExecutorClass;
      const existing = current.draftsByExecutor[currentClass] ?? {};
      const baseline = current.baselineByExecutor[currentClass] ?? {};

      return {
        ...current,
        draftsByExecutor: {
          ...current.draftsByExecutor,
          [currentClass]: {
            ...existing,
            [field.key]: baseline[field.key] ?? toDefaultFieldValue(field),
          },
        },
      };
    });
  }

  function handleTaskDescriptionChange(value: string) {
    setTaskDraft((current) => (current ? { ...current, descp: value } : current));
  }

  function handleTaskNameChange(value: string) {
    setTaskDraft((current) => (current ? { ...current, name: value } : current));
  }

  function dismissNotice() {
    setNotice(null);
  }

  function toggleRoleExpanded(role: TaskRole) {
    setExpandedRoles((current) => ({
      ...current,
      [role]: !current[role],
    }));
  }

  function toggleTasksPanelCollapsed() {
    setIsTasksPanelCollapsed((current) => !current);
  }

  return {
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
    isTaskMetadataDirty: isTaskMetadataDirty(),
    isTasksPanelCollapsed,
    lastLoadedAt,
    loadingRunnerLogIds,
    maxComparableInstances,
    notice,
    reloadTaskList: loadTaskList,
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
    selectTask: setSelectedTaskId,
    setRunnerFilters,
    statusTone,
    taskDraft,
    taskValidationMessage,
    tasks,
    toggleRoleExpanded,
    toggleRunnerInstanceSelection,
    toggleTasksPanelCollapsed,
  };
}