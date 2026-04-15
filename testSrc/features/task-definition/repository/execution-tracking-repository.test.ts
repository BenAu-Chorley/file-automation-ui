import { describe, expect, it, vi } from "vitest";
import type sql from "mssql";

import { sqlExecutionTrackingRepository } from "@/features/task-definition/repository/execution-tracking-repository";
import type { SqlRequestExecutor } from "@/features/connection/repository/sql-server-client";

type SqlRequest = ReturnType<SqlRequestExecutor["request"]>;

type MockRequest = {
  sqlRequest: SqlRequest;
  inputMock: ReturnType<typeof vi.fn>;
  queryMock: ReturnType<typeof vi.fn>;
};

function createExecutor(recordset: Record<string, unknown>[]) {
  const inputMock = vi.fn((name: string, value: unknown) => ({ name, value }));
  const queryMock = vi.fn((queryText: string) => queryText);

  const query: SqlRequest["query"] = async <T = unknown>(queryText: string) => {
    queryMock(queryText);

    return {
      recordset: recordset as T[],
      recordsets: [recordset as T[]],
      rowsAffected: [],
      output: {},
    } as unknown as sql.IResult<T>;
  };

  const request: MockRequest = {
    sqlRequest: {
      input: (name: string, value: unknown) => inputMock(name, value),
      query,
    },
    inputMock,
    queryMock,
  };

  const executor: SqlRequestExecutor = {
    request: vi.fn(() => request.sqlRequest),
  };

  return { executor, request };
}

describe("execution-tracking-repository", () => {
  it("listRunnerInstanceRows builds query using optional filters", async () => {
    const { executor, request } = createExecutor([{ id: 1 }]);

    const result = await sqlExecutionTrackingRepository.listRunnerInstanceRows(executor, {
      taskId: 9,
      startTimeFrom: "2026-04-01T00:00:00.000Z",
      startTimeBefore: "2026-05-01T00:00:00.000Z",
    });

    expect(result).toEqual([{ id: 1 }]);
    expect(request.inputMock).toHaveBeenCalledWith("taskId", 9);
    expect(request.inputMock).toHaveBeenCalledWith("startTimeFrom", expect.any(Date));
    expect(request.inputMock).toHaveBeenCalledWith("startTimeBefore", expect.any(Date));
    expect(request.queryMock).toHaveBeenCalledWith(expect.stringContaining("[task_id] = @taskId"));
    expect(request.queryMock).toHaveBeenCalledWith(expect.stringContaining("[start_time] >= @startTimeFrom"));
    expect(request.queryMock).toHaveBeenCalledWith(expect.stringContaining("[start_time] < @startTimeBefore"));
  });

  it("listRunnerInstanceRows rejects invalid task id", async () => {
    const { executor } = createExecutor([]);

    await expect(
      sqlExecutionTrackingRepository.listRunnerInstanceRows(executor, { taskId: -1 }),
    ).rejects.toThrow("Task id must be a positive integer.");
  });

  it("listRunnerLogRows fetches logs by runner instance id", async () => {
    const { executor, request } = createExecutor([{ id: 5 }]);

    const result = await sqlExecutionTrackingRepository.listRunnerLogRows(executor, 12);

    expect(result).toEqual([{ id: 5 }]);
    expect(request.inputMock).toHaveBeenCalledWith("runnerInstanceId", 12);
    expect(request.queryMock).toHaveBeenCalledWith(expect.stringContaining("FROM [fa].[t_runner_log]"));
  });

  it("listRunnerLogRows rejects invalid runner instance id", async () => {
    const { executor } = createExecutor([]);

    await expect(sqlExecutionTrackingRepository.listRunnerLogRows(executor, 0)).rejects.toThrow(
      "Runner instance id must be a positive integer.",
    );
  });

  it("listRunnerInstanceRows ignores invalid date filters", async () => {
    const { executor, request } = createExecutor([{ id: 7 }]);

    const result = await sqlExecutionTrackingRepository.listRunnerInstanceRows(executor, {
      startTimeFrom: "not-a-date",
      startTimeBefore: "",
    });

    expect(result).toEqual([{ id: 7 }]);
    expect(request.inputMock).not.toHaveBeenCalledWith("startTimeFrom", expect.anything());
    expect(request.inputMock).not.toHaveBeenCalledWith("startTimeBefore", expect.anything());
    expect(request.queryMock).toHaveBeenCalledWith(expect.stringContaining("ORDER BY [start_time] DESC, [id] DESC"));
  });
});
