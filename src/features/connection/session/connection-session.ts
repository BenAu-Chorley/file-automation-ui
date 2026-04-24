import { cookies } from "next/headers";

import type { ConnectionSessionSnapshot } from "../types";

const CONNECTION_COOKIE_NAME = "fa_connection_string";
const RECENT_CONNECTIONS_COOKIE_NAME = "fa_recent_connection_strings";
const MAX_RECENT_CONNECTIONS = 5;
const PERSISTED_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getConnectionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

function normalizeRecentConnectionStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizedValues = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return [...new Set(normalizedValues)].slice(0, MAX_RECENT_CONNECTIONS);
}

export async function getSessionConnectionString(): Promise<string | null> {
  const cookieStore = await cookies();
  const connectionString = cookieStore.get(CONNECTION_COOKIE_NAME)?.value?.trim();

  return connectionString ? connectionString : null;
}

export async function getRecentConnectionStrings(): Promise<string[]> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(RECENT_CONNECTIONS_COOKIE_NAME)?.value;

  if (!cookieValue) {
    return [];
  }

  try {
    return normalizeRecentConnectionStrings(JSON.parse(cookieValue));
  } catch {
    return [];
  }
}

export async function getConnectionSessionSnapshot(): Promise<ConnectionSessionSnapshot> {
  const [activeConnectionString, recentConnectionStrings] = await Promise.all([
    getSessionConnectionString(),
    getRecentConnectionStrings(),
  ]);

  return {
    activeConnectionString,
    recentConnectionStrings,
  };
}

async function setRecentConnectionStrings(connectionStrings: string[]): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(
    RECENT_CONNECTIONS_COOKIE_NAME,
    JSON.stringify(connectionStrings),
    getConnectionCookieOptions(PERSISTED_COOKIE_MAX_AGE_SECONDS),
  );
}

export async function removeRecentConnectionString(connectionString: string): Promise<string[]> {
  const normalizedConnectionString = connectionString.trim();

  if (!normalizedConnectionString) {
    return getRecentConnectionStrings();
  }

  const recentConnectionStrings = await getRecentConnectionStrings();
  const nextRecentConnectionStrings = recentConnectionStrings.filter(
    (entry) => entry !== normalizedConnectionString,
  );

  await setRecentConnectionStrings(nextRecentConnectionStrings);

  return nextRecentConnectionStrings;
}

export async function clearRecentConnectionStrings(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(RECENT_CONNECTIONS_COOKIE_NAME, "", {
    ...getConnectionCookieOptions(0),
    expires: new Date(0),
  });
}

export async function setSessionConnectionString(connectionString: string): Promise<void> {
  const cookieStore = await cookies();
  const recentConnectionStrings = await getRecentConnectionStrings();
  const nextRecentConnections = [connectionString, ...recentConnectionStrings.filter((entry) => entry !== connectionString)]
    .slice(0, MAX_RECENT_CONNECTIONS);

  cookieStore.set(
    CONNECTION_COOKIE_NAME,
    connectionString,
    getConnectionCookieOptions(PERSISTED_COOKIE_MAX_AGE_SECONDS),
  );

  await setRecentConnectionStrings(nextRecentConnections);
}

export async function clearSessionConnectionString(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(CONNECTION_COOKIE_NAME, "", {
    ...getConnectionCookieOptions(0),
    expires: new Date(0),
  });
}
