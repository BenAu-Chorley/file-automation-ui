import { Button } from "@/components/ui/button";
import { RoleEditorPanel } from "@/features/task-definition/ui/role-editor-panel";
import type { ExecutorFieldSpec } from "../executor-config-schema";
import { EXECUTOR_CLASSES, type ExecutorClass, type ExecutorClassOrUnknown, type TaskDefinitionDetails, type TaskRole } from "../types";
import type { ExpandedRoles, RoleDraftState } from "./task-definition-ui-types";

type TaskRolePanelsProps = {
  details: TaskDefinitionDetails;
  executorOptions: readonly ExecutorClass[];
  expandedRoles: ExpandedRoles;
  isSavingRole: boolean;
  onBooleanFieldChange: (role: TaskRole, fieldKey: string, checked: boolean) => void;
  onCancelRole: (role: TaskRole) => void;
  onChangeExecutorClass: (role: TaskRole, nextExecutorClass: ExecutorClass) => void;
  onFieldValueChange: (role: TaskRole, fieldKey: string, value: string) => void;
  onRevertField: (role: TaskRole, field: ExecutorFieldSpec) => void;
  onSaveRole: (role: TaskRole) => void;
  onToggleExpanded: (role: TaskRole) => void;
  roleDrafts: Record<TaskRole, RoleDraftState> | null;
  roleValidationMessages: Partial<Record<TaskRole, string>>;
};

const TASK_ROLES: TaskRole[] = ["extractor", "transformer", "loader"];

function toRoleLabel(role: TaskRole): string {
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}

function rolePanelClasses(role: TaskRole): string {
  if (role === "extractor") {
    return "border-sky-300/70 bg-sky-100/70 dark:border-sky-800 dark:bg-sky-950/25";
  }

  if (role === "transformer") {
    return "border-amber-300/70 bg-amber-100/70 dark:border-amber-800 dark:bg-amber-950/25";
  }

  return "border-emerald-300/70 bg-emerald-100/70 dark:border-emerald-800 dark:bg-emerald-950/25";
}

function roleEyebrowClasses(role: TaskRole): string {
  if (role === "extractor") {
    return "text-sky-950/80 dark:text-sky-100";
  }

  if (role === "transformer") {
    return "text-amber-950/80 dark:text-amber-100";
  }

  return "text-emerald-950/80 dark:text-emerald-100";
}

function normalizeExecutorClass(executorClass: ExecutorClassOrUnknown): ExecutorClass {
  return EXECUTOR_CLASSES.includes(executorClass as ExecutorClass)
    ? (executorClass as ExecutorClass)
    : "NoOp";
}

export function TaskRolePanels({
  details,
  executorOptions,
  expandedRoles,
  isSavingRole,
  onBooleanFieldChange,
  onCancelRole,
  onChangeExecutorClass,
  onFieldValueChange,
  onRevertField,
  onSaveRole,
  onToggleExpanded,
  roleDrafts,
  roleValidationMessages,
}: TaskRolePanelsProps) {
  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-3">
      {TASK_ROLES.map((role) => {
        const assignment = details.assignments.find((entry) => entry.role === role) ?? null;
        const executorClass = normalizeExecutorClass(assignment?.executorClass ?? "NoOp");
        const isExpanded = expandedRoles[role];

        return (
          <div key={role} className={`rounded-2xl border ${isExpanded ? "p-5 lg:col-span-3" : "p-3"} ${rolePanelClasses(role)}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${roleEyebrowClasses(role)}`}>
                  {toRoleLabel(role)} Class
                </p>
                <h4 className={`mt-1 font-semibold text-foreground ${isExpanded ? "text-lg" : "text-base"}`}>{executorClass}</h4>
              </div>
              <Button
                className="h-9 w-9 text-sm font-semibold"
                title={isExpanded ? `Collapse ${role} panel` : `Expand ${role} panel`}
                aria-label={isExpanded ? `Collapse ${role} panel` : `Expand ${role} panel`}
                onClick={() => onToggleExpanded(role)}
                size="icon"
                variant="outline"
              >
                {isExpanded ? "-" : "+"}
              </Button>
            </div>

            {isExpanded ? (
              <div className="mt-4">
                {roleDrafts ? (
                  <RoleEditorPanel
                    executorOptions={executorOptions}
                    isSavingRole={isSavingRole}
                    onBooleanFieldChange={onBooleanFieldChange}
                    onCancelRole={onCancelRole}
                    onChangeExecutorClass={onChangeExecutorClass}
                    onFieldValueChange={onFieldValueChange}
                    onRevertField={onRevertField}
                    onSaveRole={onSaveRole}
                    role={role}
                    roleDraft={roleDrafts[role]}
                    roleValidationMessage={roleValidationMessages[role] ?? null}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}