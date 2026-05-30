import { describe, expect, it } from "vitest";

import { sessionUserIdResult } from "@/lib/auth/session";

describe("session helper utilities", () => {
  it("returns the authenticated user ID from a session", () => {
    expect(sessionUserIdResult({ user: { id: "user_123" } })).toEqual({
      authenticated: true,
      userId: "user_123",
    });
  });

  it("returns a typed unauthenticated result when the session has no user ID", () => {
    expect(sessionUserIdResult({ user: {} })).toEqual({
      authenticated: false,
      reason: "unauthenticated",
    });
    expect(sessionUserIdResult(null)).toEqual({
      authenticated: false,
      reason: "unauthenticated",
    });
  });
});
