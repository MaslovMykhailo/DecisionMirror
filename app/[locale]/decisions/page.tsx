import { DecisionHistoryList } from "@/components/decisions/decision-history-list";
import { getAuthenticatedUserId } from "@/lib/auth/server-session";
import { getDecisionHistoryList } from "@/lib/decisions/history";

export default async function DecisionHistoryPage() {
  const result = await getDecisionHistoryList({ getUser: getAuthenticatedUserId });
  const decisions = result.status === "success" ? result.decisions : [];

  return (
    <main className="min-h-screen">
      <div className="mx-auto grid min-h-screen w-full max-w-4xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <DecisionHistoryList decisions={decisions} />
      </div>
    </main>
  );
}
