import { ListStatePanel } from "@/components/feedback/status-feedback";
import { Button } from "@/components/ui/button";
import type { TaskDefinitionSummary } from "../types";

type TaskListPanelProps = {
  hasActiveConnection: boolean;
  isLoadingTasks: boolean;
  isTasksPanelCollapsed: boolean;
  onReloadTasks: () => void;
  onSelectTask: (taskId: number) => void;
  onToggleCollapsed: () => void;
  selectedTaskId: number | null;
  tasks: TaskDefinitionSummary[];
};

export function TaskListPanel({
  hasActiveConnection,
  isLoadingTasks,
  isTasksPanelCollapsed,
  onReloadTasks,
  onSelectTask,
  onToggleCollapsed,
  selectedTaskId,
  tasks,
}: TaskListPanelProps) {
  return (
    <aside className={`flex h-full flex-col rounded-2xl border border-border bg-muted/60 ${isTasksPanelCollapsed ? "p-2" : "p-4"}`}>
      <div className="flex items-center justify-between gap-2">
        {!isTasksPanelCollapsed ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tasks</p>
        ) : <span />}
        <Button
          className="h-7 w-7 text-xs font-semibold"
          title={isTasksPanelCollapsed ? "Expand tasks panel" : "Shrink tasks panel"}
          aria-label={isTasksPanelCollapsed ? "Expand tasks panel" : "Shrink tasks panel"}
          onClick={onToggleCollapsed}
          size="icon"
          variant="outline"
        >
          {isTasksPanelCollapsed ? ">" : "<"}
        </Button>
      </div>
      <Button
        onClick={onReloadTasks}
        disabled={!hasActiveConnection || isLoadingTasks}
        className={`mt-3 w-full ${
          isTasksPanelCollapsed ? "px-0" : ""
        }`}
        title="Reload tasks"
        aria-label="Reload tasks"
        variant="outline"
      >
        {isLoadingTasks ? "..." : isTasksPanelCollapsed ? "↻" : "Reload tasks"}
      </Button>
      <div
        className={`mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto ${isTasksPanelCollapsed ? "pr-0" : "pr-2"}`}
        style={{ scrollbarGutter: "stable" }}
      >
        {tasks.map((task) => {
          const isActive = selectedTaskId === task.id;

          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelectTask(task.id)}
              title={`#${task.id} ${task.name}`}
              className={`w-full rounded-xl border text-left transition ${
                isActive
                  ? "border-primary/25 bg-primary/10 text-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:border-primary/15 hover:bg-background"
              } ${isTasksPanelCollapsed ? "px-1 py-2 text-center" : "px-3 py-3"}`}
            >
              {isTasksPanelCollapsed ? (
                <p className="text-xs font-semibold">#{task.id}</p>
              ) : (
                <>
                  <p className="text-sm font-semibold">#{task.id} {task.name}</p>
                  <p className={`mt-1 text-xs ${isActive ? "text-foreground/75" : "text-muted-foreground"}`}>
                    {task.descp || "No description"}
                  </p>
                </>
              )}
            </button>
          );
        })}

        {!isLoadingTasks && tasks.length === 0 ? (
          <ListStatePanel
            className="bg-background"
            description={hasActiveConnection
              ? "No tasks available for this connection."
              : "Activate a connection to load task definitions."}
          />
        ) : null}
      </div>
    </aside>
  );
}