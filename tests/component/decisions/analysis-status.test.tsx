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
});
