import type { SqlRequestExecutor } from "@/features/connection/repository/sql-server-client";

import type {
  RunnerInstanceFilter,
  SaveRoleExecutorInput,
  TaskRole,
  UpdateTaskMetadataInput,
} from "../types";

export type DbRow = Record<string, unknown>;

export type TaskDefinitionRow = DbRow;
export type ExecutorRow = DbRow;
export type RunnerInstanceRow = DbRow;
export type RunnerLogRow = DbRow;

export type TaskWithExecutorRows = {
  taskRow: TaskDefinitionRow | null;
  executorRowsByRole: Partial<Record<TaskRole, ExecutorRow | null>>;
};

export interface TaskDefinitionRepository {
  listTaskRows(executor: SqlRequestExecutor): Promise<TaskDefinitionRow[]>;
  getTaskWithExecutors(executor: SqlRequestExecutor, taskId: number): Promise<TaskWithExecutorRows>;
  updateTaskMetadata(
    executor: SqlRequestExecutor,
    input: UpdateTaskMetadataInput,
  ): Promise<void>;
  saveRoleExecutor(
    executor: SqlRequestExecutor,
    input: SaveRoleExecutorInput,
  ): Promise<void>;
}

export interface ExecutionTrackingRepository {
  listRunnerInstanceRows(
    executor: SqlRequestExecutor,
    filters: RunnerInstanceFilter,
  ): Promise<RunnerInstanceRow[]>;
  listRunnerLogRows(executor: SqlRequestExecutor, runnerInstanceId: number): Promise<RunnerLogRow[]>;
}
