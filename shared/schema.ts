import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, real, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, passwordHash: true }).extend({
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  userEmail: text("user_email"),
  userName: text("user_name"),
  action: text("action").notNull(),
  projectId: varchar("project_id"),
  projectName: text("project_name"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AuditLog = typeof auditLogs.$inferSelect;

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postal_code"),
  yearBuilt: text("year_built"),
  numFloors: text("num_floors"),
  numUnits: text("num_units"),
  clientName: text("client_name"),
  evaluator: text("evaluator"),
  evaluationDate: text("evaluation_date"),
  buildingType: text("building_type").notNull().default("existing"),
  programmeType: text("programme_type").notNull().default("optimisation"),
  thermopompeModel: text("thermopompe_model").notNull().default("tcl"),
  customMeasures: jsonb("custom_measures").default([]),
  status: text("status").notNull().default("draft"),
  preReportRaw: text("pre_report_raw"),
  postReportRaw: text("post_report_raw"),
  preReportData: jsonb("pre_report_data"),
  postReportData: jsonb("post_report_data"),
  comparisonData: jsonb("comparison_data"),
  annexClimateZoneImage: text("annex_climate_zone_image"),
  annexThermopompesImage: text("annex_thermopompes_image"),
  annexRobineterieImage: text("annex_robineterie_image"),
  annexLedLightingImage: text("annex_led_lighting_image"),
  annexVrcImage: text("annex_vrc_image"),
  annexChauffeEauThermopompeImage: text("annex_chauffe_eau_thermopompe_image"),
  signatoryName: text("signatory_name"),
  signatoryTitle: text("signatory_title"),
  signatoryCoordonnes: text("signatory_coordonnees"),
  hasCommercialUnits: boolean("has_commercial_units"),
  commercialUnits: integer("commercial_units").default(0),
  basementInsulationType: text("basement_insulation_type"),
  basementInsulationInches: text("basement_insulation_inches"),
  basementInsulationRValue: text("basement_insulation_r_value"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const buildingZoneSchema = z.object({
  element: z.string(),
  grossArea: z.number().optional(),
  netArea: z.number().optional(),
  rsi: z.number().optional(),
  heatLossMJ: z.number(),
  heatLossPercent: z.number(),
});

export const monthlyEnergySchema = z.object({
  month: z.string(),
  heatingPrimary: z.number(),
  heatingSecondary: z.number(),
  hotWaterPrimary: z.number(),
  hotWaterSecondary: z.number(),
  lightingAppliances: z.number(),
  ventilation: z.number(),
  cooling: z.number(),
});

export const reportDataSchema = z.object({
  fileName: z.string().optional(),
  buildingInfo: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    yearBuilt: z.string().optional(),
    numFloors: z.string().optional(),
    orientation: z.string().optional(),
    climateData: z.string().optional(),
    occupants: z.string().optional(),
    windowFraction: z.string().optional(),
    wallMaxRsi: z.number().optional(),
    roofMaxRsi: z.number().optional(),
    foundationRsi: z.number().optional(),
  }).optional(),
  zone1: z.array(buildingZoneSchema).optional(),
  zone1Total: z.object({
    heatLossMJ: z.number(),
    heatLossPercent: z.number(),
  }).optional(),
  zone3: z.array(buildingZoneSchema).optional(),
  zone3Total: z.object({
    heatLossMJ: z.number(),
    heatLossPercent: z.number(),
  }).optional(),
  ventilation: z.object({
    volume: z.number().optional(),
    airChange: z.number().optional(),
    heatLossMJ: z.number().optional(),
    heatLossPercent: z.number().optional(),
  }).optional(),
  totalHeatLossMJ: z.number().optional(),
  monthlyEnergy: z.array(monthlyEnergySchema).optional(),
  annualEnergy: monthlyEnergySchema.optional(),
  airLeakage: z.object({
    cah50: z.number().optional(),
    envelopeArea: z.number().optional(),
    leakageArea: z.number().optional(),
  }).optional(),
  heating: z.object({
    primaryType: z.string().optional(),
    primaryEquipment: z.string().optional(),
    primaryManufacturer: z.string().optional(),
    primaryModel: z.string().optional(),
    primaryEfficiency: z.string().optional(),
    secondaryType: z.string().optional(),
    secondaryEquipment: z.string().optional(),
    secondaryEfficiency: z.string().optional(),
    annualConsumption: z.number().optional(),
    grossHeatLoss: z.number().optional(),
    puissance8_3kW: z.number().optional(),
  }).optional(),
  cooling: z.object({
    type: z.string().optional(),
    seer: z.number().optional(),
    cop: z.number().optional(),
    annualEnergy: z.number().optional(),
  }).optional(),
  hotWater: z.object({
    type: z.string().optional(),
    primaryType: z.string().optional(),
    energyFactor: z.number().optional(),
    dailyConsumption: z.number().optional(),
    annualConsumption: z.number().optional(),
    equipmentType: z.string().optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
  }).optional(),
  interiorLightingKWh: z.number().optional(),
  centralVentilation: z.object({
    type: z.string().optional(),
    sensibleEfficiency0C: z.number().optional(),
    sensibleEfficiencyMinus25C: z.number().optional(),
  }).optional(),
  annualSummary: z.object({
    heatingGJ: z.number().optional(),
    hotWaterGJ: z.number().optional(),
    baseLoadsGJ: z.number().optional(),
    ventilationGJ: z.number().optional(),
    coolingGJ: z.number().optional(),
    totalGJ: z.number().optional(),
    ghgElectricity: z.number().optional(),
    ghgGas: z.number().optional(),
    ghgTotal: z.number().optional(),
  }).optional(),
});

export type ReportData = z.infer<typeof reportDataSchema>;
export type BuildingZone = z.infer<typeof buildingZoneSchema>;
export type MonthlyEnergy = z.infer<typeof monthlyEnergySchema>;

export const comparisonSchema = z.object({
  heatingBefore: z.number(),
  heatingAfter: z.number(),
  hotWaterBefore: z.number(),
  hotWaterAfter: z.number(),
  baseLoadsBefore: z.number(),
  baseLoadsAfter: z.number(),
  ventilationBefore: z.number(),
  ventilationAfter: z.number(),
  coolingBefore: z.number(),
  coolingAfter: z.number(),
  totalBefore: z.number(),
  totalAfter: z.number(),
  improvementPercent: z.number(),
  ghsElectricityBefore: z.number(),
  ghsElectricityAfter: z.number(),
  ghsGasBefore: z.number(),
  ghsGasAfter: z.number(),
  ghsBefore: z.number(),
  ghsAfter: z.number(),
  ghsImprovementPercent: z.number(),
});

export type ComparisonData = z.infer<typeof comparisonSchema>;
