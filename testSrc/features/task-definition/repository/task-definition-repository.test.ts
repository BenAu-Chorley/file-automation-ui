import { describe, expect, it, vi } from "vitest";
import type sql from "mssql";

import { sqlTaskDefinitionRepository } from "@/features/task-definition/repository/task-definition-repository";
import type { SqlRequestExecutor } from "@/features/connection/repository/sql-server-client";

type SqlRequest = ReturnType<SqlRequestExecutor["request"]>;

type MockRequest = {
  sqlRequest: SqlRequest;
  inputMock: ReturnType<typeof vi.fn>;
  queryMock: ReturnType<typeof vi.fn>;
};

function createExecutor(recordsets: Array<Record<string, unknown>[]>) {
  const requests: MockRequest[] = [];

  const executor: SqlRequestExecutor = {
    request() {
      const inputMock = vi.fn((name: string, value: unknown) => ({ name, value }));
      const queryMock = vi.fn((queryText: string) => queryText);

      const query: SqlRequest["query"] = async <T = unknown>(queryText: string) => {
        const currentRecordset = (recordsets.shift() ?? []) as T[];
        queryMock(queryText);

        return {
          recordset: currentRecordset,
          recordsets: [currentRecordset],
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

      requests.push(request);
      return request.sqlRequest;
    },
  };

  return { executor, requests };
}

describe("task-definition-repository", () => {
  it("listTaskRows returns recordset", async () => {
    const { executor, requests } = createExecutor([[{ id: 1 }]]);

    const result = await sqlTaskDefinitionRepository.listTaskRows(executor);

    expect(result).toEqual([{ id: 1 }]);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.queryMock).toHaveBeenCalledWith(expect.stringContaining("FROM [fa].[t_runner_task]"));
  });

  it("getTaskWithExecutors rejects invalid task id", async () => {
    const { executor } = createExecutor([]);

    await expect(sqlTaskDefinitionRepository.getTaskWithExecutors(executor, 0)).rejects.toThrow(
      "Task id must be a positive integer.",
    );
  });

  it("getTaskWithExecutors returns null task payload when task row missing", async () => {
    const { executor } = createExecutor([[]]);

    const result = await sqlTaskDefinitionRepository.getTaskWithExecutors(executor, 5);

    expect(result.taskRow).toBeNull();
    expect(result.executorRowsByRole).toEqual({});
  });

  it("getTaskWithExecutors resolves rows by role and class table mapping", async () => {
    const { executor, requests } = createExecutor([
      [
        {
          id: 8,
          task_name: "Task 8",
          extractor_class: "UnknownClass",
          transformer_class: "NoOp",
          loader_class: "LocalFileCopy",
        },
      ],
      [
        {
          task_id: 8,
          role: "loader",
          src_path_pattern: "C:/src",
          dest_path_pattern: "D:/dest",
        },
      ],
    ]);

    const result = await sqlTaskDefinitionRepository.getTaskWithExecutors(executor, 8);

    expect(result.taskRow).not.toBeNull();
    expect(result.executorRowsByRole.extractor).toBeNull();
    expect(result.executorRowsByRole.transformer).toBeNull();
    expect(result.executorRowsByRole.loader).toEqual(
      expect.objectContaining({ role: "loader" }),
    );
    expect(requests).toHaveLength(2);
    expect(requests[1]?.queryMock).toHaveBeenCalledWith(
      expect.stringContaining("[fa].[t_executor_LocalFileCopy]"),
    );
  });

  it("updateTaskMetadata updates only name and descp columns", async () => {
    const { executor, requests } = createExecutor([[]]);

    await sqlTaskDefinitionRepository.updateTaskMetadata(executor, {
      taskId: 4,
      name: "Task 4",
      descp: "Updated description",
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.inputMock).toHaveBeenCalledWith("taskId", 4);
    expect(requests[0]?.inputMock).toHaveBeenCalledWith("name", "Task 4");
    expect(requests[0]?.inputMock).toHaveBeenCalledWith("descp", "Updated description");
    expect(requests[0]?.queryMock).toHaveBeenCalledWith(
      expect.stringContaining("SET [name] = @name"),
    );
    expect(requests[0]?.queryMock).toHaveBeenCalledWith(
      expect.stringContaining("[descp] = @descp"),
    );
  });

  it("saveRoleExecutor updates role class and upserts same-table config", async () => {
    const { executor, requests } = createExecutor([
      [
        {
          id: 3,
          extractor_class: "NoOp",
          transformer_class: "NoOp",
          loader_class: "LocalFileCopy",
        },
      ],
      [],
      [],
    ]);

    await sqlTaskDefinitionRepository.saveRoleExecutor(executor, {
      taskId: 3,
      role: "loader",
      executorClass: "LocalFileCopy",
      values: {
        src_path_pattern: "C:/source/*.csv",
        dest_path_pattern: "D:/dest/*.csv",
        overwrite_dest: 1,
        delete_src_after_copy: 0,
      },
    });

    expect(requests).toHaveLength(3);
    expect(requests[1]?.queryMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE [fa].[t_runner_task]"));
    expect(requests[2]?.queryMock).toHaveBeenCalledWith(expect.stringContaining("MERGE [fa].[t_executor_LocalFileCopy]"));
  });

  it("saveRoleExecutor switches executor with delete old and add new semantics", async () => {
    const { executor, requests } = createExecutor([
      [
        {
          id: 7,
          extractor_class: "ItrentNewJoiner2CSV",
          transformer_class: "NoOp",
          loader_class: "NoOp",
        },
      ],
      [],
      [],
      [],
      [],
    ]);

    await sqlTaskDefinitionRepository.saveRoleExecutor(executor, {
      taskId: 7,
      role: "extractor",
      executorClass: "LocalFileCopy",
      values: {
        src_path_pattern: "C:/temp/*.csv",
        dest_path_pattern: "D:/target/*.csv",
        overwrite_dest: 1,
        delete_src_after_copy: 0,
      },
    });

    expect(requests).toHaveLength(5);
    expect(requests[2]?.queryMock).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM [fa].[t_executor_ItrentNewJoiner2Csv]"),
    );
    expect(requests[3]?.queryMock).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM [fa].[t_executor_LocalFileCopy]"),
    );
    expect(requests[4]?.queryMock).toHaveBeenCalledWith(
      expect.stringContaining("MERGE [fa].[t_executor_LocalFileCopy]"),
    );
  });

  it("saveRoleExecutor handles switch to NoOp by deleting old row only", async () => {
    const { executor, requests } = createExecutor([
      [
        {
          id: 10,
          extractor_class: "LocalFileCopy",
          transformer_class: "NoOp",
          loader_class: "NoOp",
        },
      ],
      [],
      [],
    ]);

    await sqlTaskDefinitionRepository.saveRoleExecutor(executor, {
      taskId: 10,
      role: "extractor",
      executorClass: "NoOp",
      values: {},
    });

    expect(requests).toHaveLength(3);
    expect(requests[2]?.queryMock).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM [fa].[t_executor_LocalFileCopy]"),
    );
  });
});
