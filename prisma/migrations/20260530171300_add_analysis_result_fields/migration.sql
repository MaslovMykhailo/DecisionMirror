-- Add nullable structured result sections for ready agent analyses.
ALTER TABLE "Analysis"
  ADD COLUMN "biases" JSONB,
  ADD COLUMN "missedAlternatives" JSONB,
  ADD COLUMN "premortemRisks" JSONB,
  ADD COLUMN "keyAssumptions" JSONB,
  ADD COLUMN "warningSigns" JSONB;
