import {
  withSharedSqlServerConnection,
  withSqlServerTransaction,
} from "@/features/connection/repository/sql-server-client";
import { getSessionConnectionString } from "@/features/connection/session/connection-session";

import {
  sqlExecutionTrackingRepository,
} from "../repository/execution-tracking-repository";
import { sqlTaskDefinitionRepository } from "../repository/task-definition-repository";
import { TaskDefinitionService } from "../service/task-definition-service";
import type {
  RunnerInstance,
  RunnerInstanceFilter,
  RunnerLog,
  SaveRoleExecutorInput,
  TaskDefinitionActionResult,
  TaskDefinitionDetails,
  TaskDefinitionSummary,
  UpdateTaskMetadataInput,
} from "../types";

export interface TaskDefinitionController {
  listTaskDefinitions(): Promise<TaskDefinitionActionResult<TaskDefinitionSummary[]>>;
  getTaskDefinitionDetails(taskId: number): Promise<TaskDefinitionActionResult<TaskDefinitionDetails>>;
  updateTaskMetadata(
    input: UpdateTaskMetadataInput,
  ): Promise<TaskDefinitionActionResult<null>>;
  saveRoleExecutor(
    input: SaveRoleExecutorInput,
  ): Promise<TaskDefinitionActionResult<null>>;
  listRunnerInstances(
    filters: RunnerInstanceFilter,
  ): Promise<TaskDefinitionActionResult<RunnerInstance[]>>;
  listRunnerLogs(runnerInstanceId: number): Promise<TaskDefinitionActionResult<RunnerLog[]>>;
}

type TaskDefinitionControllerDependencies = {
  getConnectionString: () => Promise<string | null>;
  service: TaskDefinitionService;
};

class DefaultTaskDefinitionController implements TaskDefinitionController {
  constructor(private readonly dependencies: TaskDefinitionControllerDependencies) {}

  async listTaskDefinitions(): Promise<TaskDefinitionActionResult<TaskDefinitionSummary[]>> {
    try {
      const connectionString = await this.getRequiredSessionConnectionString();
      const taskDefinitions = await withSharedSqlServerConnection(connectionString, (executor) =>
        this.dependencies.service.listTaskDefinitions(executor)
      );

      return {
        ok: true,
        message: "Task definitions loaded.",
        data: taskDefinitions,
      };
    } catch (error) {
      return this.toControllerError(error);
    }
  }

  async getTaskDefinitionDetails(taskId: number): Promise<TaskDefinitionActionResult<TaskDefinitionDetails>> {
    try {
      const connectionString = await this.getRequiredSessionConnectionString();
      const taskDefinitionDetails = await withSharedSqlServerConnection(connectionString, (executor) =>
        this.dependencies.service.getTaskDefinitionDetails(executor, taskId)
      );

      if (!taskDefinitionDetails) {
        return {
          ok: false,
          message: `Task ${taskId} was not found.`,
          data: null,
        };
      }

      return {
        ok: true,
        message: "Task definition details loaded.",
        data: taskDefinitionDetails,
      };
    } catch (error) {
      return this.toControllerError(error);
    }
  }

  async saveRoleExecutor(
    input: SaveRoleExecutorInput,
  ): Promise<TaskDefinitionActionResult<null>> {
    try {
      const connectionString = await this.getRequiredSessionConnectionString();

      await withSqlServerTransaction(connectionString, async (executor) =>
        this.dependencies.service.saveRoleExecutor(executor, input)
      );

      return {
        ok: true,
        message: `${input.role} executor saved as ${input.executorClass}.`,
        data: null,
      };
    } catch (error) {
      return this.toControllerError(error);
    }
  }

  async updateTaskMetadata(
    input: UpdateTaskMetadataInput,
  ): Promise<TaskDefinitionActionResult<null>> {
    try {
      const connectionString = await this.getRequiredSessionConnectionString();

      await withSqlServerTransaction(connectionString, async (executor) =>
        this.dependencies.service.updateTaskMetadata(executor, input)
      );

      return {
        ok: true,
        message: `Task #${input.taskId} details saved.`,
        data: null,
      };
    } catch (error) {
      return this.toControllerError(error);
    }
  }

  async listRunnerInstances(
    filters: RunnerInstanceFilter,
  ): Promise<TaskDefinitionActionResult<RunnerInstance[]>> {
    try {
      const connectionString = await this.getRequiredSessionConnectionString();
      const runnerInstances = await withSharedSqlServerConnection(connectionString, (executor) =>
        this.dependencies.service.listRunnerInstances(executor, filters)
      );

      return {
        ok: true,
        message: "Runner instances loaded.",
        data: runnerInstances,
      };
    } catch (error) {
      return this.toControllerError(error);
    }
  }

  async listRunnerLogs(runnerInstanceId: number): Promise<TaskDefinitionActionResult<RunnerLog[]>> {
    try {
      const connectionString = await this.getRequiredSessionConnectionString();
      const runnerLogs = await withSharedSqlServerConnection(connectionString, (executor) =>
        this.dependencies.service.listRunnerLogs(executor, runnerInstanceId)
      );

      return {
        ok: true,
        message: "Runner logs loaded.",
        data: runnerLogs,
      };
    } catch (error) {
      return this.toControllerError(error);
    }
  }

  private async getRequiredSessionConnectionString(): Promise<string> {
    const connectionString = await this.dependencies.getConnectionString();

    if (!connectionString) {
      throw new Error("No active session connection. Activate a database connection first.");
    }

    return connectionString;
  }

  private toControllerError<T>(error: unknown): TaskDefinitionActionResult<T> {
    const message = error instanceof Error && error.message.trim()
      ? error.message
      : "Task definition operation failed.";

    return {
      ok: false,
      message,
      data: null,
    };
  }
}

export function createTaskDefinitionController(
  dependencies?: Partial<TaskDefinitionControllerDependencies>,
): TaskDefinitionController {
  const service = dependencies?.service ?? new TaskDefinitionService(
    sqlTaskDefinitionRepository,
    sqlExecutionTrackingRepository,
  );

  return new DefaultTaskDefinitionController({
    getConnectionString: dependencies?.getConnectionString ?? getSessionConnectionString,
    service,
  });
}

export const taskDefinitionController = createTaskDefinitionController();
