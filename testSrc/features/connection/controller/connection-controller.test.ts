import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifySqlServerConnectionMock } = vi.hoisted(() => ({
  verifySqlServerConnectionMock: vi.fn(),
}));

vi.mock("@/features/connection/repository/sql-server-connection-repository", () => ({
  verifySqlServerConnection: verifySqlServerConnectionMock,
}));

import {
  activateConnectionController,
  testConnectionController,
} from "@/features/connection/controller/connection-controller";

describe("connection-controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("testConnectionController returns success payload", async () => {
    verifySqlServerConnectionMock.mockResolvedValue(undefined);

    const result = await testConnectionController("Server=localhost;Database=fa;Trusted_Connection=true;");

    expect(result.ok).toBe(true);
    expect(result.message).toBe("Connection test succeeded.");
    expect(result.normalizedConnectionString).toBe("Server=localhost;Database=fa;Trusted_Connection=true;");
    expect(result.connectionSummary).toContain("localhost");
    expect(result.usesIntegratedSecurity).toBe(true);
  });

  it("testConnectionController sanitizes failure messages", async () => {
    const connectionString = "Server=localhost;Database=fa;";
    verifySqlServerConnectionMock.mockRejectedValue(
      new Error(`Could not connect with ${connectionString}`),
    );

    const result = await testConnectionController(connectionString);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("[connection string]");
    expect(result.connectionSummary).toBeNull();
    expect(result.normalizedConnectionString).toBeNull();
  });

  it("activateConnectionController returns normalized details", () => {
    const result = activateConnectionController("  Server=localhost;Database=fa;  ");

    expect(result.ok).toBe(true);
    expect(result.normalizedConnectionString).toBe("Server=localhost;Database=fa;");
    expect(result.connectionDetails.length).toBeGreaterThan(0);
  });

  it("activateConnectionController returns validation failures", () => {
    const result = activateConnectionController("   ");

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Connection string is required.");
  });
});
