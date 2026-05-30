import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DecisionHistoryList } from "@/components/decisions/decision-history-list";
import type { DecisionHistoryItem } from "@/lib/decisions/history";

vi.mock("@/lib/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ refresh: vi.fn() }),
}));

const messages = {
  DecisionHistory: {
    title: "Decision history",
    description: "Review saved decisions and their analysis state.",
    emptyTitle: "No decisions yet",
    emptyDescription: "Saved decisions will appear here after you capture them.",
    categoryLabel: "Category: {category}",
    openDetail: "Open decision",
  },
  AnalysisState: {
    status: {
      processing: "Processing",
      ready: "Ready",
      failed: "Failed",
      stalled: "Stalled",
    },
    processing: "Analysis is still processing.",
    stalled: "Analysis stalled. You can retry it from the detail view.",
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
  },
};

function renderWithIntl(component: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {component}
    </NextIntlClientProvider>,
  );
}

function historyItem(overrides: Partial<DecisionHistoryItem> = {}): DecisionHistoryItem {
  return {
    id: "decision_1",
    summary: "Accept the startup offer",
    createdAt: "2026-05-30T12:00:00.000Z",
    updatedAt: "2026-05-30T12:05:00.000Z",
    newestAnalysis: {
      analysisId: "analysis_1",
      version: 1,
      status: "ready",
      updatedAt: "2026-05-30T12:05:00.000Z",
      isStalled: false,
      retryable: false,
    },
    newestReadyCategory: "career",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("decision history list", () => {
  it("shows row summary, ready category, status badge, failed explanation, and not-ready explanation", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));

    renderWithIntl(
      <DecisionHistoryList
        decisions={[
          historyItem(),
          historyItem({
            id: "decision_processing",
            summary: "Wait before moving cities",
            newestAnalysis: {
              analysisId: "analysis_processing",
              version: 1,
              status: "processing",
              updatedAt: "2026-05-30T12:10:00.000Z",
              isStalled: false,
              retryable: false,
            },
            newestReadyCategory: null,
          }),
          historyItem({
            id: "decision_failed",
            summary: "Refinance the mortgage",
            newestAnalysis: {
              analysisId: "analysis_failed",
              version: 1,
              status: "failed",
              updatedAt: "2026-05-30T12:15:00.000Z",
              isStalled: false,
              retryable: true,
              failureReason: "The structured output did not match the contract.",
            },
            newestReadyCategory: null,
          }),
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Decision history" })).toBeDefined();
    expect(screen.getByText("Accept the startup offer")).toBeDefined();
    expect(screen.getByText("Category: Career")).toBeDefined();
    expect(screen.getByText("Ready")).toBeDefined();
    expect(screen.getByText("Wait before moving cities")).toBeDefined();
    expect(screen.getByText("Processing")).toBeDefined();
    expect(screen.getByText("Analysis is still processing.")).toBeDefined();
    expect(screen.getByText("Refinance the mortgage")).toBeDefined();
    expect(screen.getByText("Failed")).toBeDefined();
    expect(
      screen.getByText("Analysis failed: The structured output did not match the contract."),
    ).toBeDefined();
  });

  it("renders an empty state without decision rows", () => {
    renderWithIntl(<DecisionHistoryList decisions={[]} />);

    expect(screen.getByRole("heading", { name: "No decisions yet" })).toBeDefined();
    expect(
      screen.getByText("Saved decisions will appear here after you capture them."),
    ).toBeDefined();
    expect(screen.queryByText("Accept the startup offer")).toBeNull();
  });

  it("shows stalled retryable state without polling or telemetry payloads", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderWithIntl(
      <DecisionHistoryList
        decisions={[
          historyItem({
            id: "decision_stalled",
            summary: "Move private decision text",
            newestAnalysis: {
              analysisId: "analysis_stalled",
              version: 2,
              status: "processing",
              updatedAt: "2026-05-30T11:30:00.000Z",
              isStalled: true,
              retryable: true,
            },
            newestReadyCategory: null,
          }),
        ]}
      />,
    );

    expect(screen.getByText("Stalled")).toBeDefined();
    expect(
      screen.getByText("Analysis stalled. You can retry it from the detail view."),
    ).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
