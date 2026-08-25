import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";
import fs from "fs";
import path from "path";

// Les documents téléversés restent sur le disque persistant du serveur. Cette
// valeur ne contrôle plus la base de données : PostgreSQL est la seule source
// active pour les données métier et les sessions.
export const APP_DATA_DIR = process.env.MAB_DATA_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(APP_DATA_DIR, { recursive: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL est requis : configurez la connexion PostgreSQL avant de démarrer l'application.");
}

export const pool = new Pool({
  connectionString,
  // Les fournisseurs PostgreSQL gérés et les VMs historiques utilisent TLS.
  // PGSSLMODE=no-verify permet toutefois un certificat autosigné seulement
  // lorsque l'administrateur l'a explicitement demandé dans DATABASE_URL.
  ssl: process.env.PGSSLMODE === "disable"
    ? false
    : process.env.PGSSLMODE === "no-verify"
      ? { rejectUnauthorized: false }
      : undefined,
});

export const db = drizzle(pool, { schema });

export async function assertDatabaseConnection(): Promise<void> {
  await pool.query("SELECT 1");
}