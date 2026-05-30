import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DecisionDetailView } from "@/components/decisions/decision-detail-view";
import type { DecisionHistoryDetailResult } from "@/lib/decisions/history";
import { validAnalysisOutput } from "@/tests/support/fixtures/analysis-output";

vi.mock("@/lib/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ refresh: vi.fn() }),
}));

const messages = {
  DecisionDetail: {
    backToHistory: "Back to history",
    originalInput: "Original input",
    situation: "Situation",
    decision: "Decision",
    reasoning: "Reasoning",
    analysis: "Analysis",
    categoryLabel: "Category: {category}",
    biases: "Biases",
    missedAlternatives: "Missed alternatives",
    premortemRisks: "Premortem risks",
    keyAssumptions: "Key assumptions",
    warningSigns: "Warning signs",
    versionSwitcherLabel: "Analysis version",
    versionOption: "Version {version}",
    retryAnalysis: "Retry analysis",
    reanalyze: "Run re-analysis",
    retryPending: "Retrying analysis",
    reanalyzePending: "Starting re-analysis",
    actionError: "We could not update this analysis.",
    alreadyProcessing: "Analysis is already processing.",
    notFoundTitle: "Decision not found",
    notFoundDescription: "This decision is unavailable or belongs to another user.",
  },
  AnalysisState: {
    status: {
      processing: "Processing",
      ready: "Ready",
      failed: "Failed",
      stalled: "Stalled",
    },
    processing: "Analysis is still processing.",
    stalled: "Analysis stalled. You can retry it.",
    stalledWithReady: "Analysis stalled. The latest ready result is shown below.",
    newerProcessing:
      "A newer analysis is still processing. The latest ready result is shown below.",
    notReady: "Analysis is not ready yet.",
    failed: "Analysis failed. You can try again later.",
    failedWithReason: "Analysis failed: {reason}",
  },
  Taxonomy: {
    category: {
      career: "Career",
      finance: "Finance",
      relationships: "Relationships",
      health: "Health",
      education: "Education",
      business: "Business",
      lifestyle: "Lifestyle",
      other: "Other",
    },
    bias: {
      anchoring: "Anchoring",
      confirmation_bias: "Confirmation bias",
      sunk_cost_fallacy: "Sunk cost fallacy",
      overconfidence: "Overconfidence",
      availability_heuristic: "Availability heuristic",
      loss_aversion: "Loss aversion",
      status_quo_bias: "Status quo bias",
      optimism_bias: "Optimism bias",
    },
  },
};

function renderWithIntl(component: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {component}
    </NextIntlClientProvider>,
  );
}

function successResult(
  overrides: Partial<Extract<DecisionHistoryDetailResult, { status: "success" }>> = {},
): Extract<DecisionHistoryDetailResult, { status: "success" }> {
  return {
    status: "success",
    decision: {
      id: "decision_1",
      situation: "Choosing between a stable role and a startup",
      decision: "Accept the startup offer",
      reasoning: "The product mission fits my long-term goals.",
      createdAt: "2026-05-30T12:00:00.000Z",
      updatedAt: "2026-05-30T12:05:00.000Z",
    },
    newestAnalysis: {
      analysisId: "analysis_ready",
      version: 1,
      status: "ready",
      updatedAt: "2026-05-30T12:05:00.000Z",
      isStalled: false,
      retryable: false,
    },
    readyAnalysis: {
      analysisId: "analysis_ready",
      version: 1,
      updatedAt: "2026-05-30T12:05:00.000Z",
      result: validAnalysisOutput,
    },
    readyAnalyses: [
      {
        analysisId: "analysis_ready",
        version: 1,
        updatedAt: "2026-05-30T12:05:00.000Z",
        result: validAnalysisOutput,
      },
    ],
    ...overrides,
  };
}

const olderAnalysisOutput = {
  ...validAnalysisOutput,
  category: "finance" as const,
  missedAlternatives: ["Keep the stable role and revisit the startup later."],
};

function mutationResponse(analysis: {
  analysisId: string;
  version: number;
  status: "processing" | "ready" | "failed";
  updatedAt: string;
  isStalled: boolean;
  retryable: boolean;
}) {
  return new Response(JSON.stringify({ status: "success", analysis }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
}

function submittedPayload(fetchMock: ReturnType<typeof vi.fn>) {
  const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
  return request?.body ? JSON.parse(String(request.body)) : undefined;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("decision detail view", () => {
  it("shows original input beside ready analysis sections", () => {
    renderWithIntl(<DecisionDetailView result={successResult()} />);

    expect(screen.getByText("Choosing between a stable role and a startup")).toBeDefined();
    expect(screen.getAllByText("Accept the startup offer").length).toBeGreaterThan(0);
    expect(screen.getByText("The product mission fits my long-term goals.")).toBeDefined();
    expect(screen.getByText("Ready")).toBeDefined();
    expect(screen.getByText("Category: Career")).toBeDefined();
    expect(screen.getByText("Biases")).toBeDefined();
    expect(screen.getByText("Anchoring")).toBeDefined();
    expect(screen.getByText("The first salary range is carrying too much weight.")).toBeDefined();
    expect(screen.getByText("Missed alternatives")).toBeDefined();
    expect(
      screen.getByText("Negotiate a trial consulting project before resigning."),
    ).toBeDefined();
    expect(screen.getByText("Premortem risks")).toBeDefined();
    expect(screen.getByText("The new role may not provide the autonomy promised.")).toBeDefined();
    expect(screen.getByText("Key assumptions")).toBeDefined();
    expect(
      screen.getByText("The company has budget approval for the team expansion."),
    ).toBeDefined();
    expect(screen.getByText("Warning signs")).toBeDefined();
    expect(
      screen.getByText("The hiring manager avoids answering questions about turnover."),
    ).toBeDefined();
  });

  it("shows processing when no ready result exists", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));

    renderWithIntl(
      <DecisionDetailView
        result={successResult({
          newestAnalysis: {
            analysisId: "analysis_processing",
            version: 1,
            status: "processing",
            updatedAt: "2026-05-30T12:05:00.000Z",
            isStalled: false,
            retryable: false,
          },
          readyAnalysis: null,
          readyAnalyses: [],
        })}
      />,
    );

    expect(screen.getByText("Processing")).toBeDefined();
    expect(screen.getByText("Analysis is still processing.")).toBeDefined();
    expect(screen.queryByText("Category: Career")).toBeNull();
  });

  it("shows failed state with the stored failure reason", () => {
    renderWithIntl(
      <DecisionDetailView
        result={successResult({
          newestAnalysis: {
            analysisId: "analysis_failed",
            version: 2,
            status: "failed",
            updatedAt: "2026-05-30T12:05:00.000Z",
            isStalled: false,
            retryable: true,
            failureReason: "The structured output did not match the contract.",
          },
          readyAnalysis: null,
          readyAnalyses: [],
        })}
      />,
    );

    expect(screen.getByText("Failed")).toBeDefined();
    expect(
      screen.getByText("Analysis failed: The structured output did not match the contract."),
    ).toBeDefined();
  });

  it("renders not found without private decision content", () => {
    renderWithIntl(<DecisionDetailView result={{ status: "not_found" }} />);

    expect(screen.getByRole("heading", { name: "Decision not found" })).toBeDefined();
    expect(
      screen.getByText("This decision is unavailable or belongs to another user."),
    ).toBeDefined();
    expect(screen.queryByText("Accept the startup offer")).toBeNull();
  });

  it("keeps the latest ready result visible during newer processing", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));

    renderWithIntl(
      <DecisionDetailView
        result={successResult({
          newestAnalysis: {
            analysisId: "analysis_processing",
            version: 2,
            status: "processing",
            updatedAt: "2026-05-30T12:10:00.000Z",
            isStalled: false,
            retryable: false,
          },
        })}
      />,
    );

    expect(
      screen.getByText(
        "A newer analysis is still processing. The latest ready result is shown below.",
      ),
    ).toBeDefined();
    expect(screen.getByText("Category: Career")).toBeDefined();
  });

  it("shows the version switcher with the newest ready version selected by default", () => {
    renderWithIntl(
      <DecisionDetailView
        result={successResult({
          readyAnalysis: {
            analysisId: "analysis_ready_2",
            version: 2,
            updatedAt: "2026-05-30T12:05:00.000Z",
            result: validAnalysisOutput,
          },
          readyAnalyses: [
            {
              analysisId: "analysis_ready_2",
              version: 2,
              updatedAt: "2026-05-30T12:05:00.000Z",
              result: validAnalysisOutput,
            },
            {
              analysisId: "analysis_ready_1",
              version: 1,
              updatedAt: "2026-05-30T11:05:00.000Z",
              result: olderAnalysisOutput,
            },
          ],
        })}
      />,
    );

    expect((screen.getByLabelText("Analysis version") as HTMLSelectElement).value).toBe(
      "analysis_ready_2",
    );
    expect(screen.getByText("Version 2")).toBeDefined();
    expect(screen.getByText("Version 1")).toBeDefined();
    expect(screen.getByText("Category: Career")).toBeDefined();
  });

  it("renders an older ready version when selected", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <DecisionDetailView
        result={successResult({
          readyAnalysis: {
            analysisId: "analysis_ready_2",
            version: 2,
            updatedAt: "2026-05-30T12:05:00.000Z",
            result: validAnalysisOutput,
          },
          readyAnalyses: [
            {
              analysisId: "analysis_ready_2",
              version: 2,
              updatedAt: "2026-05-30T12:05:00.000Z",
              result: validAnalysisOutput,
            },
            {
              analysisId: "analysis_ready_1",
              version: 1,
              updatedAt: "2026-05-30T11:05:00.000Z",
              result: olderAnalysisOutput,
            },
          ],
        })}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Analysis version"), "analysis_ready_1");

    expect(screen.getByText("Category: Finance")).toBeDefined();
    expect(screen.getByText("Keep the stable role and revisit the startup later.")).toBeDefined();
  });

  it("omits non-ready versions from the version switcher", () => {
    renderWithIntl(
      <DecisionDetailView
        result={successResult({
          newestAnalysis: {
            analysisId: "analysis_processing",
            version: 3,
            status: "processing",
            updatedAt: "2026-05-30T12:10:00.000Z",
            isStalled: false,
            retryable: false,
          },
          readyAnalyses: [
            {
              analysisId: "analysis_ready_2",
              version: 2,
              updatedAt: "2026-05-30T12:05:00.000Z",
              result: validAnalysisOutput,
            },
            {
              analysisId: "analysis_ready_1",
              version: 1,
              updatedAt: "2026-05-30T11:05:00.000Z",
              result: olderAnalysisOutput,
            },
          ],
        })}
      />,
    );

    expect(screen.getByLabelText("Analysis version")).toBeDefined();
    expect(screen.queryByText("Version 3")).toBeNull();
    expect(screen.getByText("Version 2")).toBeDefined();
    expect(screen.getByText("Version 1")).toBeDefined();
  });

  it("retries failed analysis and moves the visible state to processing", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      mutationResponse({
        analysisId: "analysis_failed",
        version: 2,
        status: "processing",
        updatedAt: "2026-05-30T12:10:00.000Z",
        isStalled: false,
        retryable: false,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithIntl(
      <DecisionDetailView
        result={successResult({
          newestAnalysis: {
            analysisId: "analysis_failed",
            version: 2,
            status: "failed",
            updatedAt: "2026-05-30T12:05:00.000Z",
            isStalled: false,
            retryable: true,
            failureReason: "The structured output did not match the contract.",
          },
          readyAnalysis: null,
          readyAnalyses: [],
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Retry analysis" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/decisions/decision_1/retry", {
        method: "POST",
        headers: { Accept: "application/json" },
      }),
    );
    expect(screen.getByText("Processing")).toBeDefined();
    expect(screen.queryByText("Retry analysis")).toBeNull();
  });

  it("renders stalled retryable detail state before retry without leaking content in payload", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        mutationResponse({
          analysisId: "analysis_stalled",
          version: 2,
          status: "processing",
          updatedAt: "2026-05-30T12:10:00.000Z",
          isStalled: false,
          retryable: false,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithIntl(
      <DecisionDetailView
        result={successResult({
          newestAnalysis: {
            analysisId: "analysis_stalled",
            version: 2,
            status: "processing",
            updatedAt: "2026-05-30T11:40:00.000Z",
            isStalled: true,
            retryable: true,
          },
        })}
      />,
    );

    expect(screen.getByText("Stalled")).toBeDefined();
    expect(
      screen.getByText("Analysis stalled. The latest ready result is shown below."),
    ).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Retry analysis" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const retryRequest = fetchMock.mock.calls.find(
      (call) => call[0] === "/api/decisions/decision_1/retry",
    )?.[1] as RequestInit | undefined;
    expect(retryRequest?.body).toBeUndefined();
    expect(JSON.stringify(retryRequest)).not.toContain("Choosing between a stable role");
    expect(JSON.stringify(retryRequest)).not.toContain("Accept the startup offer");
  });

  it("retries stalled processing analysis and clears the stalled state", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        mutationResponse({
          analysisId: "analysis_stalled",
          version: 2,
          status: "processing",
          updatedAt: "2026-05-30T12:10:00.000Z",
          isStalled: false,
          retryable: false,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithIntl(
      <DecisionDetailView
        result={successResult({
          newestAnalysis: {
            analysisId: "analysis_stalled",
            version: 2,
            status: "processing",
            updatedAt: "2026-05-30T11:40:00.000Z",
            isStalled: true,
            retryable: true,
          },
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Retry analysis" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/decisions/decision_1/retry", {
        method: "POST",
        headers: { Accept: "application/json" },
      }),
    );
    expect(screen.getByText("Processing")).toBeDefined();
    expect(screen.queryByText("Retry analysis")).toBeNull();
  });

  it("starts re-analysis from ready detail while keeping the ready result visible", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      mutationResponse({
        analysisId: "analysis_processing",
        version: 2,
        status: "processing",
        updatedAt: "2026-05-30T12:10:00.000Z",
        isStalled: false,
        retryable: false,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithIntl(<DecisionDetailView result={successResult()} />);

    await user.click(screen.getByRole("button", { name: "Run re-analysis" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/decisions/decision_1/reanalyze", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ locale: "en" }),
      }),
    );
    expect(submittedPayload(fetchMock)).toEqual({ locale: "en" });
    expect(screen.getByText("Processing")).toBeDefined();
    expect(screen.getByText("Category: Career")).toBeDefined();
  });

  it("blocks retry and re-analysis controls while analysis is actively processing", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));

    renderWithIntl(
      <DecisionDetailView
        result={successResult({
          newestAnalysis: {
            analysisId: "analysis_processing",
            version: 2,
            status: "processing",
            updatedAt: "2026-05-30T12:10:00.000Z",
            isStalled: false,
            retryable: false,
          },
        })}
      />,
    );

    expect(screen.queryByRole("button", { name: "Retry analysis" })).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Analysis is already processing." })
        .hasAttribute("disabled"),
    ).toBe(true);
  });
});
