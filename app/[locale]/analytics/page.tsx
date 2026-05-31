import { AnalyticsDashboardView } from "@/components/analytics/dashboard-view";
import { AppNav } from "@/components/app-nav";
import { DashboardViewTracker } from "@/components/analytics/dashboard-view-tracker";
import {
  getAnalyticsDashboard,
  normalizeDashboardMode,
  type AnalyticsDashboardResult,
} from "@/lib/analytics/dashboard";
import { getAuthenticatedUserId } from "@/lib/auth/server-session";

const emptyDashboard = {
  status: "success",
  categoryFrequency: [],
  biasFrequency: [],
  isEmpty: true,
} satisfies Extract<AnalyticsDashboardResult, { status: "success" }>;

type AnalyticsDashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AnalyticsDashboardPage({
  searchParams,
}: AnalyticsDashboardPageProps = {}) {
  const query = await searchParams;
  const mode = normalizeDashboardMode(query?.mode);
  const result = await getAnalyticsDashboard({ getUser: getAuthenticatedUserId, mode });
  const dashboard = result.status === "success" ? result : emptyDashboard;

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <AppNav />
        <DashboardViewTracker />
        <AnalyticsDashboardView dashboard={dashboard} mode={mode} />
      </div>
    </main>
  );
}
