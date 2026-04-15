import { FormFieldShell } from "@/components/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EXECUTOR_CONFIG_FIELDS, type ExecutorFieldSpec } from "../executor-config-schema";
import type { ExecutorClass, TaskRole } from "../types";
import type { RoleDraftState } from "./task-definition-ui-types";

type RoleEditorPanelProps = {
  executorOptions: readonly ExecutorClass[];
  isSavingRole: boolean;
  onBooleanFieldChange: (role: TaskRole, fieldKey: string, checked: boolean) => void;
  onCancelRole: (role: TaskRole) => void;
  onChangeExecutorClass: (role: TaskRole, nextExecutorClass: ExecutorClass) => void;
  onFieldValueChange: (role: TaskRole, fieldKey: string, value: string) => void;
  onRevertField: (role: TaskRole, field: ExecutorFieldSpec) => void;
  onSaveRole: (role: TaskRole) => void;
  role: TaskRole;
  roleDraft: RoleDraftState;
  roleValidationMessage: string | null;
};

function toRoleLabel(role: TaskRole): string {
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}

function isUpsertableExecutorClass(executorClass: ExecutorClass): executorClass is Exclude<ExecutorClass, "NoOp"> {
  return executorClass !== "NoOp";
}

function isRoleDirty(roleDraft: RoleDraftState): boolean {
  if (roleDraft.selectedExecutorClass !== roleDraft.loadedExecutorClass) {
    return true;
  }

  if (!isUpsertableExecutorClass(roleDraft.selectedExecutorClass)) {
    return false;
  }

  const baseline = roleDraft.baselineByExecutor[roleDraft.selectedExecutorClass] ?? {};
  const draft = roleDraft.draftsByExecutor[roleDraft.selectedExecutorClass] ?? {};

  return Object.keys({ ...baseline, ...draft }).some((key) => (draft[key] ?? "") !== (baseline[key] ?? ""));
}

function getChangedFieldKeys(roleDraft: RoleDraftState): string[] {
  if (!isUpsertableExecutorClass(roleDraft.selectedExecutorClass)) {
    return [];
  }

  const baseline = roleDraft.baselineByExecutor[roleDraft.selectedExecutorClass] ?? {};
  const draft = roleDraft.draftsByExecutor[roleDraft.selectedExecutorClass] ?? {};

  return Object.keys({ ...baseline, ...draft }).filter((key) => (draft[key] ?? "") !== (baseline[key] ?? ""));
}

function NoOpExecutorForm({ role }: { role: TaskRole }) {
  return (
    <Card className="border-border bg-muted/70">
      <CardContent className="p-5">
        <p className="text-sm font-semibold text-foreground">NoOp placeholder</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Role <span className="font-semibold text-foreground">{role}</span> is configured as NoOp.
          There are no executor table fields to maintain for this assignment.
        </p>
      </CardContent>
    </Card>
  );
}

export function RoleEditorPanel({
  executorOptions,
  isSavingRole,
  onBooleanFieldChange,
  onCancelRole,
  onChangeExecutorClass,
  onFieldValueChange,
  onRevertField,
  onSaveRole,
  role,
  roleDraft,
  roleValidationMessage,
}: RoleEditorPanelProps) {
  const roleLabel = toRoleLabel(role);
  const dirty = isRoleDirty(roleDraft);
  const changedFields = getChangedFieldKeys(roleDraft);
  const selectedExecutorClass = roleDraft.selectedExecutorClass;
  const loadedDisplayClass = roleDraft.loadedExecutorClass;

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card/85">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Executor selection</p>
              <FormFieldShell
                description={`Loaded from DB: ${loadedDisplayClass}`}
                label="Choose executor class"
              >
                <Select
                  className={selectedExecutorClass !== roleDraft.loadedExecutorClass ? "border-amber-300 dark:border-amber-700" : undefined}
                  value={selectedExecutorClass}
                  onChange={(event) => onChangeExecutorClass(role, event.target.value as ExecutorClass)}
                >
                  {executorOptions.map((executorClass) => (
                    <option key={`${role}:${executorClass}`} value={executorClass}>{executorClass}</option>
                  ))}
                </Select>
              </FormFieldShell>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedExecutorClass !== roleDraft.loadedExecutorClass ? (
                <Badge className="normal-case tracking-normal" variant="warning">
                  Pending executor switch (unsaved)
                </Badge>
              ) : null}
              {changedFields.length > 0 ? (
                <Badge className="normal-case tracking-normal" variant="info">
                  {changedFields.length} field change{changedFields.length === 1 ? "" : "s"} (unsaved)
                </Badge>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedExecutorClass === "NoOp" ? (
        <NoOpExecutorForm role={role} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {EXECUTOR_CONFIG_FIELDS[selectedExecutorClass].map((field) => {
            const draftValues = roleDraft.draftsByExecutor[selectedExecutorClass] ?? {};
            const baselineValues = roleDraft.baselineByExecutor[selectedExecutorClass] ?? {};
            const currentValue = draftValues[field.key] ?? (field.type === "boolean" ? false : field.defaultValue ?? "");
            const baselineValue = baselineValues[field.key] ?? (field.type === "boolean" ? false : field.defaultValue ?? "");
            const changed = currentValue !== baselineValue;
            const fieldBorderClass = changed ? "border-amber-300 dark:border-amber-700" : "border-border";

            if (field.type === "boolean") {
              return (
                <div key={field.key} className={`rounded-xl border bg-card p-3 ${fieldBorderClass}`}>
                  <label className="inline-flex min-h-11 items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      checked={Boolean(currentValue)}
                      onChange={(event) => onBooleanFieldChange(role, field.key, event.target.checked)}
                    />
                    <span>
                      {field.key}
                      {field.required ? <span className="ml-1 text-destructive">*</span> : null}
                    </span>
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    {changed ? (
                      <Badge className="normal-case tracking-normal" variant="warning">Changed</Badge>
                    ) : null}
                    {changed ? (
                      <Button
                        title={`Revert ${field.key}`}
                        aria-label={`Revert ${field.key}`}
                        onClick={() => onRevertField(role, field)}
                        className="h-6 rounded-full px-2 text-xs"
                        size="sm"
                        variant="outline"
                      >
                        ↺
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            }

            return (
              <div key={field.key} className={`rounded-xl border bg-card p-3 ${fieldBorderClass}`}>
                <FormFieldShell
                  footer={(
                    <div className="flex items-center gap-2">
                      {changed ? <Badge className="normal-case tracking-normal" variant="warning">Changed</Badge> : null}
                      {changed ? (
                        <Button
                          title={`Revert ${field.key}`}
                          aria-label={`Revert ${field.key}`}
                          onClick={() => onRevertField(role, field)}
                          className="h-6 rounded-full px-2 text-xs"
                          size="sm"
                          variant="outline"
                        >
                          ↺
                        </Button>
                      ) : null}
                    </div>
                  )}
                  label={field.key}
                  required={field.required}
                >
                  {field.type === "yn" || field.uiOptions ? (
                    <Select
                      value={String(currentValue ?? "")}
                      onChange={(event) => onFieldValueChange(role, field.key, event.target.value)}
                    >
                      {field.type === "yn" ? <option value="">-- Select --</option> : !field.defaultValue ? <option value="">-- Select --</option> : null}
                      {field.type === "yn" ? (
                        <>
                          <option value="Y">Y</option>
                          <option value="N">N</option>
                        </>
                      ) : field.uiOptions?.map((option) => (
                        <option key={`${field.key}:${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type={field.type === "number" ? "number" : "text"}
                      maxLength={field.type === "string" ? field.maxLength : undefined}
                      value={String(currentValue ?? "")}
                      onChange={(event) => onFieldValueChange(role, field.key, event.target.value)}
                    />
                  )}
                </FormFieldShell>
              </div>
            );
          })}
        </div>
      )}

      {roleValidationMessage ? (
        <p className="text-sm font-medium text-destructive">{roleValidationMessage}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!dirty || isSavingRole} onClick={() => onSaveRole(role)}>
          {isSavingRole ? "Saving..." : `Save ${roleLabel}`}
        </Button>
        <Button disabled={!dirty || isSavingRole} onClick={() => onCancelRole(role)} variant="outline">
          Cancel {roleLabel}
        </Button>
      </div>
    </div>
  );
}