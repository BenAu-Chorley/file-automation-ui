"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  parseConnectionDetails,
  type ConnectionDetail,
} from "../connection-string";
import {
  activateConnectionAction,
  clearRecentConnectionsAction,
  clearConnectionAction,
  removeRecentConnectionAction,
  testConnectionAction,
} from "../actions";
import { useConfirm } from "@/components/ui/confirm-provider";

type Notice = {
  tone: "neutral" | "success" | "error";
  message: string;
} | null;

type UseConnectionWorkspaceArgs = {
  initialConnectionString: string | null;
  initialRecentConnectionStrings: string[];
};

function buildInitialNotice(initialConnectionString: string | null): Notice {
  return initialConnectionString
    ? {
        tone: "neutral",
        message: "A session connection is active. Open the connection manager when you need to test or switch databases.",
      }
    : {
        tone: "neutral",
        message: "Open the connection manager to test and activate a SQL Server connection for this session.",
      };
}

export function useConnectionWorkspace({
  initialConnectionString,
  initialRecentConnectionStrings,
}: UseConnectionWorkspaceArgs) {
  const router = useRouter();
  const confirm = useConfirm();
  const [draftConnectionString, setDraftConnectionString] = useState(initialConnectionString ?? "");
  const [activeConnectionString, setActiveConnectionString] = useState(initialConnectionString);
  const [recentConnectionStrings, setRecentConnectionStrings] = useState(initialRecentConnectionStrings);
  const [workspaceRevision, setWorkspaceRevision] = useState(1);
  const [isActiveConnectionExpanded, setIsActiveConnectionExpanded] = useState(false);
  const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState(!initialConnectionString);
  const [notice, setNotice] = useState<Notice>(buildInitialNotice(initialConnectionString));
  const [lastTestedConnectionString, setLastTestedConnectionString] = useState<string | null>(null);
  const [highlightedRecentConnection, setHighlightedRecentConnection] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasDraft = Boolean(draftConnectionString.trim());
  const activeConnectionDetails = useMemo<ConnectionDetail[]>(
    () => parseConnectionDetails(activeConnectionString ?? ""),
    [activeConnectionString],
  );

  function handleDraftConnectionStringChange(nextConnectionString: string) {
    setDraftConnectionString(nextConnectionString);
    setHighlightedRecentConnection(null);

    if (lastTestedConnectionString && lastTestedConnectionString !== nextConnectionString.trim()) {
      setLastTestedConnectionString(null);
    }
  }

  async function handleTestConnection() {
    startTransition(async () => {
      const result = await testConnectionAction(draftConnectionString);

      setNotice({
        tone: result.ok ? "success" : "error",
        message: result.message,
      });

      setLastTestedConnectionString(result.ok ? result.normalizedConnectionString : null);
    });
  }

  async function handleActivateConnection() {
    const normalizedDraft = draftConnectionString.trim();
    const normalizedActive = (activeConnectionString ?? "").trim();
    const isConnectionChange = Boolean(normalizedActive) && normalizedDraft !== normalizedActive;

    if (isConnectionChange) {
      const confirmed = await confirm({
        title: "Switch connection",
        message: "Switch to the new database connection? This resets task and execution state for the current session.",
        confirmLabel: "Switch",
        cancelLabel: "Keep current",
        tone: "danger",
      });

      if (!confirmed) {
        return;
      }
    }

    startTransition(async () => {
      const result = await activateConnectionAction(draftConnectionString);

      if (!result.ok || !result.normalizedConnectionString) {
        setNotice({ tone: "error", message: result.message });
        return;
      }

      const nextConnectionString = result.normalizedConnectionString;

      setActiveConnectionString(nextConnectionString);
      setRecentConnectionStrings((current) => [
        nextConnectionString,
        ...current.filter((entry) => entry !== nextConnectionString),
      ].slice(0, 5));
      setLastTestedConnectionString((current) =>
        current === nextConnectionString ? current : null,
      );

      if (isConnectionChange) {
        setWorkspaceRevision((current) => current + 1);
      }

      setNotice({
        tone: "success",
        message: isConnectionChange
          ? "Connection switched for this session. Dependent workspace state has been reset."
          : "Connection activated for this session.",
      });

      router.refresh();
    });
  }

  async function handleClearConnection() {
    if (activeConnectionString) {
      const confirmed = await confirm({
        title: "Clear session connection",
        message: "Clear the active session connection and reset the current workspace state?",
        confirmLabel: "Clear",
        cancelLabel: "Cancel",
        tone: "danger",
      });

      if (!confirmed) {
        return;
      }
    }

    startTransition(async () => {
      const result = await clearConnectionAction();

      setActiveConnectionString(null);
      setDraftConnectionString("");
      setLastTestedConnectionString(null);
      setWorkspaceRevision((current) => current + 1);
      setIsConnectionManagerOpen(true);
      setNotice({ tone: "neutral", message: result.message });
      router.refresh();
    });
  }

  function handleLoadRecentConnection(connectionString: string) {
    setDraftConnectionString(connectionString);
    setLastTestedConnectionString(null);
    setHighlightedRecentConnection(connectionString);
    setIsConnectionManagerOpen(true);
    setNotice({
      tone: "neutral",
      message: `Loaded recent connection: ${connectionString}. Test it, then activate when ready.`,
    });
  }

  async function handleRemoveRecentConnection(connectionString: string) {
    startTransition(async () => {
      const result = await removeRecentConnectionAction(connectionString);

      if (!result.ok) {
        setNotice({ tone: "error", message: "Could not remove recent connection." });
        return;
      }

      setRecentConnectionStrings(result.recentConnectionStrings);
      setNotice({ tone: "neutral", message: result.message });
      router.refresh();
    });
  }

  async function handleClearRecentConnections() {
    if (recentConnectionStrings.length === 0) {
      return;
    }

    const confirmed = await confirm({
      title: "Clear recent connections",
      message: "Clear all recent connection history?",
      confirmLabel: "Clear history",
      cancelLabel: "Cancel",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await clearRecentConnectionsAction();

      if (!result.ok) {
        setNotice({ tone: "error", message: "Could not clear recent connection history." });
        return;
      }

      setRecentConnectionStrings(result.recentConnectionStrings);
      setNotice({ tone: "neutral", message: result.message });
      router.refresh();
    });
  }

  function toggleActiveConnectionExpanded() {
    setIsActiveConnectionExpanded((current) => !current);
  }

  function toggleConnectionManager() {
    setIsConnectionManagerOpen((current) => !current);
  }

  return {
    activeConnectionDetails,
    activeConnectionString,
    draftConnectionString,
    handleActivateConnection,
    handleClearConnection,
    handleClearRecentConnections,
    handleDraftConnectionStringChange,
    handleLoadRecentConnection,
    handleRemoveRecentConnection,
    handleTestConnection,
    hasDraft,
    highlightedRecentConnection,
    isActiveConnectionExpanded,
    isConnectionManagerOpen,
    isPending,
    lastTestedConnectionString,
    notice,
    recentConnectionStrings,
    toggleActiveConnectionExpanded,
    toggleConnectionManager,
    workspaceRevision,
  };
}