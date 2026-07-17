import { type Project, type InsertProject, type User, type AuditLog, type Mandat, type InsertMandat, projects, users, auditLogs, mandats } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getProjects(userId?: string, isAdmin?: boolean): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  getMandats(userId?: string): Promise<Mandat[]>;
  getMandat(id: string): Promise<Mandat | undefined>;
  createMandat(data: Partial<InsertMandat>): Promise<Mandat>;
  updateMandat(id: string, data: Partial<InsertMandat>): Promise<Mandat | undefined>;
  deleteMandat(id: string): Promise<void>;

  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(data: { email: string; name: string; passwordHash: string; role?: string }): Promise<User>;

  createAuditLog(data: {
    userId?: string;
    userEmail?: string;
    userName?: string;
    action: string;
    projectId?: string;
    projectName?: string;
    details?: string;
  }): Promise<AuditLog>;
  getAuditLogs(userId?: string): Promise<AuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(userId?: string, isAdmin?: boolean): Promise<Project[]> {
    if (isAdmin) {
      return await db.select().from(projects).orderBy(desc(projects.createdAt));
    }
    if (userId) {
      return await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
    }
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getMandats(userId?: string): Promise<Mandat[]> {
    if (userId) {
      return await db.select().from(mandats).where(eq(mandats.userId, userId)).orderBy(desc(mandats.createdAt));
    }
    return await db.select().from(mandats).orderBy(desc(mandats.createdAt));
  }

  async getMandat(id: string): Promise<Mandat | undefined> {
    const [m] = await db.select().from(mandats).where(eq(mandats.id, id));
    return m;
  }

  async createMandat(data: Partial<InsertMandat>): Promise<Mandat> {
    const [created] = await db.insert(mandats).values({ name: "Nouveau mandat", ...data } as InsertMandat).returning();
    return created;
  }

  async updateMandat(id: string, data: Partial<InsertMandat>): Promise<Mandat | undefined> {
    const [updated] = await db.update(mandats).set(data).where(eq(mandats.id, id)).returning();
    return updated;
  }

  async deleteMandat(id: string): Promise<void> {
    await db.delete(mandats).where(eq(mandats.id, id));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(data: { email: string; name: string; passwordHash: string; role?: string }): Promise<User> {
    const [user] = await db.insert(users).values({
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash: data.passwordHash,
      role: data.role ?? "user",
    }).returning();
    return user;
  }

  async createAuditLog(data: {
    userId?: string;
    userEmail?: string;
    userName?: string;
    action: string;
    projectId?: string;
    projectName?: string;
    details?: string;
  }): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }

  async getAuditLogs(userId?: string): Promise<AuditLog[]> {
    if (userId) {
      return await db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.createdAt));
    }
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }
}

export class MemoryStorage implements IStorage {
  private _projects: Project[] = [];
  private _users: User[] = [];
  private _auditLogs: AuditLog[] = [];

  async getProjects(userId?: string, isAdmin?: boolean): Promise<Project[]> {
    const sorted = [...this._projects].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    if (isAdmin) return sorted;
    if (userId) return sorted.filter((p) => p.userId === userId);
    return sorted;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this._projects.find((project) => project.id === id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const created: Project = {
      id: randomUUID(),
      userId: project.userId ?? null,
      name: project.name,
      address: project.address ?? null,
      city: project.city ?? null,
      province: project.province ?? null,
      postalCode: project.postalCode ?? null,
      yearBuilt: project.yearBuilt ?? null,
      numFloors: project.numFloors ?? null,
      numUnits: project.numUnits ?? null,
      clientName: project.clientName ?? null,
      evaluator: project.evaluator ?? null,
      evaluationDate: project.evaluationDate ?? null,
      buildingType: project.buildingType ?? "existing",
      programmeType: (project as any).programmeType ?? "optimisation",
      thermopompeModel: (project as any).thermopompeModel ?? "tcl",
      customMeasures: (project as any).customMeasures ?? [],
      status: project.status ?? "draft",
      preReportRaw: project.preReportRaw ?? null,
      postReportRaw: project.postReportRaw ?? null,
      preReportData: project.preReportData ?? null,
      postReportData: project.postReportData ?? null,
      comparisonData: project.comparisonData ?? null,
      annexClimateZoneImage: project.annexClimateZoneImage ?? null,
      annexThermopompesImage: project.annexThermopompesImage ?? null,
      annexRobineterieImage: project.annexRobineterieImage ?? null,
      annexLedLightingImage: project.annexLedLightingImage ?? null,
      annexVrcImage: project.annexVrcImage ?? null,
      annexChauffeEauThermopompeImage: project.annexChauffeEauThermopompeImage ?? null,
      signatoryName: (project as any).signatoryName ?? null,
      signatoryTitle: (project as any).signatoryTitle ?? null,
      signatoryCoordonnes: (project as any).signatoryCoordonnes ?? null,
      hasCommercialUnits: (project as any).hasCommercialUnits ?? false,
      commercialUnits: (project as any).commercialUnits ?? 0,
      basementInsulationType: (project as any).basementInsulationType ?? null,
      basementInsulationInches: (project as any).basementInsulationInches ?? null,
      basementInsulationRValue: (project as any).basementInsulationRValue ?? null,
      nbChauffeEauThermo: (project as any).nbChauffeEauThermo ?? null,
      logisvertSubventionPdf: (project as any).logisvertSubventionPdf ?? null,
      subventionThermoManual: (project as any).subventionThermoManual ?? null,
      logisvertAdmissible: (project as any).logisvertAdmissible ?? null,
      mandatData: (project as any).mandatData ?? null,
      createdAt: new Date(),
    };
    this._projects.unshift(created);
    return created;
  }

  async updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined> {
    const index = this._projects.findIndex((project) => project.id === id);
    if (index === -1) return undefined;
    const existing = this._projects[index];
    const updated: Project = { ...existing, ...data };
    this._projects[index] = updated;
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    this._projects = this._projects.filter((project) => project.id !== id);
  }

  private _mandats: Mandat[] = [];

  async getMandats(userId?: string): Promise<Mandat[]> {
    const sorted = [...this._mandats].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    return userId ? sorted.filter(m => m.userId === userId) : sorted;
  }

  async getMandat(id: string): Promise<Mandat | undefined> {
    return this._mandats.find(m => m.id === id);
  }

  async createMandat(data: Partial<InsertMandat>): Promise<Mandat> {
    const m: Mandat = {
      id: randomUUID(),
      userId: data.userId ?? null,
      name: data.name ?? "Nouveau mandat",
      clientName: data.clientName ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      province: data.province ?? null,
      postalCode: data.postalCode ?? null,
      numUnits: data.numUnits ?? null,
      evaluator: data.evaluator ?? null,
      mandataire: data.mandataire ?? null,
      mandatData: data.mandatData ?? null,
      createdAt: new Date(),
    };
    this._mandats.unshift(m);
    return m;
  }

  async updateMandat(id: string, data: Partial<InsertMandat>): Promise<Mandat | undefined> {
    const idx = this._mandats.findIndex(m => m.id === id);
    if (idx === -1) return undefined;
    this._mandats[idx] = { ...this._mandats[idx], ...data };
    return this._mandats[idx];
  }

  async deleteMandat(id: string): Promise<void> {
    this._mandats = this._mandats.filter(m => m.id !== id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this._users.find((u) => u.email === email.toLowerCase());
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this._users.find((u) => u.id === id);
  }

  async createUser(data: { email: string; name: string; passwordHash: string; role?: string }): Promise<User> {
    const user: User = {
      id: randomUUID(),
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash: data.passwordHash,
      role: data.role ?? "user",
      createdAt: new Date(),
    };
    this._users.push(user);
    return user;
  }

  async createAuditLog(data: {
    userId?: string;
    userEmail?: string;
    userName?: string;
    action: string;
    projectId?: string;
    projectName?: string;
    details?: string;
  }): Promise<AuditLog> {
    const log: AuditLog = {
      id: randomUUID(),
      userId: data.userId ?? null,
      userEmail: data.userEmail ?? null,
      userName: data.userName ?? null,
      action: data.action,
      projectId: data.projectId ?? null,
      projectName: data.projectName ?? null,
      details: data.details ?? null,
      createdAt: new Date(),
    };
    this._auditLogs.unshift(log);
    return log;
  }

  async getAuditLogs(userId?: string): Promise<AuditLog[]> {
    if (userId) return this._auditLogs.filter((l) => l.userId === userId);
    return [...this._auditLogs];
  }
}

export const storage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemoryStorage();
