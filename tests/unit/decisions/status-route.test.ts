import { describe, expect, it, vi } from "vitest";

import { createDecisionStatusGetHandler } from "@/lib/decisions/status-http";

const updatedAt = new Date("2026-05-30T12:00:00.000Z");

function createRequest() {
  return new Request("https://decision-mirror.test/api/decisions/decision_1/status");
}

function createContext(decisionId = "decision_1") {
  return { params: Promise.resolve({ decisionId }) };
}

describe("decision analysis status route", () => {
  it("returns the current analysis status for an authenticated owner", async () => {
    const db = {
      analysis: {
        findFirst: vi.fn().mockResolvedValue({
          id: "analysis_1",
          version: 2,
          status: "processing",
          updatedAt,
          failureReason: null,
        }),
      },
    };
    const GET = createDecisionStatusGetHandler({
      getUser: async () => ({ authenticated: true, userId: "user_1" }),
      db,
      now: () => updatedAt,
    });

    const response = await GET(createRequest(), createContext());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      analysisId: "analysis_1",
      version: 2,
      status: "processing",
      updatedAt: updatedAt.toISOString(),
      isStalled: false,
      retryable: false,
    });
    expect(db.analysis.findFirst).toHaveBeenCalledWith({
      where: { decisionId: "decision_1", decision: { userId: "user_1" } },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        status: true,
        updatedAt: true,
        failureReason: true,
      },
    });
  });

  it("denies unauthenticated status requests", async () => {
    const db = { analysis: { findFirst: vi.fn() } };
    const GET = createDecisionStatusGetHandler({
      getUser: async () => ({ authenticated: false, reason: "unauthenticated" }),
      db,
    });

    const response = await GET(createRequest(), createContext());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ status: "unauthenticated" });
    expect(db.analysis.findFirst).not.toHaveBeenCalled();
  });

  it("denies cross-user status requests without returning private data", async () => {
    const db = { analysis: { findFirst: vi.fn().mockResolvedValue(null) } };
    const GET = createDecisionStatusGetHandler({
      getUser: async () => ({ authenticated: true, userId: "user_1" }),
      db,
    });

    const response = await GET(createRequest(), createContext("decision_other"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ status: "not_found" });
  });

  it("includes failureReason only for failed analyses", async () => {
    const db = {
      analysis: {
        findFirst: vi.fn().mockResolvedValue({
          id: "analysis_failed",
          version: 3,
          status: "failed",
          updatedAt,
          failureReason: "The structured analysis output did not match the contract.",
        }),
      },
    };
    const GET = createDecisionStatusGetHandler({
      getUser: async () => ({ authenticated: true, userId: "user_1" }),
      db,
    });

    const response = await GET(createRequest(), createContext());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      analysisId: "analysis_failed",
      version: 3,
      status: "failed",
      updatedAt: updatedAt.toISOString(),
      isStalled: false,
      retryable: true,
      failureReason: "The structured analysis output did not match the contract.",
    });
  });

  it("returns stalled retryability metadata for stale processing analyses", async () => {
    const staleUpdatedAt = new Date("2026-05-30T11:49:59.000Z");
    const db = {
      analysis: {
        findFirst: vi.fn().mockResolvedValue({
          id: "analysis_stalled",
          version: 4,
          status: "processing",
          updatedAt: staleUpdatedAt,
          failureReason: null,
        }),
      },
    };
    const GET = createDecisionStatusGetHandler({
      getUser: async () => ({ authenticated: true, userId: "user_1" }),
      db,
      now: () => updatedAt,
      stalledTimeoutMs: 10 * 60 * 1000,
    });

    const response = await GET(createRequest(), createContext());

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({
      analysisId: "analysis_stalled",
      version: 4,
      status: "processing",
      updatedAt: staleUpdatedAt.toISOString(),
      isStalled: true,
      retryable: true,
    });
    expect(JSON.stringify(payload)).not.toContain("Choosing between");
    expect(JSON.stringify(payload)).not.toContain("Accept the offer");
  });
});
