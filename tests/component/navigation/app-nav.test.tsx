import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppNav } from "@/components/app-nav";

const pathnameRef = vi.hoisted(() => ({ current: "/" }));

vi.mock("@/lib/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
  usePathname: () => pathnameRef.current,
}));
vi.mock("@/lib/auth/actions", () => ({ logoutAction: vi.fn() }));
vi.mock("@/components/language-switcher", () => ({
  LanguageSwitcher: () => <button type="button">Language</button>,
}));
vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));
vi.mock("@/components/auth/logout-button", () => ({
  LogoutButton: () => <button type="button">Log out</button>,
}));

const messages = {
  Common: { appName: "Decision Mirror" },
  Nav: { home: "Home", history: "History", dashboard: "Dashboard" },
};

function renderNav() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AppNav />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  pathnameRef.current = "/";
  vi.clearAllMocks();
});

describe("AppNav", () => {
  it("renders home/capture, dashboard, history, language, theme, and logout controls", () => {
    renderNav();

    expect(screen.getByRole("link", { name: /home|decision mirror/i }).getAttribute("href")).toBe(
      "/",
    );
    expect(screen.getByRole("link", { name: /dashboard/i }).getAttribute("href")).toBe(
      "/analytics",
    );
    expect(screen.getByRole("link", { name: /history/i }).getAttribute("href")).toBe("/decisions");
    expect(screen.getByRole("button", { name: "Language" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Theme" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Log out" })).toBeDefined();
  });

  it("marks the home destination active on the locale root", () => {
    pathnameRef.current = "/";
    renderNav();

    expect(
      screen.getByRole("link", { name: /home|decision mirror/i }).getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getByRole("link", { name: /history/i }).getAttribute("aria-current")).toBeNull();
    expect(
      screen.getByRole("link", { name: /dashboard/i }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("marks the history destination active on /decisions and its detail routes", () => {
    pathnameRef.current = "/decisions/decision_1";
    renderNav();

    expect(screen.getByRole("link", { name: /history/i }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(
      screen.getByRole("link", { name: /home|decision mirror/i }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("marks the dashboard destination active on /analytics", () => {
    pathnameRef.current = "/analytics";
    renderNav();

    expect(screen.getByRole("link", { name: /dashboard/i }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("renders a home icon as part of the home link", () => {
    renderNav();

    const home = screen.getByRole("link", { name: /home|decision mirror/i });
    expect(home.querySelector("svg")).not.toBeNull();
    expect(home.textContent).toContain("Decision Mirror");
  });

  it("orders the controls as theme, language, then logout", () => {
    renderNav();

    const theme = screen.getByRole("button", { name: "Theme" });
    const language = screen.getByRole("button", { name: "Language" });
    const logout = screen.getByRole("button", { name: "Log out" });

    // Theme precedes Language precedes Logout in document order.
    expect(theme.compareDocumentPosition(language) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      language.compareDocumentPosition(logout) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("lays out as a wrapping row and collapses link labels to icon-only on mobile", () => {
    renderNav();

    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("flex-wrap");

    // Labels stay accessible (sr-only) but are visually hidden at the smallest breakpoint.
    for (const name of [/dashboard/i, /history/i]) {
      const label = screen.getByText(
        (content, element) => element?.tagName === "SPAN" && name.test(content),
      );
      expect(label.className).toContain("sr-only");
      expect(label.className).toContain("sm:not-sr-only");
    }
  });
});
