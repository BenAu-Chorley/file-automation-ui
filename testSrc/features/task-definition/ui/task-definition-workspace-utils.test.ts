import { describe, expect, it } from "vitest";

import {
  buildCancelConfirmationText,
  buildFieldValueRecord,
  buildSaveConfirmationText,
  formatDateDisplay,
  formatDateTimeDisplay,
  formatTimestamp,
  initializeRoleDraft,
  isRoleDirty,
  normalizeExecutorClass,
  toDateInputValue,
  toDefaultFieldValue,
  toRoleLabel,
  statusTone,
  validateRoleDraft,
} from "@/features/task-definition/ui/task-definition-workspace-utils";
import type { TaskDefinitionDetails } from "@/features/task-definition/types";

function createTaskDetails(): TaskDefinitionDetails {
  return {
    id: 9,
    name: "Onboarding import",
    descp: "Imports onboarding payloads",
    extractorClass: "ItrentNewJoiner2CSV",
    transformerClass: "NoOp",
    loaderClass: "NoOp",
    assignments: [
      {
        role: "extractor",
        executorClass: "ItrentNewJoiner2CSV",
        config: {
          taskId: 9,
          role: "extractor",
          values: {
            itrent_conn_str: "Server=db;",
            target_csv_path_pattern: "C:/exports/*.csv",
            days_in_the_past: 2,
            with_header: "Y",
          },
        },
      },
      { role: "transformer", executorClass: "NoOp", config: null },
      { role: "loader", executorClass: "NoOp", config: null },
    ],
  };
}

describe("task-definition-workspace-utils", () => {
  it("initializes role drafts from task details config", () => {
    const roleDraft = initializeRoleDraft(createTaskDetails(), "extractor");

    expect(roleDraft.loadedExecutorClass).toBe("ItrentNewJoiner2CSV");
    expect(roleDraft.draftsByExecutor.ItrentNewJoiner2CSV?.itrent_conn_str).toBe("Server=db;");
    expect(roleDraft.draftsByExecutor.ItrentNewJoiner2CSV?.days_in_the_past).toBe("2");
  });

  it("builds default field records for upsertable executors", () => {
    const values = buildFieldValueRecord("LocalFileCopy", null);

    expect(values).toEqual({
      src_path_pattern: "",
      dest_path_pattern: "",
      overwrite_dest: false,
      delete_src_after_copy: false,
    });
  });

  it("validates required non-boolean fields and builds confirmation messages", () => {
    const roleDraft = initializeRoleDraft(createTaskDetails(), "extractor");
    roleDraft.draftsByExecutor.ItrentNewJoiner2CSV = {
      ...roleDraft.draftsByExecutor.ItrentNewJoiner2CSV,
      itrent_conn_str: "",
    };

    expect(validateRoleDraft(roleDraft)).toBe("Required fields missing: itrent_conn_str");
    expect(buildSaveConfirmationText(9, "extractor", roleDraft)).toBe("Save Extractor ItrentNewJoiner2CSV field changes for task #9?");
    expect(buildCancelConfirmationText(9, "extractor", roleDraft)).toBe("Discard unsaved Extractor field changes for task #9?");
  });

  it("maps status values to semantic tones", () => {
    expect(statusTone(null)).toBe("neutral");
    expect(statusTone("Success")).toBe("success");
    expect(statusTone("Warning")).toBe("warning");
    expect(statusTone("Failed with error")).toBe("error");
  });

  it("formats timestamps and date-only displays", () => {
    const source = new Date("2026-04-22T05:06:00.000Z");

    expect(formatTimestamp(source)).toMatch(/^2026-04-22\s\d{2}:\d{2}$/);
    expect(formatDateTimeDisplay("2026-04-22T05:06:00.000Z")).toMatch(/^2026-04-22\s\d{2}:\d{2}$/);
    expect(formatDateDisplay("2026-04-22T05:06:00.000Z")).toBe("2026-04-22");
  });

  it("returns fallback values for invalid or empty date displays", () => {
    expect(formatDateTimeDisplay(null)).toBe("-");
    expect(formatDateDisplay("")).toBe("-");
    expect(formatDateTimeDisplay("not-a-date")).toBe("not-a-date");
    expect(formatDateDisplay("not-a-date")).toBe("not-a-date");
  });

  it("maps date to date-input format", () => {
    expect(toDateInputValue(new Date("2026-04-02T00:00:00.000Z"))).toBe("2026-04-02");
  });

  it("normalizes unknown executor classes to NoOp", () => {
    expect(normalizeExecutorClass("LocalFileCopy")).toBe("LocalFileCopy");
    expect(normalizeExecutorClass("UnknownExecutor")).toBe("NoOp");
  });

  it("returns expected role labels", () => {
    expect(toRoleLabel("extractor")).toBe("Extractor");
    expect(toRoleLabel("transformer")).toBe("Transformer");
    expect(toRoleLabel("loader")).toBe("Loader");
  });

  it("computes default field values by type", () => {
    expect(toDefaultFieldValue({ key: "flag", type: "boolean", required: false })).toBe(false);
    expect(toDefaultFieldValue({ key: "kind", type: "string", required: false, defaultValue: "abc" })).toBe("abc");
    expect(toDefaultFieldValue({ key: "empty", type: "string", required: false })).toBe("");
  });

  it("detects dirty role when executor class changes", () => {
    const roleDraft = initializeRoleDraft(createTaskDetails(), "extractor");
    roleDraft.selectedExecutorClass = "NoOp";

    expect(isRoleDirty(roleDraft)).toBe(true);
  });

  it("detects clean NoOp role and dirty field-level changes", () => {
    const noopDraft = initializeRoleDraft(createTaskDetails(), "transformer");
    expect(isRoleDirty(noopDraft)).toBe(false);

    const extractorDraft = initializeRoleDraft(createTaskDetails(), "extractor");
    extractorDraft.draftsByExecutor.ItrentNewJoiner2CSV = {
      ...extractorDraft.draftsByExecutor.ItrentNewJoiner2CSV,
      with_header: "N",
    };

    expect(isRoleDirty(extractorDraft)).toBe(true);
  });

  it("builds save confirmation text for executor switch scenarios", () => {
    const fromNoop = initializeRoleDraft(createTaskDetails(), "transformer");
    fromNoop.selectedExecutorClass = "LocalFileCopy";
    fromNoop.draftsByExecutor.LocalFileCopy = buildFieldValueRecord("LocalFileCopy", null);

    expect(buildSaveConfirmationText(9, "transformer", fromNoop)).toContain("changes executor from NoOp to LocalFileCopy");

    const toNoop = initializeRoleDraft(createTaskDetails(), "extractor");
    toNoop.selectedExecutorClass = "NoOp";
    expect(buildSaveConfirmationText(9, "extractor", toNoop)).toContain("changes executor from ItrentNewJoiner2CSV to NoOp");

    const betweenExecutors = initializeRoleDraft(createTaskDetails(), "extractor");
    betweenExecutors.selectedExecutorClass = "LocalFileCopy";
    betweenExecutors.draftsByExecutor.LocalFileCopy = buildFieldValueRecord("LocalFileCopy", null);
    expect(buildSaveConfirmationText(9, "extractor", betweenExecutors)).toContain("changes executor from ItrentNewJoiner2CSV to LocalFileCopy");
  });

  it("builds cancel confirmation text for executor switch", () => {
    const roleDraft = initializeRoleDraft(createTaskDetails(), "extractor");
    roleDraft.selectedExecutorClass = "NoOp";

    expect(buildCancelConfirmationText(9, "extractor", roleDraft)).toContain(
      "revert executor from NoOp back to ItrentNewJoiner2CSV",
    );
  });

  it("buildFieldValueRecord normalizes boolean and yn fallbacks", () => {
    const values = buildFieldValueRecord("ItrentNewJoiner2CSV", {
      taskId: 9,
      role: "extractor",
      values: {
        itrent_conn_str: "Server=db;",
        target_csv_path_pattern: "C:/exports/*.csv",
        days_in_the_past: 3,
        with_header: "invalid",
      },
    });

    expect(values.days_in_the_past).toBe("3");
    expect(values.with_header).toBe("");

    const boolValues = buildFieldValueRecord("LocalFileCopy", {
      taskId: 9,
      role: "extractor",
      values: {
        src_path_pattern: "C:/in",
        dest_path_pattern: "C:/out",
        overwrite_dest: 2,
        delete_src_after_copy: "unknown",
      },
    });

    expect(boolValues.overwrite_dest).toBe(false);
    expect(boolValues.delete_src_after_copy).toBe(false);
  });
});