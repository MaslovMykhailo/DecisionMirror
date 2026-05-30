import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { reanalyzeDecision, retryDecisionAnalysis } from "@/lib/decisions/service";

const authenticated = { authenticated: true as const, userId: "user_1" };
const now = new Date("2026-05-30T12:00:00.000Z");
const staleUpdatedAt = new Date("2026-05-30T11:30:00.000Z");
const recentUpdatedAt = new Date("2026-05-30T11:59:30.000Z");
const timeoutMs = 10 * 60 * 1000;

function retryDb(latest: { status: string; updatedAt: Date; version: number }) {
  return {
    decision: { findFirst: vi.fn().mockResolvedValue({ id: "decision_1" }) },
    analysis: {
      findFirst: vi.fn().mockResolvedValue({ id: "analysis_1", ...latest }),
      update: vi.fn().mockResolvedValue({
        id: "analysis_1",
        version: latest.version,
        status: "processing",
        updatedAt: now,
      }),
    },
  };
}

describe("analysis_retried / reanalysis_run analytics", () => {
  it("emits analysis_retried with trigger 'manual' when retrying a failed analysis", async () => {
    const capture = vi.fn();
    await retryDecisionAnalysis("decision_1", {
      getUser: vi.fn().mockResolvedValue(authenticated),
      db: retryDb({ status: "failed", updatedAt: recentUpdatedAt, version: 2 }),
      now: () => now,
      stalledTimeoutMs: timeoutMs,
      capture,
    });

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith(
      "analysis_retried",
      { trigger: "manual" },
      { distinctId: "user_1" },
    );
  });

  it("emits analysis_retried with trigger 'stalled' when retrying a stalled processing analysis", async () => {
    const capture = vi.fn();
    await retryDecisionAnalysis("decision_1", {
      getUser: vi.fn().mockResolvedValue(authenticated),
      db: retryDb({ status: "processing", updatedAt: staleUpdatedAt, version: 2 }),
      now: () => now,
      stalledTimeoutMs: timeoutMs,
      capture,
    });

    expect(capture).toHaveBeenCalledWith(
      "analysis_retried",
      { trigger: "stalled" },
      { distinctId: "user_1" },
    );
  });

  it("emits reanalysis_run with the prior version exactly once", async () => {
    const capture = vi.fn();
    const db = {
      decision: { findFirst: vi.fn().mockResolvedValue({ id: "decision_1" }) },
      analysis: {
        findFirst: vi.fn().mockResolvedValue({
          id: "analysis_2",
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
      },
    };

    await reanalyzeDecision("decision_1", {
      getUser: vi.fn().mockResolvedValue(authenticated),
      db,
      now: () => now,
      stalledTimeoutMs: timeoutMs,
      locale: "en",
      capture,
    });

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith(
      "reanalysis_run",
      { prior_version: 2 },
      { distinctId: "user_1" },
    );
  });
});
