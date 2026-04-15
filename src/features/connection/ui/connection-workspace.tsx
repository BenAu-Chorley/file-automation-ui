"use client";

import { FormFieldShell } from "@/components/forms";
import { InlineFeedback, ListStatePanel } from "@/components/feedback/status-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { TaskDefinitionWorkspace } from "@/features/task-definition/ui/task-definition-workspace";
import { useConnectionWorkspace } from "@/features/connection/ui/use-connection-workspace";
import {
  authenticationLabel,
  formatConnectionTitle,
  renderConnectionDetails,
} from "@/features/connection/ui/connection-workspace-utils";

type Props = {
  initialConnectionString: string | null;
  initialRecentConnectionStrings: string[];
};

export function ConnectionWorkspace({
  initialConnectionString,
  initialRecentConnectionStrings,
}: Props) {
  const {
    activeConnectionDetails,
    activeConnectionString,
    draftConnectionString,
    handleActivateConnection,
    handleClearConnection,
    handleClearRecentConnections,
    handleDraftConnectionStringChange,
    handleLoadRecentConnection,
    handleRemoveRecentConnection,
    handleTestConnection,
    hasDraft,
    highlightedRecentConnection,
    isActiveConnectionExpanded,
    isConnectionManagerOpen,
    isPending,
    lastTestedConnectionString,
    notice,
    recentConnectionStrings,
    toggleActiveConnectionExpanded,
    toggleConnectionManager,
    workspaceRevision,
  } = useConnectionWorkspace({
    initialConnectionString,
    initialRecentConnectionStrings,
  });

  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border-border/70 bg-card/92 shadow-[0_20px_80px_color-mix(in_oklch,var(--foreground)_8%,transparent)] backdrop-blur" id="connection-setup">
        <CardHeader className="p-8 pb-0">
          <div className="mb-6 flex justify-end">
            <Button
              onClick={toggleConnectionManager}
              variant="outline"
            >
              {isConnectionManagerOpen ? "Hide connection manager" : "Manage connection"}
            </Button>
          </div>
          <div
            className={`rounded-[1.25rem] border border-border bg-muted/70 transition-all ${
              isActiveConnectionExpanded ? "p-6" : "p-3"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Active connection
                </p>
                <p
                  className={`truncate font-semibold text-foreground ${
                    isActiveConnectionExpanded ? "mt-2 text-2xl tracking-tight" : "mt-1 text-sm"
                  }`}
                  title={activeConnectionString ? formatConnectionTitle(activeConnectionString) : "Not connected"}
                >
                  {activeConnectionString ? formatConnectionTitle(activeConnectionString) : "Not connected"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="text-[11px]" variant="outline">
                  {authenticationLabel(activeConnectionString)}
                </Badge>
                <Button
                  className="h-8 w-8 text-sm font-semibold"
                  onClick={toggleActiveConnectionExpanded}
                  title={isActiveConnectionExpanded ? "Collapse details" : "Expand details"}
                  aria-label={isActiveConnectionExpanded ? "Collapse active connection details" : "Expand active connection details"}
                  size="icon"
                  variant="outline"
                >
                  {isActiveConnectionExpanded ? "-" : "+"}
                </Button>
              </div>
            </div>

            {isActiveConnectionExpanded ? (
              <div className="mt-6">{renderConnectionDetails(activeConnectionDetails)}</div>
            ) : null}
            </div>
          </CardHeader>

        {isConnectionManagerOpen ? (
            <CardContent className="pt-6">
            <section className="rounded-[1.5rem] border border-border bg-muted/60 p-6 text-foreground shadow-[0_10px_40px_color-mix(in_oklch,var(--foreground)_8%,transparent)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Connection Manager
                </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Connect and validate</h2>
              </div>
              <Badge variant={lastTestedConnectionString === draftConnectionString.trim() ? "success" : "outline"}>
                {lastTestedConnectionString === draftConnectionString.trim()
                  ? "Draft tested"
                  : "Draft not yet tested"}
              </Badge>
            </div>

            {notice ? <InlineFeedback className="mt-6" message={notice.message} tone={notice.tone} /> : null}

            <FormFieldShell className="mt-6" htmlFor="connection-string" label="SQL Server connection string">
              <Textarea
                id="connection-string"
                className="min-h-36"
                onChange={(event) => {
                  handleDraftConnectionStringChange(event.target.value);
                }}
                placeholder="Server=tcp:sql01;Database=FileAutomation;Integrated Security=true;Encrypt=true;TrustServerCertificate=true;"
                spellCheck={false}
                value={draftConnectionString}
              />
            </FormFieldShell>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                disabled={!hasDraft || isPending}
                onClick={handleTestConnection}
              >
                {isPending ? "Working..." : "Test connection"}
              </Button>
              <Button
                disabled={!hasDraft || isPending}
                onClick={handleActivateConnection}
                variant="outline"
              >
                {activeConnectionString ? "Use this connection" : "Activate session connection"}
              </Button>
              <Button
                className="text-destructive hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                disabled={(!activeConnectionString && !hasDraft) || isPending}
                onClick={handleClearConnection}
                variant="outline"
              >
                Clear session
              </Button>
            </div>

            <Card className="mt-6 border-border bg-card">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 p-4 pb-0">
                <CardTitle className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Recent connections
                </CardTitle>
                <Button
                  className="text-xs uppercase tracking-[0.14em] text-destructive hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  disabled={recentConnectionStrings.length === 0 || isPending}
                  onClick={handleClearRecentConnections}
                  size="sm"
                  variant="outline"
                >
                  Clear history
                </Button>
              </CardHeader>

              <CardContent className="pt-5">
              {recentConnectionStrings.length > 0 ? (
                <div className="space-y-3">
                  {recentConnectionStrings.map((connectionString, index) => {
                    const isActive = connectionString === activeConnectionString;

                    return (
                      <Card
                        key={connectionString}
                        className={`w-full px-4 py-4 ${
                          highlightedRecentConnection === connectionString
                            ? "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/20"
                            : "border-border bg-muted/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            className="min-w-0 flex-1 rounded-xl text-left transition hover:text-foreground"
                            onClick={() => handleLoadRecentConnection(connectionString)}
                            type="button"
                          >
                            <div className="flex min-w-0 gap-3">
                              <Badge className="h-8 w-8 shrink-0 justify-center rounded-full px-0 text-xs" variant="outline">
                                {index + 1}
                              </Badge>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">
                                  {formatConnectionTitle(connectionString)}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  {authenticationLabel(connectionString)}
                                </p>
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-2">
                            {isActive ? (
                              <Badge className="text-[11px]" variant="success">
                                Active
                              </Badge>
                            ) : null}
                            <Button
                              className="text-[11px] uppercase tracking-[0.16em] text-destructive hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                              disabled={isPending}
                              onClick={() => handleRemoveRecentConnection(connectionString)}
                              size="sm"
                              variant="outline"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <ListStatePanel
                  className="bg-muted/60"
                  description="No recent connections yet. Activated connections will appear here for quick reuse."
                />
              )}
              </CardContent>
            </Card>
          </section>
          </CardContent>
        ) : null}

        <CardContent className={isConnectionManagerOpen ? "pt-0" : "pt-8"}>
        <div key={workspaceRevision}>
          <TaskDefinitionWorkspace hasActiveConnection={Boolean(activeConnectionString)} />
        </div>
        </CardContent>
      </Card>
    </div>
  );
}