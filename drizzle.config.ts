import { defineConfig } from "drizzle-kit";
import path from "path";

const DATA_DIR = process.env.MAB_DATA_DIR || path.join(process.cwd(), "data");

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: path.join(DATA_DIR, "mab-projets.db"),
  },
  tablesFilter: ["!sessions"],
});
