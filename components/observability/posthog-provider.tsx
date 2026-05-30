"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

/**
 * Initializes the browser PostHog client once on mount. A no-op when
 * `NEXT_PUBLIC_POSTHOG_KEY` is absent, so local and test runs send nothing. Server-side
 * pipeline events go through `posthog-node`; this client covers view/locale events.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: false,
      capture_pageleave: true,
    });
  }, []);

  return <>{children}</>;
}
