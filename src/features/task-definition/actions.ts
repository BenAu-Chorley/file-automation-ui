"use server";

import { revalidatePath } from "next/cache";

import {
  taskDefinitionController,
} from "@/features/task-definition/controller/task-definition-controller";
import type {
  RunnerInstanceFilter,
  SaveRoleExecutorInput,
  TaskDefinitionActionResult,
  UpdateTaskMetadataInput,
} from "./types";

export async function listTaskDefinitionsAction() {
  return taskDefinitionController.listTaskDefinitions();
}

export async function getTaskDefinitionDetailsAction(taskId: number) {
  return taskDefinitionController.getTaskDefinitionDetails(taskId);
}

export async function saveRoleExecutorAction(
  input: SaveRoleExecutorInput,
): Promise<TaskDefinitionActionResult<null>> {
  const result = await taskDefinitionController.saveRoleExecutor(input);

  if (result.ok) {
    revalidatePath("/");
  }

  return result;
}

export async function updateTaskMetadataAction(
  input: UpdateTaskMetadataInput,
): Promise<TaskDefinitionActionResult<null>> {
  const result = await taskDefinitionController.updateTaskMetadata(input);

  if (result.ok) {
    revalidatePath("/");
  }

  return result;
}

export async function listRunnerInstancesAction(filters: RunnerInstanceFilter) {
  return taskDefinitionController.listRunnerInstances(filters);
}

export async function listRunnerLogsAction(runnerInstanceId: number) {
  return taskDefinitionController.listRunnerLogs(runnerInstanceId);
}
