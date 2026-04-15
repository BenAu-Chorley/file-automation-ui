import { describe, expect, it, vi } from "vitest";

import { TaskDefinitionService } from "@/features/task-definition/service/task-definition-service";
import type {
  ExecutionTrackingRepository,
  TaskDefinitionRepository,
} from "@/features/task-definition/repository/contracts";

describe("task-definition-service", () => {
  function createService() {
    const taskDefinitionRepository: TaskDefinitionRepository = {
      listTaskRows: vi.fn(),
      getTaskWithExecutors: vi.fn(),
      updateTaskMetadata: vi.fn(),
      saveRoleExecutor: vi.fn(),
    };

    const executionTrackingRepository: ExecutionTrackingRepository = {
      listRunnerInstanceRows: vi.fn(),
      listRunnerLogRows: vi.fn(),
    };

    return {
      service: new TaskDefinitionService(taskDefinitionRepository, executionTrackingRepository),
      taskDefinitionRepository,
      executionTrackingRepository,
    };
  }

  const executor = { request: vi.fn() } as never;

  it("listTaskDefinitions maps repository rows", async () => {
    const { service, taskDefinitionRepository } = createService();
    vi.mocked(taskDefinitionRepository.listTaskRows).mockResolvedValue([
      {
        id: 1,
        task_name: "Task 1",
        extractor_class: "NoOp",
        transformer_class: "NoOp",
        loader_class: "NoOp",
      },
    ]);

    const result = await service.listTaskDefinitions(executor);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Task 1");
  });

  it("getTaskDefinitionDetails maps executor assignments when task exists", async () => {
    const { service, taskDefinitionRepository } = createService();
    vi.mocked(taskDefinitionRepository.getTaskWithExecutors).mockResolvedValue({
      taskRow: {
        id: 11,
        task_name: "Task 11",
        extractor_class: "LocalFileCopy",
        transformer_class: "NoOp",
        loader_class: "NoOp",
      },
      executorRowsByRole: {
        extractor: {
          task_id: 11,
          role: "extractor",
          src_path_pattern: "C:/in",
          dest_path_pattern: "C:/out",
          overwrite_dest: 1,
          delete_src_after_copy: 0,
        },
      },
    });

    const result = await service.getTaskDefinitionDetails(executor, 11);

    expect(result?.id).toBe(11);
    expect(result?.assignments[0]?.config?.values.src_path_pattern).toBe("C:/in");
  });

  it("getTaskDefinitionDetails returns null when task is missing", async () => {
    const { service, taskDefinitionRepository } = createService();
    vi.mocked(taskDefinitionRepository.getTaskWithExecutors).mockResolvedValue({
      taskRow: null,
      executorRowsByRole: {},
    });

    const result = await service.getTaskDefinitionDetails(executor, 11);

    expect(result).toBeNull();
  });

  it("saveRoleExecutor trims LocalFileCopy paths before repository call", async () => {
    const { service, taskDefinitionRepository } = createService();

    await service.saveRoleExecutor(executor, {
      taskId: 5,
      role: "loader",
      executorClass: "LocalFileCopy",
      values: {
        src_path_pattern: "  C:/src/*.txt  ",
        dest_path_pattern: "  D:/dest/*.txt  ",
        overwrite_dest: true,
        delete_src_after_copy: false,
      },
    });

    expect(taskDefinitionRepository.saveRoleExecutor).toHaveBeenCalledWith(
      executor,
      expect.objectContaining({
        executorClass: "LocalFileCopy",
        values: expect.objectContaining({
          src_path_pattern: "C:/src/*.txt",
          dest_path_pattern: "D:/dest/*.txt",
          overwrite_dest: 1,
          delete_src_after_copy: 0,
        }),
      }),
    );
  });

  it("saveRoleExecutor rejects blank LocalFileCopy paths", async () => {
    const { service } = createService();

    await expect(
      service.saveRoleExecutor(executor, {
        taskId: 5,
        role: "loader",
        executorClass: "LocalFileCopy",
        values: {
          src_path_pattern: "   ",
          dest_path_pattern: "D:/dest",
          overwrite_dest: true,
          delete_src_after_copy: false,
        },
      }),
    ).rejects.toThrow("Invalid src_path_pattern");
  });

  it("saveRoleExecutor normalizes bool and number values", async () => {
    const { service, taskDefinitionRepository } = createService();

    await service.saveRoleExecutor(executor, {
      taskId: 5,
      role: "loader",
      executorClass: "LocalFile2Sftp",
      values: {
        sftp_url: " sftp://sample ",
        sftp_port: "22",
        sftp_username: "user",
        sftp_password_or_private_key_path: "/tmp/key",
        sftp_credential_type: "PasswordAuthentication",
        local_path_pattern: " C:/in/*.csv ",
        remote_path_pattern: "/out/*.csv",
        delete_local_after_copy: "yes",
        key_passphrase: "",
      },
    });

    expect(taskDefinitionRepository.saveRoleExecutor).toHaveBeenCalledWith(
      executor,
      expect.objectContaining({
        values: expect.objectContaining({
          sftp_url: "sftp://sample",
          sftp_port: 22,
          delete_local_after_copy: 1,
          key_passphrase: null,
        }),
      }),
    );
  });

  it("saveRoleExecutor rejects missing required fields", async () => {
    const { service } = createService();

    await expect(
      service.saveRoleExecutor(executor, {
        taskId: 5,
        role: "loader",
        executorClass: "SftpFile2Local",
        values: {
          sftp_url: "",
          sftp_port: 22,
          sftp_username: "user",
          sftp_password_or_private_key_path: "secret",
          sftp_credential_type: "PasswordAuthentication",
          local_path_pattern: "C:/in",
          remote_path_pattern: "/out",
          key_passphrase: null,
        },
      }),
    ).rejects.toThrow("Invalid sftp_url");
  });

  it("saveRoleExecutor rejects unsupported executor class", async () => {
    const { service } = createService();

    await expect(
      service.saveRoleExecutor(executor, {
        taskId: 5,
        role: "loader",
        executorClass: "UnknownExecutor",
        values: {},
      }),
    ).rejects.toThrow("is not supported for save/update");
  });

  it("saveRoleExecutor rejects invalid task id", async () => {
    const { service } = createService();

    await expect(
      service.saveRoleExecutor(executor, {
        taskId: 0,
        role: "extractor",
        executorClass: "NoOp",
        values: {},
      }),
    ).rejects.toThrow("Task id must be a positive integer.");
  });

  it("saveRoleExecutor rejects invalid numeric and yn values", async () => {
    const { service } = createService();

    await expect(
      service.saveRoleExecutor(executor, {
        taskId: 5,
        role: "extractor",
        executorClass: "ItrentNewJoiner2CSV",
        values: {
          itrent_conn_str: "Server=db;",
          target_csv_path_pattern: "C:/out/*.csv",
          days_in_the_past: "not-a-number",
          with_header: "maybe",
        },
      }),
    ).rejects.toThrow("Invalid days_in_the_past");
  });

  it("saveRoleExecutor rejects disallowed option values", async () => {
    const { service } = createService();

    await expect(
      service.saveRoleExecutor(executor, {
        taskId: 5,
        role: "loader",
        executorClass: "LocalFile2Sftp",
        values: {
          sftp_url: "sftp://example",
          sftp_port: 22,
          sftp_username: "user",
          sftp_password_or_private_key_path: "/tmp/key",
          sftp_credential_type: "INVALID",
          local_path_pattern: "C:/in",
          remote_path_pattern: "/out",
          delete_local_after_copy: false,
          key_passphrase: null,
        },
      }),
    ).rejects.toThrow("Invalid sftp_credential_type");
  });

  it("saveRoleExecutor accepts boolean string aliases and empty optional strings", async () => {
    const { service, taskDefinitionRepository } = createService();

    await service.saveRoleExecutor(executor, {
      taskId: 5,
      role: "loader",
      executorClass: "LocalFile2Sftp",
      values: {
        sftp_url: "sftp://sample",
        sftp_port: "22",
        sftp_username: "user",
        sftp_password_or_private_key_path: "/tmp/key",
        sftp_credential_type: "PrivateKeyAuthentication",
        local_path_pattern: "C:/in/*.csv",
        remote_path_pattern: "/out/*.csv",
        delete_local_after_copy: "0",
        key_passphrase: "   ",
      },
    });

    expect(taskDefinitionRepository.saveRoleExecutor).toHaveBeenCalledWith(
      executor,
      expect.objectContaining({
        values: expect.objectContaining({
          delete_local_after_copy: 0,
          key_passphrase: null,
        }),
      }),
    );
  });

  it("saveRoleExecutor rejects invalid boolean inputs", async () => {
    const { service } = createService();

    await expect(
      service.saveRoleExecutor(executor, {
        taskId: 5,
        role: "loader",
        executorClass: "LocalFileCopy",
        values: {
          src_path_pattern: "C:/in",
          dest_path_pattern: "C:/out",
          overwrite_dest: "sometimes",
          delete_src_after_copy: false,
        },
      }),
    ).rejects.toThrow("Invalid overwrite_dest");
  });

  it("saveRoleExecutor rejects non-integer numbers and blank numbers", async () => {
    const { service } = createService();

    await expect(
      service.saveRoleExecutor(executor, {
        taskId: 5,
        role: "extractor",
        executorClass: "ItrentNewJoiner2CSV",
        values: {
          itrent_conn_str: "Server=db;",
          target_csv_path_pattern: "C:/out",
          days_in_the_past: "",
          with_header: "Y",
        },
      }),
    ).rejects.toThrow("Invalid days_in_the_past");

    await expect(
      service.saveRoleExecutor(executor, {
        taskId: 5,
        role: "extractor",
        executorClass: "ItrentNewJoiner2CSV",
        values: {
          itrent_conn_str: "Server=db;",
          target_csv_path_pattern: "C:/out",
          days_in_the_past: 2.5,
          with_header: "Y",
        },
      }),
    ).rejects.toThrow("Invalid days_in_the_past");
  });

  it("saveRoleExecutor rejects invalid yn values and max length overflow", async () => {
    const { service } = createService();

    await expect(
      service.saveRoleExecutor(executor, {
        taskId: 5,
        role: "extractor",
        executorClass: "ItrentNewJoiner2CSV",
        values: {
          itrent_conn_str: "Server=db;",
          target_csv_path_pattern: "C:/out",
          days_in_the_past: 2,
          with_header: "YES",
        },
      }),
    ).rejects.toThrow("Invalid with_header");
  });

  it("updateTaskMetadata rejects blank descp", async () => {
    const { service } = createService();

    await expect(
      service.updateTaskMetadata(executor, {
        taskId: 12,
        name: "Valid",
        descp: "   ",
      }),
    ).rejects.toThrow("Text value is required");
  });

  it("saveRoleExecutor supports NoOp without value normalization", async () => {
    const { service, taskDefinitionRepository } = createService();

    await service.saveRoleExecutor(executor, {
      taskId: 9,
      role: "transformer",
      executorClass: "NoOp",
      values: {
        ignored: true,
      },
    });

    expect(taskDefinitionRepository.saveRoleExecutor).toHaveBeenCalledWith(
      executor,
      expect.objectContaining({
        executorClass: "NoOp",
        values: {},
      }),
    );
  });

  it("updateTaskMetadata trims and validates name/descp before repository call", async () => {
    const { service, taskDefinitionRepository } = createService();

    await service.updateTaskMetadata(executor, {
      taskId: 12,
      name: "  Nightly Task  ",
      descp: "  Transfer from source to target  ",
    });

    expect(taskDefinitionRepository.updateTaskMetadata).toHaveBeenCalledWith(
      executor,
      {
        taskId: 12,
        name: "Nightly Task",
        descp: "Transfer from source to target",
      },
    );
  });

  it("updateTaskMetadata rejects blank name", async () => {
    const { service } = createService();

    await expect(
      service.updateTaskMetadata(executor, {
        taskId: 12,
        name: "   ",
        descp: "Valid desc",
      }),
    ).rejects.toThrow("Text value is required");
  });

  it("updateTaskMetadata rejects invalid task id and oversized fields", async () => {
    const { service } = createService();

    await expect(
      service.updateTaskMetadata(executor, {
        taskId: -1,
        name: "Valid",
        descp: "Valid",
      }),
    ).rejects.toThrow("Task id must be a positive integer.");

    await expect(
      service.updateTaskMetadata(executor, {
        taskId: 12,
        name: "x".repeat(51),
        descp: "Valid",
      }),
    ).rejects.toThrow("max length 50");

    await expect(
      service.updateTaskMetadata(executor, {
        taskId: 12,
        name: "Valid",
        descp: "x".repeat(201),
      }),
    ).rejects.toThrow("max length 200");
  });

  it("listRunnerInstances maps repository rows", async () => {
    const { service, executionTrackingRepository } = createService();
    vi.mocked(executionTrackingRepository.listRunnerInstanceRows).mockResolvedValue([
      {
        id: 2,
        runner_id: "runner-a",
        task_id: 10,
        start_time: new Date("2026-01-01T00:00:00.000Z"),
        status: "Success",
      },
    ]);

    const result = await service.listRunnerInstances(executor, { taskId: 10 });

    expect(result[0]?.runnerId).toBe("runner-a");
  });

  it("listRunnerLogs maps repository rows", async () => {
    const { service, executionTrackingRepository } = createService();
    vi.mocked(executionTrackingRepository.listRunnerLogRows).mockResolvedValue([
      {
        id: 8,
        runner_instance_id: 22,
        start_time: new Date("2026-01-01T00:00:00.000Z"),
        status: "Success",
        remarks: "done",
      },
    ]);

    const result = await service.listRunnerLogs(executor, 22);

    expect(result[0]?.runnerInstanceId).toBe(22);
    expect(result[0]?.remarks).toBe("done");
  });

  it("listRunnerInstances and listRunnerLogs return empty arrays when repository is empty", async () => {
    const { service, executionTrackingRepository } = createService();
    vi.mocked(executionTrackingRepository.listRunnerInstanceRows).mockResolvedValue([]);
    vi.mocked(executionTrackingRepository.listRunnerLogRows).mockResolvedValue([]);

    await expect(service.listRunnerInstances(executor, {})).resolves.toEqual([]);
    await expect(service.listRunnerLogs(executor, 12)).resolves.toEqual([]);
  });
});
