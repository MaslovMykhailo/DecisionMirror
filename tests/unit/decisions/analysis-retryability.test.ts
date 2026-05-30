import { describe, expect, it } from "vitest";

import { analysisRetryability } from "@/lib/decisions/analysis-retryability";

const now = new Date("2026-05-30T12:00:00.000Z");
const timeoutMs = 10 * 60 * 1000;

describe("analysis retryability", () => {
  it("marks processing analyses older than the injected timeout as stalled and retryable", () => {
    expect(
      analysisRetryability(
        {
          status: "processing",
          updatedAt: new Date("2026-05-30T11:49:59.000Z"),
        },
        { now: () => now, stalledTimeoutMs: timeoutMs },
      ),
    ).toEqual({ isStalled: true, retryable: true });
  });

  it("keeps processing analyses within the injected timeout active and not retryable", () => {
    expect(
      analysisRetryability(
        {
          status: "processing",
          updatedAt: new Date("2026-05-30T11:55:00.000Z"),
        },
        { now: () => now, stalledTimeoutMs: timeoutMs },
      ),
    ).toEqual({ isStalled: false, retryable: false });
  });

  it("marks failed analyses retryable without calling them stalled", () => {
    expect(
      analysisRetryability(
        {
          status: "failed",
          updatedAt: now,
        },
        { now: () => now, stalledTimeoutMs: timeoutMs },
      ),
    ).toEqual({ isStalled: false, retryable: true });
  });
});
