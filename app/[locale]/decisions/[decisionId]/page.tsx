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

  return <DecisionDetailView result={result} />;
}
