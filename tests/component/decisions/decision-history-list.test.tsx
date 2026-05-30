import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DecisionHistoryList } from "@/components/decisions/decision-history-list";
import { COGNITIVE_BIASES, DECISION_CATEGORIES } from "@/lib/taxonomy";
import type { DecisionHistoryItem } from "@/lib/decisions/history";

const replaceMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/decisions",
  useRouter: () => ({ refresh: vi.fn(), replace: replaceMock }),
}));

const messages = {
  DecisionHistory: {
    title: "Decision history",
    description: "Review saved decisions and their analysis state.",
    emptyTitle: "No decisions yet",
    emptyDescription: "Saved decisions will appear here after you capture them.",
    filteredEmptyTitle: "No matching decisions",
    filteredEmptyDescription: "Change the filters to see more saved decisions.",
    categoryLabel: "Category: {category}",
    categoryFilter: "Category",
    biasFilter: "Bias",
    sortControl: "Sort",
    allCategories: "All categories",
    allBiases: "All biases",
    sortCreatedAt: "Newest first",
    sortComplexity: "Complexity",
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

function historyItem(overrides: Partial<DecisionHistoryItem> = {}): DecisionHistoryItem {
  const complexity = overrides.complexity === undefined ? 4 : overrides.complexity;

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
    complexity,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
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

  it("renders localized filter and sort controls with selected values", () => {
    renderWithIntl(
      <DecisionHistoryList
        decisions={[historyItem()]}
        filters={{ category: "career", bias: "confirmation_bias" }}
        sort="complexity"
      />,
    );

    const categorySelect = screen.getByLabelText("Category") as HTMLSelectElement;
    const biasSelect = screen.getByLabelText("Bias") as HTMLSelectElement;
    const sortSelect = screen.getByLabelText("Sort") as HTMLSelectElement;

    expect(categorySelect.value).toBe("career");
    expect(biasSelect.value).toBe("confirmation_bias");
    expect(sortSelect.value).toBe("complexity");
    expect(within(categorySelect).getAllByRole("option")).toHaveLength(
      DECISION_CATEGORIES.length + 1,
    );
    expect(within(biasSelect).getAllByRole("option")).toHaveLength(COGNITIVE_BIASES.length + 1);
    expect(screen.getByRole("option", { name: "Career" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Confirmation bias" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Complexity" })).toBeDefined();
  });

  it("updates the locale-aware query string when a control changes", async () => {
    const user = userEvent.setup();

    renderWithIntl(
      <DecisionHistoryList
        decisions={[historyItem()]}
        filters={{ category: null, bias: "confirmation_bias" }}
        sort="complexity"
      />,
    );

    await user.selectOptions(screen.getByLabelText("Category"), "finance");

    expect(replaceMock).toHaveBeenCalledWith(
      "/decisions?category=finance&bias=confirmation_bias&sort=complexity",
    );
  });

  it("renders a filtered empty state distinct from no decisions", () => {
    renderWithIntl(
      <DecisionHistoryList
        decisions={[]}
        filters={{ category: "career", bias: null }}
        sort="created_at"
      />,
    );

    expect(screen.getByRole("heading", { name: "No matching decisions" })).toBeDefined();
    expect(screen.getByText("Change the filters to see more saved decisions.")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "No decisions yet" })).toBeNull();
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
