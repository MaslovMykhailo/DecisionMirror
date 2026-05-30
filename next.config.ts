import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

import { resolveSentryRelease } from "./lib/observability/release";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

// Source-map upload + release tagging. SENTRY_AUTH_TOKEN is a build secret; when it is
// absent (e.g. local builds) the Sentry plugin skips the upload with a warning rather
// than failing the build.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: "mykhailom-system",
  project: "decision-mirror",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: { name: resolveSentryRelease() },
  silent: !process.env.CI,
  // Keep build output clean and uploads resilient on serverless.
  widenClientFileUpload: true,
  disableLogger: true,
});
