export type MainNavigationItem = {
  description: string;
  href: string;
  key: string;
  label: string;
};

export const mainNavigation: MainNavigationItem[] = [
  {
    key: "connection-setup",
    label: "Connection",
    href: "#connection-setup",
    description: "Test, activate, and manage the session database connection.",
  },
  {
    key: "task-definitions",
    label: "Task Definitions",
    href: "#task-definitions",
    description: "Browse tasks, edit metadata, and manage executor assignments.",
  },
  {
    key: "execution-tracking",
    label: "Execution Tracking",
    href: "#execution-tracking",
    description: "Filter runner instances and compare execution logs side by side.",
  },
];