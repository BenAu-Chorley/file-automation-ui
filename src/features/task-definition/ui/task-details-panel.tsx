import { FormFieldShell } from "@/components/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TaskDefinitionDetails } from "../types";
import type { TaskMetadataDraft } from "./task-definition-ui-types";

type TaskDetailsPanelProps = {
  details: TaskDefinitionDetails;
  isSavingTask: boolean;
  isTaskMetadataDirty: boolean;
  onCancelTaskMetadata: () => void;
  onSaveTaskMetadata: () => void;
  onTaskDescriptionChange: (value: string) => void;
  onTaskNameChange: (value: string) => void;
  taskDraft: TaskMetadataDraft | null;
  taskValidationMessage: string | null;
};

export function TaskDetailsPanel({
  details,
  isSavingTask,
  isTaskMetadataDirty,
  onCancelTaskMetadata,
  onSaveTaskMetadata,
  onTaskDescriptionChange,
  onTaskNameChange,
  taskDraft,
  taskValidationMessage,
}: TaskDetailsPanelProps) {
  const nameInputId = `task-name-${details.id}`;
  const descriptionInputId = `task-descp-${details.id}`;

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Selected task</p>
          <h3 className="mt-1 text-xl font-semibold text-foreground">#{details.id} {details.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{details.descp || "No description"}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-muted/60 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormFieldShell htmlFor={nameInputId} label="name" required>
            <Input
              id={nameInputId}
              maxLength={50}
              value={taskDraft?.name ?? details.name}
              onChange={(event) => onTaskNameChange(event.target.value)}
            />
          </FormFieldShell>
          <FormFieldShell htmlFor={descriptionInputId} label="descp" required>
            <Input
              id={descriptionInputId}
              maxLength={200}
              value={taskDraft?.descp ?? details.descp ?? ""}
              onChange={(event) => onTaskDescriptionChange(event.target.value)}
            />
          </FormFieldShell>
        </div>

        {taskValidationMessage ? (
          <p className="mt-3 text-sm font-medium text-destructive">{taskValidationMessage}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button disabled={!isTaskMetadataDirty || isSavingTask} onClick={onSaveTaskMetadata}>
            {isSavingTask ? "Saving..." : "Save task details"}
          </Button>
          <Button disabled={!isTaskMetadataDirty || isSavingTask} onClick={onCancelTaskMetadata} variant="outline">
            Cancel task details
          </Button>
          {isTaskMetadataDirty ? (
            <Badge className="normal-case tracking-normal" variant="warning">
              Task details changed (unsaved)
            </Badge>
          ) : null}
        </div>
      </div>
    </>
  );
}