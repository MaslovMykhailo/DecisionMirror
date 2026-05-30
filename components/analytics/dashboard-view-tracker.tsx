"use client";

import { useEffect } from "react";

import { captureClientEvent } from "@/lib/observability/capture-client";

/**
 * Emits `dashboard_viewed` once when the analytics dashboard mounts. Rendered by the
 * analytics page (the design scopes this event to the analytics dashboard only).
 */
export function DashboardViewTracker() {
  useEffect(() => {
    captureClientEvent("dashboard_viewed", {});
  }, []);

  return null;
}
