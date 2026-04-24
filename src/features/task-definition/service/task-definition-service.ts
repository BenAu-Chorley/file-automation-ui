import type { SqlRequestExecutor } from "@/features/connection/repository/sql-server-client";

import type {
  ExecutionTrackingRepository,
  TaskDefinitionRepository,
} from "../repository/contracts";
import {
  mapRunnerInstanceRow,
  mapRunnerLogRow,
  mapTaskDetails,
  mapTaskRowToSummary,
} from "./task-definition-mappers";
import type {
  RunnerInstance,
  RunnerInstanceFilter,
  RunnerLog,
  SaveRoleExecutorInput,
  TaskDefinitionDetails,
  TaskDefinitionSummary,
  UpdateTaskMetadataInput,
} from "../types";
import {
  EXECUTOR_CONFIG_FIELDS,
  type ExecutorFieldSpec,
} from "../executor-config-schema";

function assertPositiveTaskId(taskId: number): void {
  if (!Number.isInteger(taskId) || taskId <= 0) {
    throw new Error("Task id must be a positive integer.");
  }
}

function normalizeBooleanValue(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["1", "true", "y", "yes"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "n", "no"].includes(normalized)) {
      return false;
    }
  }

  throw new Error("Boolean value must be Yes/No or true/false.");
}

function normalizeNumberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error("Numeric value is required.");
    }

    const parsed = Number.parseInt(normalized, 10);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error("Numeric value must be an integer.");
}

function normalizeStringValue(value: unknown, required: boolean, maxLength?: number): string | null {
  if (value === null || value === undefined) {
    if (required) {
      throw new Error("Text value is required.");
    }

    return null;
  }

  const normalized = String(value).trim();

  if (!normalized) {
    if (required) {
      throw new Error("Text value is required.");
    }

    return null;
  }

  if (maxLength && normalized.length > maxLength) {
    throw new Error(`Text value exceeds max length ${maxLength}.`);
  }

  return normalized;
}

function normalizeYnValue(value: unknown, maxLength?: number): string {
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();

    if (maxLength && normalized.length > maxLength) {
      throw new Error(`Value exceeds max length ${maxLength}.`);
    }

    if (normalized === "Y" || normalized === "N") {
      return normalized;
    }
  }

  throw new Error("Value must be Y or N.");
}

function normalizeExecutorValues(
  fields: ExecutorFieldSpec[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const field of fields) {
    const rawValue = values[field.key];

    try {
      if (field.type === "boolean") {
        normalized[field.key] = normalizeBooleanValue(rawValue) ? 1 : 0;
        continue;
      }

      if (field.type === "number") {
        normalized[field.key] = normalizeNumberValue(rawValue);
        continue;
      }

      if (field.type === "yn") {
        normalized[field.key] = normalizeYnValue(rawValue, field.maxLength);
        continue;
      }

      const normalizedString = normalizeStringValue(rawValue, field.required, field.maxLength);

      if (normalizedString && field.allowedValues && !field.allowedValues.includes(normalizedString)) {
        throw new Error(`Value must be one of: ${field.allowedValues.join(", ")}.`);
      }

      normalized[field.key] = normalizedString;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid value.";
      throw new Error(`Invalid ${field.key}: ${message}`);
    }
  }

  return normalized;
}

export class TaskDefinitionService {
  constructor(
    private readonly taskDefinitionRepository: TaskDefinitionRepository,
    private readonly executionTrackingRepository: ExecutionTrackingRepository,
  ) {}

  async listTaskDefinitions(executor: SqlRequestExecutor): Promise<TaskDefinitionSummary[]> {
    const taskRows = await this.taskDefinitionRepository.listTaskRows(executor);

    return taskRows.map((row) => mapTaskRowToSummary(row));
  }

  async getTaskDefinitionDetails(
    executor: SqlRequestExecutor,
    taskId: number,
  ): Promise<TaskDefinitionDetails | null> {
    const taskWithExecutors = await this.taskDefinitionRepository.getTaskWithExecutors(executor, taskId);

    if (!taskWithExecutors.taskRow) {
      return null;
    }

    return mapTaskDetails(taskWithExecutors.taskRow, taskWithExecutors.executorRowsByRole);
  }

  async saveRoleExecutor(
    executor: SqlRequestExecutor,
    input: SaveRoleExecutorInput,
  ): Promise<void> {
    assertPositiveTaskId(input.taskId);

    const normalizedValues = input.executorClass === "NoOp"
      ? {}
      : (() => {
          const fieldSpecs = EXECUTOR_CONFIG_FIELDS[input.executorClass];

          if (!fieldSpecs) {
            throw new Error(`Executor class ${input.executorClass} is not supported for save/update.`);
          }

          return normalizeExecutorValues(fieldSpecs, input.values);
        })();

    await this.taskDefinitionRepository.saveRoleExecutor(executor, {
      ...input,
      values: normalizedValues,
    });
  }

  async updateTaskMetadata(
    executor: SqlRequestExecutor,
    input: UpdateTaskMetadataInput,
  ): Promise<void> {
    assertPositiveTaskId(input.taskId);

    const normalizedName = normalizeStringValue(input.name, true, 50);
    const normalizedDescp = normalizeStringValue(input.descp, true, 200);

    await this.taskDefinitionRepository.updateTaskMetadata(executor, {
      taskId: input.taskId,
      name: normalizedName ?? "",
      descp: normalizedDescp ?? "",
    });
  }

  async listRunnerInstances(
    executor: SqlRequestExecutor,
    filters: RunnerInstanceFilter,
  ): Promise<RunnerInstance[]> {
    const rows = await this.executionTrackingRepository.listRunnerInstanceRows(executor, filters);

    return rows.map((row) => mapRunnerInstanceRow(row));
  }

  async listRunnerLogs(executor: SqlRequestExecutor, runnerInstanceId: number): Promise<RunnerLog[]> {
    const rows = await this.executionTrackingRepository.listRunnerLogRows(executor, runnerInstanceId);

    return rows.map((row) => mapRunnerLogRow(row));
  }
}
