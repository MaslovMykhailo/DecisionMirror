-- Layout: Prisma-managed relational tables first, then the raw-SQL pgvector block
-- (DecisionMemory) last so its foreign keys to User/Decision/Analysis resolve.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('processing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "DecisionCategory" AS ENUM ('career', 'finance', 'relationships', 'health', 'education', 'business', 'lifestyle', 'other');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "situation" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'processing',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "category" "DecisionCategory",
    "biases" JSONB,
    "missedAlternatives" JSONB,
    "premortemRisks" JSONB,
    "keyAssumptions" JSONB,
    "warningSigns" JSONB,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Decision_userId_idx" ON "Decision"("userId");

-- CreateIndex
CREATE INDEX "Analysis_decisionId_idx" ON "Analysis"("decisionId");

-- CreateIndex
CREATE UNIQUE INDEX "Analysis_decisionId_version_key" ON "Analysis"("decisionId", "version");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Long-term agent memory (cross-decision semantic recall), created with raw SQL because
-- pgvector's `vector` type lives outside Prisma's typed layer. Coexists with the
-- Prisma-managed relational tables on the same instance.
-- ---------------------------------------------------------------------------

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
