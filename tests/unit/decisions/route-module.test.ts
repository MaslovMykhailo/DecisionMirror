import { beforeEach, describe, expect, it, vi } from "vitest";

describe("decision route module wiring", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("schedules the real runAgent entrypoint through the route after seam", async () => {
    const after = vi.fn();
    const POST = vi.fn();
    const createDecisionPostHandler = vi.fn(() => POST);
    const getAuthenticatedUserId = vi.fn();
    const runAgent = vi.fn();

    vi.doMock("next/server", () => ({ after }));
    vi.doMock("@/lib/auth/server-session", () => ({ getAuthenticatedUserId }));
    vi.doMock("@/lib/decisions/http", () => ({ createDecisionPostHandler }));
    vi.doMock("@/agent", () => ({ runAgent }));

    const route = await import("@/app/api/decisions/route");

    expect(route.POST).toBe(POST);
    expect(createDecisionPostHandler).toHaveBeenCalledWith({
      getUser: getAuthenticatedUserId,
      scheduleAfter: after,
      triggerAnalysis: runAgent,
    });
  });
});
