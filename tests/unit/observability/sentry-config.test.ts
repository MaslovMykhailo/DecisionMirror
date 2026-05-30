import { describe, expect, it } from "vitest";

import {
  resolveSentryRelease,
  scrubSentryEvent,
  sentryInitOptions,
} from "@/lib/observability/sentry";

describe("sentry init options", () => {
  it("is disabled (no DSN) when NEXT_PUBLIC_SENTRY_DSN is absent — a no-op", () => {
    const options = sentryInitOptions({});
    expect(options.dsn).toBeUndefined();
    expect(options.enabled).toBe(false);
  });

  it("is enabled and carries the DSN when configured", () => {
    const options = sentryInitOptions({
      NEXT_PUBLIC_SENTRY_DSN: "https://abc@o1.ingest.sentry.io/1",
    });
    expect(options.dsn).toBe("https://abc@o1.ingest.sentry.io/1");
    expect(options.enabled).toBe(true);
    expect(typeof options.beforeSend).toBe("function");
  });
});

describe("sentry release derivation", () => {
  it("derives the release from the git SHA env", () => {
    expect(resolveSentryRelease({ VERCEL_GIT_COMMIT_SHA: "abc123" })).toBe("abc123");
    expect(resolveSentryRelease({ SENTRY_RELEASE: "v9" })).toBe("v9");
    expect(resolveSentryRelease({})).toBeUndefined();
  });

  it("includes the resolved release in init options", () => {
    const options = sentryInitOptions({
      NEXT_PUBLIC_SENTRY_DSN: "https://abc@o1.ingest.sentry.io/1",
      VERCEL_GIT_COMMIT_SHA: "deadbeef",
    });
    expect(options.release).toBe("deadbeef");
  });
});

describe("sentry beforeSend scrubbing", () => {
  it("strips non-allowlisted fields from extra, tags, and contexts", () => {
    const scrubbed = scrubSentryEvent({
      extra: {
        decisionId: "decision_1",
        situation: "Should I accept the new role?",
        reasoning: "It has more scope.",
      },
      tags: { status: "processing", note: "free form prose here" },
      contexts: {
        analysis: { version: 2, summary: "a long prose summary that leaks content" },
      },
    });

    expect(scrubbed.extra).toEqual({ decisionId: "decision_1" });
    expect(scrubbed.tags).toEqual({ status: "processing" });
    expect(scrubbed.contexts).toEqual({ analysis: { version: 2 } });
  });

  it("returns the event unchanged in shape when there is nothing to scrub", () => {
    expect(scrubSentryEvent({ level: "error" })).toEqual({ level: "error" });
  });
});
