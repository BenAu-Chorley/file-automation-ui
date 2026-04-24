import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  connectionPoolCtorMock,
  execFileSyncMock,
  parseConnectionDetailsMock,
  usesIntegratedSecurityMock,
  getConnectionValueMock,
} = vi.hoisted(() => ({
  connectionPoolCtorMock: vi.fn(),
  execFileSyncMock: vi.fn(),
  parseConnectionDetailsMock: vi.fn(),
  usesIntegratedSecurityMock: vi.fn(),
  getConnectionValueMock: vi.fn(),
}));

type FakeTransaction = {
  begin: ReturnType<typeof vi.fn>;
  commit: ReturnType<typeof vi.fn>;
  rollback: ReturnType<typeof vi.fn>;
  request: ReturnType<typeof vi.fn>;
};

type FakePool = {
  connect: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  request: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
  _transaction: FakeTransaction;
};

const createdPools: FakePool[] = [];

const normalizedKey = (value: string) => value.trim().toLowerCase().replace(/[\s_]+/g, " ");

function createConnectionDetails(values: Record<string, string>) {
  return Object.entries(values).map(([key, value]) => ({
    key,
    normalizedKey: normalizedKey(key),
    value,
    displayValue: value,
    isSensitive: false,
  }));
}

function createFakePool(): FakePool {
  const transaction: FakeTransaction = {
    begin: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    request: vi.fn(() => ({
      input: vi.fn(),
      query: vi.fn().mockResolvedValue({ recordset: [] }),
    })),
  };

  return {
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    request: vi.fn(() => ({
      input: vi.fn(),
      query: vi.fn().mockResolvedValue({ recordset: [] }),
    })),
    transaction: vi.fn(() => transaction),
    _transaction: transaction,
  };
}

vi.mock("mssql", () => ({
  default: {
    ConnectionPool: function ConnectionPool(this: unknown, config: unknown) {
      return connectionPoolCtorMock(config);
    },
  },
}));

vi.mock("mssql/msnodesqlv8", () => ({
  default: {
    ConnectionPool: function ConnectionPool(this: unknown, config: unknown) {
      return connectionPoolCtorMock(config);
    },
  },
}));

vi.mock("node:child_process", () => ({
  execFileSync: execFileSyncMock,
}));

vi.mock("@/features/connection/connection-string", () => ({
  parseConnectionDetails: parseConnectionDetailsMock,
  usesIntegratedSecurity: usesIntegratedSecurityMock,
  getConnectionValue: getConnectionValueMock,
}));

import {
  createSqlServerConnectionPool,
  closeAllSharedSqlServerConnectionPools,
  closeSharedSqlServerConnectionPool,
  getSharedSqlServerConnectionPool,
  withSharedSqlServerConnection,
  withSqlServerTransaction,
} from "@/features/connection/repository/sql-server-client";

describe("sql-server-client", () => {
  beforeEach(async () => {
    await closeAllSharedSqlServerConnectionPools();
    vi.clearAllMocks();
    createdPools.length = 0;

    parseConnectionDetailsMock.mockReturnValue([]);
    usesIntegratedSecurityMock.mockImplementation((input) =>
      Array.isArray(input)
        ? input.some(
            (detail) =>
              detail.normalizedKey === "integrated security" &&
              ["true", "yes", "1", "sspi"].includes(String(detail.value).trim().toLowerCase()),
          )
        : false,
    );
    getConnectionValueMock.mockImplementation((connectionDetails, candidateKeys) => {
      const normalizedCandidates = candidateKeys.map((candidate: string) => normalizedKey(candidate));

      for (const detail of connectionDetails) {
        if (detail.value && normalizedCandidates.includes(detail.normalizedKey)) {
          return detail.value;
        }
      }

      return null;
    });
    execFileSyncMock.mockReturnValue("");

    connectionPoolCtorMock.mockImplementation(() => {
      const pool = createFakePool();
      createdPools.push(pool);
      return pool;
    });
  });

  it("reuses a shared pool for equivalent trimmed keys", async () => {
    const first = await getSharedSqlServerConnectionPool("  Server=db;Database=fa;  ");
    const second = await getSharedSqlServerConnectionPool("Server=db;Database=fa;");

    expect(first).toBe(second);
    expect(connectionPoolCtorMock).toHaveBeenCalledTimes(1);
    expect(createdPools[0]?.connect).toHaveBeenCalledTimes(1);
  });

  it("closes and clears one shared pool", async () => {
    await getSharedSqlServerConnectionPool("Server=db;Database=fa;");
    const pool = createdPools[0];

    await closeSharedSqlServerConnectionPool("Server=db;Database=fa;");

    expect(pool.close).toHaveBeenCalledTimes(1);

    await getSharedSqlServerConnectionPool("Server=db;Database=fa;");
    expect(connectionPoolCtorMock).toHaveBeenCalledTimes(2);
  });

  it("withSharedSqlServerConnection forwards the pool as executor", async () => {
    const callback = vi.fn(async () => "ok");

    const result = await withSharedSqlServerConnection("Server=db;Database=fa;", callback);

    expect(result).toBe("ok");
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("withSqlServerTransaction commits on success", async () => {
    const result = await withSqlServerTransaction("Server=db;Database=fa;", async () => "done");
    const pool = createdPools[0];

    expect(result).toBe("done");
    expect(pool._transaction.begin).toHaveBeenCalledTimes(1);
    expect(pool._transaction.commit).toHaveBeenCalledTimes(1);
    expect(pool._transaction.rollback).not.toHaveBeenCalled();
  });

  it("withSqlServerTransaction rolls back on failure", async () => {
    await expect(
      withSqlServerTransaction("Server=db;Database=fa;", async () => {
        throw new Error("write failed");
      }),
    ).rejects.toThrow("write failed");

    const pool = createdPools[0];

    expect(pool._transaction.begin).toHaveBeenCalledTimes(1);
    expect(pool._transaction.rollback).toHaveBeenCalledTimes(1);
    expect(pool._transaction.commit).not.toHaveBeenCalled();
  });

  it("createSqlServerConnectionPool uses plain connection string when not integrated", async () => {
    parseConnectionDetailsMock.mockReturnValue(createConnectionDetails({ Server: "localhost" }));

    const pool = await createSqlServerConnectionPool("Server=localhost;Database=fa;");

    expect(pool).toBeDefined();
    expect(connectionPoolCtorMock).toHaveBeenCalledWith("Server=localhost;Database=fa;");
  });

  it("createSqlServerConnectionPool builds integrated security config with explicit driver", async () => {
    parseConnectionDetailsMock.mockReturnValue(
      createConnectionDetails({
        Server: "tcp:sql-host\\SQLEXPRESS,1433",
        Database: "fa",
        "Integrated Security": "SSPI",
        Encrypt: "yes",
        "Trust Server Certificate": "0",
        "Connection Timeout": "15",
        "Request Timeout": "30",
        Driver: "ODBC Driver 18 for SQL Server",
      }),
    );
    usesIntegratedSecurityMock.mockImplementation(() => true);

    await createSqlServerConnectionPool("Server=tcp:sql-host\\SQLEXPRESS,1433;Integrated Security=SSPI;");

    expect(connectionPoolCtorMock).toHaveBeenCalledWith({
      driver: "ODBC Driver 18 for SQL Server",
      server: "sql-host",
      database: "fa",
      connectionTimeout: 15,
      requestTimeout: 30,
      options: {
        trustedConnection: true,
        instanceName: "SQLEXPRESS,1433",
        encrypt: true,
        trustServerCertificate: false,
      },
    });
  });

  it("createSqlServerConnectionPool throws when integrated security has no server", async () => {
    parseConnectionDetailsMock.mockReturnValue(
      createConnectionDetails({
        "Integrated Security": "true",
        Driver: "ODBC Driver 18 for SQL Server",
      }),
    );
    usesIntegratedSecurityMock.mockImplementation(() => true);

    await expect(
      createSqlServerConnectionPool("Integrated Security=true;Driver=ODBC Driver 18 for SQL Server;"),
    ).rejects.toThrow("Connection string must include Server or Data Source for Windows authentication.");
  });

  it("createSqlServerConnectionPool throws when integrated security has no driver", async () => {
    parseConnectionDetailsMock.mockReturnValue(
      createConnectionDetails({
        Server: "sql-host",
        "Integrated Security": "true",
      }),
    );
    usesIntegratedSecurityMock.mockImplementation(() => true);

    await expect(
      createSqlServerConnectionPool("Server=sql-host;Integrated Security=true;"),
    ).rejects.toThrow(
      "Integrated security requires a SQL Server ODBC driver. Install ODBC Driver 18 for SQL Server, or provide Driver={...} in the connection string.",
    );
  });

  it("retries pool creation after a failed initial connect", async () => {
    const firstPool = createFakePool();
    firstPool.connect.mockRejectedValueOnce(new Error("connect failed"));
    const secondPool = createFakePool();

    connectionPoolCtorMock
      .mockImplementationOnce(() => firstPool)
      .mockImplementationOnce(() => secondPool);

    await expect(getSharedSqlServerConnectionPool("Server=db;Database=fa;")).rejects.toThrow("connect failed");

    const recoveredPool = await getSharedSqlServerConnectionPool("Server=db;Database=fa;");

    expect(recoveredPool).toBe(secondPool);
    expect(connectionPoolCtorMock).toHaveBeenCalledTimes(2);
  });

  it("throws for empty shared pool connection string", async () => {
    await expect(getSharedSqlServerConnectionPool("   ")).rejects.toThrow(
      "Connection string is required to open a SQL Server pool.",
    );
  });

  it("closeSharedSqlServerConnectionPool ignores empty and unknown keys", async () => {
    await closeSharedSqlServerConnectionPool(" ");
    await closeSharedSqlServerConnectionPool("Server=missing;Database=fa;");

    expect(connectionPoolCtorMock).toHaveBeenCalledTimes(0);
  });

  it("closeSharedSqlServerConnectionPool swallows close errors", async () => {
    await getSharedSqlServerConnectionPool("Server=db;Database=fa;");
    const pool = createdPools[0];
    pool.close.mockRejectedValueOnce(new Error("close failed"));

    await expect(closeSharedSqlServerConnectionPool("Server=db;Database=fa;")).resolves.toBeUndefined();
  });

  it("withSqlServerTransaction still throws callback error if rollback fails", async () => {
    await getSharedSqlServerConnectionPool("Server=db;Database=fa;");
    const pool = createdPools[0];
    pool._transaction.rollback.mockRejectedValueOnce(new Error("rollback failed"));

    await expect(
      withSqlServerTransaction("Server=db;Database=fa;", async () => {
        throw new Error("write failed");
      }),
    ).rejects.toThrow("write failed");

    expect(pool._transaction.begin).toHaveBeenCalledTimes(1);
    expect(pool._transaction.commit).not.toHaveBeenCalled();
    expect(pool._transaction.rollback).toHaveBeenCalledTimes(1);
  });

  it("createSqlServerConnectionPool handles integrated config with minimal optional values", async () => {
    parseConnectionDetailsMock.mockReturnValue(
      createConnectionDetails({
        Server: " sql-host ",
        "Integrated Security": "true",
        Driver: "ODBC Driver 18 for SQL Server",
        Encrypt: "maybe",
        "Trust Server Certificate": "",
        "Connection Timeout": "abc",
      }),
    );
    usesIntegratedSecurityMock.mockImplementation(() => true);

    await createSqlServerConnectionPool("Server=sql-host;Integrated Security=true;");

    expect(connectionPoolCtorMock).toHaveBeenCalledWith({
      driver: "ODBC Driver 18 for SQL Server",
      server: "sql-host",
      options: {
        trustedConnection: true,
      },
    });
  });

  it("createSqlServerConnectionPool keeps instance name without numeric port", async () => {
    parseConnectionDetailsMock.mockReturnValue(
      createConnectionDetails({
        Server: "tcp:sql-host\\DEVINST",
        "Integrated Security": "true",
        Driver: "ODBC Driver 18 for SQL Server",
        Encrypt: "no",
        "Trust Server Certificate": "1",
      }),
    );
    usesIntegratedSecurityMock.mockImplementation(() => true);

    await createSqlServerConnectionPool("Server=tcp:sql-host\\DEVINST;Integrated Security=true;");

    expect(connectionPoolCtorMock).toHaveBeenCalledWith({
      driver: "ODBC Driver 18 for SQL Server",
      server: "sql-host",
      options: {
        trustedConnection: true,
        instanceName: "DEVINST",
        encrypt: false,
        trustServerCertificate: true,
      },
    });
  });
});
