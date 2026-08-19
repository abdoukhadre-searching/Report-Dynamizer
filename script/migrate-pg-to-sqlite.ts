// Script ponctuel : copie les données PostgreSQL existantes vers le fichier SQLite.
// DÉJÀ EXÉCUTÉ le 2026-08-19 (données copiées dans ./data/mab-projets.db).
// NOTE : "pg" a été retiré des dépendances du projet ; pour ré-exécuter ce script,
// installer d'abord : npm install pg
// Usage : DATABASE_URL=... npx tsx script/migrate-pg-to-sqlite.ts
import pg from "pg";
import "../server/db"; // crée le fichier + les tables
import { sqlite } from "../server/db";

const jsonCols = new Set([
  "images", "spec_pages", "custom_measures", "pre_report_data", "post_report_data",
  "comparison_data", "annex_preuves_images", "annex_preuves_sections", "mandat_data", "offre_data",
]);
const boolCols = new Set(["is_default", "has_commercial_units", "logisvert_admissible"]);

function convert(col: string, v: any): any {
  if (v === null || v === undefined) return null;
  if (col === "created_at") return Math.floor(new Date(v).getTime() / 1000);
  if (boolCols.has(col)) return v ? 1 : 0;
  if (jsonCols.has(col)) return typeof v === "string" ? v : JSON.stringify(v);
  return v;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL requis");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const tables = ["users", "audit_logs", "heat_pumps", "projects", "mandats", "offres"];
  for (const table of tables) {
    const { rows } = await pool.query(`SELECT * FROM ${table}`);
    if (!rows.length) { console.log(`${table}: 0 lignes`); continue; }
    const cols = Object.keys(rows[0]);
    const stmt = sqlite.prepare(
      `INSERT OR REPLACE INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`
    );
    const insertAll = sqlite.transaction((rs: any[]) => {
      for (const r of rs) stmt.run(cols.map((c) => convert(c, r[c])));
    });
    insertAll(rows);
    console.log(`${table}: ${rows.length} lignes copiées`);
  }
  await pool.end();
  console.log("Migration terminée →", process.env.MAB_DATA_DIR || "./data");
}

main().catch((e) => { console.error(e); process.exit(1); });
