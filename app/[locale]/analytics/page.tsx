import { AnalyticsDashboardView } from "@/components/analytics/dashboard-view";
import { DashboardViewTracker } from "@/components/analytics/dashboard-view-tracker";
import { getAnalyticsDashboard, type AnalyticsDashboardResult } from "@/lib/analytics/dashboard";
import { getAuthenticatedUserId } from "@/lib/auth/server-session";

const emptyDashboard = {
  status: "success",
  categoryFrequency: [],
  biasFrequency: [],
  isEmpty: true,
} satisfies Extract<AnalyticsDashboardResult, { status: "success" }>;

export default async function AnalyticsDashboardPage() {
  const result = await getAnalyticsDashboard({ getUser: getAuthenticatedUserId });
  const dashboard = result.status === "success" ? result : emptyDashboard;

  return (
    <main className="min-h-screen">
      <div className="mx-auto grid min-h-screen w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <DashboardViewTracker />
        <AnalyticsDashboardView dashboard={dashboard} />
      </div>
    </main>
  );
}
