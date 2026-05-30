import { describe, expect, it, vi } from "vitest";

// createDecision emits decision_created via captureEvent, which lazily imports the
// server-only PostHog module; stub server-only so it loads under jsdom.
vi.mock("server-only", () => ({}));

import { createDecisionPostHandler } from "@/lib/decisions/http";

function jsonRequest(body: unknown) {
  return new Request("https://decision-mirror.test/api/decisions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("PostHog flush in the after() window", () => {
  it("flushes server events after the analysis is triggered, inside the scheduled callback", async () => {
    const calls: string[] = [];
    let scheduled: (() => void | Promise<void>) | undefined;

    const handler = createDecisionPostHandler({
      getUser: vi.fn().mockResolvedValue({ authenticated: true, userId: "user_1" }),
      db: {
        decision: { create: vi.fn().mockResolvedValue({ id: "decision_1" }) },
        analysis: { create: vi.fn().mockResolvedValue({ id: "analysis_1" }) },
      },
      triggerAnalysis: vi.fn(async () => {
        calls.push("trigger");
      }),
      flush: vi.fn(async () => {
        calls.push("flush");
      }),
      scheduleAfter: (cb) => {
        scheduled = cb;
      },
    });

    const response = await handler(
      jsonRequest({
        situation: "A long situation that should never be sent anywhere as prose.",
        decision: "A decision sentence.",
        reasoning: "Some reasoning.",
        locale: "en",
      }),
    );

    expect(response.status).toBe(201);
    expect(scheduled).toBeTypeOf("function");

    await scheduled?.();

    expect(calls).toEqual(["trigger", "flush"]);
  });
});
