"use server";

import { revalidatePath } from "next/cache";

import { closeSharedSqlServerConnectionPool } from "./repository/sql-server-client";
import {
  activateConnectionController,
  testConnectionController,
} from "./controller/connection-controller";
import {
  clearRecentConnectionStrings,
  clearSessionConnectionString,
  getSessionConnectionString,
  removeRecentConnectionString,
  setSessionConnectionString,
} from "./session/connection-session";
import type { ConnectionActionResult } from "./types";

export async function testConnectionAction(connectionString: string): Promise<ConnectionActionResult> {
  return testConnectionController(connectionString);
}

export async function activateConnectionAction(connectionString: string): Promise<ConnectionActionResult> {
  const previousConnectionString = await getSessionConnectionString();
  const result = activateConnectionController(connectionString);

  if (!result.ok || !result.normalizedConnectionString) {
    return result;
  }

  await setSessionConnectionString(result.normalizedConnectionString);

  if (
    previousConnectionString
    && previousConnectionString !== result.normalizedConnectionString
  ) {
    await closeSharedSqlServerConnectionPool(previousConnectionString);
  }

  revalidatePath("/");

  return result;
}

export async function clearConnectionAction(): Promise<ConnectionActionResult> {
  const previousConnectionString = await getSessionConnectionString();

  await clearSessionConnectionString();

  if (previousConnectionString) {
    await closeSharedSqlServerConnectionPool(previousConnectionString);
  }

  revalidatePath("/");

  return {
    ok: true,
    message: "Connection string cleared for this session.",
    connectionSummary: null,
    normalizedConnectionString: null,
    connectionDetails: [],
    usesIntegratedSecurity: false,
  };
}

export async function removeRecentConnectionAction(connectionString: string): Promise<{
  ok: boolean;
  message: string;
  recentConnectionStrings: string[];
}> {
  const recentConnectionStrings = await removeRecentConnectionString(connectionString);
  revalidatePath("/");

  return {
    ok: true,
    message: "Recent connection removed.",
    recentConnectionStrings,
  };
}

export async function clearRecentConnectionsAction(): Promise<{
  ok: boolean;
  message: string;
  recentConnectionStrings: string[];
}> {
  await clearRecentConnectionStrings();
  revalidatePath("/");

  return {
    ok: true,
    message: "Recent connection history cleared.",
    recentConnectionStrings: [],
  };
}
