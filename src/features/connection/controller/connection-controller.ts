import {
  parseConnectionDetails,
  summarizeConnectionString,
  usesIntegratedSecurity,
} from "../connection-string";
import { verifySqlServerConnection } from "../repository/sql-server-connection-repository";
import {
  sanitizeConnectionError,
  validateConnectionString,
} from "../service/connection-service";
import type { ConnectionActionResult } from "../types";

export async function testConnectionController(connectionString: string): Promise<ConnectionActionResult> {
  try {
    const normalizedConnectionString = validateConnectionString(connectionString);
    const connectionDetails = parseConnectionDetails(normalizedConnectionString);

    await verifySqlServerConnection(normalizedConnectionString);

    return {
      ok: true,
      message: "Connection test succeeded.",
      connectionSummary: summarizeConnectionString(normalizedConnectionString),
      normalizedConnectionString,
      connectionDetails,
      usesIntegratedSecurity: usesIntegratedSecurity(connectionDetails),
    };
  } catch (error) {
    return {
      ok: false,
      message: sanitizeConnectionError(error, connectionString.trim()),
      connectionSummary: null,
      normalizedConnectionString: null,
      connectionDetails: [],
      usesIntegratedSecurity: false,
    };
  }
}

export function activateConnectionController(connectionString: string): ConnectionActionResult {
  try {
    const normalizedConnectionString = validateConnectionString(connectionString);
    const connectionDetails = parseConnectionDetails(normalizedConnectionString);

    return {
      ok: true,
      message: "Connection string saved for this session.",
      connectionSummary: summarizeConnectionString(normalizedConnectionString),
      normalizedConnectionString,
      connectionDetails,
      usesIntegratedSecurity: usesIntegratedSecurity(connectionDetails),
    };
  } catch (error) {
    return {
      ok: false,
      message: sanitizeConnectionError(error, connectionString.trim()),
      connectionSummary: null,
      normalizedConnectionString: null,
      connectionDetails: [],
      usesIntegratedSecurity: false,
    };
  }
}
