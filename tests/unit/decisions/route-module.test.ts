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

  it("wires the retry route to authenticated user lookup and after scheduling", async () => {
    const after = vi.fn();
    const POST = vi.fn();
    const createDecisionAnalysisRetryPostHandler = vi.fn(() => POST);
    const getAuthenticatedUserId = vi.fn();
    const runAgent = vi.fn();

    vi.doMock("next/server", () => ({ after }));
    vi.doMock("@/lib/auth/server-session", () => ({ getAuthenticatedUserId }));
    vi.doMock("@/lib/decisions/http", () => ({ createDecisionAnalysisRetryPostHandler }));
    vi.doMock("@/agent", () => ({ runAgent }));

    const route = await import("@/app/api/decisions/[decisionId]/retry/route");

    expect(route.POST).toBe(POST);
    expect(createDecisionAnalysisRetryPostHandler).toHaveBeenCalledWith({
      getUser: getAuthenticatedUserId,
      scheduleAfter: after,
      triggerAnalysis: runAgent,
    });
  });

  it("wires the re-analysis route to authenticated user lookup and after scheduling", async () => {
    const after = vi.fn();
    const POST = vi.fn();
    const createDecisionReanalysisPostHandler = vi.fn(() => POST);
    const getAuthenticatedUserId = vi.fn();
    const runAgent = vi.fn();

    vi.doMock("next/server", () => ({ after }));
    vi.doMock("@/lib/auth/server-session", () => ({ getAuthenticatedUserId }));
    vi.doMock("@/lib/decisions/http", () => ({ createDecisionReanalysisPostHandler }));
    vi.doMock("@/agent", () => ({ runAgent }));

    const route = await import("@/app/api/decisions/[decisionId]/reanalyze/route");

    expect(route.POST).toBe(POST);
    expect(createDecisionReanalysisPostHandler).toHaveBeenCalledWith({
      getUser: getAuthenticatedUserId,
      scheduleAfter: after,
      triggerAnalysis: runAgent,
    });
  });
});
