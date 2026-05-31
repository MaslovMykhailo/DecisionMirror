import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LogoutButton } from "@/components/auth/logout-button";

const messages = { Auth: { logout: "Log out" } };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderButton() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <LogoutButton action={vi.fn()} redirectTo="/en/login" />
    </NextIntlClientProvider>,
  );
}

describe("LogoutButton", () => {
  it("renders an icon and an accessible label", () => {
    renderButton();

    const button = screen.getByRole("button", { name: /log out/i });
    expect(button.querySelector("svg")).not.toBeNull();
  });

  it("collapses the label to icon-only on mobile", () => {
    renderButton();

    const label = screen.getByText("Log out", {
      selector: "span",
    });
    expect(label.className).toContain("sr-only");
    expect(label.className).toContain("sm:not-sr-only");
  });
});
