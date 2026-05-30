import "server-only";

import { randomUUID } from "node:crypto";

import type { AnalysisOutput } from "@/agent/schema";
import type { AgentEmbeddings } from "@/agent/memory/embeddings";
import {
  buildDecisionMemoryDocument,
  buildDecisionRecallText,
  formatPriorPatterns,
  type MemoryDecisionInput,
} from "@/agent/memory/document";

export const DEFAULT_MEMORY_TOP_K = 3;

type MemorySqlDb = {
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
};

type PgVectorMemoryRepositoryOptions = {
  db: MemorySqlDb;
  embeddings: AgentEmbeddings;
  topK?: number;
  dimensions?: number;
};

type RecallArgs = {
  userId: string;
  decisionId: string;
  decisionInput: MemoryDecisionInput;
};

type RememberArgs = RecallArgs & {
  analysisId: string;
  analysis: AnalysisOutput;
};

type DecisionMemoryRow = {
  id: string;
  userId: string;
  decisionId: string;
  analysisId: string;
  content: string;
  distance: number | string | null;
};

export function configuredMemoryTopK(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const configured = env.AGENT_MEMORY_TOP_K;
  if (!configured) return DEFAULT_MEMORY_TOP_K;

  const parsed = Number(configured);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("AGENT_MEMORY_TOP_K must be a positive integer.");
  }

  return parsed;
}

function toVectorLiteral(vector: number[]) {
  return `[${vector
    .map((value) => {
      if (!Number.isFinite(value)) throw new Error("Embedding vectors must contain only numbers.");
      return value;
    })
    .join(",")}]`;
}

function assertDimensions(vector: number[], dimensions: number) {
  if (vector.length !== dimensions) {
    throw new Error(
      `Expected a ${dimensions}-dimensional embedding, but received ${vector.length} dimensions.`,
    );
  }
}

export function createPgVectorMemoryRepository({
  db,
  dimensions,
  embeddings,
  topK = configuredMemoryTopK(),
}: PgVectorMemoryRepositoryOptions) {
  const expectedDimensions = dimensions ?? embeddings.metadata.dimensions;

  return {
    async recall({ decisionId, decisionInput, userId }: RecallArgs) {
      const queryEmbedding = await embeddings.embedQuery(buildDecisionRecallText(decisionInput));
      assertDimensions(queryEmbedding, expectedDimensions);
      const queryVector = toVectorLiteral(queryEmbedding);
      const rows = await db.$queryRawUnsafe<DecisionMemoryRow[]>(
        `SELECT
           "id",
           "userId",
           "decisionId",
           "analysisId",
           "content",
           ("embedding" <=> $1::vector) AS "distance"
         FROM "DecisionMemory"
         WHERE "userId" = $2
           AND "decisionId" <> $3
         ORDER BY "embedding" <=> $1::vector ASC
         LIMIT $4`,
        queryVector,
        userId,
        decisionId,
        topK,
      );

      return formatPriorPatterns(rows, { currentDecisionId: decisionId, maxPatterns: topK });
    },

    async remember({ analysis, analysisId, decisionId, decisionInput, userId }: RememberArgs) {
      const content = buildDecisionMemoryDocument({ decisionInput, analysis });
      const documentEmbedding = await embeddings.embedDocument(content);
      assertDimensions(documentEmbedding, expectedDimensions);

      await db.$executeRawUnsafe(
        `INSERT INTO "DecisionMemory" (
           "id",
           "userId",
           "decisionId",
           "analysisId",
           "content",
           "embedding",
           "createdAt",
           "updatedAt"
         )
         VALUES ($1, $2, $3, $4, $5, $6::vector, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT ("userId", "decisionId")
         DO UPDATE SET
           "analysisId" = EXCLUDED."analysisId",
           "content" = EXCLUDED."content",
           "embedding" = EXCLUDED."embedding",
           "updatedAt" = CURRENT_TIMESTAMP`,
        randomUUID(),
        userId,
        decisionId,
        analysisId,
        content,
        toVectorLiteral(documentEmbedding),
      );
    },
  };
}
