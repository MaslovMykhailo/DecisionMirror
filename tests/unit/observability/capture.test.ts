import { describe, expect, it, vi } from "vitest";

import { captureEvent } from "@/lib/observability/capture";

describe("typed analytics capture wrapper", () => {
  it("forwards a taxonomy event to the client, identified to the user", async () => {
    const capture = vi.fn();
    await captureEvent(
      "analysis_ready",
      { duration_ms: 1200, bias_count: 2, complexity: 4 },
      { distinctId: "user_1", client: { capture } },
    );

    expect(capture).toHaveBeenCalledWith({
      distinctId: "user_1",
      event: "analysis_ready",
      properties: { duration_ms: 1200, bias_count: 2, complexity: 4 },
    });
  });

  it("scrubs any prose that slips into properties before sending", async () => {
    const capture = vi.fn();
    await captureEvent(
      "decision_created",
      // Cast to force a disallowed prose field past the type checker.
      { has_reasoning: true, situation: "Should I accept the offer?" } as unknown as {
        has_reasoning: boolean;
      },
      { distinctId: "user_1", client: { capture } },
    );

    expect(capture).toHaveBeenCalledWith({
      distinctId: "user_1",
      event: "decision_created",
      properties: { has_reasoning: true },
    });
  });

  it("is a no-op when no client is configured (no PostHog key)", async () => {
    await expect(
      captureEvent("dashboard_viewed", {}, { distinctId: "user_1", client: null }),
    ).resolves.toBeUndefined();
  });
});
