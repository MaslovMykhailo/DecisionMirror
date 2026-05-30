import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: { capture, __loaded: true } }));

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@/lib/i18n/navigation", () => ({
  usePathname: () => "/analytics",
  useRouter: () => ({ replace }),
}));

import { DashboardViewTracker } from "@/components/analytics/dashboard-view-tracker";
import { LanguageSwitcher } from "@/components/language-switcher";

const messages = { LanguageSwitcher: { label: "Language", en: "English", uk: "Українська" } };

afterEach(() => {
  vi.clearAllMocks();
});

describe("client analytics events", () => {
  it("emits dashboard_viewed when the analytics dashboard view mounts", () => {
    render(<DashboardViewTracker />);
    expect(capture).toHaveBeenCalledWith("dashboard_viewed", {});
  });

  it("emits locale_switched with from and to when the language changes", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LanguageSwitcher />
      </NextIntlClientProvider>,
    );

    await userEvent.selectOptions(document.querySelector("select")!, "uk");

    expect(capture).toHaveBeenCalledWith("locale_switched", { from: "en", to: "uk" });
  });
});
