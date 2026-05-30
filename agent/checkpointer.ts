import "server-only";

import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

import type { AgentCheckpointer } from "@/agent/graph";

export function createPostgresCheckpointer(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): AgentCheckpointer {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to create the LangGraph Postgres checkpointer.");
  }

  return PostgresSaver.fromConnString(env.DATABASE_URL);
}
