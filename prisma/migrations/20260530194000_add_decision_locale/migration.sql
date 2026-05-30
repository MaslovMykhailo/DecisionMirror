ALTER TABLE "Analysis"
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en';

ALTER TABLE "Analysis"
  ADD CONSTRAINT "Analysis_locale_check" CHECK ("locale" IN ('en', 'uk'));
