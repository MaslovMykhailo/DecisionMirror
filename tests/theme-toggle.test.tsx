import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "@/components/theme-toggle";

// next-themes is mocked: tests are deterministic and never touch the real
// provider, localStorage, or the OS preference.
const setTheme = vi.fn();
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme }),
}));

const messages = {
  Theme: { toggle: "Toggle theme", light: "Light", dark: "Dark", system: "System" },
};

function renderToggle() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ThemeToggle />
    </NextIntlClientProvider>,
  );
}

// Radix relies on these DOM APIs that jsdom does not implement.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  setTheme.mockReset();
});

describe("ThemeToggle", () => {
  it("renders an accessible toggle control", () => {
    renderToggle();
    expect(screen.getByRole("button", { name: "Toggle theme" })).toBeDefined();
  });

  it.each([
    ["Light", "light"],
    ["Dark", "dark"],
    ["System", "system"],
  ])("selecting %s calls setTheme(%s)", async (label, value) => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole("button", { name: "Toggle theme" }));
    await user.click(await screen.findByRole("menuitem", { name: label }));

    expect(setTheme).toHaveBeenCalledWith(value);
  });
});
