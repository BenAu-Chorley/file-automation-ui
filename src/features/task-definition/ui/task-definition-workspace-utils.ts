import {
  EXECUTOR_CONFIG_FIELDS,
  type ExecutorFieldSpec,
  type UpsertableExecutorClass,
} from "../executor-config-schema";
import {
  EXECUTOR_CLASSES,
  type ExecutorClass,
  type ExecutorConfig,
  type ExecutorClassOrUnknown,
  type TaskDefinitionDetails,
  type TaskRole,
} from "../types";
import type { FieldValue, RoleDraftState } from "./task-definition-ui-types";

export function formatTimestamp(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export function formatDateTimeDisplay(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return formatTimestamp(date);
}

export function formatDateDisplay(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export function toDateInputValue(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export function statusTone(status: string | null | undefined): "neutral" | "success" | "warning" | "error" {
  const normalized = (status ?? "").trim().toLowerCase();

  if (!normalized) {
    return "neutral";
  }

  if (normalized.includes("fail") || normalized.includes("error")) {
    return "error";
  }

  if (normalized.includes("warn") || normalized.includes("caution")) {
    return "warning";
  }

  return "success";
}

export function toRoleLabel(role: TaskRole): string {
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}

export function normalizeExecutorClass(executorClass: ExecutorClassOrUnknown): ExecutorClass {
  return EXECUTOR_CLASSES.includes(executorClass as ExecutorClass)
    ? (executorClass as ExecutorClass)
    : "NoOp";
}

export function isUpsertableExecutorClass(executorClass: ExecutorClass): executorClass is UpsertableExecutorClass {
  return executorClass !== "NoOp";
}

export function toEditorFields(executorClass: UpsertableExecutorClass): ExecutorFieldSpec[] {
  return EXECUTOR_CONFIG_FIELDS[executorClass];
}

function getString(config: ExecutorConfig | null, key: string): string {
  const value = config?.values[key];

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function getBoolean(config: ExecutorConfig | null, key: string): string {
  const value = config?.values[key];

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return value === 1 ? "Yes" : "No";
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["1", "true", "y", "yes"].includes(normalized)) {
      return "Yes";
    }

    if (["0", "false", "n", "no"].includes(normalized)) {
      return "No";
    }
  }

  return "No";
}

function toEditorFieldValue(field: ExecutorFieldSpec, config: ExecutorConfig | null): FieldValue {
  if (field.type === "boolean") {
    return getBoolean(config, field.key) === "Yes";
  }

  if (field.type === "yn") {
    const raw = getString(config, field.key).trim().toUpperCase();
    return raw === "Y" || raw === "N" ? raw : "";
  }

  return getString(config, field.key);
}

export function toDefaultFieldValue(field: ExecutorFieldSpec): FieldValue {
  if (field.type === "boolean") {
    return false;
  }

  if (field.defaultValue) {
    return field.defaultValue;
  }

  return "";
}

export function buildFieldValueRecord(executorClass: UpsertableExecutorClass, config: ExecutorConfig | null): Record<string, FieldValue> {
  return Object.fromEntries(
    toEditorFields(executorClass).map((field) => [
      field.key,
      config ? toEditorFieldValue(field, config) : toDefaultFieldValue(field),
    ]),
  );
}

function areFieldValuesEqual(left: FieldValue, right: FieldValue): boolean {
  return left === right;
}

export function isRoleDirty(roleDraft: RoleDraftState): boolean {
  if (roleDraft.selectedExecutorClass !== roleDraft.loadedExecutorClass) {
    return true;
  }

  if (!isUpsertableExecutorClass(roleDraft.selectedExecutorClass)) {
    return false;
  }

  const baseline = roleDraft.baselineByExecutor[roleDraft.selectedExecutorClass] ?? {};
  const draft = roleDraft.draftsByExecutor[roleDraft.selectedExecutorClass] ?? {};

  return Object.keys({ ...baseline, ...draft }).some((key) => !areFieldValuesEqual(draft[key] ?? "", baseline[key] ?? ""));
}

export function getAssignmentByRole(details: TaskDefinitionDetails, role: TaskRole) {
  return details.assignments.find((entry) => entry.role === role) ?? null;
}

export function initializeRoleDraft(details: TaskDefinitionDetails, role: TaskRole): RoleDraftState {
  const assignment = getAssignmentByRole(details, role);
  const loadedExecutorClass = normalizeExecutorClass(assignment?.executorClass ?? "NoOp");

  if (!isUpsertableExecutorClass(loadedExecutorClass)) {
    return {
      loadedExecutorClass,
      selectedExecutorClass: loadedExecutorClass,
      draftsByExecutor: {},
      baselineByExecutor: {},
    };
  }

  const loadedValues = buildFieldValueRecord(loadedExecutorClass, assignment?.config ?? null);

  return {
    loadedExecutorClass,
    selectedExecutorClass: loadedExecutorClass,
    draftsByExecutor: {
      [loadedExecutorClass]: loadedValues,
    },
    baselineByExecutor: {
      [loadedExecutorClass]: loadedValues,
    },
  };
}

export function validateRoleDraft(roleDraft: RoleDraftState): string | null {
  if (!isUpsertableExecutorClass(roleDraft.selectedExecutorClass)) {
    return null;
  }

  const fields = toEditorFields(roleDraft.selectedExecutorClass);
  const draft = roleDraft.draftsByExecutor[roleDraft.selectedExecutorClass] ?? {};

  const missingFields = fields
    .filter((field) => field.required && field.type !== "boolean")
    .filter((field) => !String(draft[field.key] ?? "").trim())
    .map((field) => field.key);

  if (missingFields.length > 0) {
    return `Required fields missing: ${missingFields.join(", ")}`;
  }

  return null;
}

export function buildSaveConfirmationText(taskId: number, role: TaskRole, roleDraft: RoleDraftState): string {
  const fromExecutor = roleDraft.loadedExecutorClass;
  const toExecutor = roleDraft.selectedExecutorClass;

  if (fromExecutor !== toExecutor) {
    if (fromExecutor === "NoOp" && toExecutor !== "NoOp") {
      return `Save ${toRoleLabel(role)} for task #${taskId}?\n\nThis changes executor from NoOp to ${toExecutor} and adds a new ${toExecutor} config row.`;
    }

    if (fromExecutor !== "NoOp" && toExecutor === "NoOp") {
      return `Save ${toRoleLabel(role)} for task #${taskId}?\n\nThis changes executor from ${fromExecutor} to NoOp and deletes the existing ${fromExecutor} config row.`;
    }

    return `Save ${toRoleLabel(role)} for task #${taskId}?\n\nThis changes executor from ${fromExecutor} to ${toExecutor}, deletes the old config row, and adds a new ${toExecutor} config row.`;
  }

  return `Save ${toRoleLabel(role)} ${toExecutor} field changes for task #${taskId}?`;
}

export function buildCancelConfirmationText(taskId: number, role: TaskRole, roleDraft: RoleDraftState): string {
  const fromExecutor = roleDraft.loadedExecutorClass;
  const toExecutor = roleDraft.selectedExecutorClass;

  if (fromExecutor !== toExecutor) {
    return `Discard pending ${toRoleLabel(role)} executor switch for task #${taskId}?\n\nThis will revert executor from ${toExecutor} back to ${fromExecutor} and drop all unsaved field changes.`;
  }

  return `Discard unsaved ${toRoleLabel(role)} field changes for task #${taskId}?`;
}