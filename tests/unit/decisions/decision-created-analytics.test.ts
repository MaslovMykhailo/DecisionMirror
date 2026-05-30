import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createDecision } from "@/lib/decisions/service";

const authenticated = { authenticated: true as const, userId: "user_1" };

function createDb() {
  return {
    decision: { create: vi.fn().mockResolvedValue({ id: "decision_1" }) },
    analysis: { create: vi.fn().mockResolvedValue({ id: "analysis_1" }) },
  };
}

describe("decision_created analytics emission", () => {
  it("emits decision_created exactly once with has_reasoning reduced to a boolean", async () => {
    const capture = vi.fn();
    const result = await createDecision(
      {
        situation: "A long situation describing a hard choice.",
        decision: "Take the offer.",
        reasoning: "Because it has more scope and growth.",
        locale: "en",
      },
      { getUser: vi.fn().mockResolvedValue(authenticated), db: createDb(), capture },
    );

    expect(result.status).toBe("success");
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith(
      "decision_created",
      { has_reasoning: true },
      { distinctId: "user_1" },
    );
  });

  it("emits has_reasoning false when no reasoning was provided", async () => {
    const capture = vi.fn();
    await createDecision(
      { situation: "A situation.", decision: "A decision.", locale: "en" },
      { getUser: vi.fn().mockResolvedValue(authenticated), db: createDb(), capture },
    );

    expect(capture).toHaveBeenCalledWith(
      "decision_created",
      { has_reasoning: false },
      { distinctId: "user_1" },
    );
  });

  it("does not emit when the user is unauthenticated", async () => {
    const capture = vi.fn();
    await createDecision(
      { situation: "A situation.", decision: "A decision.", locale: "en" },
      { getUser: vi.fn().mockResolvedValue({ authenticated: false }), db: createDb(), capture },
    );

    expect(capture).not.toHaveBeenCalled();
  });
});
