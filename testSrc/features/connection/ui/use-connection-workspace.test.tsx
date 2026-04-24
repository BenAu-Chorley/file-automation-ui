/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, renderHook, screen, waitFor, within } from "@testing-library/react";

const {
  activateConnectionActionMock,
  clearConnectionActionMock,
  clearRecentConnectionsActionMock,
  refreshMock,
  removeRecentConnectionActionMock,
  testConnectionActionMock,
} = vi.hoisted(() => ({
  activateConnectionActionMock: vi.fn(),
  clearConnectionActionMock: vi.fn(),
  clearRecentConnectionsActionMock: vi.fn(),
  refreshMock: vi.fn(),
  removeRecentConnectionActionMock: vi.fn(),
  testConnectionActionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/features/connection/actions", () => ({
  activateConnectionAction: activateConnectionActionMock,
  clearConnectionAction: clearConnectionActionMock,
  clearRecentConnectionsAction: clearRecentConnectionsActionMock,
  removeRecentConnectionAction: removeRecentConnectionActionMock,
  testConnectionAction: testConnectionActionMock,
}));

import { ConfirmProvider } from "@/components/ui/confirm-provider";
import { summarizeConnectionString } from "@/features/connection/connection-string";
import { useConnectionWorkspace } from "@/features/connection/ui/use-connection-workspace";

describe("use-connection-workspace", () => {
  const activeConnection = "Server=sql-a;Database=fa_a;Trusted_Connection=true;";
  const nextConnection = "Server=sql-b;Database=fa_b;User Id=sa;Password=secret;";
  const thirdConnection = "Server=sql-c;Database=fa_c;Trusted_Connection=true;";

  function wrapper({ children }: { children: ReactNode }) {
    return <ConfirmProvider>{children}</ConfirmProvider>;
  }

  beforeEach(() => {
    vi.clearAllMocks();

    activateConnectionActionMock.mockResolvedValue({
      ok: true,
      message: "Connection activated for this session.",
      connectionSummary: summarizeConnectionString(nextConnection),
      normalizedConnectionString: nextConnection,
      connectionDetails: [],
      usesIntegratedSecurity: false,
    });
    clearConnectionActionMock.mockResolvedValue({
      ok: true,
      message: "Connection string cleared for this session.",
      connectionSummary: null,
      normalizedConnectionString: null,
      connectionDetails: [],
      usesIntegratedSecurity: false,
    });
    clearRecentConnectionsActionMock.mockResolvedValue({ ok: true, message: "Recent connection history cleared.", recentConnectionStrings: [] });
    removeRecentConnectionActionMock.mockResolvedValue({ ok: true, message: "Recent connection removed.", recentConnectionStrings: [activeConnection] });
    testConnectionActionMock.mockResolvedValue({
      ok: true,
      message: "Connection test succeeded.",
      connectionSummary: summarizeConnectionString(nextConnection),
      normalizedConnectionString: nextConnection,
      connectionDetails: [],
      usesIntegratedSecurity: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("increments workspace revision and reorders recent connections when switching connections", async () => {
    const { result } = renderHook(
      () => useConnectionWorkspace({
        initialConnectionString: activeConnection,
        initialRecentConnectionStrings: [thirdConnection, activeConnection, nextConnection],
      }),
      { wrapper },
    );

    act(() => {
      result.current.handleLoadRecentConnection(nextConnection);
    });

    expect(result.current.draftConnectionString).toBe(nextConnection);
    expect(result.current.highlightedRecentConnection).toBe(nextConnection);

    act(() => {
      void result.current.handleActivateConnection();
    });

    const dialog = await screen.findByRole("dialog", { name: "Switch connection" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Switch" }));

    await waitFor(() => {
      expect(activateConnectionActionMock).toHaveBeenCalledWith(nextConnection);
    });

    await waitFor(() => {
      expect(result.current.activeConnectionString).toBe(nextConnection);
      expect(result.current.workspaceRevision).toBe(2);
      expect(result.current.recentConnectionStrings).toEqual([nextConnection, thirdConnection, activeConnection]);
    });

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("clears the active connection and reopens the manager after confirmation", async () => {
    const { result } = renderHook(
      () => useConnectionWorkspace({
        initialConnectionString: activeConnection,
        initialRecentConnectionStrings: [thirdConnection, activeConnection, nextConnection],
      }),
      { wrapper },
    );

    expect(result.current.isConnectionManagerOpen).toBe(false);

    act(() => {
      void result.current.handleClearConnection();
    });

    const dialog = await screen.findByRole("dialog", { name: "Clear session connection" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Clear" }));

    await waitFor(() => {
      expect(clearConnectionActionMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.activeConnectionString).toBeNull();
      expect(result.current.draftConnectionString).toBe("");
      expect(result.current.isConnectionManagerOpen).toBe(true);
      expect(result.current.workspaceRevision).toBe(2);
    });

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("activates directly without confirmation when no active connection exists", async () => {
    const { result } = renderHook(
      () => useConnectionWorkspace({
        initialConnectionString: null,
        initialRecentConnectionStrings: [],
      }),
      { wrapper },
    );

    act(() => {
      result.current.handleDraftConnectionStringChange(nextConnection);
    });

    act(() => {
      void result.current.handleActivateConnection();
    });

    await waitFor(() => {
      expect(activateConnectionActionMock).toHaveBeenCalledWith(nextConnection);
      expect(result.current.activeConnectionString).toBe(nextConnection);
    });

    expect(screen.queryByRole("dialog", { name: "Switch connection" })).toBeNull();
  });

  it("shows error notice when activate connection action fails", async () => {
    activateConnectionActionMock.mockResolvedValueOnce({
      ok: false,
      message: "Could not activate connection.",
      normalizedConnectionString: null,
      connectionSummary: null,
      connectionDetails: [],
      usesIntegratedSecurity: false,
    });

    const { result } = renderHook(
      () => useConnectionWorkspace({
        initialConnectionString: null,
        initialRecentConnectionStrings: [],
      }),
      { wrapper },
    );

    act(() => {
      result.current.handleDraftConnectionStringChange(nextConnection);
    });

    act(() => {
      void result.current.handleActivateConnection();
    });

    await waitFor(() => {
      expect(result.current.notice?.tone).toBe("error");
      expect(result.current.notice?.message).toBe("Could not activate connection.");
    });
  });

  it("updates tested state on test action success and failure", async () => {
    testConnectionActionMock
      .mockResolvedValueOnce({
        ok: true,
        message: "Connection test succeeded.",
        connectionSummary: summarizeConnectionString(nextConnection),
        normalizedConnectionString: nextConnection,
        connectionDetails: [],
        usesIntegratedSecurity: false,
      })
      .mockResolvedValueOnce({
        ok: false,
        message: "Connection test failed.",
        connectionSummary: null,
        normalizedConnectionString: null,
        connectionDetails: [],
        usesIntegratedSecurity: false,
      });

    const { result } = renderHook(
      () => useConnectionWorkspace({
        initialConnectionString: null,
        initialRecentConnectionStrings: [],
      }),
      { wrapper },
    );

    act(() => {
      result.current.handleDraftConnectionStringChange(nextConnection);
    });

    act(() => {
      void result.current.handleTestConnection();
    });

    await waitFor(() => {
      expect(result.current.lastTestedConnectionString).toBe(nextConnection);
      expect(result.current.notice?.tone).toBe("success");
    });

    act(() => {
      result.current.handleDraftConnectionStringChange(`${nextConnection} `);
      void result.current.handleTestConnection();
    });

    await waitFor(() => {
      expect(result.current.lastTestedConnectionString).toBeNull();
      expect(result.current.notice?.tone).toBe("error");
    });
  });

  it("handles remove and clear recent connection failures", async () => {
    removeRecentConnectionActionMock.mockResolvedValueOnce({
      ok: false,
      message: "failed",
      recentConnectionStrings: [activeConnection],
    });
    clearRecentConnectionsActionMock.mockResolvedValueOnce({
      ok: false,
      message: "failed",
      recentConnectionStrings: [activeConnection],
    });

    const { result } = renderHook(
      () => useConnectionWorkspace({
        initialConnectionString: activeConnection,
        initialRecentConnectionStrings: [activeConnection, nextConnection],
      }),
      { wrapper },
    );

    act(() => {
      void result.current.handleRemoveRecentConnection(nextConnection);
    });

    await waitFor(() => {
      expect(result.current.notice?.message).toBe("Could not remove recent connection.");
    });

    act(() => {
      void result.current.handleClearRecentConnections();
    });

    const dialog = await screen.findByRole("dialog", { name: "Clear recent connections" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear history" }));

    await waitFor(() => {
      expect(result.current.notice?.message).toBe("Could not clear recent connection history.");
    });
  });

  it("toggles expansion and manager visibility", async () => {
    const { result } = renderHook(
      () => useConnectionWorkspace({
        initialConnectionString: activeConnection,
        initialRecentConnectionStrings: [activeConnection],
      }),
      { wrapper },
    );

    expect(result.current.isActiveConnectionExpanded).toBe(false);
    expect(result.current.isConnectionManagerOpen).toBe(false);

    act(() => {
      result.current.toggleActiveConnectionExpanded();
      result.current.toggleConnectionManager();
    });

    expect(result.current.isActiveConnectionExpanded).toBe(true);
    expect(result.current.isConnectionManagerOpen).toBe(true);
  });
});