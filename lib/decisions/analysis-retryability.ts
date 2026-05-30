export const DEFAULT_STALLED_ANALYSIS_TIMEOUT_MS = 15 * 60 * 1000;

export type AnalysisRetryabilityOptions = {
  now?: () => Date;
  stalledTimeoutMs?: number;
};

type AnalysisRetryabilityInput = {
  status: string;
  updatedAt: Date | string;
};

function resolveNow(options: AnalysisRetryabilityOptions) {
  return options.now?.() ?? new Date();
}

export function analysisRetryability(
  analysis: AnalysisRetryabilityInput,
  options: AnalysisRetryabilityOptions = {},
) {
  if (analysis.status === "failed") {
    return { isStalled: false, retryable: true };
  }

  if (analysis.status !== "processing") {
    return { isStalled: false, retryable: false };
  }

  const updatedAt =
    analysis.updatedAt instanceof Date ? analysis.updatedAt : new Date(analysis.updatedAt);
  const timeoutMs = options.stalledTimeoutMs ?? DEFAULT_STALLED_ANALYSIS_TIMEOUT_MS;
  const elapsedMs = resolveNow(options).getTime() - updatedAt.getTime();
  const isStalled = Number.isFinite(elapsedMs) && elapsedMs >= timeoutMs;

  return { isStalled, retryable: isStalled };
}
