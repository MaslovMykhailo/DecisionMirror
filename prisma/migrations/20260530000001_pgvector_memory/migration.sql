-- Long-term agent memory (cross-decision semantic recall), created with raw SQL because
-- pgvector's `vector` type lives outside Prisma's typed layer. Coexists with the
-- Prisma-managed relational tables on the same instance.

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable: one embedding record per analyzed decision, scoped by user for isolation.
-- The vector dimension matches the default embeddings model (Voyage voyage-3 = 1024 dims);
-- revisit if the embeddings provider changes (see design.md open question).
CREATE TABLE IF NOT EXISTS "DecisionMemory" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "content"    TEXT NOT NULL,
    "embedding"  vector(1024) NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionMemory_pkey" PRIMARY KEY ("id")
);

-- Recall is always filtered by userId — no cross-user leakage, ever.
CREATE INDEX IF NOT EXISTS "DecisionMemory_userId_idx" ON "DecisionMemory" ("userId");
CREATE INDEX IF NOT EXISTS "DecisionMemory_analysisId_idx" ON "DecisionMemory" ("analysisId");
CREATE UNIQUE INDEX IF NOT EXISTS "DecisionMemory_userId_decisionId_key"
    ON "DecisionMemory" ("userId", "decisionId");

-- Approximate-nearest-neighbour index for cosine similarity search over the embeddings.
CREATE INDEX IF NOT EXISTS "DecisionMemory_embedding_idx"
    ON "DecisionMemory" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- Foreign keys mirror the Prisma cascade semantics (memory dies with its user/decision).
ALTER TABLE "DecisionMemory"
    ADD CONSTRAINT "DecisionMemory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DecisionMemory"
    ADD CONSTRAINT "DecisionMemory_decisionId_fkey"
    FOREIGN KEY ("decisionId") REFERENCES "Decision" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DecisionMemory"
    ADD CONSTRAINT "DecisionMemory_analysisId_fkey"
    FOREIGN KEY ("analysisId") REFERENCES "Analysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
