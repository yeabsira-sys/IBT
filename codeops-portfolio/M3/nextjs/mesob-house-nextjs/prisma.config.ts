import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node scripts/seed.mjs",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
