import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DecisionStatusPoller } from "@/components/decisions/decision-status-poller";

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/i18n/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

function statusResponse(
  status: "processing" | "ready" | "failed",
  options: {
    isStalled?: boolean;
    retryable?: boolean;
    failureReason?: string;
  } = {},
) {
  return new Response(
    JSON.stringify({
      analysisId: `analysis_${status}`,
      version: status === "processing" ? 1 : 2,
      status,
      updatedAt: "2026-05-30T12:05:00.000Z",
      isStalled: options.isStalled ?? false,
      retryable: options.retryable ?? status === "failed",
      ...(options.failureReason ? { failureReason: options.failureReason } : {}),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  refreshMock.mockClear();
});

describe("decision status poller", () => {
  it("starts polling only visible decisions whose newest status is processing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(statusResponse("processing"));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DecisionStatusPoller
        decisions={[
          { decisionId: "decision_processing", status: "processing" },
          { decisionId: "decision_ready", status: "ready" },
          { decisionId: "decision_failed", status: "failed" },
          { decisionId: "decision_absent", status: null },
        ]}
      />,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/decisions/decision_processing/status");
  });

  it("backs off with a capped delay, updates status, stops on ready, and refreshes", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(statusResponse("processing"))
      .mockResolvedValueOnce(statusResponse("processing"))
      .mockResolvedValueOnce(statusResponse("ready"));
    const onStatusChange = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DecisionStatusPoller
        decisions={[{ decisionId: "decision_1", status: "processing" }]}
        initialDelayMs={100}
        maxDelayMs={250}
        onStatusChange={onStatusChange}
      />,
    );

    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith({
      decisionId: "decision_1",
      analysisId: "analysis_processing",
      version: 1,
      status: "processing",
      updatedAt: "2026-05-30T12:05:00.000Z",
      isStalled: false,
      retryable: false,
    });

    await advance(199);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await advance(1);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await advance(249);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await advance(1);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(onStatusChange).toHaveBeenLastCalledWith({
      decisionId: "decision_1",
      analysisId: "analysis_ready",
      version: 2,
      status: "ready",
      updatedAt: "2026-05-30T12:05:00.000Z",
      isStalled: false,
      retryable: false,
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);

    await advance(1000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("stops on failed without refreshing the route", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(statusResponse("processing"))
      .mockResolvedValueOnce(
        statusResponse("failed", { failureReason: "The structured output did not match." }),
      );
    const onStatusChange = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DecisionStatusPoller
        decisions={[{ decisionId: "decision_1", status: "processing" }]}
        initialDelayMs={100}
        maxDelayMs={250}
        onStatusChange={onStatusChange}
      />,
    );

    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await advance(200);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onStatusChange).toHaveBeenLastCalledWith({
      decisionId: "decision_1",
      analysisId: "analysis_failed",
      version: 2,
      status: "failed",
      updatedAt: "2026-05-30T12:05:00.000Z",
      isStalled: false,
      retryable: true,
      failureReason: "The structured output did not match.",
    });
    expect(refreshMock).not.toHaveBeenCalled();

    await advance(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops polling when processing becomes stalled and retryable", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValueOnce(
      statusResponse("processing", {
        isStalled: true,
        retryable: true,
      }),
    );
    const onStatusChange = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DecisionStatusPoller
        decisions={[{ decisionId: "decision_1", status: "processing" }]}
        initialDelayMs={100}
        maxDelayMs={250}
        onStatusChange={onStatusChange}
      />,
    );

    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith({
      decisionId: "decision_1",
      analysisId: "analysis_processing",
      version: 1,
      status: "processing",
      updatedAt: "2026-05-30T12:05:00.000Z",
      isStalled: true,
      retryable: true,
    });

    await advance(1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
