import type { SqlRequestExecutor } from "@/features/connection/repository/sql-server-client";

import type {
  DbRow,
  TaskDefinitionRepository,
  TaskWithExecutorRows,
} from "./contracts";
import {
  TASK_ROLES,
  type SaveRoleExecutorInput,
  type TaskRole,
  type UpdateTaskMetadataInput,
} from "../types";
import { getExecutorTableName, mapTaskRowToSummary } from "../service/task-definition-mappers";

function getRoleClassColumn(role: TaskRole): "extractor_class" | "transformer_class" | "loader_class" {
  if (role === "extractor") {
    return "extractor_class";
  }

  if (role === "transformer") {
    return "transformer_class";
  }

  return "loader_class";
}

function assertTaskId(taskId: number): void {
  if (!Number.isInteger(taskId) || taskId <= 0) {
    throw new Error("Task id must be a positive integer.");
  }
}

function buildTaskRoleClass(taskSummary: {
  extractorClass: string;
  transformerClass: string;
  loaderClass: string;
}, role: TaskRole): string {
  if (role === "extractor") {
    return taskSummary.extractorClass;
  }

  if (role === "transformer") {
    return taskSummary.transformerClass;
  }

  return taskSummary.loaderClass;
}

export const sqlTaskDefinitionRepository: TaskDefinitionRepository = {
  async listTaskRows(executor: SqlRequestExecutor): Promise<DbRow[]> {
    const result = await executor.request().query<DbRow>(`
      SELECT *
      FROM [fa].[t_runner_task]
      ORDER BY [id] ASC
    `);

    return result.recordset;
  },

  async getTaskWithExecutors(executor: SqlRequestExecutor, taskId: number): Promise<TaskWithExecutorRows> {
    assertTaskId(taskId);

    const taskRequest = executor.request();
    taskRequest.input("taskId", taskId);

    const taskResult = await taskRequest.query<DbRow>(`
      SELECT *
      FROM [fa].[t_runner_task]
      WHERE [id] = @taskId
    `);

    const taskRow = taskResult.recordset[0] ?? null;

    if (!taskRow) {
      return {
        taskRow: null,
        executorRowsByRole: {},
      };
    }

    const taskSummary = mapTaskRowToSummary(taskRow);
    const executorRowsByRole: Partial<Record<TaskRole, DbRow | null>> = {};

    for (const role of TASK_ROLES) {
      const executorClass = buildTaskRoleClass(taskSummary, role);
      const executorTableName = getExecutorTableName(executorClass);

      if (!executorTableName) {
        executorRowsByRole[role] = null;
        continue;
      }

      const executorRequest = executor.request();
      executorRequest.input("taskId", taskSummary.id);
      executorRequest.input("role", role);

      const executorResult = await executorRequest.query<DbRow>(`
        SELECT *
        FROM [fa].[${executorTableName}]
        WHERE [task_id] = @taskId
          AND [role] = @role
      `);

      executorRowsByRole[role] = executorResult.recordset[0] ?? null;
    }

    return {
      taskRow,
      executorRowsByRole,
    };
  },

  async updateTaskMetadata(
    executor: SqlRequestExecutor,
    input: UpdateTaskMetadataInput,
  ): Promise<void> {
    assertTaskId(input.taskId);

    const request = executor.request();
    request.input("taskId", input.taskId);
    request.input("name", input.name);
    request.input("descp", input.descp);

    await request.query(`
      UPDATE [fa].[t_runner_task]
      SET [name] = @name,
          [descp] = @descp
      WHERE [id] = @taskId
    `);
  },

  async saveRoleExecutor(
    executor: SqlRequestExecutor,
    input: SaveRoleExecutorInput,
  ): Promise<void> {
    assertTaskId(input.taskId);

    const loadTaskRequest = executor.request();
    loadTaskRequest.input("taskId", input.taskId);

    const loadTaskResult = await loadTaskRequest.query<DbRow>(`
      SELECT *
      FROM [fa].[t_runner_task]
      WHERE [id] = @taskId
    `);

    const taskRow = loadTaskResult.recordset[0] ?? null;

    if (!taskRow) {
      throw new Error(`Task ${input.taskId} was not found.`);
    }

    const taskSummary = mapTaskRowToSummary(taskRow);
    const currentExecutorClass = buildTaskRoleClass(taskSummary, input.role);
    const nextExecutorClass = input.executorClass;

    const updateTaskRequest = executor.request();
    updateTaskRequest.input("taskId", input.taskId);
    updateTaskRequest.input("nextExecutorClass", nextExecutorClass);

    await updateTaskRequest.query(`
      UPDATE [fa].[t_runner_task]
      SET [${getRoleClassColumn(input.role)}] = @nextExecutorClass
      WHERE [id] = @taskId
    `);

    const currentTableName = getExecutorTableName(currentExecutorClass);
    const nextTableName = getExecutorTableName(nextExecutorClass);

    if (currentExecutorClass !== nextExecutorClass && currentTableName) {
      const deleteOldRequest = executor.request();
      deleteOldRequest.input("taskId", input.taskId);
      deleteOldRequest.input("role", input.role);

      await deleteOldRequest.query(`
        DELETE FROM [fa].[${currentTableName}]
        WHERE [task_id] = @taskId
          AND [role] = @role
      `);
    }

    if (!nextTableName) {
      return;
    }

    const fieldEntries = Object.entries(input.values);

    if (fieldEntries.length === 0) {
      throw new Error(`No values supplied for ${nextExecutorClass} executor save.`);
    }

    if (currentExecutorClass !== nextExecutorClass) {
      const deleteNextStaleRequest = executor.request();
      deleteNextStaleRequest.input("taskId", input.taskId);
      deleteNextStaleRequest.input("role", input.role);

      await deleteNextStaleRequest.query(`
        DELETE FROM [fa].[${nextTableName}]
        WHERE [task_id] = @taskId
          AND [role] = @role
      `);
    }

    const request = executor.request();
    request.input("taskId", input.taskId);
    request.input("role", input.role);

    const sourceProjection = ["@taskId AS [task_id]", "@role AS [role]"];
    const insertColumns = ["[task_id]", "[role]"];
    const insertValues = ["source.[task_id]", "source.[role]"];
    const updateAssignments: string[] = [];

    fieldEntries.forEach(([columnName, value], index) => {
      const parameterName = `value${index}`;
      request.input(parameterName, value);

      sourceProjection.push(`@${parameterName} AS [${columnName}]`);
      insertColumns.push(`[${columnName}]`);
      insertValues.push(`source.[${columnName}]`);
      updateAssignments.push(`target.[${columnName}] = source.[${columnName}]`);
    });

    await request.query(`
      MERGE [fa].[${nextTableName}] AS target
      USING (
        SELECT
          ${sourceProjection.join(",\n          ")}
      ) AS source
      ON target.[task_id] = source.[task_id]
        AND target.[role] = source.[role]
      WHEN MATCHED THEN
        UPDATE SET
          ${updateAssignments.join(",\n          ")}
      WHEN NOT MATCHED THEN
        INSERT (
          ${insertColumns.join(",\n          ")}
        )
        VALUES (
          ${insertValues.join(",\n          ")}
        );
    `);
  },
};
