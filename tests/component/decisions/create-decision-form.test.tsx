import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CreateDecisionForm } from "@/components/decisions/create-decision-form";

const messages = {
  DecisionCapture: {
    title: "Capture a decision",
    situation: "Situation",
    decision: "Decision",
    reasoning: "Reasoning",
    reasoningOptional: "optional",
    submit: "Save decision",
    pending: "Saving decision",
    success: "Decision saved. Analysis is starting.",
    error: "We could not save this decision.",
    errors: {
      situation_required: "Describe the situation.",
      decision_required: "Enter the decision.",
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

function mockSuccessfulCreate() {
  return vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        status: "success",
        decisionId: "decision_1",
        analysisId: "analysis_1",
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    ),
  );
}

function submittedPayload(fetchMock: ReturnType<typeof vi.fn>) {
  const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
  return JSON.parse(String(request?.body));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("create decision form", () => {
  it("shows required field errors without sending a create request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWithIntl(<CreateDecisionForm />);
    await user.click(screen.getByRole("button", { name: "Save decision" }));

    expect(screen.getByText("Describe the situation.")).toBeDefined();
    expect(screen.getByText("Enter the decision.")).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits valid input without requiring reasoning", async () => {
    const fetchMock = mockSuccessfulCreate();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWithIntl(<CreateDecisionForm />);
    await user.type(screen.getByLabelText("Situation"), "Choosing a new role");
    await user.type(screen.getByLabelText("Decision"), "Accept the offer");
    await user.click(screen.getByRole("button", { name: "Save decision" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(submittedPayload(fetchMock)).toEqual({
      situation: "Choosing a new role",
      decision: "Accept the offer",
    });
    expect(screen.getByText("Decision saved. Analysis is starting.")).toBeDefined();
  });

  it("submits trimmed values from all fields", async () => {
    const fetchMock = mockSuccessfulCreate();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWithIntl(<CreateDecisionForm />);
    await user.type(screen.getByLabelText("Situation"), "  Move cities  ");
    await user.type(screen.getByLabelText("Decision"), "  Stay remote  ");
    await user.type(screen.getByLabelText("Reasoning (optional)"), "  family support  ");
    await user.click(screen.getByRole("button", { name: "Save decision" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(submittedPayload(fetchMock)).toEqual({
      situation: "Move cities",
      decision: "Stay remote",
      reasoning: "family support",
    });
  });
});
