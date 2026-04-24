import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
}));

type CookieRecord = {
  value: string;
};

type CookieSetCall = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

let cookieMap = new Map<string, CookieRecord>();
let setCalls: CookieSetCall[] = [];

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

import {
  clearRecentConnectionStrings,
  clearSessionConnectionString,
  getConnectionSessionSnapshot,
  getRecentConnectionStrings,
  getSessionConnectionString,
  removeRecentConnectionString,
  setSessionConnectionString,
} from "@/features/connection/session/connection-session";

function buildCookieStore() {
  return {
    get: (name: string) => cookieMap.get(name),
    set: (name: string, value: string, options: Record<string, unknown>) => {
      setCalls.push({ name, value, options });
      cookieMap.set(name, { value });
    },
  };
}

describe("connection-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieMap = new Map();
    setCalls = [];

    cookiesMock.mockResolvedValue(buildCookieStore());
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when active connection cookie is missing or blank", async () => {
    expect(await getSessionConnectionString()).toBeNull();

    cookieMap.set("fa_connection_string", { value: "   " });

    expect(await getSessionConnectionString()).toBeNull();
  });

  it("returns a trimmed active connection string", async () => {
    cookieMap.set("fa_connection_string", { value: "  Server=localhost;Database=fa;  " });

    expect(await getSessionConnectionString()).toBe("Server=localhost;Database=fa;");
  });

  it("returns empty recent list for missing or invalid cookies", async () => {
    expect(await getRecentConnectionStrings()).toEqual([]);

    cookieMap.set("fa_recent_connection_strings", { value: "not-json" });

    expect(await getRecentConnectionStrings()).toEqual([]);
  });

  it("normalizes recent connection strings from cookie payload", async () => {
    cookieMap.set("fa_recent_connection_strings", {
      value: JSON.stringify([
        "  Server=a;Database=db;  ",
        "Server=b;Database=db;",
        "Server=b;Database=db;",
        "",
        123,
        "Server=c;Database=db;",
        "Server=d;Database=db;",
        "Server=e;Database=db;",
        "Server=f;Database=db;",
      ]),
    });

    expect(await getRecentConnectionStrings()).toEqual([
      "Server=a;Database=db;",
      "Server=b;Database=db;",
      "Server=c;Database=db;",
      "Server=d;Database=db;",
      "Server=e;Database=db;",
    ]);
  });

  it("builds a snapshot from active and recent cookies", async () => {
    cookieMap.set("fa_connection_string", { value: "Server=active;Database=fa;" });
    cookieMap.set("fa_recent_connection_strings", {
      value: JSON.stringify(["Server=active;Database=fa;", "Server=older;Database=fa;"]),
    });

    await expect(getConnectionSessionSnapshot()).resolves.toEqual({
      activeConnectionString: "Server=active;Database=fa;",
      recentConnectionStrings: ["Server=active;Database=fa;", "Server=older;Database=fa;"],
    });
  });

  it("removeRecentConnectionString returns existing list for blank input", async () => {
    cookieMap.set("fa_recent_connection_strings", {
      value: JSON.stringify(["Server=a;Database=fa;", "Server=b;Database=fa;"]),
    });

    await expect(removeRecentConnectionString("   ")).resolves.toEqual([
      "Server=a;Database=fa;",
      "Server=b;Database=fa;",
    ]);
    expect(setCalls).toHaveLength(0);
  });

  it("removeRecentConnectionString removes only the requested entry and persists result", async () => {
    cookieMap.set("fa_recent_connection_strings", {
      value: JSON.stringify(["Server=a;Database=fa;", "Server=b;Database=fa;", "Server=c;Database=fa;"]),
    });

    await expect(removeRecentConnectionString(" Server=b;Database=fa; ")).resolves.toEqual([
      "Server=a;Database=fa;",
      "Server=c;Database=fa;",
    ]);

    const setCall = setCalls.find((entry) => entry.name === "fa_recent_connection_strings");
    expect(setCall?.value).toBe(JSON.stringify(["Server=a;Database=fa;", "Server=c;Database=fa;"]));
    expect(setCall?.options.maxAge).toBe(60 * 60 * 24 * 30);
    expect(setCall?.options.secure).toBe(false);
  });

  it("setSessionConnectionString updates active and recent cookies with de-duplication", async () => {
    cookieMap.set("fa_recent_connection_strings", {
      value: JSON.stringify([
        "Server=old-1;Database=fa;",
        "Server=old-2;Database=fa;",
        "Server=old-3;Database=fa;",
        "Server=old-4;Database=fa;",
        "Server=old-5;Database=fa;",
      ]),
    });

    await setSessionConnectionString("Server=old-3;Database=fa;");

    const activeCall = setCalls.find((entry) => entry.name === "fa_connection_string");
    const recentsCall = setCalls.find((entry) => entry.name === "fa_recent_connection_strings");

    expect(activeCall?.value).toBe("Server=old-3;Database=fa;");
    expect(recentsCall?.value).toBe(
      JSON.stringify([
        "Server=old-3;Database=fa;",
        "Server=old-1;Database=fa;",
        "Server=old-2;Database=fa;",
        "Server=old-4;Database=fa;",
        "Server=old-5;Database=fa;",
      ]),
    );
  });

  it("clearRecentConnectionStrings expires the recents cookie", async () => {
    await clearRecentConnectionStrings();

    const setCall = setCalls.find((entry) => entry.name === "fa_recent_connection_strings");

    expect(setCall?.value).toBe("");
    expect(setCall?.options.maxAge).toBe(0);
    expect(setCall?.options.expires).toEqual(new Date(0));
  });

  it("clearSessionConnectionString expires the active cookie", async () => {
    await clearSessionConnectionString();

    const setCall = setCalls.find((entry) => entry.name === "fa_connection_string");

    expect(setCall?.value).toBe("");
    expect(setCall?.options.maxAge).toBe(0);
    expect(setCall?.options.expires).toEqual(new Date(0));
  });

  it("marks cookie writes as secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await setSessionConnectionString("Server=prod;Database=fa;");

    const setCall = setCalls.find((entry) => entry.name === "fa_connection_string");
    expect(setCall?.options.secure).toBe(true);
  });
});
