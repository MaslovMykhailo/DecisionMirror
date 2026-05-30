import { describe, expect, it, vi } from "vitest";

import { getDecisionAnalysisStatus } from "@/lib/decisions/status";

const authedUser = vi.fn().mockResolvedValue({ authenticated: true, userId: "user_1" });
const TIMEOUT_MS = 15 * 60 * 1000;

function dbWith(row: { status: string; updatedAt: Date; failureReason?: string | null }) {
  return {
    analysis: {
      findFirst: vi.fn().mockResolvedValue({
        id: "analysis_1",
        version: 3,
        failureReason: row.failureReason ?? null,
        ...row,
      }),
    },
  };
}

describe("stalled analysis reporting", () => {
  it("reports a distinct stalled signal for a processing analysis past the timeout", async () => {
    const now = new Date("2026-05-30T12:00:00.000Z");
    const reporter = { captureStalledAnalysis: vi.fn() };
    const db = dbWith({
      status: "processing",
      updatedAt: new Date(now.getTime() - TIMEOUT_MS - 1),
    });

    await getDecisionAnalysisStatus("decision_1", {
      getUser: authedUser,
      db,
      now: () => now,
      stalledTimeoutMs: TIMEOUT_MS,
      reporter,
    });

    expect(reporter.captureStalledAnalysis).toHaveBeenCalledWith({
      decisionId: "decision_1",
      analysisId: "analysis_1",
      version: 3,
    });
  });

  it("does not report a fresh processing analysis", async () => {
    const now = new Date("2026-05-30T12:00:00.000Z");
    const reporter = { captureStalledAnalysis: vi.fn() };
    const db = dbWith({ status: "processing", updatedAt: new Date(now.getTime() - 1000) });

    await getDecisionAnalysisStatus("decision_1", {
      getUser: authedUser,
      db,
      now: () => now,
      stalledTimeoutMs: TIMEOUT_MS,
      reporter,
    });

    expect(reporter.captureStalledAnalysis).not.toHaveBeenCalled();
  });

  it("does not report a failed analysis as stalled", async () => {
    const now = new Date("2026-05-30T12:00:00.000Z");
    const reporter = { captureStalledAnalysis: vi.fn() };
    const db = dbWith({
      status: "failed",
      updatedAt: new Date(now.getTime() - TIMEOUT_MS - 1),
      failureReason: "provider_error",
    });

    await getDecisionAnalysisStatus("decision_1", {
      getUser: authedUser,
      db,
      now: () => now,
      stalledTimeoutMs: TIMEOUT_MS,
      reporter,
    });

    expect(reporter.captureStalledAnalysis).not.toHaveBeenCalled();
  });
});
