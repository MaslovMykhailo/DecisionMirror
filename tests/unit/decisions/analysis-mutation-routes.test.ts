import { describe, expect, it, vi } from "vitest";

// The after() callback flushes server analytics, which lazily imports the server-only
// PostHog module; stub server-only so it loads under jsdom.
vi.mock("server-only", () => ({}));

import {
  createDecisionAnalysisRetryPostHandler,
  createDecisionReanalysisPostHandler,
} from "@/lib/decisions/http";

const now = new Date("2026-05-30T12:00:00.000Z");
const staleUpdatedAt = new Date("2026-05-30T11:49:59.000Z");
const recentUpdatedAt = new Date("2026-05-30T11:55:00.000Z");
const timeoutMs = 10 * 60 * 1000;

function createRequest(body?: unknown) {
  return new Request("https://decision-mirror.test/api/decisions/decision_1/retry", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createContext(decisionId = "decision_1") {
  return { params: Promise.resolve({ decisionId }) };
}

function ownerDb(
  overrides: {
    latest?: Record<string, unknown> | null;
    created?: Record<string, unknown>;
    updated?: Record<string, unknown>;
  } = {},
) {
  return {
    decision: { findFirst: vi.fn().mockResolvedValue({ id: "decision_1" }) },
    analysis: {
      findFirst: vi.fn().mockResolvedValue(
        overrides.latest ?? {
          id: "analysis_failed",
          version: 2,
          status: "failed",
          updatedAt: recentUpdatedAt,
        },
      ),
      update: vi.fn().mockResolvedValue(
        overrides.updated ?? {
          id: "analysis_failed",
          version: 2,
          status: "processing",
          updatedAt: now,
        },
      ),
      aggregate: vi.fn().mockResolvedValue({ _max: { version: 2 } }),
      create: vi.fn().mockResolvedValue(
        overrides.created ?? {
          id: "analysis_3",
          version: 3,
          status: "processing",
          updatedAt: now,
        },
      ),
    },
  };
}

describe("analysis retry route handler", () => {
  it("denies unauthenticated retry requests", async () => {
    const db = ownerDb();
    const POST = createDecisionAnalysisRetryPostHandler({
      getUser: async () => ({ authenticated: false, reason: "unauthenticated" }),
      db,
    });

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ status: "unauthenticated" });
    expect(db.analysis.update).not.toHaveBeenCalled();
  });

  it("denies retry for decisions outside the session user", async () => {
    const db = ownerDb();
    db.decision.findFirst.mockResolvedValue(null);
    const POST = createDecisionAnalysisRetryPostHandler({
      getUser: async () => ({ authenticated: true, userId: "user_session" }),
      db,
    });

    const response = await POST(createRequest(), createContext("decision_other"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ status: "not_found" });
    expect(db.analysis.update).not.toHaveBeenCalled();
  });

  it("returns conflict and does not schedule retry for active processing analyses", async () => {
    const db = ownerDb({
      latest: {
        id: "analysis_active",
        version: 3,
        status: "processing",
        updatedAt: recentUpdatedAt,
      },
    });
    const scheduleAfter = vi.fn();
    const triggerAnalysis = vi.fn();
    const POST = createDecisionAnalysisRetryPostHandler({
      getUser: async () => ({ authenticated: true, userId: "user_session" }),
      db,
      scheduleAfter,
      triggerAnalysis,
      now: () => now,
      stalledTimeoutMs: timeoutMs,
    });

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ status: "already_processing" });
    expect(db.analysis.update).not.toHaveBeenCalled();
    expect(scheduleAfter).not.toHaveBeenCalled();
    expect(triggerAnalysis).not.toHaveBeenCalled();
  });

  it("retries a retryable analysis and schedules runAgent through after", async () => {
    const db = ownerDb({
      latest: {
        id: "analysis_stalled",
        version: 2,
        status: "processing",
        updatedAt: staleUpdatedAt,
      },
      updated: {
        id: "analysis_stalled",
        version: 2,
        status: "processing",
        updatedAt: now,
      },
    });
    const scheduledCallbacks: Array<() => void | Promise<void>> = [];
    const triggerAnalysis = vi.fn();
    const POST = createDecisionAnalysisRetryPostHandler({
      getUser: async () => ({ authenticated: true, userId: "user_session" }),
      db,
      scheduleAfter: (callback) => scheduledCallbacks.push(callback),
      triggerAnalysis,
      now: () => now,
      stalledTimeoutMs: timeoutMs,
    });

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      status: "success",
      analysis: {
        analysisId: "analysis_stalled",
        version: 2,
        status: "processing",
        updatedAt: now.toISOString(),
        isStalled: false,
        retryable: false,
      },
    });
    expect(triggerAnalysis).not.toHaveBeenCalled();
    expect(scheduledCallbacks).toHaveLength(1);

    await scheduledCallbacks[0]?.();
    expect(triggerAnalysis).toHaveBeenCalledWith("decision_1");
  });
});

describe("re-analysis route handler", () => {
  it("denies unauthenticated re-analysis requests", async () => {
    const db = ownerDb();
    const POST = createDecisionReanalysisPostHandler({
      getUser: async () => ({ authenticated: false, reason: "unauthenticated" }),
      db,
    });

    const response = await POST(createRequest({ locale: "uk" }), createContext());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ status: "unauthenticated" });
    expect(db.analysis.create).not.toHaveBeenCalled();
  });

  it("denies re-analysis for decisions outside the session user", async () => {
    const db = ownerDb();
    db.decision.findFirst.mockResolvedValue(null);
    const POST = createDecisionReanalysisPostHandler({
      getUser: async () => ({ authenticated: true, userId: "user_session" }),
      db,
    });

    const response = await POST(createRequest({ locale: "uk" }), createContext("decision_other"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ status: "not_found" });
    expect(db.analysis.create).not.toHaveBeenCalled();
  });

  it("returns conflict and does not schedule duplicate active processing re-analysis", async () => {
    const db = ownerDb({
      latest: {
        id: "analysis_active",
        version: 3,
        status: "processing",
        updatedAt: recentUpdatedAt,
      },
    });
    const scheduleAfter = vi.fn();
    const triggerAnalysis = vi.fn();
    const POST = createDecisionReanalysisPostHandler({
      getUser: async () => ({ authenticated: true, userId: "user_session" }),
      db,
      scheduleAfter,
      triggerAnalysis,
      now: () => now,
      stalledTimeoutMs: timeoutMs,
    });

    const response = await POST(createRequest({ locale: "uk" }), createContext());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ status: "already_processing" });
    expect(db.analysis.create).not.toHaveBeenCalled();
    expect(scheduleAfter).not.toHaveBeenCalled();
    expect(triggerAnalysis).not.toHaveBeenCalled();
  });

  it("creates a localized re-analysis and schedules runAgent through after", async () => {
    const db = ownerDb({
      latest: {
        id: "analysis_ready",
        version: 2,
        status: "ready",
        updatedAt: recentUpdatedAt,
      },
    });
    const scheduledCallbacks: Array<() => void | Promise<void>> = [];
    const triggerAnalysis = vi.fn();
    const POST = createDecisionReanalysisPostHandler({
      getUser: async () => ({ authenticated: true, userId: "user_session" }),
      db,
      scheduleAfter: (callback) => scheduledCallbacks.push(callback),
      triggerAnalysis,
      now: () => now,
      stalledTimeoutMs: timeoutMs,
    });

    const response = await POST(createRequest({ locale: "uk" }), createContext());

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      status: "success",
      analysis: {
        analysisId: "analysis_3",
        version: 3,
        status: "processing",
        updatedAt: now.toISOString(),
        isStalled: false,
        retryable: false,
      },
    });
    expect(db.analysis.create).toHaveBeenCalledWith({
      data: {
        decisionId: "decision_1",
        version: 3,
        status: "processing",
        locale: "uk",
        updatedAt: now,
      },
      select: {
        id: true,
        version: true,
        status: true,
        updatedAt: true,
      },
    });
    expect(triggerAnalysis).not.toHaveBeenCalled();
    expect(scheduledCallbacks).toHaveLength(1);

    await scheduledCallbacks[0]?.();
    expect(triggerAnalysis).toHaveBeenCalledWith("decision_1");
  });
});
