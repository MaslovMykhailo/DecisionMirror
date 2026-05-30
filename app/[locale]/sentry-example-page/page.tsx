"use client";

import * as Sentry from "@sentry/nextjs";

/**
 * Manual Sentry verification aid (from the @sentry/wizard layout). Clicking the button
 * throws an uncaught error captured by Sentry. With a DSN configured, confirm it appears
 * in Sentry → Issues; with no DSN it is an inert no-op. Carries no decision content.
 */
export default function SentryExamplePage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-content-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Sentry verification</h1>
      <p className="text-muted-foreground text-sm">
        Trigger a sample error and confirm it reaches Sentry Issues.
      </p>
      <button
        type="button"
        className="bg-foreground text-background rounded-md px-4 py-2"
        onClick={() => {
          Sentry.startSpan({ name: "sentry-example", op: "test" }, () => {
            throw new Error("Sentry example frontend error");
          });
        }}
      >
        Throw a sample error
      </button>
    </main>
  );
}
