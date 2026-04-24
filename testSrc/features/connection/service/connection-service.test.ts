import { describe, expect, it } from "vitest";

import {
  sanitizeConnectionError,
  validateConnectionString,
} from "@/features/connection/service/connection-service";

describe("connection-service", () => {
  it("validateConnectionString trims valid input", () => {
    expect(validateConnectionString("  Server=localhost;Database=fa;  ")).toBe("Server=localhost;Database=fa;");
  });

  it("validateConnectionString rejects empty input", () => {
    expect(() => validateConnectionString("   ")).toThrow("Connection string is required.");
  });

  it("validateConnectionString rejects overly long input", () => {
    const oversized = "a".repeat(4001);

    expect(() => validateConnectionString(oversized)).toThrow("Connection string is too long.");
  });

  it("sanitizeConnectionError masks the provided connection string", () => {
    const connectionString = "Server=db;Database=fa;";
    const error = new Error(`Failed to connect using ${connectionString}`);

    expect(sanitizeConnectionError(error, connectionString)).toContain("[connection string]");
  });

  it("sanitizeConnectionError falls back to generic message for unknown errors", () => {
    expect(sanitizeConnectionError({ reason: "unknown" }, "Server=db;")).toBe(
      "Connection test failed. Check the connection details and try again.",
    );
  });
});
