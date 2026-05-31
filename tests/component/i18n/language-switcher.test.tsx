import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LanguageSwitcher } from "@/components/language-switcher";

vi.mock("@/lib/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@/lib/observability/capture-client", () => ({ captureClientEvent: vi.fn() }));

const messages = {
  LanguageSwitcher: { label: "Language", en: "English", uk: "Ukrainian" },
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LanguageSwitcher", () => {
  it("renders the select at the aligned control height", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LanguageSwitcher />
      </NextIntlClientProvider>,
    );

    const select = screen.getByLabelText("Language") as HTMLSelectElement;
    expect(select.className).toContain("h-9");
  });

  it("does not render a visible text label", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LanguageSwitcher />
      </NextIntlClientProvider>,
    );

    // The label remains accessible via aria-label, but no visible text label is rendered.
    const select = screen.getByLabelText("Language") as HTMLSelectElement;
    expect(select.getAttribute("aria-label")).toBe("Language");
    expect(screen.queryByText("Language", { selector: "span,label" })).toBeNull();
  });
});
