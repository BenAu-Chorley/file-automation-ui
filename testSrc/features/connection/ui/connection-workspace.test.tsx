/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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

vi.mock("@/features/task-definition/ui/task-definition-workspace", () => ({
  TaskDefinitionWorkspace: ({ hasActiveConnection }: { hasActiveConnection: boolean }) => (
    <div data-testid="task-workspace">{hasActiveConnection ? "task-workspace-active" : "task-workspace-inactive"}</div>
  ),
}));

import { summarizeConnectionString } from "@/features/connection/connection-string";
import { ConnectionWorkspace } from "@/features/connection/ui/connection-workspace";
import { ConfirmProvider } from "@/components/ui/confirm-provider";

describe("connection-workspace", () => {
  const activeConnection = "Server=sql-a;Database=fa_a;Trusted_Connection=true;";
  const nextConnection = "Server=sql-b;Database=fa_b;User Id=sa;Password=secret;";

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

  it("toggles active connection detail expansion", () => {
    render(
      <ConfirmProvider>
        <ConnectionWorkspace
          initialConnectionString={activeConnection}
          initialRecentConnectionStrings={[nextConnection, activeConnection]}
        />
      </ConfirmProvider>,
    );

    expect(screen.queryByText("Trusted_Connection")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Expand active connection details" }));

    expect(screen.getByText("Server")).toBeTruthy();
    expect(screen.getByText("Database")).toBeTruthy();
    expect(screen.getByText("Trusted_Connection")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Collapse active connection details" }));

    expect(screen.queryByText("Trusted_Connection")).toBeNull();
  });

  it("loads a recent connection and confirms switching the active session connection", async () => {
    render(
      <ConfirmProvider>
        <ConnectionWorkspace
          initialConnectionString={activeConnection}
          initialRecentConnectionStrings={[nextConnection, activeConnection]}
        />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Manage connection" }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(summarizeConnectionString(nextConnection), "i") }));

    expect((screen.getByLabelText("SQL Server connection string") as HTMLTextAreaElement).value).toBe(nextConnection);

    fireEvent.click(screen.getByRole("button", { name: "Use this connection" }));

    expect(await screen.findByRole("dialog", { name: "Switch connection" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Switch" }));

    await waitFor(() => {
      expect(activateConnectionActionMock).toHaveBeenCalledWith(nextConnection);
    });

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Connection switched for this session. Dependent workspace state has been reset.")).toBeTruthy();
    expect(screen.getByTestId("task-workspace").textContent).toBe("task-workspace-active");
  });

  it("keeps the current connection when switch confirmation is cancelled", async () => {
    render(
      <ConfirmProvider>
        <ConnectionWorkspace
          initialConnectionString={activeConnection}
          initialRecentConnectionStrings={[nextConnection, activeConnection]}
        />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Manage connection" }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(summarizeConnectionString(nextConnection), "i") }));
    fireEvent.click(screen.getByRole("button", { name: "Use this connection" }));

    expect(await screen.findByRole("dialog", { name: "Switch connection" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Keep current" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Switch connection" })).toBeNull();
    });

    expect(activateConnectionActionMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("task-workspace").textContent).toBe("task-workspace-active");
  });

  it("does not clear the active session when clear confirmation is cancelled", async () => {
    render(
      <ConfirmProvider>
        <ConnectionWorkspace
          initialConnectionString={activeConnection}
          initialRecentConnectionStrings={[nextConnection, activeConnection]}
        />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Manage connection" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear session" }));

    expect(await screen.findByRole("dialog", { name: "Clear session connection" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Clear session connection" })).toBeNull();
    });

    expect(clearConnectionActionMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("task-workspace").textContent).toBe("task-workspace-active");
  });

  it("does not clear recent history when history confirmation is cancelled", async () => {
    render(
      <ConfirmProvider>
        <ConnectionWorkspace
          initialConnectionString={activeConnection}
          initialRecentConnectionStrings={[nextConnection, activeConnection]}
        />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Manage connection" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear history" }));

    expect(await screen.findByRole("dialog", { name: "Clear recent connections" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Clear recent connections" })).toBeNull();
    });

    expect(clearRecentConnectionsActionMock).not.toHaveBeenCalled();
    expect(screen.getByText(summarizeConnectionString(nextConnection))).toBeTruthy();
    expect(screen.getAllByText(summarizeConnectionString(activeConnection)).length).toBeGreaterThan(0);
  });

  it("clears the active session connection after confirmation", async () => {
    render(
      <ConfirmProvider>
        <ConnectionWorkspace
          initialConnectionString={activeConnection}
          initialRecentConnectionStrings={[nextConnection, activeConnection]}
        />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Manage connection" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear session" }));

    expect(await screen.findByRole("dialog", { name: "Clear session connection" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => {
      expect(clearConnectionActionMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Connection string cleared for this session.")).toBeTruthy();
    expect((screen.getByLabelText("SQL Server connection string") as HTMLTextAreaElement).value).toBe("");
    expect(screen.getByTestId("task-workspace").textContent).toBe("task-workspace-inactive");
  });

  it("clears recent history after confirmation", async () => {
    render(
      <ConfirmProvider>
        <ConnectionWorkspace
          initialConnectionString={activeConnection}
          initialRecentConnectionStrings={[nextConnection, activeConnection]}
        />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Manage connection" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear history" }));

    const dialog = await screen.findByRole("dialog", { name: "Clear recent connections" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Clear history" }));

    await waitFor(() => {
      expect(clearRecentConnectionsActionMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Recent connection history cleared.")).toBeTruthy();
    expect(screen.getByText("No recent connections yet. Activated connections will appear here for quick reuse.")).toBeTruthy();
    expect(screen.getByTestId("task-workspace").textContent).toBe("task-workspace-active");
  });

  it("edits draft, tests connection, and deletes a recent entry", async () => {
    render(
      <ConfirmProvider>
        <ConnectionWorkspace
          initialConnectionString={activeConnection}
          initialRecentConnectionStrings={[nextConnection, activeConnection]}
        />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Manage connection" }));

    fireEvent.change(screen.getByLabelText("SQL Server connection string"), {
      target: { value: nextConnection },
    });
    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));

    await waitFor(() => {
      expect(testConnectionActionMock).toHaveBeenCalledWith(nextConnection);
    });

    const deleteButtons = await screen.findAllByRole("button", { name: "Delete" });
    const enabledDelete = deleteButtons.find((button) => !(button as HTMLButtonElement).disabled);
    fireEvent.click(enabledDelete as HTMLButtonElement);

    await waitFor(() => {
      expect(removeRecentConnectionActionMock).toHaveBeenCalledTimes(1);
    });
  });
});