import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { init } = vi.hoisted(() => ({ init: vi.fn() }));
vi.mock("posthog-js", () => ({ default: { init, __loaded: false } }));

import { PostHogProvider } from "@/components/observability/posthog-provider";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("client PostHog provider", () => {
  it("does not initialize when NEXT_PUBLIC_POSTHOG_KEY is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    render(
      <PostHogProvider>
        <span>child</span>
      </PostHogProvider>,
    );
    expect(init).not.toHaveBeenCalled();
  });

  it("initializes posthog-js when the public key is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_public");
    render(
      <PostHogProvider>
        <span>child</span>
      </PostHogProvider>,
    );
    expect(init).toHaveBeenCalledWith(
      "phc_public",
      expect.objectContaining({ api_host: expect.any(String) }),
    );
  });

  it("renders its children", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const { getByText } = render(
      <PostHogProvider>
        <span>child-content</span>
      </PostHogProvider>,
    );
    expect(getByText("child-content")).toBeTruthy();
  });
});
