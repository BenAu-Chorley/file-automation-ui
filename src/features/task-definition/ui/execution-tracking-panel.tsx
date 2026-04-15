import { FormFieldShell } from "@/components/forms";
import { ListStatePanel } from "@/components/feedback/status-feedback";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import { Input } from "@/components/ui/input";
import type { RunnerInstance, RunnerLog } from "../types";
import type { RunnerFilters } from "./task-definition-ui-types";

type ExecutionTrackingPanelProps = {
  isLoadingRunnerInstances: boolean;
  loadingRunnerLogIds: number[];
  maxComparableInstances: number;
  onApplyQuickRange: (days: number) => void;
  onApplyRunnerFilters: () => void;
  onClearRunnerFilters: () => void;
  onChangeRunnerFilters: (filters: RunnerFilters) => void;
  onToggleRunnerInstanceSelection: (runnerInstanceId: number) => void;
  runnerFilters: RunnerFilters;
  runnerInstances: RunnerInstance[];
  runnerLogErrorByInstanceId: Record<number, string>;
  runnerLogsByInstanceId: Record<number, RunnerLog[]>;
  runnerStartTimeBounds: { earliest: string | null; latest: string | null };
  selectedRunnerInstanceIds: number[];
  selectedRunnerInstances: RunnerInstance[];
  statusTone: (status: string | null | undefined) => StatusTone;
  formatDateDisplay: (value: string | null) => string;
  formatDateTimeDisplay: (value: string | null) => string;
};

export function ExecutionTrackingPanel({
  isLoadingRunnerInstances,
  loadingRunnerLogIds,
  maxComparableInstances,
  onApplyQuickRange,
  onApplyRunnerFilters,
  onChangeRunnerFilters,
  onClearRunnerFilters,
  onToggleRunnerInstanceSelection,
  runnerFilters,
  runnerInstances,
  runnerLogErrorByInstanceId,
  runnerLogsByInstanceId,
  runnerStartTimeBounds,
  selectedRunnerInstanceIds,
  selectedRunnerInstances,
  statusTone,
  formatDateDisplay,
  formatDateTimeDisplay,
}: ExecutionTrackingPanelProps) {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-muted/60 p-4" id="execution-tracking">
      <div className="flex flex-col items-start gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Execution tracking</p>
          <h4 className="mt-1 text-lg font-semibold text-foreground">Runner instance comparison</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter by start date range and compare runner-instance logs side by side.
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <FormFieldShell
              description={`Earliest in current result: ${formatDateDisplay(runnerStartTimeBounds.earliest)}`}
              label="Start date from"
              labelClassName="text-xs"
            >
              <Input
                type="date"
                className="mt-1"
                value={runnerFilters.startTimeFrom}
                onChange={(event) => onChangeRunnerFilters({ ...runnerFilters, startTimeFrom: event.target.value })}
              />
            </FormFieldShell>
            <FormFieldShell
              description={`Latest in current result: ${formatDateDisplay(runnerStartTimeBounds.latest)}`}
              label="Start date before"
              labelClassName="text-xs"
            >
              <Input
                type="date"
                className="mt-1"
                value={runnerFilters.startTimeBefore}
                onChange={(event) => onChangeRunnerFilters({ ...runnerFilters, startTimeBefore: event.target.value })}
              />
            </FormFieldShell>
            <div className="hidden items-center gap-2 sm:flex sm:self-start">
              <Button onClick={onApplyRunnerFilters} disabled={isLoadingRunnerInstances} size="sm">
                {isLoadingRunnerInstances ? "Loading..." : "Apply"}
              </Button>
              <Button onClick={onClearRunnerFilters} disabled={isLoadingRunnerInstances} size="sm" variant="outline">
                Clear
              </Button>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[7, 14, 30, 60].map((days) => (
              <Button key={days} onClick={() => onApplyQuickRange(days)} size="sm" variant="outline">
                Last {days} days
              </Button>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2 sm:hidden">
            <Button onClick={onApplyRunnerFilters} disabled={isLoadingRunnerInstances} size="sm">
              {isLoadingRunnerInstances ? "Loading..." : "Apply"}
            </Button>
            <Button onClick={onClearRunnerFilters} disabled={isLoadingRunnerInstances} size="sm" variant="outline">
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Instances ({runnerInstances.length})
          </p>
          <div className="mt-3 grid max-h-[18rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-4">
            {runnerInstances.map((instance) => {
              const checked = selectedRunnerInstanceIds.includes(instance.id);
              const instanceTone = statusTone(instance.status);

              return (
                <label
                  key={instance.id}
                  className={`block rounded-xl border px-3 py-2 text-sm transition ${
                    checked
                      ? "border-primary/25 bg-primary/10 text-foreground shadow-sm"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      className="mt-1"
                      checked={checked}
                      onChange={() => onToggleRunnerInstanceSelection(instance.id)}
                    />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        <span>Instance #{instance.id}</span>
                        <StatusChip tone={instanceTone}>{instance.status || "Unknown"}</StatusChip>
                      </p>
                      <p className={`text-xs ${checked ? "text-foreground/75" : "text-muted-foreground"}`}>
                        runner_id: {instance.runnerId || "-"}
                      </p>
                      <p className={`text-xs ${checked ? "text-foreground/75" : "text-muted-foreground"}`}>
                        start: {formatDateTimeDisplay(instance.startTime)}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}

            {!isLoadingRunnerInstances && runnerInstances.length === 0 ? (
              <ListStatePanel className="bg-muted/60" description="No runner instances match the selected range." />
            ) : null}
          </div>
        </div>

        <div className={`grid gap-3 ${selectedRunnerInstances.length > 1 ? "md:grid-cols-2" : ""} ${selectedRunnerInstances.length > 2 ? "xl:grid-cols-3" : ""}`}>
          {selectedRunnerInstances.map((instance) => {
            const isLoadingLogs = loadingRunnerLogIds.includes(instance.id);
            const logs = runnerLogsByInstanceId[instance.id] ?? [];
            const logsError = runnerLogErrorByInstanceId[instance.id] ?? null;
            const instanceTone = statusTone(instance.status);

            return (
              <article key={instance.id} className="rounded-xl border border-border bg-card p-3">
                <div className="border-b border-border pb-2">
                  <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <span>Instance #{instance.id}</span>
                    <StatusChip tone={instanceTone}>{instance.status || "Unknown"}</StatusChip>
                  </p>
                  <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">start:</span> {formatDateTimeDisplay(instance.startTime)}</p>
                  <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">end:</span> {formatDateTimeDisplay(instance.endTime)}</p>
                </div>

                <div className="mt-3 max-h-[24rem] space-y-2 overflow-y-auto pr-1" style={{ scrollbarGutter: "stable" }}>
                  {isLoadingLogs ? (
                    <p className="rounded-lg border border-border bg-muted/70 px-3 py-2 text-sm text-muted-foreground">Loading logs...</p>
                  ) : null}

                  {!isLoadingLogs && logsError ? (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{logsError}</p>
                  ) : null}

                  {!isLoadingLogs && !logsError && logs.length === 0 ? (
                    <ListStatePanel className="bg-muted/60 px-3 py-3" description="No logs found for this runner instance." />
                  ) : null}

                  {!isLoadingLogs && !logsError && logs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-border bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                        <span>Log #{log.id}</span>
                        <StatusChip tone={statusTone(log.status)}>{log.status || "Unknown"}</StatusChip>
                      </p>
                      <p><span className="font-semibold text-foreground">start:</span> {formatDateTimeDisplay(log.startTime)}</p>
                      <p><span className="font-semibold text-foreground">end:</span> {formatDateTimeDisplay(log.endTime)}</p>
                      <p className="mt-1 text-muted-foreground"><span className="font-semibold text-foreground">remarks:</span> {log.remarks || "-"}</p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}

          {selectedRunnerInstances.length === 0 ? (
            <ListStatePanel className="bg-background" description={`Select up to ${maxComparableInstances} runner instances to compare logs side by side.`} />
          ) : null}
        </div>
      </div>
    </div>
  );
}