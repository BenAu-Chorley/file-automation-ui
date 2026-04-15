import type { SqlRequestExecutor } from "@/features/connection/repository/sql-server-client";

import type {
  DbRow,
  ExecutionTrackingRepository,
  RunnerInstanceRow,
  RunnerLogRow,
} from "./contracts";
import type { RunnerInstanceFilter } from "../types";

function assertPositiveId(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function normalizeDateInput(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export const sqlExecutionTrackingRepository: ExecutionTrackingRepository = {
  async listRunnerInstanceRows(
    executor: SqlRequestExecutor,
    filters: RunnerInstanceFilter,
  ): Promise<RunnerInstanceRow[]> {
    const startTimeFrom = normalizeDateInput(filters.startTimeFrom);
    const startTimeBefore = normalizeDateInput(filters.startTimeBefore);

    const request = executor.request();

    let query = `
      SELECT *
      FROM [fa].[t_runner_instance]
      WHERE 1 = 1
    `;

    if (filters.taskId !== undefined) {
      assertPositiveId(filters.taskId, "Task id");
      request.input("taskId", filters.taskId);
      query += " AND [task_id] = @taskId";
    }

    if (startTimeFrom) {
      request.input("startTimeFrom", startTimeFrom);
      query += " AND [start_time] >= @startTimeFrom";
    }

    if (startTimeBefore) {
      request.input("startTimeBefore", startTimeBefore);
      query += " AND [start_time] < @startTimeBefore";
    }

    query += " ORDER BY [start_time] DESC, [id] DESC";

    const result = await request.query<DbRow>(query);

    return result.recordset;
  },

  async listRunnerLogRows(executor: SqlRequestExecutor, runnerInstanceId: number): Promise<RunnerLogRow[]> {
    assertPositiveId(runnerInstanceId, "Runner instance id");

    const request = executor.request();
    request.input("runnerInstanceId", runnerInstanceId);

    const result = await request.query<DbRow>(`
      SELECT *
      FROM [fa].[t_runner_log]
      WHERE [runner_instance_id] = @runnerInstanceId
      ORDER BY [id] ASC
    `);

    return result.recordset;
  },
};
