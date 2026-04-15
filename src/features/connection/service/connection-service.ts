import {
  normalizeConnectionString,
} from "../connection-string";

export function validateConnectionString(connectionString: string): string {
  const normalizedConnectionString = normalizeConnectionString(connectionString);

  if (!normalizedConnectionString) {
    throw new Error("Connection string is required.");
  }

  if (normalizedConnectionString.length > 4000) {
    throw new Error("Connection string is too long.");
  }

  return normalizedConnectionString;
}

export function sanitizeConnectionError(error: unknown, connectionString: string): string {
  if (!(error instanceof Error) || !error.message.trim()) {
    return "Connection test failed. Check the connection details and try again.";
  }

  if (!connectionString) {
    return error.message;
  }

  return error.message.split(connectionString).join("[connection string]");
}
