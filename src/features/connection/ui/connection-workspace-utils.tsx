import {
  summarizeConnectionString,
  usesIntegratedSecurity,
  type ConnectionDetail,
} from "../connection-string";
import { Card, CardContent } from "@/components/ui/card";

export function formatConnectionTitle(connectionString: string): string {
  return summarizeConnectionString(connectionString);
}

export function authenticationLabel(connectionString: string | null): string {
  if (!connectionString?.trim()) {
    return "No active connection";
  }

  return usesIntegratedSecurity(connectionString) ? "Windows authentication" : "SQL authentication";
}

export function renderConnectionDetails(connectionDetails: ConnectionDetail[]) {
  if (connectionDetails.length === 0) {
    return (
      <p className="text-sm leading-7 text-muted-foreground">
        No active connection for this session yet.
      </p>
    );
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {connectionDetails.map((detail) => (
        <Card
          key={`${detail.normalizedKey}:${detail.value}`}
          className="border-border/80 bg-card/90"
        >
          <CardContent className="px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {detail.key}
            </dt>
            <dd className="mt-2 break-all text-sm font-medium text-foreground">
              {detail.displayValue}
            </dd>
          </CardContent>
        </Card>
      ))}
    </dl>
  );
}