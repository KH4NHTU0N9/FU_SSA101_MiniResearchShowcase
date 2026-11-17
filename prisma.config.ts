import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local first (for local secrets), then fallback to .env
config({ path: ".env.local" });
config();

const databaseUrl = process.env.DATABASE_URL;

export default databaseUrl
  ? defineConfig({
      schema: "prisma/schema.prisma",
      migrations: {
        path: "prisma/migrations",
      },
      engine: "classic",
      datasource: {
        url: databaseUrl,
      },
    })
  : defineConfig({
      schema: "prisma/schema.prisma",
      migrations: {
        path: "prisma/migrations",
      },
    });
