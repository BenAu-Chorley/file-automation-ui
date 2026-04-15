import {
  EXECUTOR_CLASSES,
  type ExecutorAssignment,
  type ExecutorClass,
  type ExecutorClassOrUnknown,
  type ExecutorConfig,
  type RunnerInstance,
  type RunnerLog,
  type TaskDefinitionDetails,
  type TaskDefinitionSummary,
  type TaskRole,
} from "../types";
import type {
  DbRow,
  ExecutorRow,
  RunnerInstanceRow,
  RunnerLogRow,
  TaskDefinitionRow,
} from "../repository/contracts";

const EXECUTOR_TABLE_BY_CLASS: Partial<Record<ExecutorClass, string>> = {
  ItrentNewJoiner2CSV: "t_executor_ItrentNewJoiner2Csv",
  LocalFile2Sftp: "t_executor_LocalFile2Sftp",
  LocalFileCopy: "t_executor_LocalFileCopy",
  LocalFolder2Sftp: "t_executor_LocalFolder2Sftp",
  SftpFile2Local: "t_executor_SftpFile2Local",
  SftpFolder2Local: "t_executor_SftpFolder2Local",
};

function normalizeRow(row: DbRow): Record<string, unknown> {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]);

  return Object.fromEntries(normalizedEntries);
}

function getString(row: DbRow, keys: string[]): string | null {
  const normalizedRow = normalizeRow(row);

  for (const key of keys) {
    const value = normalizedRow[key.toLowerCase()];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getNumber(row: DbRow, keys: string[]): number | null {
  const normalizedRow = normalizeRow(row);

  for (const key of keys) {
    const value = normalizedRow[key.toLowerCase()];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsedValue = Number.parseInt(value, 10);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return null;
}

function getIsoDateTime(row: DbRow, keys: string[]): string | null {
  const normalizedRow = normalizeRow(row);

  for (const key of keys) {
    const value = normalizedRow[key.toLowerCase()];

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }

    if (typeof value === "string" && value.trim()) {
      const parsedDate = new Date(value);

      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString();
      }
    }
  }

  return null;
}

function normalizeExecutorClass(value: string | null): ExecutorClassOrUnknown {
  if (!value) {
    return "NoOp";
  }

  return value;
}

function isKnownExecutorClass(value: string): value is ExecutorClass {
  return (EXECUTOR_CLASSES as readonly string[]).includes(value);
}

function deriveTaskName(row: TaskDefinitionRow, taskId: number): string {
  const preferredName = getString(row, ["task_name", "name", "runner_id"]);

  return preferredName ?? `Task ${taskId}`;
}

export function getExecutorTableName(executorClass: ExecutorClassOrUnknown): string | null {
  if (!isKnownExecutorClass(executorClass)) {
    return null;
  }

  return EXECUTOR_TABLE_BY_CLASS[executorClass] ?? null;
}

export function mapTaskRowToSummary(row: TaskDefinitionRow): TaskDefinitionSummary {
  const taskId = getNumber(row, ["id", "task_id"]) ?? 0;

  return {
    id: taskId,
    name: deriveTaskName(row, taskId),
    descp: getString(row, ["descp", "description"]),
    extractorClass: normalizeExecutorClass(getString(row, ["extractor_class"])),
    transformerClass: normalizeExecutorClass(getString(row, ["transformer_class"])),
    loaderClass: normalizeExecutorClass(getString(row, ["loader_class"])),
  };
}

export function mapExecutorRowToConfig(
  taskId: number,
  role: TaskRole,
  row: ExecutorRow | null,
): ExecutorConfig | null {
  if (!row) {
    return null;
  }

  const normalizedRow = normalizeRow(row);

  const values = Object.fromEntries(
    Object.entries(normalizedRow).filter(([key]) => key !== "task_id" && key !== "role"),
  );

  return {
    taskId,
    role,
    values,
  };
}

export function mapTaskDetails(
  taskRow: TaskDefinitionRow,
  executorRowsByRole: Partial<Record<TaskRole, ExecutorRow | null>>,
): TaskDefinitionDetails {
  const summary = mapTaskRowToSummary(taskRow);

  const assignments: ExecutorAssignment[] = [
    {
      role: "extractor",
      executorClass: summary.extractorClass,
      config: mapExecutorRowToConfig(
        summary.id,
        "extractor",
        executorRowsByRole.extractor ?? null,
      ),
    },
    {
      role: "transformer",
      executorClass: summary.transformerClass,
      config: mapExecutorRowToConfig(
        summary.id,
        "transformer",
        executorRowsByRole.transformer ?? null,
      ),
    },
    {
      role: "loader",
      executorClass: summary.loaderClass,
      config: mapExecutorRowToConfig(
        summary.id,
        "loader",
        executorRowsByRole.loader ?? null,
      ),
    },
  ];

  return {
    ...summary,
    assignments,
  };
}

export function mapRunnerInstanceRow(row: RunnerInstanceRow): RunnerInstance {
  const id = getNumber(row, ["id"]) ?? 0;
  const taskId = getNumber(row, ["task_id"]) ?? 0;

  return {
    id,
    runnerId: getString(row, ["runner_id"]) ?? "",
    taskId,
    startTime: getIsoDateTime(row, ["start_time"]) ?? new Date(0).toISOString(),
    endTime: getIsoDateTime(row, ["end_time"]),
    status: getString(row, ["status"]) ?? "",
  };
}

export function mapRunnerLogRow(row: RunnerLogRow): RunnerLog {
  const id = getNumber(row, ["id"]) ?? 0;

  return {
    id,
    runnerInstanceId: getNumber(row, ["runner_instance_id"]) ?? 0,
    startTime: getIsoDateTime(row, ["start_time"]) ?? new Date(0).toISOString(),
    endTime: getIsoDateTime(row, ["end_time"]),
    status: getString(row, ["status"]) ?? "",
    remarks: getString(row, ["remarks"]),
  };
}

