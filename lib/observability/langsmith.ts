import type { RunnableConfig } from "@langchain/core/runnables";

import { scrubProperties } from "@/lib/observability/scrub";

/**
 * LangSmith tracing is driven by the LangChain SDK's own env vars (`LANGSMITH_TRACING`
 * + `LANGSMITH_API_KEY`). We additionally require `LANGSMITH_PROJECT` so traces are
 * always scoped to a named project — never the shared default. This is also the guard
 * that keeps cron/headless contexts (where the project or key is absent) from tracing.
 */
type LangsmithEnv = Record<string, string | undefined>;

export function langsmithTracingEnabled(env: LangsmithEnv = process.env): boolean {
  return (
    env.LANGSMITH_TRACING === "true" &&
    Boolean(env.LANGSMITH_API_KEY) &&
    Boolean(env.LANGSMITH_PROJECT)
  );
}

/**
 * Merge privacy-safe run metadata into a node's RunnableConfig so it is attached to the
 * LangSmith run. Recalled memories are recorded by id reference, never raw content; the
 * metadata is scrubbed as a backstop.
 */
export function attachRunMetadata(
  config: RunnableConfig | undefined,
  metadata: Record<string, unknown>,
): void {
  if (!config) return;
  config.metadata = { ...(config.metadata ?? {}), ...scrubProperties(metadata) };
}
