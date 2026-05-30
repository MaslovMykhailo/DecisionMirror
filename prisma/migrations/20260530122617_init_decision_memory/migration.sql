/*
  Warnings:

  - You are about to drop the `DecisionMemory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DecisionMemory" DROP CONSTRAINT "DecisionMemory_decisionId_fkey";

-- DropForeignKey
ALTER TABLE "DecisionMemory" DROP CONSTRAINT "DecisionMemory_userId_fkey";

-- DropTable
DROP TABLE "DecisionMemory";
