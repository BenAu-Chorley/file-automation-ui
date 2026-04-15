import { beforeEach, describe, expect, it, vi } from "vitest";

const { withSharedSqlServerConnectionMock } = vi.hoisted(() => ({
  withSharedSqlServerConnectionMock: vi.fn(),
}));

vi.mock("@/features/connection/repository/sql-server-client", () => ({
  withSharedSqlServerConnection: withSharedSqlServerConnectionMock,
}));

import { verifySqlServerConnection } from "@/features/connection/repository/sql-server-connection-repository";

describe("sql-server-connection-repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifySqlServerConnection runs SELECT 1 through shared connection", async () => {
    const queryMock = vi.fn().mockResolvedValue({ recordset: [] });

    withSharedSqlServerConnectionMock.mockImplementation(async (_connectionString, callback) =>
      callback({
        request: () => ({
          input: vi.fn(),
          query: queryMock,
        }),
      }),
    );

    await verifySqlServerConnection("Server=localhost;Database=fa;");

    expect(withSharedSqlServerConnectionMock).toHaveBeenCalledOnce();
    expect(queryMock).toHaveBeenCalledWith("SELECT 1 AS connection_test");
  });
});
