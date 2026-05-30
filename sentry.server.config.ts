// Sentry initialization for the Node.js server runtime.
// Hand-maintained from the @sentry/wizard layout; init options + PII scrub are
// centralized in lib/observability/sentry.ts. A no-op when NEXT_PUBLIC_SENTRY_DSN is absent.
import * as Sentry from "@sentry/nextjs";

import { sentryInitOptions } from "@/lib/observability/sentry";

Sentry.init(sentryInitOptions(process.env));
