import type { ExecutorClass } from "./types";

export type UpsertableExecutorClass = Exclude<ExecutorClass, "NoOp">;

export type ExecutorFieldType = "string" | "number" | "boolean" | "yn";

export type ExecutorFieldSpec = {
  key: string;
  required: boolean;
  type: ExecutorFieldType;
  maxLength?: number;
  allowedValues?: string[];
  uiOptions?: Array<{ value: string; label: string }>;
  defaultValue?: string;
};

export const EXECUTOR_CONFIG_FIELDS: Record<UpsertableExecutorClass, ExecutorFieldSpec[]> = {
  ItrentNewJoiner2CSV: [
    { key: "itrent_conn_str", required: true, type: "string", maxLength: 300 },
    { key: "target_csv_path_pattern", required: true, type: "string", maxLength: 300 },
    { key: "days_in_the_past", required: true, type: "number" },
    { key: "with_header", required: true, type: "yn", maxLength: 1 },
  ],
  LocalFile2Sftp: [
    { key: "sftp_url", required: true, type: "string", maxLength: 200 },
    { key: "sftp_port", required: true, type: "number" },
    { key: "sftp_username", required: true, type: "string", maxLength: 200 },
    { key: "sftp_password_or_private_key_path", required: true, type: "string", maxLength: 300 },
    {
      key: "sftp_credential_type",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["PrivateKeyAuthentication", "PasswordAuthentication"],
      uiOptions: [
        { value: "PrivateKeyAuthentication", label: "PrivateKeyAuthentication" },
        { value: "PasswordAuthentication", label: "PasswordAuthentication" },
      ],
    },
    { key: "local_path_pattern", required: true, type: "string", maxLength: 300 },
    { key: "remote_path_pattern", required: true, type: "string", maxLength: 300 },
    { key: "delete_local_after_copy", required: true, type: "boolean" },
    { key: "key_passphrase", required: false, type: "string", maxLength: 255 },
  ],
  LocalFileCopy: [
    { key: "src_path_pattern", required: true, type: "string", maxLength: 300 },
    { key: "dest_path_pattern", required: true, type: "string", maxLength: 300 },
    { key: "overwrite_dest", required: true, type: "boolean" },
    { key: "delete_src_after_copy", required: true, type: "boolean" },
  ],
  LocalFolder2Sftp: [
    { key: "sftp_url", required: true, type: "string", maxLength: 200 },
    { key: "sftp_port", required: true, type: "number" },
    { key: "sftp_username", required: true, type: "string", maxLength: 200 },
    { key: "sftp_password_or_private_key_path", required: true, type: "string", maxLength: 300 },
    {
      key: "sftp_credential_type",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["PrivateKeyAuthentication", "PasswordAuthentication"],
      uiOptions: [
        { value: "PrivateKeyAuthentication", label: "PrivateKeyAuthentication" },
        { value: "PasswordAuthentication", label: "PasswordAuthentication" },
      ],
    },
    { key: "local_path_pattern", required: true, type: "string", maxLength: 300 },
    { key: "remote_path_pattern", required: true, type: "string", maxLength: 300 },
    { key: "delete_local_after_copy", required: true, type: "boolean" },
    { key: "key_passphrase", required: false, type: "string", maxLength: 255 },
    {
      key: "tree_traversal_strategy",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["DFS_PreOrder"],
      uiOptions: [{ value: "DFS_PreOrder", label: "DFS_PreOrder" }],
      defaultValue: "DFS_PreOrder",
    },
    {
      key: "transactional_strategy",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["NonTxn"],
      uiOptions: [{ value: "NonTxn", label: "NonTxn" }],
      defaultValue: "NonTxn",
    },
    {
      key: "continuation_strategy",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["FailSafe"],
      uiOptions: [{ value: "FailSafe", label: "FailSafe" }],
      defaultValue: "FailSafe",
    },
    {
      key: "root_folder_inclusion_strategy",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["IncludeRoot", "ExcludeRoot"],
      uiOptions: [
        { value: "IncludeRoot", label: "IncludeRoot" },
        { value: "ExcludeRoot", label: "ExcludeRoot" },
      ],
    },
    {
      key: "file_upload_strategy",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["Overwrite"],
      uiOptions: [{ value: "Overwrite", label: "Overwrite" }],
      defaultValue: "Overwrite",
    },
    {
      key: "folder_upload_strategy",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["Merge", "Skip"],
      uiOptions: [
        { value: "Merge", label: "Merge" },
        { value: "Skip", label: "Skip" },
      ],
    },
  ],
  SftpFile2Local: [
    { key: "sftp_url", required: true, type: "string", maxLength: 200 },
    { key: "sftp_port", required: true, type: "number" },
    { key: "sftp_username", required: true, type: "string", maxLength: 200 },
    { key: "sftp_password_or_private_key_path", required: true, type: "string", maxLength: 300 },
    {
      key: "sftp_credential_type",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["PrivateKeyAuthentication", "PasswordAuthentication"],
      uiOptions: [
        { value: "PrivateKeyAuthentication", label: "PrivateKeyAuthentication" },
        { value: "PasswordAuthentication", label: "PasswordAuthentication" },
      ],
    },
    { key: "local_path_pattern", required: true, type: "string", maxLength: 300 },
    { key: "remote_path_pattern", required: true, type: "string", maxLength: 300 },
    { key: "key_passphrase", required: false, type: "string", maxLength: 255 },
  ],
  SftpFolder2Local: [
    { key: "sftp_url", required: true, type: "string", maxLength: 200 },
    { key: "sftp_port", required: true, type: "number" },
    { key: "sftp_username", required: true, type: "string", maxLength: 200 },
    { key: "sftp_password_or_private_key_path", required: true, type: "string", maxLength: 300 },
    {
      key: "sftp_credential_type",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["PrivateKeyAuthentication", "PasswordAuthentication"],
      uiOptions: [
        { value: "PrivateKeyAuthentication", label: "PrivateKeyAuthentication" },
        { value: "PasswordAuthentication", label: "PasswordAuthentication" },
      ],
    },
    { key: "local_path_pattern", required: true, type: "string", maxLength: 300 },
    { key: "remote_path_pattern", required: true, type: "string", maxLength: 300 },
    { key: "key_passphrase", required: false, type: "string", maxLength: 255 },
    {
      key: "tree_traversal_strategy",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["DFS_PreOrder"],
      uiOptions: [{ value: "DFS_PreOrder", label: "DFS_PreOrder" }],
      defaultValue: "DFS_PreOrder",
    },
    {
      key: "transactional_strategy",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["NonTxn"],
      uiOptions: [{ value: "NonTxn", label: "NonTxn" }],
      defaultValue: "NonTxn",
    },
    {
      key: "continuation_strategy",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["FailSafe"],
      uiOptions: [{ value: "FailSafe", label: "FailSafe" }],
      defaultValue: "FailSafe",
    },
    {
      key: "root_folder_inclusion_strategy",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["IncludeRoot", "ExcludeRoot"],
      uiOptions: [
        { value: "IncludeRoot", label: "IncludeRoot" },
        { value: "ExcludeRoot", label: "ExcludeRoot" },
      ],
    },
    {
      key: "file_download_strategy",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["Overwrite"],
      uiOptions: [{ value: "Overwrite", label: "Overwrite" }],
      defaultValue: "Overwrite",
    },
    {
      key: "folder_download_strategy",
      required: true,
      type: "string",
      maxLength: 50,
      allowedValues: ["Merge", "Skip"],
      uiOptions: [
        { value: "Merge", label: "Merge" },
        { value: "Skip", label: "Skip" },
      ],
    },
  ],
};
