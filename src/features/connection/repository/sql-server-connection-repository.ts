import { withSharedSqlServerConnection } from "./sql-server-client";

export async function verifySqlServerConnection(connectionString: string): Promise<void> {
  await withSharedSqlServerConnection(connectionString, async (executor) => {
    await executor.request().query("SELECT 1 AS connection_test");
  });
}
