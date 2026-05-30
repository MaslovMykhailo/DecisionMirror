import { describe, expect, it } from "vitest";

import { createDecisionInputSchema } from "@/lib/decisions/validation";

describe("create-decision input schema", () => {
  it("requires situation and decision fields", () => {
    const result = createDecisionInputSchema.safeParse({});

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors).toMatchObject({
      situation: expect.any(Array),
      decision: expect.any(Array),
    });
  });

  it("accepts omitted reasoning", () => {
    const result = createDecisionInputSchema.safeParse({
      situation: "Accept a new role",
      decision: "Take the offer",
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        situation: "Accept a new role",
        decision: "Take the offer",
        locale: "en",
      },
    });
    if (result.success) {
      expect(result.data.reasoning).toBeUndefined();
    }
  });

  it("trims submitted fields and removes blank optional reasoning", () => {
    const result = createDecisionInputSchema.safeParse({
      situation: "  Move cities  ",
      decision: "  Stay remote  ",
      reasoning: "   ",
    });

    expect(result).toEqual({
      success: true,
      data: {
        situation: "Move cities",
        decision: "Stay remote",
        reasoning: undefined,
        locale: "en",
      },
    });
  });

  it("accepts supported locales and rejects unsupported locales", () => {
    const supported = createDecisionInputSchema.safeParse({
      situation: "Змінити роботу",
      decision: "Поки залишитися",
      locale: "uk",
    });
    const unsupported = createDecisionInputSchema.safeParse({
      situation: "Change jobs",
      decision: "Stay for now",
      locale: "fr",
    });

    expect(supported).toMatchObject({
      success: true,
      data: {
        locale: "uk",
      },
    });
    expect(unsupported.success).toBe(false);
    if (unsupported.success) return;
    expect(unsupported.error.flatten().fieldErrors).toMatchObject({
      locale: expect.arrayContaining(["locale_unsupported"]),
    });
  });

  it("rejects blank required values after trimming", () => {
    const result = createDecisionInputSchema.safeParse({
      situation: "   ",
      decision: "\n\t",
      reasoning: "  because it feels right  ",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors).toMatchObject({
      situation: expect.arrayContaining(["situation_required"]),
      decision: expect.arrayContaining(["decision_required"]),
    });
  });
});
