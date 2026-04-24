export const TASK_ROLES = ["extractor", "transformer", "loader"] as const;

export type TaskRole = (typeof TASK_ROLES)[number];

export const EXECUTOR_CLASSES = [
  "ItrentNewJoiner2CSV",
  "LocalFile2Sftp",
  "LocalFileCopy",
  "LocalFolder2Sftp",
  "SftpFile2Local",
  "SftpFolder2Local",
  "NoOp",
] as const;

export type ExecutorClass = (typeof EXECUTOR_CLASSES)[number];

export type ExecutorClassOrUnknown = ExecutorClass | string;

export type TaskDefinitionSummary = {
  id: number;
  name: string;
  descp: string | null;
  extractorClass: ExecutorClassOrUnknown;
  transformerClass: ExecutorClassOrUnknown;
  loaderClass: ExecutorClassOrUnknown;
};

export type ExecutorConfig = {
  taskId: number;
  role: TaskRole;
  values: Record<string, unknown>;
};

export type ExecutorAssignment = {
  role: TaskRole;
  executorClass: ExecutorClassOrUnknown;
  config: ExecutorConfig | null;
};

export type TaskDefinitionDetails = TaskDefinitionSummary & {
  assignments: ExecutorAssignment[];
};

export type UpsertExecutorConfigInput = {
  taskId: number;
  role: TaskRole;
  executorClass: Exclude<ExecutorClass, "NoOp">;
  values: Record<string, unknown>;
};

export type SaveRoleExecutorInput = {
  taskId: number;
  role: TaskRole;
  executorClass: ExecutorClass;
  values: Record<string, unknown>;
};

export type UpdateTaskMetadataInput = {
  taskId: number;
  name: string;
  descp: string;
};

export type RunnerInstance = {
  id: number;
  runnerId: string;
  taskId: number;
  startTime: string;
  endTime: string | null;
  status: string;
};

export type RunnerLog = {
  id: number;
  runnerInstanceId: number;
  startTime: string;
  endTime: string | null;
  status: string;
  remarks: string | null;
};

export type RunnerInstanceFilter = {
  taskId?: number;
  startTimeFrom?: string;
  startTimeBefore?: string;
};

export type TaskDefinitionActionResult<T> = {
  ok: boolean;
  message: string;
  data: T | null;
};
