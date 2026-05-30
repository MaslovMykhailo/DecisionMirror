// Sentry initialization for the browser runtime. Hand-maintained from the
// @sentry/wizard layout; init options + PII scrub are centralized in
// lib/observability/sentry.ts. A no-op when no DSN is configured.
import * as Sentry from "@sentry/nextjs";

import { sentryInitOptions } from "@/lib/observability/sentry";

Sentry.init(sentryInitOptions());

// Required so Next.js can instrument client-side navigations for tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
