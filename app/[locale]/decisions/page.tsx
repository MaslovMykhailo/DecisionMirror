import { DecisionHistoryList } from "@/components/decisions/decision-history-list";
import { getAuthenticatedUserId } from "@/lib/auth/server-session";
import {
  getDecisionHistoryList,
  parseDecisionHistoryFilters,
  parseDecisionHistorySort,
} from "@/lib/decisions/history";

type DecisionHistoryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DecisionHistoryPage({ searchParams }: DecisionHistoryPageProps = {}) {
  const query = await searchParams;
  const filters = parseDecisionHistoryFilters(query);
  const sort = parseDecisionHistorySort(query);
  const result = await getDecisionHistoryList({ getUser: getAuthenticatedUserId, filters, sort });
  const decisions = result.status === "success" ? result.decisions : [];

  return (
    <main className="min-h-screen">
      <div className="mx-auto grid min-h-screen w-full max-w-4xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <DecisionHistoryList decisions={decisions} filters={filters} sort={sort} />
      </div>
    </main>
  );
}
