import { execFileSync } from "node:child_process";

import sql from "mssql";

import {
  getConnectionValue,
  parseConnectionDetails,
  usesIntegratedSecurity,
  type ConnectionDetail,
} from "../connection-string";

type SqlModule = typeof import("mssql");

type SqlPoolLike = {
  connect(): Promise<void>;
  close(): Promise<void>;
  request(): {
    input(name: string, value: unknown): unknown;
    query<T = unknown>(queryText: string): Promise<sql.IResult<T>>;
  };
  transaction(): SqlTransactionLike;
};

type SqlTransactionLike = {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  request(): {
    input(name: string, value: unknown): unknown;
    query<T = unknown>(queryText: string): Promise<sql.IResult<T>>;
  };
};

export type SqlRequestExecutor = {
  request(): {
    input(name: string, value: unknown): unknown;
    query<T = unknown>(queryText: string): Promise<sql.IResult<T>>;
  };
};

const WINDOWS_SQL_SERVER_DRIVER_CANDIDATES = [
  "ODBC Driver 18 for SQL Server",
  "ODBC Driver 17 for SQL Server",
  "SQL Server Native Client 11.0",
  "SQL Server",
] as const;

let cachedWindowsSqlServerDriver: string | null | undefined;
const sqlPoolByConnectionString = new Map<string, Promise<SqlPoolLike>>();

function normalizePoolKey(connectionString: string): string {
  return connectionString.trim();
}

function parseBooleanConnectionValue(value: string | null): boolean | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (["true", "yes", "1"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "no", "0"].includes(normalizedValue)) {
    return false;
  }

  return undefined;
}

function parseNumberConnectionValue(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function parseServerValue(serverValue: string): {
  server: string;
  instanceName?: string;
  port?: number;
} {
  const normalizedValue = serverValue.trim().replace(/^tcp:/i, "");
  const slashIndex = normalizedValue.indexOf("\\");
  const serverWithPort = slashIndex >= 0 ? normalizedValue.slice(0, slashIndex) : normalizedValue;
  const instanceName = slashIndex >= 0 ? normalizedValue.slice(slashIndex + 1).trim() : undefined;
  const commaIndex = serverWithPort.lastIndexOf(",");
  const portCandidate = commaIndex >= 0 ? serverWithPort.slice(commaIndex + 1).trim() : "";
  const hasNumericPort = Boolean(portCandidate) && /^\d+$/.test(portCandidate);

  return {
    server: hasNumericPort ? serverWithPort.slice(0, commaIndex).trim() : serverWithPort.trim(),
    instanceName,
    port: hasNumericPort ? Number.parseInt(portCandidate, 10) : undefined,
  };
}

function readInstalledWindowsOdbcDrivers(): string[] {
  const registryPaths = [
    "HKLM\\SOFTWARE\\ODBC\\ODBCINST.INI\\ODBC Drivers",
    "HKLM\\SOFTWARE\\WOW6432Node\\ODBC\\ODBCINST.INI\\ODBC Drivers",
  ];

  const installedDrivers = new Set<string>();

  for (const registryPath of registryPaths) {
    try {
      const output = execFileSync("reg", ["query", registryPath], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });

      for (const line of output.split(/\r?\n/)) {
        const match = line.match(/^\s+([^\s].*?)\s+REG_\w+\s+(.*)$/);

        if (!match) {
          continue;
        }

        const [, driverName, driverState] = match;

        if (driverState.trim().toLowerCase() === "installed") {
          installedDrivers.add(driverName.trim());
        }
      }
    } catch {
      continue;
    }
  }

  return [...installedDrivers];
}

function detectWindowsSqlServerDriver(): string | null {
  if (cachedWindowsSqlServerDriver !== undefined) {
    return cachedWindowsSqlServerDriver;
  }

  const installedDrivers = readInstalledWindowsOdbcDrivers();

  cachedWindowsSqlServerDriver =
    WINDOWS_SQL_SERVER_DRIVER_CANDIDATES.find((candidate) =>
      installedDrivers.includes(candidate),
    ) ?? null;

  return cachedWindowsSqlServerDriver;
}

function createIntegratedSecurityConfig(connectionDetails: ConnectionDetail[]) {
  const serverValue = getConnectionValue(connectionDetails, [
    "server",
    "data source",
    "addr",
    "address",
    "network address",
  ]);

  if (!serverValue) {
    throw new Error("Connection string must include Server or Data Source for Windows authentication.");
  }

  const { server, instanceName, port } = parseServerValue(serverValue);
  const database = getConnectionValue(connectionDetails, ["database", "initial catalog"]);
  const connectionTimeout = parseNumberConnectionValue(
    getConnectionValue(connectionDetails, ["connection timeout", "connect timeout"]),
  );
  const requestTimeout = parseNumberConnectionValue(
    getConnectionValue(connectionDetails, ["request timeout"]),
  );
  const encrypt = parseBooleanConnectionValue(getConnectionValue(connectionDetails, ["encrypt"]));
  const trustServerCertificate = parseBooleanConnectionValue(
    getConnectionValue(connectionDetails, ["trust server certificate"]),
  );
  const explicitDriver = getConnectionValue(connectionDetails, ["driver"]);
  const detectedDriver = process.platform === "win32" ? detectWindowsSqlServerDriver() : null;
  const driver = explicitDriver ?? detectedDriver;

  if (!driver) {
    throw new Error(
      "Integrated security requires a SQL Server ODBC driver. Install ODBC Driver 18 for SQL Server, or provide Driver={...} in the connection string.",
    );
  }

  return {
    driver,
    server,
    ...(database ? { database } : {}),
    ...(port ? { port } : {}),
    ...(connectionTimeout ? { connectionTimeout } : {}),
    ...(requestTimeout ? { requestTimeout } : {}),
    options: {
      trustedConnection: true,
      ...(instanceName ? { instanceName } : {}),
      ...(encrypt !== undefined ? { encrypt } : {}),
      ...(trustServerCertificate !== undefined ? { trustServerCertificate } : {}),
    },
  };
}

async function loadSqlModule(connectionString: string): Promise<SqlModule> {
  if (!usesIntegratedSecurity(connectionString)) {
    return sql;
  }

  const sqlModule = await import("mssql/msnodesqlv8");

  return ("default" in sqlModule ? sqlModule.default : sqlModule) as SqlModule;
}

export async function createSqlServerConnectionPool(connectionString: string): Promise<SqlPoolLike> {
  const connectionDetails = parseConnectionDetails(connectionString);
  const sqlModule = await loadSqlModule(connectionString);

  const pool = usesIntegratedSecurity(connectionDetails)
    ? new sqlModule.ConnectionPool(createIntegratedSecurityConfig(connectionDetails))
    : new sqlModule.ConnectionPool(connectionString);

  /**
   * Pool object can come from either mssql or mssql/msnodesqlv8 via dynamic import
   * Their static typings are not always directly assignable in one union-safe way
   * We only rely on the shared subset methods defined in SqlPoolLike, so this is a pragmatic typing bridge
   */
  return pool as unknown as SqlPoolLike;
}

async function createAndConnectPool(connectionString: string): Promise<SqlPoolLike> {
  const pool = await createSqlServerConnectionPool(connectionString);
  await pool.connect();
  return pool;
}

export async function getSharedSqlServerConnectionPool(connectionString: string): Promise<SqlPoolLike> {
  const poolKey = normalizePoolKey(connectionString);

  if (!poolKey) {
    throw new Error("Connection string is required to open a SQL Server pool.");
  }

  let poolPromise = sqlPoolByConnectionString.get(poolKey);

  if (!poolPromise) {
    poolPromise = createAndConnectPool(poolKey);
    sqlPoolByConnectionString.set(poolKey, poolPromise);
  }

  try {
    return await poolPromise;
  } catch (error) {
    sqlPoolByConnectionString.delete(poolKey);
    throw error;
  }
}

export async function closeSharedSqlServerConnectionPool(connectionString: string): Promise<void> {
  const poolKey = normalizePoolKey(connectionString);

  if (!poolKey) {
    return;
  }

  const poolPromise = sqlPoolByConnectionString.get(poolKey);

  if (!poolPromise) {
    return;
  }

  sqlPoolByConnectionString.delete(poolKey);

  try {
    const pool = await poolPromise;
    await pool.close();
  } catch {
    return;
  }
}

export async function closeAllSharedSqlServerConnectionPools(): Promise<void> {
  const poolKeys = [...sqlPoolByConnectionString.keys()];

  await Promise.all(poolKeys.map((poolKey) => closeSharedSqlServerConnectionPool(poolKey)));
}

export async function withSharedSqlServerConnection<T>(
  connectionString: string,
  callback: (executor: SqlRequestExecutor) => Promise<T>,
): Promise<T> {
  const pool = await getSharedSqlServerConnectionPool(connectionString);

  return callback(pool);
}

export async function withSqlServerTransaction<T>(
  connectionString: string,
  callback: (executor: SqlRequestExecutor) => Promise<T>,
): Promise<T> {
  const pool = await getSharedSqlServerConnectionPool(connectionString);
  const transaction = pool.transaction();

  try {
    await transaction.begin();
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback().catch(() => undefined);
    throw error;
  }
}
