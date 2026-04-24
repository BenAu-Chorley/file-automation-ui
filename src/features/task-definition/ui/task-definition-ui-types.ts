import type { ExecutorClass, TaskRole } from "../types";

export type FieldValue = string | boolean;

export type RoleDraftState = {
  loadedExecutorClass: ExecutorClass;
  selectedExecutorClass: ExecutorClass;
  draftsByExecutor: Partial<Record<Exclude<ExecutorClass, "NoOp">, Record<string, FieldValue>>>;
  baselineByExecutor: Partial<Record<Exclude<ExecutorClass, "NoOp">, Record<string, FieldValue>>>;
};

export type TaskMetadataDraft = {
  baselineName: string;
  baselineDescp: string;
  name: string;
  descp: string;
};

export type RunnerFilters = {
  startTimeFrom: string;
  startTimeBefore: string;
};

export type ExpandedRoles = Record<TaskRole, boolean>;