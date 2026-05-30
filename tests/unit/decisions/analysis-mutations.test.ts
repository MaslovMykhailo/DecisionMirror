import { describe, expect, it, vi } from "vitest";

import { reanalyzeDecision, retryDecisionAnalysis } from "@/lib/decisions/service";

const authenticated = { authenticated: true as const, userId: "user_session" };
const now = new Date("2026-05-30T12:00:00.000Z");
const staleUpdatedAt = new Date("2026-05-30T11:49:59.000Z");
const recentUpdatedAt = new Date("2026-05-30T11:55:00.000Z");
const timeoutMs = 10 * 60 * 1000;

function ownerDecision() {
  return { id: "decision_1" };
}

describe("analysis retry service", () => {
  it("retries the newest failed analysis in place and schedules analysis", async () => {
    const db = {
      decision: { findFirst: vi.fn().mockResolvedValue(ownerDecision()) },
      analysis: {
        findFirst: vi.fn().mockResolvedValue({
          id: "analysis_failed",
          version: 2,
          status: "failed",
          updatedAt: recentUpdatedAt,
          locale: "uk",
        }),
        update: vi.fn().mockResolvedValue({
          id: "analysis_failed",
          version: 2,
          status: "processing",
          updatedAt: now,
        }),
      },
    };
    const triggerAnalysis = vi.fn();

    await expect(
      retryDecisionAnalysis("decision_1", {
        getUser: async () => authenticated,
        db,
        triggerAnalysis,
        now: () => now,
        stalledTimeoutMs: timeoutMs,
      }),
    ).resolves.toEqual({
      status: "success",
      analysis: {
        analysisId: "analysis_failed",
        version: 2,
        status: "processing",
        updatedAt: now.toISOString(),
        isStalled: false,
        retryable: false,
      },
    });

    expect(db.analysis.update).toHaveBeenCalledWith({
      where: { id: "analysis_failed" },
      data: { status: "processing", failureReason: null, updatedAt: now },
      select: {
        id: true,
        version: true,
        status: true,
        updatedAt: true,
      },
    });
    expect(triggerAnalysis).toHaveBeenCalledWith("decision_1");
  });

  it("retries a stalled processing analysis by refreshing the same row", async () => {
    const db = {
      decision: { findFirst: vi.fn().mockResolvedValue(ownerDecision()) },
      analysis: {
        findFirst: vi.fn().mockResolvedValue({
          id: "analysis_stalled",
          version: 3,
          status: "processing",
          updatedAt: staleUpdatedAt,
          locale: "en",
        }),
        update: vi.fn().mockResolvedValue({
          id: "analysis_stalled",
          version: 3,
          status: "processing",
          updatedAt: now,
        }),
      },
    };
    const triggerAnalysis = vi.fn();

    const result = await retryDecisionAnalysis("decision_1", {
      getUser: async () => authenticated,
      db,
      triggerAnalysis,
      now: () => now,
      stalledTimeoutMs: timeoutMs,
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.analysis.analysisId).toBe("analysis_stalled");
    expect(result.analysis.version).toBe(3);
    expect(result.analysis.updatedAt).toBe(now.toISOString());
    expect(db.analysis.update).toHaveBeenCalledWith({
      where: { id: "analysis_stalled" },
      data: { status: "processing", failureReason: null, updatedAt: now },
      select: {
        id: true,
        version: true,
        status: true,
        updatedAt: true,
      },
    });
    expect(triggerAnalysis).toHaveBeenCalledWith("decision_1");
  });

  it("blocks retry for active non-stalled processing analyses", async () => {
    const db = {
      decision: { findFirst: vi.fn().mockResolvedValue(ownerDecision()) },
      analysis: {
        findFirst: vi.fn().mockResolvedValue({
          id: "analysis_active",
          version: 4,
          status: "processing",
          updatedAt: recentUpdatedAt,
          locale: "en",
        }),
        update: vi.fn(),
      },
    };
    const triggerAnalysis = vi.fn();

    await expect(
      retryDecisionAnalysis("decision_1", {
        getUser: async () => authenticated,
        db,
        triggerAnalysis,
        now: () => now,
        stalledTimeoutMs: timeoutMs,
      }),
    ).resolves.toEqual({ status: "already_processing" });

    expect(db.analysis.update).not.toHaveBeenCalled();
    expect(triggerAnalysis).not.toHaveBeenCalled();
  });

  it("denies cross-user retry before mutating or scheduling", async () => {
    const db = {
      decision: { findFirst: vi.fn().mockResolvedValue(null) },
      analysis: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    };
    const triggerAnalysis = vi.fn();

    await expect(
      retryDecisionAnalysis("decision_other", {
        getUser: async () => authenticated,
        db,
        triggerAnalysis,
      }),
    ).resolves.toEqual({ status: "not_found" });

    expect(db.analysis.findFirst).not.toHaveBeenCalled();
    expect(db.analysis.update).not.toHaveBeenCalled();
    expect(triggerAnalysis).not.toHaveBeenCalled();
  });
});

describe("re-analysis service", () => {
  it("appends the next processing version and leaves prior analyses untouched", async () => {
    const db = {
      decision: { findFirst: vi.fn().mockResolvedValue(ownerDecision()) },
      analysis: {
        findFirst: vi.fn().mockResolvedValue({
          id: "analysis_ready",
          version: 2,
          status: "ready",
          updatedAt: recentUpdatedAt,
        }),
        aggregate: vi.fn().mockResolvedValue({ _max: { version: 2 } }),
        create: vi.fn().mockResolvedValue({
          id: "analysis_3",
          version: 3,
          status: "processing",
          updatedAt: now,
        }),
        update: vi.fn(),
      },
    };
    const triggerAnalysis = vi.fn();

    await expect(
      reanalyzeDecision("decision_1", {
        getUser: async () => authenticated,
        db,
        triggerAnalysis,
        locale: "uk",
        now: () => now,
        stalledTimeoutMs: timeoutMs,
      }),
    ).resolves.toEqual({
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
    expect(db.analysis.update).not.toHaveBeenCalled();
    expect(triggerAnalysis).toHaveBeenCalledWith("decision_1");
  });

  it("blocks duplicate re-analysis when the newest analysis is active processing", async () => {
    const db = {
      decision: { findFirst: vi.fn().mockResolvedValue(ownerDecision()) },
      analysis: {
        findFirst: vi.fn().mockResolvedValue({
          id: "analysis_active",
          version: 3,
          status: "processing",
          updatedAt: recentUpdatedAt,
        }),
        aggregate: vi.fn(),
        create: vi.fn(),
      },
    };
    const triggerAnalysis = vi.fn();

    await expect(
      reanalyzeDecision("decision_1", {
        getUser: async () => authenticated,
        db,
        triggerAnalysis,
        now: () => now,
        stalledTimeoutMs: timeoutMs,
      }),
    ).resolves.toEqual({ status: "already_processing" });

    expect(db.analysis.aggregate).not.toHaveBeenCalled();
    expect(db.analysis.create).not.toHaveBeenCalled();
    expect(triggerAnalysis).not.toHaveBeenCalled();
  });

  it("denies cross-user re-analysis before inserting or scheduling", async () => {
    const db = {
      decision: { findFirst: vi.fn().mockResolvedValue(null) },
      analysis: {
        findFirst: vi.fn(),
        aggregate: vi.fn(),
        create: vi.fn(),
      },
    };
    const triggerAnalysis = vi.fn();

    await expect(
      reanalyzeDecision("decision_other", {
        getUser: async () => authenticated,
        db,
        triggerAnalysis,
      }),
    ).resolves.toEqual({ status: "not_found" });

    expect(db.analysis.findFirst).not.toHaveBeenCalled();
    expect(db.analysis.create).not.toHaveBeenCalled();
    expect(triggerAnalysis).not.toHaveBeenCalled();
  });
});
