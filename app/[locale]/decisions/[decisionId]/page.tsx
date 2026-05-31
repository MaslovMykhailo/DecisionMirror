import { AppNav } from "@/components/app-nav";
import { DecisionDetailView } from "@/components/decisions/decision-detail-view";
import { getAuthenticatedUserId } from "@/lib/auth/server-session";
import { getDecisionHistoryDetail } from "@/lib/decisions/history";

type DecisionDetailPageProps = {
  params: Promise<{ decisionId: string }>;
};

export default async function DecisionDetailPage({ params }: DecisionDetailPageProps) {
  const { decisionId } = await params;
  const result = await getDecisionHistoryDetail(decisionId, {
    getUser: getAuthenticatedUserId,
  });

  return (
    <>
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6 lg:px-8">
        <AppNav />
      </div>
      <DecisionDetailView result={result} />
    </>
  );
}
