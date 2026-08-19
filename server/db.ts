import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";
import fs from "fs";

// Répertoire de données : configurable pour le mode desktop (Tauri) via MAB_DATA_DIR
export const DATA_DIR = process.env.MAB_DATA_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

export const DB_PATH = path.join(DATA_DIR, "mab-projets.db");

export const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Création automatique des tables au premier lancement
sqlite.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_email TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  project_id TEXT,
  project_name TEXT,
  details TEXT,
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS heat_pumps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  capacity TEXT,
  hspf2 TEXT,
  seer2 TEXT,
  type TEXT NOT NULL DEFAULT 'heatpump',
  is_default INTEGER NOT NULL DEFAULT 0,
  images TEXT DEFAULT '[]',
  spec_pages TEXT DEFAULT '[]',
  logisvert_pdf TEXT,
  subvention_amount TEXT,
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  year_built TEXT,
  num_floors TEXT,
  num_units TEXT,
  client_name TEXT,
  evaluator TEXT,
  evaluation_date TEXT,
  building_type TEXT NOT NULL DEFAULT 'existing',
  programme_type TEXT NOT NULL DEFAULT 'optimisation',
  thermopompe_model TEXT NOT NULL DEFAULT 'tcl',
  selected_heat_pump_id TEXT,
  selected_water_heater_id TEXT,
  custom_measures TEXT DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  pre_report_raw TEXT,
  post_report_raw TEXT,
  pre_report_data TEXT,
  post_report_data TEXT,
  comparison_data TEXT,
  annex_climate_zone_image TEXT,
  annex_thermopompes_image TEXT,
  annex_robineterie_image TEXT,
  annex_led_lighting_image TEXT,
  annex_vrc_image TEXT,
  annex_chauffe_eau_thermopompe_image TEXT,
  annex_preuves_title TEXT,
  annex_preuves_images TEXT DEFAULT '[]',
  annex_preuves_sections TEXT DEFAULT '[]',
  signatory_name TEXT,
  signatory_title TEXT,
  signatory_coordonnees TEXT,
  has_commercial_units INTEGER,
  commercial_units INTEGER DEFAULT 0,
  basement_insulation_type TEXT,
  basement_insulation_inches TEXT,
  basement_insulation_r_value TEXT,
  nb_chauffe_eau_thermo INTEGER,
  logisvert_subvention_pdf TEXT,
  subvention_thermo_manual TEXT,
  logisvert_admissible INTEGER,
  mandat_data TEXT,
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS mandats (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL DEFAULT '',
  client_name TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  num_units TEXT,
  evaluator TEXT,
  mandataire TEXT,
  mandat_data TEXT,
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS offres (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL DEFAULT 'Nouvelle offre',
  numero TEXT,
  client_name TEXT,
  address TEXT,
  offre_data TEXT,
  created_at INTEGER
);
`);

export const db = drizzle(sqlite, { schema });
