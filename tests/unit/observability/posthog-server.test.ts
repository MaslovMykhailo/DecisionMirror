import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureMock = vi.fn();
const flushMock = vi.fn().mockResolvedValue(undefined);
const constructorMock = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("posthog-node", () => ({
  PostHog: class {
    capture = captureMock;
    flush = flushMock;
    constructor(...args: unknown[]) {
      constructorMock(...args);
    }
  },
}));

async function loadModule() {
  const mod = await import("@/lib/observability/posthog-server");
  mod.resetServerPostHogClient();
  return mod;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("server PostHog client", () => {
  it("returns null and constructs nothing when no key is configured", async () => {
    vi.stubEnv("POSTHOG_KEY", "");
    const { getServerPostHogClient } = await loadModule();

    expect(getServerPostHogClient()).toBeNull();
    expect(constructorMock).not.toHaveBeenCalled();
  });

  it("constructs a client with the configured key and memoizes it", async () => {
    vi.stubEnv("POSTHOG_KEY", "phc_test");
    const { getServerPostHogClient } = await loadModule();

    const first = getServerPostHogClient();
    const second = getServerPostHogClient();

    expect(first).toBe(second);
    expect(constructorMock).toHaveBeenCalledTimes(1);
    expect(constructorMock).toHaveBeenCalledWith("phc_test", expect.any(Object));
  });

  it("identifies a server event to the authenticated user via the capture wrapper", async () => {
    vi.stubEnv("POSTHOG_KEY", "phc_test");
    await loadModule();
    const { captureEvent } = await import("@/lib/observability/capture");

    await captureEvent("analysis_started", { version: 2 }, { distinctId: "user_42" });

    expect(captureMock).toHaveBeenCalledWith({
      distinctId: "user_42",
      event: "analysis_started",
      properties: { version: 2 },
    });
  });

  it("flush is a safe no-op when no client is configured", async () => {
    vi.stubEnv("POSTHOG_KEY", "");
    const { flushServerPostHog } = await loadModule();

    await expect(flushServerPostHog()).resolves.toBeUndefined();
    expect(flushMock).not.toHaveBeenCalled();
  });
});
