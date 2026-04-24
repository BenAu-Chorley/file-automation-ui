/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  authenticationLabel,
  formatConnectionTitle,
  renderConnectionDetails,
} from "@/features/connection/ui/connection-workspace-utils";
import type { ConnectionDetail } from "@/features/connection/connection-string";

describe("connection-workspace-utils", () => {
  it("formats connection titles from the summarized connection string", () => {
    expect(formatConnectionTitle("Server=sql-a;Database=fa_a;Trusted_Connection=true;")).toBe("sql-a / fa_a / Windows auth");
  });

  it("returns the expected authentication labels", () => {
    expect(authenticationLabel(null)).toBe("No active connection");
    expect(authenticationLabel("Server=sql-a;Database=fa_a;Trusted_Connection=true;")).toBe("Windows authentication");
    expect(authenticationLabel("Server=sql-b;Database=fa_b;User Id=sa;Password=secret;")).toBe("SQL authentication");
  });

  it("renders an empty-state message when no connection details exist", () => {
    render(<>{renderConnectionDetails([])}</>);

    expect(screen.getByText("No active connection for this session yet.")).toBeTruthy();
  });

  it("renders connection detail cards for parsed details", () => {
    const details: ConnectionDetail[] = [
      {
        key: "Server",
        normalizedKey: "server",
        value: "sql-a",
        displayValue: "sql-a",
        isSensitive: false,
      },
      {
        key: "Password",
        normalizedKey: "password",
        value: "secret",
        displayValue: "********",
        isSensitive: true,
      },
    ];

    render(<>{renderConnectionDetails(details)}</>);

    expect(screen.getByText("Server")).toBeTruthy();
    expect(screen.getByText("sql-a")).toBeTruthy();
    expect(screen.getByText("Password")).toBeTruthy();
    expect(screen.getByText("********")).toBeTruthy();
  });
});