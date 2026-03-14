import { type Project, type InsertProject, projects } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<Project[]> {
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
}

export class MemoryStorage implements IStorage {
  private projects: Project[] = [];

  async getProjects(): Promise<Project[]> {
    return [...this.projects].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.find((project) => project.id === id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const created: Project = {
      id: randomUUID(),
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
      createdAt: new Date(),
    };

    this.projects.unshift(created);
    return created;
  }

  async updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined> {
    const index = this.projects.findIndex((project) => project.id === id);
    if (index === -1) {
      return undefined;
    }

    const existing = this.projects[index];
    const updated: Project = {
      ...existing,
      ...data,
    };

    this.projects[index] = updated;
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    this.projects = this.projects.filter((project) => project.id !== id);
  }
}

export const storage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemoryStorage();
