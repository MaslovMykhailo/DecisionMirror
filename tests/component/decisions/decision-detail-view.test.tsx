import { cleanup, render, screen } from "@testing-library/react";
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
    notFoundTitle: "Decision not found",
    notFoundDescription: "This decision is unavailable or belongs to another user.",
  },
  AnalysisState: {
    status: {
      processing: "Processing",
      ready: "Ready",
      failed: "Failed",
    },
    processing: "Analysis is still processing.",
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
    },
    readyAnalysis: {
      analysisId: "analysis_ready",
      version: 1,
      updatedAt: "2026-05-30T12:05:00.000Z",
      result: validAnalysisOutput,
    },
    ...overrides,
  };
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
          },
          readyAnalysis: null,
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
            failureReason: "The structured output did not match the contract.",
          },
          readyAnalysis: null,
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
});
