import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Decision Mirror loads runtime config from `.env.local` (Next.js convention). Prisma reads
// `.env` by default, so we explicitly load `.env.local` here to keep one source of truth.
loadEnv({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
