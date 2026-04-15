import { beforeEach, describe, expect, it, vi } from "vitest";

const { withSharedSqlServerConnectionMock, withSqlServerTransactionMock } = vi.hoisted(() => ({
  withSharedSqlServerConnectionMock: vi.fn(),
  withSqlServerTransactionMock: vi.fn(),
}));

vi.mock("@/features/connection/repository/sql-server-client", () => ({
  withSharedSqlServerConnection: withSharedSqlServerConnectionMock,
  withSqlServerTransaction: withSqlServerTransactionMock,
}));

import { createTaskDefinitionController } from "@/features/task-definition/controller/task-definition-controller";
import type { TaskDefinitionService } from "@/features/task-definition/service/task-definition-service";

describe("task-definition-controller", () => {
  const executor = { request: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();

    withSharedSqlServerConnectionMock.mockImplementation(async (_connectionString, callback) =>
      callback(executor)
    );
    withSqlServerTransactionMock.mockImplementation(async (_connectionString, callback) =>
      callback(executor)
    );
  });

  function createServiceMock() {
    return {
      listTaskDefinitions: vi.fn(),
      getTaskDefinitionDetails: vi.fn(),
      updateTaskMetadata: vi.fn(),
      saveRoleExecutor: vi.fn(),
      listRunnerInstances: vi.fn(),
      listRunnerLogs: vi.fn(),
    } as unknown as TaskDefinitionService;
  }

  it("listTaskDefinitions returns success", async () => {
    const service = createServiceMock();
    vi.mocked(service.listTaskDefinitions).mockResolvedValue([]);
    const controller = createTaskDefinitionController({
      getConnectionString: async () => "Server=db;Database=fa;",
      service,
    });

    const result = await controller.listTaskDefinitions();

    expect(result.ok).toBe(true);
    expect(withSharedSqlServerConnectionMock).toHaveBeenCalledTimes(1);
  });

  it("getTaskDefinitionDetails returns not found for null payload", async () => {
    const service = createServiceMock();
    vi.mocked(service.getTaskDefinitionDetails).mockResolvedValue(null);
    const controller = createTaskDefinitionController({
      getConnectionString: async () => "Server=db;Database=fa;",
      service,
    });

    const result = await controller.getTaskDefinitionDetails(9);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Task 9 was not found");
  });

  it("saveRoleExecutor uses transaction wrapper", async () => {
    const service = createServiceMock();
    vi.mocked(service.saveRoleExecutor).mockResolvedValue(undefined);
    const controller = createTaskDefinitionController({
      getConnectionString: async () => "Server=db;Database=fa;",
      service,
    });

    const result = await controller.saveRoleExecutor({
      taskId: 2,
      role: "extractor",
      executorClass: "ItrentNewJoiner2CSV",
      values: {
        itrent_conn_str: "x",
        target_csv_path_pattern: "y",
        days_in_the_past: 1,
        with_header: "Y",
      },
    });

    expect(result.ok).toBe(true);
    expect(withSqlServerTransactionMock).toHaveBeenCalledTimes(1);
  });

  it("updateTaskMetadata uses transaction wrapper", async () => {
    const service = createServiceMock();
    vi.mocked(service.updateTaskMetadata).mockResolvedValue(undefined);
    const controller = createTaskDefinitionController({
      getConnectionString: async () => "Server=db;Database=fa;",
      service,
    });

    const result = await controller.updateTaskMetadata({
      taskId: 2,
      name: "Task A",
      descp: "Description A",
    });

    expect(result.ok).toBe(true);
    expect(withSqlServerTransactionMock).toHaveBeenCalledTimes(1);
  });

  it("listRunnerInstances and listRunnerLogs delegate through shared connection", async () => {
    const service = createServiceMock();
    vi.mocked(service.listRunnerInstances).mockResolvedValue([]);
    vi.mocked(service.listRunnerLogs).mockResolvedValue([]);
    const controller = createTaskDefinitionController({
      getConnectionString: async () => "Server=db;Database=fa;",
      service,
    });

    const runnerInstancesResult = await controller.listRunnerInstances({ taskId: 1 });
    const runnerLogsResult = await controller.listRunnerLogs(12);

    expect(runnerInstancesResult.ok).toBe(true);
    expect(runnerLogsResult.ok).toBe(true);
    expect(withSharedSqlServerConnectionMock).toHaveBeenCalledTimes(2);
  });

  it("returns controller error when session connection is missing", async () => {
    const service = createServiceMock();
    const controller = createTaskDefinitionController({
      getConnectionString: async () => null,
      service,
    });

    const result = await controller.listTaskDefinitions();

    expect(result.ok).toBe(false);
    expect(result.message).toBe("No active session connection. Activate a database connection first.");
  });
});
