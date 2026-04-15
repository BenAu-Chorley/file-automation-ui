import { describe, expect, it } from "vitest";

import {
  getExecutorTableName,
  mapExecutorRowToConfig,
  mapRunnerLogRow,
  mapRunnerInstanceRow,
  mapTaskDetails,
  mapTaskRowToSummary,
} from "@/features/task-definition/service/task-definition-mappers";

describe("task-definition-mappers", () => {
  it("mapTaskRowToSummary maps required class columns and explicit name/descp", () => {
    const summary = mapTaskRowToSummary({
      id: 17,
      task_name: "Daily export",
      descp: "Nightly transfer",
      extractor_class: "LocalFileCopy",
      transformer_class: "NoOp",
      loader_class: "SftpFile2Local",
    });

    expect(summary).toEqual({
      id: 17,
      name: "Daily export",
      descp: "Nightly transfer",
      extractorClass: "LocalFileCopy",
      transformerClass: "NoOp",
      loaderClass: "SftpFile2Local",
    });
  });

  it("mapTaskDetails keeps missing executor rows as null configs", () => {
    const details = mapTaskDetails(
      {
        id: 21,
        task_name: "Task 21",
        extractor_class: "LocalFileCopy",
        transformer_class: "NoOp",
        loader_class: "NoOp",
      },
      {
        extractor: {
          task_id: 21,
          role: "extractor",
          src_path_pattern: "C:/in",
          dest_path_pattern: "C:/out",
          overwrite_dest: 1,
          delete_src_after_copy: 0,
        },
        transformer: null,
        loader: null,
      },
    );

    expect(details.assignments).toHaveLength(3);
    expect(details.assignments[0].config?.values.src_path_pattern).toBe("C:/in");
    expect(details.assignments[1].config).toBeNull();
    expect(details.assignments[2].config).toBeNull();
  });

  it("mapRunnerInstanceRow converts date values to ISO strings", () => {
    const instance = mapRunnerInstanceRow({
      id: 99,
      runner_id: "runner-a",
      task_id: 3,
      start_time: new Date("2026-04-17T01:02:03Z"),
      end_time: null,
      status: "Success",
    });

    expect(instance.id).toBe(99);
    expect(instance.taskId).toBe(3);
    expect(instance.status).toBe("Success");
    expect(instance.startTime).toBe("2026-04-17T01:02:03.000Z");
    expect(instance.endTime).toBeNull();
  });

  it("mapTaskRowToSummary applies defaults when row values are sparse", () => {
    const summary = mapTaskRowToSummary({
      task_id: "42",
      extractor_class: null,
      transformer_class: "UnknownExecutor",
      loader_class: undefined,
      runner_id: "runner-fallback-name",
    });

    expect(summary).toEqual({
      id: 42,
      name: "runner-fallback-name",
      descp: null,
      extractorClass: "NoOp",
      transformerClass: "UnknownExecutor",
      loaderClass: "NoOp",
    });
  });

  it("maps executor row values excluding task_id and role", () => {
    const config = mapExecutorRowToConfig(18, "loader", {
      task_id: 18,
      role: "loader",
      field_a: "abc",
      flag: 1,
    });

    expect(config).toEqual({
      taskId: 18,
      role: "loader",
      values: {
        field_a: "abc",
        flag: 1,
      },
    });
  });

  it("returns null config when executor row is missing", () => {
    expect(mapExecutorRowToConfig(18, "extractor", null)).toBeNull();
  });

  it("maps runner log rows with date fallbacks", () => {
    const log = mapRunnerLogRow({
      id: "55",
      runner_instance_id: "99",
      start_time: "invalid-date",
      end_time: new Date("2026-04-01T01:00:00.000Z"),
      status: "Success",
      remarks: "done",
    });

    expect(log.id).toBe(55);
    expect(log.runnerInstanceId).toBe(99);
    expect(log.startTime).toBe(new Date(0).toISOString());
    expect(log.endTime).toBe("2026-04-01T01:00:00.000Z");
    expect(log.remarks).toBe("done");
  });

  it("returns executor table names for known classes", () => {
    expect(getExecutorTableName("LocalFileCopy")).toBe("t_executor_LocalFileCopy");
    expect(getExecutorTableName("NoOp")).toBeNull();
    expect(getExecutorTableName("UnknownExecutor")).toBeNull();
  });
});
