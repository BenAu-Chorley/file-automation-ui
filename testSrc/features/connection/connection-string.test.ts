import { describe, expect, it } from "vitest";

import {
  getConnectionValue,
  normalizeConnectionString,
  parseConnectionDetails,
  summarizeConnectionString,
  usesIntegratedSecurity,
} from "@/features/connection/connection-string";

describe("connection-string", () => {
  it("normalizes connection string by trimming", () => {
    expect(normalizeConnectionString("  Server=db;Database=fa;  ")).toBe("Server=db;Database=fa;");
  });

  it("parses details with braces, quotes, and semicolons in values", () => {
    const details = parseConnectionDetails(
      "Server=tcp:db,1433;Password={abc;123};User Id='sa';Database=\"fa\";",
    );

    expect(details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "Server", value: "tcp:db,1433", isSensitive: false }),
        expect.objectContaining({ key: "Password", value: "abc;123", isSensitive: true }),
        expect.objectContaining({ key: "User Id", value: "sa", isSensitive: false }),
        expect.objectContaining({ key: "Database", value: "fa", isSensitive: false }),
      ]),
    );
  });

  it("masks sensitive values and shows empty placeholders", () => {
    const details = parseConnectionDetails("Password=secret123;Token=;Server=localhost;");
    const password = details.find((entry) => entry.normalizedKey === "password");
    const token = details.find((entry) => entry.normalizedKey === "token");

    expect(password?.displayValue).toMatch(/^\*{8,16}$/);
    expect(token?.displayValue).toBe("(empty)");
  });

  it("ignores malformed segments without key-value separator", () => {
    const details = parseConnectionDetails("Server=localhost;broken-part;Database=fa;");

    expect(details.map((entry) => entry.key)).toEqual(["Server", "Database"]);
  });

  it("returns null for missing candidate keys or blank values", () => {
    const details = parseConnectionDetails("Server=localhost;Database=;User Id=sa;");

    expect(getConnectionValue(details, ["database", "initial catalog"])).toBeNull();
    expect(getConnectionValue(details, ["uid", "user id"])).toBe("sa");
  });

  it("detects integrated security from string and detail inputs", () => {
    expect(usesIntegratedSecurity("Trusted_Connection=Yes;Server=db;")).toBe(true);
    expect(usesIntegratedSecurity("Integrated Security=0;Server=db;")).toBe(false);

    const details = parseConnectionDetails("Integrated Security=SSPI;Server=db;");
    expect(usesIntegratedSecurity(details)).toBe(true);
  });

  it("summarizes with windows auth when integrated security is enabled", () => {
    expect(
      summarizeConnectionString("Data Source=db1;Initial Catalog=fa;Integrated Security=true;"),
    ).toBe("db1 / fa / Windows auth");
  });

  it("summarizes with sql auth label when user is present", () => {
    expect(summarizeConnectionString("Server=db2;Database=fa;UID=etl_user;PWD=secret;")).toBe(
      "db2 / fa / SQL auth",
    );
  });

  it("falls back to length-based summary when server/database/auth cannot be derived", () => {
    expect(summarizeConnectionString("Application Name=my-app;")).toBe(
      "Saved connection string (24 chars)",
    );
  });

  it("returns empty list for blank normalized connection string", () => {
    expect(parseConnectionDetails("   ")).toEqual([]);
  });
});
