export type ConnectionDetail = {
  key: string;
  normalizedKey: string;
  value: string;
  displayValue: string;
  isSensitive: boolean;
};

const SENSITIVE_CONNECTION_KEYS = new Set([
  "password",
  "pwd",
  "key passphrase",
  "secret",
  "token",
  "access token",
]);

const TRUE_CONNECTION_VALUES = new Set(["true", "yes", "sspi", "1"]);

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s_]+/g, " ");
}

function unwrapValue(value: string): string {
  const trimmedValue = value.trim();

  if (
    (trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) ||
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1).trim();
  }

  return trimmedValue;
}

function maskValue(value: string): string {
  if (!value) {
    return "(empty)";
  }

  return "*".repeat(Math.max(8, Math.min(16, value.length)));
}

function splitConnectionString(connectionString: string): string[] {
  const parts: string[] = [];
  let currentPart = "";
  let braceDepth = 0;
  let quoteCharacter: "'" | '"' | null = null;

  for (const character of connectionString) {
    if (quoteCharacter) {
      currentPart += character;

      if (character === quoteCharacter) {
        quoteCharacter = null;
      }

      continue;
    }

    if (character === "'" || character === '"') {
      quoteCharacter = character;
      currentPart += character;
      continue;
    }

    if (character === "{") {
      braceDepth += 1;
      currentPart += character;
      continue;
    }

    if (character === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      currentPart += character;
      continue;
    }

    if (character === ";" && braceDepth === 0) {
      if (currentPart.trim()) {
        parts.push(currentPart.trim());
      }

      currentPart = "";
      continue;
    }

    currentPart += character;
  }

  if (currentPart.trim()) {
    parts.push(currentPart.trim());
  }

  return parts;
}

export function normalizeConnectionString(connectionString: string): string {
  return connectionString.trim();
}

export function parseConnectionDetails(connectionString: string): ConnectionDetail[] {
  const normalizedConnectionString = normalizeConnectionString(connectionString);

  if (!normalizedConnectionString) {
    return [];
  }

  return splitConnectionString(normalizedConnectionString)
    .map((part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex < 0) {
        return null;
      }

      const key = part.slice(0, separatorIndex).trim();
      const normalizedKey = normalizeKey(key);
      const value = unwrapValue(part.slice(separatorIndex + 1));
      const isSensitive = SENSITIVE_CONNECTION_KEYS.has(normalizedKey);

      return {
        key,
        normalizedKey,
        value,
        displayValue: isSensitive ? maskValue(value) : value || "(empty)",
        isSensitive,
      } satisfies ConnectionDetail;
    })
    .filter((detail): detail is ConnectionDetail => detail !== null);
}

export function getConnectionValue(
  connectionDetails: ConnectionDetail[],
  candidateKeys: string[],
): string | null {
  const normalizedCandidates = candidateKeys.map(normalizeKey);

  for (const detail of connectionDetails) {
    if (detail.value && normalizedCandidates.includes(detail.normalizedKey)) {
      return detail.value;
    }
  }

  return null;
}

export function usesIntegratedSecurity(connectionString: string | ConnectionDetail[]): boolean {
  const connectionDetails = Array.isArray(connectionString)
    ? connectionString
    : parseConnectionDetails(connectionString);

  const integratedValue = getConnectionValue(connectionDetails, [
    "integrated security",
    "trusted connection",
    "trusted_connection",
  ]);

  return integratedValue ? TRUE_CONNECTION_VALUES.has(integratedValue.toLowerCase()) : false;
}

export function summarizeConnectionString(connectionString: string): string {
  const connectionDetails = parseConnectionDetails(connectionString);
  const server = getConnectionValue(connectionDetails, [
    "server",
    "data source",
    "addr",
    "address",
    "network address",
  ]);
  const database = getConnectionValue(connectionDetails, ["database", "initial catalog"]);
  const authenticationLabel = usesIntegratedSecurity(connectionDetails)
    ? "Windows auth"
    : getConnectionValue(connectionDetails, ["user id", "uid", "user"])
      ? "SQL auth"
      : null;

  const summaryParts = [server, database, authenticationLabel].filter(Boolean);

  if (summaryParts.length > 0) {
    return summaryParts.join(" / ");
  }

  return `Saved connection string (${normalizeConnectionString(connectionString).length} chars)`;
}