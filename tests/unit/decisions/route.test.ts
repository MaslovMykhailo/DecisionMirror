import { describe, expect, it, vi } from "vitest";

import { createDecisionPostHandler } from "@/lib/decisions/http";

function createDb() {
  return {
    decision: { create: vi.fn().mockResolvedValue({ id: "decision_1" }) },
    analysis: { create: vi.fn().mockResolvedValue({ id: "analysis_1" }) },
  };
}

function createRequest(body: unknown) {
  return new Request("https://decision-mirror.test/api/decisions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe("decision route protection", () => {
  it("creates a decision and initial processing analysis for a valid authenticated request", async () => {
    const db = createDb();
    const POST = createDecisionPostHandler({
      getUser: async () => ({ authenticated: true, userId: "user_session" }),
      db,
    });

    const response = await POST(
      createRequest({
        situation: "  Situation  ",
        decision: "  Decision  ",
        reasoning: "  Reasoning  ",
        userId: "attacker",
        ownerId: "attacker",
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      status: "success",
      decisionId: "decision_1",
      analysisId: "analysis_1",
    });
    expect(db.decision.create).toHaveBeenCalledWith({
      data: {
        userId: "user_session",
        situation: "Situation",
        decision: "Decision",
        reasoning: "Reasoning",
      },
      select: { id: true },
    });
    expect(db.analysis.create).toHaveBeenCalledWith({
      data: {
        decisionId: "decision_1",
        version: 1,
        status: "processing",
      },
      select: { id: true },
    });
  });

  it("returns field validation errors and does not persist invalid decision creation requests", async () => {
    const db = {
      decision: { create: vi.fn() },
      analysis: { create: vi.fn() },
    };
    const POST = createDecisionPostHandler({
      getUser: async () => ({ authenticated: true, userId: "user_session" }),
      db,
    });

    const response = await POST(createRequest({ situation: "   ", decision: "" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      status: "validation_error",
      fieldErrors: {
        situation: ["situation_required"],
        decision: ["decision_required"],
      },
    });
    expect(db.decision.create).not.toHaveBeenCalled();
    expect(db.analysis.create).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated decision creation requests", async () => {
    const db = {
      decision: { create: vi.fn() },
      analysis: { create: vi.fn() },
    };
    const POST = createDecisionPostHandler({
      getUser: async () => ({ authenticated: false, reason: "unauthenticated" }),
      db,
    });

    const response = await POST(createRequest({ situation: "S", decision: "D" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ status: "unauthenticated" });
    expect(db.decision.create).not.toHaveBeenCalled();
  });

  it("registers a background callback with the created decision ID after successful create", async () => {
    const scheduledCallbacks: Array<() => void | Promise<void>> = [];
    const triggerAnalysis = vi.fn();
    const POST = createDecisionPostHandler({
      getUser: async () => ({ authenticated: true, userId: "user_session" }),
      db: createDb(),
      triggerAnalysis,
      scheduleAfter: (callback) => scheduledCallbacks.push(callback),
    });

    const response = await POST(createRequest({ situation: "S", decision: "D" }));

    expect(response.status).toBe(201);
    expect(triggerAnalysis).not.toHaveBeenCalled();
    expect(scheduledCallbacks).toHaveLength(1);

    await scheduledCallbacks[0]?.();
    expect(triggerAnalysis).toHaveBeenCalledWith("decision_1");
  });

  it("does not schedule analysis work for invalid or unauthenticated creates", async () => {
    const scheduleAfter = vi.fn();
    const triggerAnalysis = vi.fn();
    const authenticatedPost = createDecisionPostHandler({
      getUser: async () => ({ authenticated: true, userId: "user_session" }),
      db: createDb(),
      triggerAnalysis,
      scheduleAfter,
    });
    const unauthenticatedPost = createDecisionPostHandler({
      getUser: async () => ({ authenticated: false, reason: "unauthenticated" }),
      db: createDb(),
      triggerAnalysis,
      scheduleAfter,
    });

    await authenticatedPost(createRequest({ situation: "", decision: "" }));
    await unauthenticatedPost(createRequest({ situation: "S", decision: "D" }));

    expect(scheduleAfter).not.toHaveBeenCalled();
    expect(triggerAnalysis).not.toHaveBeenCalled();
  });

  it("returns the create response without waiting for scheduled analysis work", async () => {
    const trigger = deferred();
    const triggerAnalysis = vi.fn(() => trigger.promise);
    const POST = createDecisionPostHandler({
      getUser: async () => ({ authenticated: true, userId: "user_session" }),
      db: createDb(),
      triggerAnalysis,
      scheduleAfter: (callback) => {
        void callback();
      },
    });

    const responsePromise = POST(createRequest({ situation: "S", decision: "D" }));
    const winner = await Promise.race([
      responsePromise.then(() => "response"),
      new Promise((resolve) => setTimeout(() => resolve("timeout"), 10)),
    ]);
    trigger.resolve();
    await responsePromise;

    expect(winner).toBe("response");
    expect(triggerAnalysis).toHaveBeenCalledWith("decision_1");
  });
});
