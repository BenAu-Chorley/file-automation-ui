# Database Model Overview

As a internal web UI to manage file automation db records, the project would connect to FileAutomation db to be specified by the user during runtime

## Schema
- Single schema: [fa]

## Task Definition
- fa.t_runner_task, defines which `t_executor_*` will be used for the 3 roles, viz. `extractor`, `transformer` and `loader`
- the 3 roles will be executed in order in the backend (out of the scope of this wireframe) using the classes defined in the 3 `*_class` columns in fa.t_runner_task
- Each `t_executor_*` tables define the details for the corresponding role component in a task that the backend class will use
    - E.g. `t_executor_LocalFileCopy` stores the detail that the backend executor class enum `LocalFileCopy` will use. This will be represented by the value `LocalFileCopy` in [fa].[t_runner_task].[transformer_class] field if that's assigned for the transformer role.

Each task:
- PK: [fa].[t_runner_task].[id]

## Executor Tables
- fa.t_executor_ItrentNewJoiner2Csv. Represented by the role code "ItrentNewJoiner2CSV"
- fa.t_executor_LocalFile2Sftp. Represented by the role code "LocalFile2Sftp"
- fa.t_executor_LocalFileCopy. Represented by the role code "LocalFileCopy"
- fa.t_executor_LocalFolder2Sftp. Represented by the role code "LocalFolder2Sftp"
- fa.t_executor_SftpFile2Local. Represented by the role code "SftpFile2Local"
- fa.t_executor_SftpFolder2Local. Represented by the role code "SftpFolder2Local"
- the only exception is the role code `NoOp`, which has no corresponding table. It's just a placeholder stands for "no operation"

Each executor table:
- PK: (task_id, role)
- FK: task_id -> fa.t_runner_task.id

## Execution Tracking
- fa.t_runner_instance (one per execution)
- fa.t_runner_log (detailed steps and results per execution)

fa.t_runner_instance:
- PK: id
- FK: task_id -> fa.t_runner_task.id

fa.t_runner_log
- PK: id
- FK: runner_instance_id -> fa.t_runner_instance.id

## Field details
It's important for the wireframe UI to allow users manage all task definition details.

For execution tracking details, it's important for the UI to show them and allow users to compare details among executions.
- an example could be that user picks 3 execution instances of a single task, and the UI shows each list of execution logs vertically (one list on the left, one on the middle and one on the right) so user can scroll each list independently to visually compare

### Executor field details
[fa].[t_executor_ItrentNewJoiner2Csv]
- [task_id] [int] NOT NULL,
- [role] [varchar](20) NOT NULL,
- [itrent_conn_str] [varchar](300) NOT NULL,
- [target_csv_path_pattern] [varchar](300) NOT NULL,
- [days_in_the_past] [int] NOT NULL,
- [with_header] [char](1) NOT NULL default ('Y'),

[fa].[t_executor_LocalFile2Sftp]
- [task_id] [int] NOT NULL,
- [role] [varchar](20) NOT NULL,
- [sftp_url] [nvarchar](200) NOT NULL,
- [sftp_port] [int] NOT NULL,
- [sftp_username] [varchar](200) NOT NULL,
- [sftp_password_or_private_key_path] [varchar](300) NOT NULL,
- [sftp_credential_type] [varchar](50) NOT NULL,
- [local_path_pattern] [varchar](300) NOT NULL,
- [remote_path_pattern] [varchar](300) NOT NULL,
- [delete_local_after_copy] [bit] NOT NULL default (0),
- [key_passphrase] [varchar](255) NULL,

[fa].[t_executor_LocalFileCopy]
- [task_id] [int] NOT NULL,
- [role] [varchar](20) NOT NULL,
- [src_path_pattern] [varchar](300) NOT NULL,
- [dest_path_pattern] [varchar](300) NOT NULL,
- [overwrite_dest] [bit] NOT NULL default (0),
- [delete_src_after_copy] [bit] NOT NULL default (0),

[fa].[t_executor_LocalFolder2Sftp]
- [task_id] [int] NOT NULL,
- [role] [varchar](20) NOT NULL,
- [sftp_url] [nvarchar](200) NOT NULL,
- [sftp_port] [int] NOT NULL,
- [sftp_username] [varchar](200) NOT NULL,
- [sftp_password_or_private_key_path] [varchar](300) NOT NULL,
- [sftp_credential_type] [varchar](50) NOT NULL,
- [local_path_pattern] [varchar](300) NOT NULL,
- [remote_path_pattern] [varchar](300) NOT NULL,
- [delete_local_after_copy] [bit] NOT NULL default (0),
- [key_passphrase] [varchar](255) NULL,
- [tree_traversal_strategy] [varchar](50) NOT NULL,
- [transactional_strategy] [varchar](50) NOT NULL,
- [continuation_strategy] [varchar](50) NOT NULL,
- [root_folder_inclusion_strategy] [varchar](50) NOT NULL,
- [file_upload_strategy] [varchar](50) NOT NULL,
- [folder_upload_strategy] [varchar](50) NOT NULL,

[fa].[t_executor_SftpFile2Local]
- [task_id] [int] NOT NULL,
- [role] [varchar](20) NOT NULL,
- [sftp_url] [nvarchar](200) NOT NULL,
- [sftp_port] [int] NOT NULL,
- [sftp_username] [varchar](200) NOT NULL,
- [sftp_password_or_private_key_path] [varchar](300) NOT NULL,
- [sftp_credential_type] [varchar](50) NOT NULL,
- [local_path_pattern] [varchar](300) NOT NULL,
- [remote_path_pattern] [varchar](300) NOT NULL,
- [key_passphrase] [varchar](255) NULL,

[fa].[t_executor_SftpFolder2Local]
- [task_id] [int] NOT NULL,
- [role] [varchar](20) NOT NULL,
- [sftp_url] [nvarchar](200) NOT NULL,
- [sftp_port] [int] NOT NULL,
- [sftp_username] [varchar](200) NOT NULL,
- [sftp_password_or_private_key_path] [varchar](300) NOT NULL,
- [sftp_credential_type] [varchar](50) NOT NULL,
- [local_path_pattern] [varchar](300) NOT NULL,
- [remote_path_pattern] [varchar](300) NOT NULL,
- [key_passphrase] [varchar](255) NULL,
- [tree_traversal_strategy] [varchar](50) NOT NULL,
- [transactional_strategy] [varchar](50) NOT NULL,
- [continuation_strategy] [varchar](50) NOT NULL,
- [root_folder_inclusion_strategy] [varchar](50) NOT NULL,
- [file_download_strategy] [varchar](50) NOT NULL,
- [folder_download_strategy] [varchar](50) NOT NULL,

### Execution tracking field details
[fa].[t_runner_instance]
- [id] [int] IDENTITY(1,1) NOT NULL,
- [runner_id] [varchar](50) NOT NULL,
- [task_id] [int] NOT NULL,
- [start_time] [datetime] NOT NULL,
- [end_time] [datetime] NULL,
- [status] [varchar](10) NOT NULL,

[fa].[t_runner_log]
- [id] [int] IDENTITY(1,1) NOT NULL,
- [runner_instance_id] [int] NOT NULL,
- [start_time] [datetime] NOT NULL,
- [end_time] [datetime] NULL,
- [status] [varchar](30) NOT NULL,
- [remarks] [varchar](500) NULL,

### Task table
[fa].[t_runner_task]
- [id] [int] IDENTITY(1,1) NOT NULL,
- [name] [varchar](50) NOT NULL,
- [descp] [varchar](200) NOT NULL,
- [extractor_class] [varchar](100) NOT NULL,
- [transformer_class] [varchar](100) NOT NULL,
- [loader_class] [varchar](100) NOT NULL,


### Allowed enum values for selected executor fields

[fa].[t_executor_LocalFile2Sftp]
- [sftp_credential_type]
    - "PrivateKeyAuthentication"
    - "PasswordAuthentication"

[fa].[t_executor_LocalFolder2Sftp]
- [sftp_credential_type]
    - "PrivateKeyAuthentication"
    - "PasswordAuthentication"
- [tree_traversal_strategy]
    - "DFS_PreOrder" (default)
- [transactional_strategy]
    - "NonTxn" (default)
- [continuation_strategy]
    - "FailSafe" (default)
- [root_folder_inclusion_strategy]
    - "IncludeRoot"
    - "ExcludeRoot"
- [file_upload_strategy]
    - "Overwrite" (default)
- [folder_upload_strategy]
    - "Merge"
    - "Skip"

[fa].[t_executor_SftpFile2Local]
- [sftp_credential_type]
    - "PrivateKeyAuthentication"
    - "PasswordAuthentication"

[fa].[t_executor_SftpFolder2Local]
- [sftp_credential_type]
    - "PrivateKeyAuthentication"
    - "PasswordAuthentication"
- [tree_traversal_strategy]
    - "DFS_PreOrder" (default)
- [transactional_strategy]
    - "NonTxn" (default)
- [continuation_strategy]
    - "FailSafe" (default)
- [root_folder_inclusion_strategy]
    - "IncludeRoot"
    - "ExcludeRoot"
- [file_download_strategy]
    - "Overwrite" (default)
- [folder_download_strategy]
    - "Merge"
    - "Skip"
