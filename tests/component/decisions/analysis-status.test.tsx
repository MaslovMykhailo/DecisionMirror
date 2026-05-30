import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import { AnalysisStatusBadge } from "@/components/decisions/analysis-status";

const messages = {
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
};

function renderWithIntl(component: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {component}
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe("analysis status presentation", () => {
  it.each([
    ["processing", "Processing"],
    ["ready", "Ready"],
    ["failed", "Failed"],
  ] as const)("renders the %s status badge", (status, label) => {
    renderWithIntl(<AnalysisStatusBadge status={status} />);

    const badge = screen.getByText(label);
    expect(badge).toBeDefined();
    expect(badge.closest("[data-analysis-status]")?.getAttribute("data-analysis-status")).toBe(
      status,
    );
  });

  it("renders stalled processing with a distinct badge label", () => {
    renderWithIntl(<AnalysisStatusBadge status="processing" isStalled />);

    const badge = screen.getByText("Stalled");
    expect(badge).toBeDefined();
    expect(badge.closest("[data-analysis-status]")?.getAttribute("data-analysis-status")).toBe(
      "stalled",
    );
  });
});
