import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local first (for local secrets), then fallback to .env
config({ path: ".env.local" });
config();

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(databaseUrl
    ? {
        engine: "classic" as const,
        datasource: {
          url: databaseUrl,
        },
      }
    : {}),
});
