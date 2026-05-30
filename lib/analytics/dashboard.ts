import type { AuthenticatedUserIdResult } from "@/lib/auth/session";
import {
  biasSchema,
  categorySchema,
  type CognitiveBias,
  type DecisionCategory,
} from "@/lib/taxonomy";

type GetUser = () => Promise<AuthenticatedUserIdResult>;

type DashboardDb = {
  $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
};

type DashboardDeps = {
  getUser: GetUser;
  db?: DashboardDb;
};

type CategoryFrequencyQueryRow = {
  category: unknown;
  count: unknown;
};

type BiasFrequencyQueryRow = {
  bias: unknown;
  count: unknown;
};

export type DashboardCategoryFrequency = {
  category: DecisionCategory;
  count: number;
};

export type DashboardBiasFrequency = {
  bias: CognitiveBias;
  count: number;
};

export type AnalyticsDashboardResult =
  | { status: "unauthenticated" }
  | {
      status: "success";
      categoryFrequency: DashboardCategoryFrequency[];
      biasFrequency: DashboardBiasFrequency[];
      isEmpty: boolean;
    };

async function defaultDb(): Promise<DashboardDb> {
  const { prisma } = await import("@/lib/db/client");
  return prisma as unknown as DashboardDb;
}

async function resolveDb(db?: DashboardDb): Promise<DashboardDb> {
  return db ?? (await defaultDb());
}

function countFrom(value: unknown) {
  const numeric = typeof value === "bigint" ? Number(value) : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function compareFrequency<T extends { count: number }>(
  left: T,
  right: T,
  idFrom: (row: T) => string,
) {
  const countDelta = right.count - left.count;
  return countDelta === 0 ? idFrom(left).localeCompare(idFrom(right)) : countDelta;
}

function categoryFrequencyFromRows(
  rows: CategoryFrequencyQueryRow[],
): DashboardCategoryFrequency[] {
  return rows
    .map((row) => {
      const category = categorySchema.safeParse(row.category);
      return category.success
        ? {
            category: category.data,
            count: countFrom(row.count),
          }
        : null;
    })
    .filter((row): row is DashboardCategoryFrequency => Boolean(row))
    .sort((left, right) => compareFrequency(left, right, (row) => row.category));
}

function biasFrequencyFromRows(rows: BiasFrequencyQueryRow[]): DashboardBiasFrequency[] {
  return rows
    .map((row) => {
      const bias = biasSchema.safeParse(row.bias);
      return bias.success
        ? {
            bias: bias.data,
            count: countFrom(row.count),
          }
        : null;
    })
    .filter((row): row is DashboardBiasFrequency => Boolean(row))
    .sort((left, right) => compareFrequency(left, right, (row) => row.bias));
}

export async function getAnalyticsDashboard({
  getUser,
  db,
}: DashboardDeps): Promise<AnalyticsDashboardResult> {
  const user = await getUser();
  if (!user.authenticated) return { status: "unauthenticated" };

  const resolvedDb = await resolveDb(db);
  const categoryRows = (await resolvedDb.$queryRaw`
    SELECT
      a."category"::text AS "category",
      COUNT(*) AS "count"
    FROM "Analysis" a
    INNER JOIN "Decision" d ON d."id" = a."decisionId"
    WHERE d."userId" = ${user.userId}
      AND a."status" = 'ready'::"AnalysisStatus"
      AND a."category" IS NOT NULL
    GROUP BY a."category"
  `) as CategoryFrequencyQueryRow[];

  const biasRows = (await resolvedDb.$queryRaw`
    SELECT
      bias_entry->>'id' AS "bias",
      COUNT(*) AS "count"
    FROM "Analysis" a
    INNER JOIN "Decision" d ON d."id" = a."decisionId"
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(a."biases"::jsonb) = 'array' THEN a."biases"::jsonb
        ELSE '[]'::jsonb
      END
    ) AS bias_entry
    WHERE d."userId" = ${user.userId}
      AND a."status" = 'ready'::"AnalysisStatus"
      AND bias_entry ? 'id'
    GROUP BY bias_entry->>'id'
  `) as BiasFrequencyQueryRow[];

  const categoryFrequency = categoryFrequencyFromRows(categoryRows);
  const biasFrequency = biasFrequencyFromRows(biasRows);

  return {
    status: "success",
    categoryFrequency,
    biasFrequency,
    isEmpty: categoryFrequency.length === 0 && biasFrequency.length === 0,
  };
}
