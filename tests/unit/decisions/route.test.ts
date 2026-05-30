import { describe, expect, it, vi } from "vitest";

import { createDecisionPostHandler } from "@/lib/decisions/http";

describe("decision route protection", () => {
  it("returns 401 for unauthenticated decision creation requests", async () => {
    const db = {
      decision: { create: vi.fn() },
      analysis: { create: vi.fn() },
    };
    const POST = createDecisionPostHandler({
      getUser: async () => ({ authenticated: false, reason: "unauthenticated" }),
      db,
    });

    const response = await POST(
      new Request("https://decision-mirror.test/api/decisions", {
        method: "POST",
        body: JSON.stringify({ situation: "S", decision: "D" }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ status: "unauthenticated" });
    expect(db.decision.create).not.toHaveBeenCalled();
  });
});
