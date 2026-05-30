import { config } from "dotenv";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

config({ path: ".env.local" });
config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log("DATABASE_URL is not set; skipping LangGraph checkpointer setup.");
  process.exit(0);
}

const checkpointer = PostgresSaver.fromConnString(databaseUrl);

try {
  await checkpointer.setup();
  console.log("LangGraph checkpointer tables are ready.");
} finally {
  await checkpointer.end();
}
