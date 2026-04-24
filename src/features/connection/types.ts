import type { ConnectionDetail } from "./connection-string";

export type ConnectionActionResult = {
  ok: boolean;
  message: string;
  connectionSummary: string | null;
  normalizedConnectionString: string | null;
  connectionDetails: ConnectionDetail[];
  usesIntegratedSecurity: boolean;
};

export type ConnectionSessionSnapshot = {
  activeConnectionString: string | null;
  recentConnectionStrings: string[];
};
