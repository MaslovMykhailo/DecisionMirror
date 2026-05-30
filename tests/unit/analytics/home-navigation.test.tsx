import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/auth/logout-button", () => ({
  LogoutButton: () => <button type="button">Log out</button>,
}));
vi.mock("@/components/decisions/create-decision-form", () => ({
  CreateDecisionForm: () => <form aria-label="Capture a decision" />,
}));
vi.mock("@/components/language-switcher", () => ({
  LanguageSwitcher: () => <button type="button">Language</button>,
}));
vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));
vi.mock("@/lib/auth/actions", () => ({
  logoutAction: vi.fn(),
}));
vi.mock("@/lib/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

const messages = {
  Common: {
    appName: "Decision Mirror",
    tagline: "See a choice from the outside before it becomes a regret.",
  },
  Nav: {
    history: "History",
    dashboard: "Dashboard",
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
  vi.clearAllMocks();
});

describe("home navigation", () => {
  it("links to history and analytics from the authenticated header", async () => {
    const { default: Home } = await import("@/app/[locale]/page");
    renderWithIntl(<Home />);

    expect(screen.getByRole("link", { name: /history/i }).getAttribute("href")).toBe("/decisions");
    expect(screen.getByRole("link", { name: /dashboard/i }).getAttribute("href")).toBe(
      "/analytics",
    );
  });
});
