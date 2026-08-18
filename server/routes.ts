import type { Express, Request } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { parseHot2000Report, computeComparison } from "./parser";
import type { ReportData, ComparisonData } from "@shared/schema";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { renderProjectPdf } from "./pdf-export";
import * as os from "os";
import * as crypto from "crypto";
import { PDFDocument, rgb, StandardFonts, PDFName, PDFBool } from "pdf-lib";
import { inflateSync, deflateSync } from "zlib";
import { hashPassword, verifyPassword } from "./auth";
import sharp from "sharp";
function torontoDateStr(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d); // YYYY-MM-DD
}

const execFileAsync = promisify(execFile);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const tmpDir = os.tmpdir();
  const uid = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const tmpInput = path.join(tmpDir, `upload-${uid}.pdf`);
  const tmpOutput = path.join(tmpDir, `upload-${uid}.txt`);
  try {
    await fs.promises.writeFile(tmpInput, buffer);
    await execFileAsync("pdftotext", ["-layout", tmpInput, tmpOutput], { timeout: 30000 });
    const text = (await fs.promises.readFile(tmpOutput, "utf-8")).trim();
    if (!text) {
      throw new Error("Impossible d'extraire le texte du PDF. Vérifiez que le fichier n'est pas une image scannée uniquement.");
    }
    return text;
  } finally {
    await fs.promises.unlink(tmpInput).catch(() => {});
    await fs.promises.unlink(tmpOutput).catch(() => {});
  }
}

// Normalise n'importe quel format d'image (HEIC/HEIF, TIFF, BMP, etc.) en un buffer
// lisible par sharp. Si sharp ne peut pas le lire directement, on convertit via ImageMagick.
async function normalizeImageBuffer(buffer: Buffer, originalName?: string): Promise<Buffer> {
  try {
    const meta = await sharp(buffer).metadata();
    // sharp reconnaît les HEIC/HEIF mais ne peut pas les décoder (codec HEVC breveté) :
    // on force la conversion ImageMagick pour ces formats.
    if (meta.format === "heif") throw new Error("heif: convert via magick");
    return buffer;
  } catch {
    const tmpDir = os.tmpdir();
    const uid = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const ext = (originalName?.split(".").pop() || "img").toLowerCase().replace(/[^a-z0-9]/g, "") || "img";
    const tmpIn = path.join(tmpDir, `imgconv-${uid}.${ext}`);
    const tmpOut = path.join(tmpDir, `imgconv-${uid}.jpg`);
    try {
      await fs.promises.writeFile(tmpIn, buffer);
      await execFileAsync("magick", [`${tmpIn}[0]`, "-auto-orient", tmpOut], { timeout: 45000 });
      return await fs.promises.readFile(tmpOut);
    } finally {
      await fs.promises.unlink(tmpIn).catch(() => {});
      await fs.promises.unlink(tmpOut).catch(() => {});
    }
  }
}

function extractAmountFromWindow(window: string): number | null {
  // OCR sometimes reads "00" as "OO"/"oO" right before the $ sign — normalize that,
  // and OCR often splits/mis-groups digits (e.g. "18 480,00" -> "1 8480 00").
  const cleaned = window.replace(/[oO]{2}(?=\s*\$)/g, "00");
  const match = cleaned.match(/(\d[\d\s.,]{0,20})\$/);
  if (!match) return null;
  const collapsed = match[1].replace(/\s/g, "");
  const decimalMatch = collapsed.match(/^(\d+)[.,](\d{2})$/);
  if (decimalMatch) {
    const value = parseFloat(`${decimalMatch[1]}.${decimalMatch[2]}`);
    return isNaN(value) ? null : value;
  }
  if (/^\d+$/.test(collapsed)) {
    if (collapsed.length > 2) {
      const dollars = collapsed.slice(0, -2);
      const cents = collapsed.slice(-2);
      const value = parseFloat(`${dollars}.${cents}`);
      return isNaN(value) ? null : value;
    }
    const value = parseFloat(collapsed);
    return isNaN(value) ? null : value;
  }
  return null;
}

function extractLogisvertAmount(text: string): number | null {
  const normalized = text.replace(/\r/g, "");
  const lines = normalized.split("\n");
  const priorityKeywords = [
    /pourriez\s+avoir\s+droit\s+[àa]/i,
    /pourriez\s+avoir/i,
    /vous\s+avez\s+droit\s+[àa]/i,
    /montant\s+total\s+de\s+(la\s+)?subvention/i,
    /subvention\s+totale/i,
    /total\s+de\s+la\s+subvention/i,
    /aide\s+financière\s+totale/i,
    /montant\s+de\s+l['’]aide/i,
    /montant\s+total/i,
  ];

  for (const keywordRegex of priorityKeywords) {
    for (let i = 0; i < lines.length; i++) {
      if (keywordRegex.test(lines[i])) {
        const searchWindow = [lines[i], lines[i + 1] || "", lines[i + 2] || ""].join(" ");
        const value = extractAmountFromWindow(searchWindow);
        if (value !== null && value > 0) return value;
      }
    }
  }

  const allAmounts: number[] = [];
  for (const line of lines) {
    const value = extractAmountFromWindow(line);
    if (value !== null && value > 0) allAmounts.push(value);
  }
  if (allAmounts.length > 0) return Math.max(...allAmounts);
  return null;
}

async function extractTextViaOcr(buffer: Buffer): Promise<string> {
  const tmpDir = os.tmpdir();
  const uid = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const tmpPdf = path.join(tmpDir, `ocr-${uid}.pdf`);
  const tmpImgPrefix = path.join(tmpDir, `ocr-${uid}-img`);
  const tmpTxtPrefix = path.join(tmpDir, `ocr-${uid}-txt`);
  try {
    await fs.promises.writeFile(tmpPdf, buffer);
    await execFileAsync("pdftoppm", ["-png", "-r", "150", "-f", "1", "-l", "1", tmpPdf, tmpImgPrefix], { timeout: 45000 });
    const imgPath = `${tmpImgPrefix}-1.png`;
    await execFileAsync("tesseract", [imgPath, tmpTxtPrefix, "-l", "fra", "--psm", "6"], { timeout: 60000 });
    const text = (await fs.promises.readFile(`${tmpTxtPrefix}.txt`, "utf-8")).trim();
    await fs.promises.unlink(imgPath).catch(() => {});
    return text;
  } finally {
    await fs.promises.unlink(tmpPdf).catch(() => {});
    await fs.promises.unlink(`${tmpTxtPrefix}.txt`).catch(() => {});
  }
}

function getProjectId(param: string | string[] | undefined): string {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 100);
}
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Auth routes ──────────────────────────────────────────────────────────────

  // Inscription publique désactivée — compte unique géré directement
  app.post("/api/auth/register", (_req, res) => {
    res.status(403).json({ message: "L'inscription publique est désactivée." });
  });

  // ── Gestion des utilisateurs (admin seulement) ──────────────────────────────
  app.get("/api/admin/users", async (req, res) => {
    if (!req.session.userId || req.session.userRole !== "admin")
      return res.status(403).json({ message: "Accès refusé" });
    try {
      const allUsers = await storage.getAllUsers();
      const safe = allUsers.map(({ passwordHash: _, ...u }) => u);
      res.json(safe);
    } catch { res.status(500).json({ message: "Erreur serveur" }); }
  });

  app.post("/api/admin/users", async (req, res) => {
    if (!req.session.userId || req.session.userRole !== "admin")
      return res.status(403).json({ message: "Accès refusé" });
    try {
      const { name, username, email, password, role } = req.body;
      if (!name || !email || !password)
        return res.status(400).json({ message: "Nom, courriel et mot de passe requis" });
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "Courriel déjà utilisé" });
      if (username) {
        const existingU = await storage.getUserByUsername(username);
        if (existingU) return res.status(409).json({ message: "Nom d'utilisateur déjà utilisé" });
      }
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({ name, username: username || null, email, passwordHash, role: role || "user" });
      const { passwordHash: _, ...safe } = user;
      res.json(safe);
    } catch (e: any) { res.status(500).json({ message: e.message || "Erreur serveur" }); }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.session.userId || req.session.userRole !== "admin")
      return res.status(403).json({ message: "Accès refusé" });
    if (req.params.id === req.session.userId)
      return res.status(400).json({ message: "Impossible de supprimer votre propre compte" });
    try {
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Erreur serveur" }); }
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    if (!req.session.userId || req.session.userRole !== "admin")
      return res.status(403).json({ message: "Accès refusé" });
    try {
      const { password, role } = req.body;
      const updates: Record<string, any> = {};
      if (role) updates.role = role;
      if (password) updates.passwordHash = await hashPassword(password);
      await storage.updateUser(req.params.id, updates);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Erreur serveur" }); }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email: emailOrUsername, password, rememberMe } = req.body;
      if (!emailOrUsername || !password) {
        return res.status(400).json({ message: "Identifiant et mot de passe requis" });
      }
      // Accept username or email
      let user = emailOrUsername.includes("@")
        ? await storage.getUserByEmail(emailOrUsername)
        : await storage.getUserByUsername(emailOrUsername);
      if (!user) {
        return res.status(401).json({ message: "Identifiants incorrects" });
      }
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Identifiants incorrects" });
      }
      req.session.userId = user.id;
      req.session.userRole = user.role;
      // Extend session to 30 days if "remember me" is checked
      if (rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      }
      const { passwordHash: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Erreur lors de la connexion" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "Utilisateur introuvable" });
      }
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ── Audit log routes ──────────────────────────────────────────────────────────

  app.get("/api/audit-logs/mine", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    try {
      const logs = await storage.getAuditLogs(req.session.userId);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/audit-logs/all", async (req, res) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }
    try {
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ── Projects ──────────────────────────────────────────────────────────────────

  app.get("/api/projects", async (req, res) => {
    try {
      const userId = req.session.userId;
      const isAdmin = req.session.userRole === "admin";
      const projects = await storage.getProjects(userId, isAdmin);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.get("/api/projects/:id/export-pdf", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (!project.preReportData || !project.postReportData || !project.comparisonData) {
        return res.status(400).json({ message: "Project report is not ready for export" });
      }

      const internalOrigin = `http://localhost:${process.env.PORT || 5000}`;
      const reportUrl = `${internalOrigin}/project/${projectId}/print`;
      const pdfBuffer = await renderProjectPdf(reportUrl);

      const baseName = sanitizeFileName((project.preReportData as any)?.buildingInfo?.address || project.name || `project-${projectId}`) || `project-${projectId}`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}.pdf"`);
      return res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      return res.status(500).json({ message: error.message || "Failed to export PDF" });
    }
  });

  app.get("/api/projects/:id/export-recommandations-pdf", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.preReportData || !project.postReportData) {
        return res.status(400).json({ message: "Project report is not ready for export" });
      }
      const internalOrigin = `http://localhost:${process.env.PORT || 5000}`;
      const reportUrl = `${internalOrigin}/project/${projectId}/print-recommandations`;
      const pdfBuffer = await renderProjectPdf(reportUrl, "#recommandations-content");
      const baseName = sanitizeFileName((project.preReportData as any)?.buildingInfo?.address || project.name || `project-${projectId}`) || `project-${projectId}`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Cahier de Recommandations - ${baseName}.pdf"`);
      return res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error exporting recommandations PDF:", error);
      return res.status(500).json({ message: error.message || "Failed to export PDF" });
    }
  });

  app.get("/api/projects/:id/export-strategie-pdf", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.preReportData || !project.postReportData) {
        return res.status(400).json({ message: "Project report is not ready for export" });
      }
      const internalOrigin = `http://localhost:${process.env.PORT || 5000}`;
      const reportUrl = `${internalOrigin}/project/${projectId}/print-strategie`;
      const pdfBuffer = await renderProjectPdf(reportUrl, "#strategy-content");
      const baseName = sanitizeFileName((project.preReportData as any)?.buildingInfo?.address || project.name || `project-${projectId}`) || `project-${projectId}`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Cahier de Stratégie - ${baseName}.pdf"`);
      return res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error exporting strategie PDF:", error);
      return res.status(500).json({ message: error.message || "Failed to export PDF" });
    }
  });

  app.get("/api/projects/:id/export-empreinte-pdf", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.preReportData || !project.postReportData) {
        return res.status(400).json({ message: "Project report is not ready for export" });
      }
      const internalOrigin = `http://localhost:${process.env.PORT || 5000}`;
      const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
      const reportUrl = `${internalOrigin}/project/${projectId}/print-empreinte${queryString ? `?${queryString}` : ""}`;
      const pdfBuffer = await renderProjectPdf(reportUrl, "#empreinte-content");
      const baseName = sanitizeFileName((project.preReportData as any)?.buildingInfo?.address || project.name || `project-${projectId}`) || `project-${projectId}`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Empreinte Économique - ${baseName}.pdf"`);
      return res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error exporting empreinte PDF:", error);
      return res.status(500).json({ message: error.message || "Failed to export PDF" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const userId = req.session.userId;
      const projectName = req.body.name || "Nouveau projet";
      const project = await storage.createProject({
        name: projectName,
        status: "draft",
        userId: userId || null,
      });
      if (userId) {
        const user = await storage.getUserById(userId);
        await storage.createAuditLog({
          userId,
          userEmail: user?.email,
          userName: user?.name,
          action: "create_project",
          projectId: project.id,
          projectName: project.name,
          details: `Projet créé: ${project.name}`,
        }).catch(() => {});
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const project = await storage.updateProject(projectId, req.body);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const project = await storage.getProject(projectId);
      const userId = req.session.userId;
      await storage.deleteProject(projectId);
      if (userId && project) {
        const user = await storage.getUserById(userId);
        await storage.createAuditLog({
          userId,
          userEmail: user?.email,
          userName: user?.name,
          action: "delete_project",
          projectId: project.id,
          projectName: project.name,
          details: `Projet supprimé: ${project.name}`,
        }).catch(() => {});
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  async function handleReportUpload(projectId: string, content: string, type: "pre" | "post") {
    const project = await storage.getProject(projectId);
    if (!project) throw new Error("Project not found");

    const reportData = parseHot2000Report(content);

    if (!reportData.annualSummary || (reportData.annualSummary.totalGJ === 0 && (!reportData.monthlyEnergy || reportData.monthlyEnergy.length === 0))) {
      throw new Error("Le rapport ne contient pas de données énergétiques valides. Vérifiez que le fichier est un rapport HOT2000 complet.");
    }

    const updateData: any = {};

    if (type === "pre") {
      updateData.preReportRaw = content.substring(0, 50000);
      updateData.preReportData = reportData;
      updateData.status = project.postReportData ? "ready" : "pre_uploaded";

      if (reportData.buildingInfo?.address) updateData.address = reportData.buildingInfo.address;
      if (reportData.buildingInfo?.city) updateData.city = reportData.buildingInfo.city;
      if (reportData.buildingInfo?.province) updateData.province = reportData.buildingInfo.province;
      if (reportData.buildingInfo?.postalCode) updateData.postalCode = reportData.buildingInfo.postalCode;
      if (reportData.buildingInfo?.yearBuilt) updateData.yearBuilt = reportData.buildingInfo.yearBuilt;
      if (reportData.buildingInfo?.numFloors) updateData.numFloors = reportData.buildingInfo.numFloors;

      if (project.postReportData) {
        const comparison = computeComparison(reportData, project.postReportData as ReportData);
        updateData.comparisonData = comparison;
      }
    } else {
      updateData.postReportRaw = content.substring(0, 50000);
      updateData.postReportData = reportData;
      updateData.status = project.preReportData ? "ready" : "post_uploaded";

      if (project.preReportData) {
        const comparison = computeComparison(project.preReportData as ReportData, reportData);
        updateData.comparisonData = comparison;
      }
    }

    return storage.updateProject(projectId, updateData);
  }

  async function logUploadAudit(req: any, projectId: string, type: "pre" | "post") {
    const userId = req.session?.userId;
    if (!userId) return;
    try {
      const [project, user] = await Promise.all([storage.getProject(projectId), storage.getUserById(userId)]);
      await storage.createAuditLog({
        userId,
        userEmail: user?.email,
        userName: user?.name,
        action: type === "pre" ? "upload_pre" : "upload_post",
        projectId,
        projectName: project?.name,
        details: `Rapport ${type === "pre" ? "PRÉ" : "POST"} chargé pour ${project?.name || projectId}`,
      });
    } catch {}
  }

  app.post("/api/projects/:id/reparse", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const updateData: any = {};

      if (project.preReportRaw) {
        const preData = parseHot2000Report(project.preReportRaw as string);
        updateData.preReportData = preData;
      }
      if (project.postReportRaw) {
        const postData = parseHot2000Report(project.postReportRaw as string);
        updateData.postReportData = postData;
      }
      if (updateData.preReportData && updateData.postReportData) {
        updateData.comparisonData = computeComparison(updateData.preReportData, updateData.postReportData);
      } else if (updateData.preReportData && project.postReportData) {
        updateData.comparisonData = computeComparison(updateData.preReportData, project.postReportData as ReportData);
      } else if (project.preReportData && updateData.postReportData) {
        updateData.comparisonData = computeComparison(project.preReportData as ReportData, updateData.postReportData);
      }

      const updated = await storage.updateProject(projectId, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error("Reparse error:", error);
      res.status(500).json({ message: error.message || "Failed to reparse" });
    }
  });

  app.post("/api/projects/:id/upload-pre", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Content is required" });
      }
      const updated = await handleReportUpload(projectId, content, "pre");
      if (!updated) return res.status(404).json({ message: "Project not found" });
      logUploadAudit(req, projectId, "pre");
      res.json(updated);
    } catch (error: any) {
      console.error("Error parsing PRE report:", error);
      res.status(422).json({ message: error.message || "Failed to parse report" });
    }
  });

  app.post("/api/projects/:id/upload-post", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Content is required" });
      }
      const updated = await handleReportUpload(projectId, content, "post");
      if (!updated) return res.status(404).json({ message: "Project not found" });
      logUploadAudit(req, projectId, "post");
      res.json(updated);
    } catch (error: any) {
      console.error("Error parsing POST report:", error);
      res.status(422).json({ message: error.message || "Failed to parse report" });
    }
  });

  app.post("/api/projects/:id/upload-pre-pdf", upload.single("file"), async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      if (!req.file) {
        return res.status(400).json({ message: "PDF file is required" });
      }
      const text = await extractTextFromPdf(req.file.buffer);
      const updated = await handleReportUpload(projectId, text, "pre");
      if (!updated) return res.status(404).json({ message: "Project not found" });
      logUploadAudit(req, projectId, "pre");
      res.json(updated);
    } catch (error: any) {
      console.error("Error parsing PRE PDF:", error);
      res.status(422).json({ message: error.message || "Failed to parse PDF report" });
    }
  });

  app.post("/api/projects/:id/upload-post-pdf", upload.single("file"), async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      if (!req.file) {
        return res.status(400).json({ message: "PDF file is required" });
      }
      const text = await extractTextFromPdf(req.file.buffer);
      const updated = await handleReportUpload(projectId, text, "post");
      if (!updated) return res.status(404).json({ message: "Project not found" });
      logUploadAudit(req, projectId, "post");
      res.json(updated);
    } catch (error: any) {
      console.error("Error parsing POST PDF:", error);
      res.status(422).json({ message: error.message || "Failed to parse PDF report" });
    }
  });

  const UPLOADS_DIR = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(UPLOADS_DIR, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  // Convertit n'importe quel format d'image (HEIC, TIFF, etc.) en JPEG (data URL)
  // pour les usages côté client (ex. signature) où le navigateur ne peut pas lire le format.
  app.post("/api/convert-image", upload.single("file"), async (req, res) => {
    try {
      if (!req.session.userId) return res.status(401).json({ message: "Non authentifié" });
      if (!req.file) return res.status(400).json({ message: "Image file is required" });
      const normalized = await normalizeImageBuffer(req.file.buffer, req.file.originalname);
      const jpeg = await sharp(normalized)
        .rotate()
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
      res.json({ dataUrl: `data:image/jpeg;base64,${jpeg.toString("base64")}` });
    } catch (error: any) {
      console.error("Error converting image:", error);
      res.status(422).json({ message: "Format d'image non pris en charge" });
    }
  });

  app.post("/api/projects/:id/upload-annex-image", upload.single("file"), async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
      }
      const annexType = req.body.annexType;
      const validTypes = ["climateZone", "thermopompes", "robineterie", "ledLighting", "vrc", "chauffeEauThermopompe"];
      if (!validTypes.includes(annexType)) {
        return res.status(400).json({ message: "Invalid annex type" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Si le fichier est un PDF, convertir la première page en image via pdftoppm
      let imageBuffer: Buffer = req.file.buffer;
      if (req.file.mimetype === "application/pdf" || req.file.originalname?.toLowerCase().endsWith(".pdf")) {
        const tmpSuffix = crypto.randomBytes(8).toString("hex");
        const tmpPdf = path.join(os.tmpdir(), `annex-${tmpSuffix}.pdf`);
        const tmpPrefix = path.join(os.tmpdir(), `annex-${tmpSuffix}-out`);
        fs.writeFileSync(tmpPdf, req.file.buffer);
        try {
          await execFileAsync("pdftoppm", ["-f", "1", "-l", "1", "-jpeg", "-r", "200", tmpPdf, tmpPrefix]);
          const outputFile = `${tmpPrefix}-1.jpg`;
          imageBuffer = fs.readFileSync(outputFile);
          fs.unlinkSync(outputFile);
        } finally {
          if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf);
        }
      }

      const fileName = `${projectId}_${annexType}_${Date.now()}.jpg`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      imageBuffer = await normalizeImageBuffer(imageBuffer, req.file.originalname);
      const compressed = await sharp(imageBuffer)
        .rotate()
        .resize({ width: 3000, height: 3000, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
      fs.writeFileSync(filePath, compressed);

      const imageUrl = `/uploads/${fileName}`;
      const updateData: any = {};
      if (annexType === "climateZone") updateData.annexClimateZoneImage = imageUrl;
      else if (annexType === "thermopompes") updateData.annexThermopompesImage = imageUrl;
      else if (annexType === "robineterie") updateData.annexRobineterieImage = imageUrl;
      else if (annexType === "ledLighting") updateData.annexLedLightingImage = imageUrl;
      else if (annexType === "vrc") updateData.annexVrcImage = imageUrl;
      else if (annexType === "chauffeEauThermopompe") updateData.annexChauffeEauThermopompeImage = imageUrl;

      const updated = await storage.updateProject(projectId, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error uploading annex image:", error);
      res.status(500).json({ message: error.message || "Failed to upload image" });
    }
  });

  app.post("/api/projects/:id/upload-logisvert-pdf", upload.single("file"), async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const isPdf = req.file.mimetype === "application/pdf" || req.file.originalname?.toLowerCase().endsWith(".pdf");
      let detectedAmount: number | null = null;
      let fileUrl: string;
      if (isPdf) {
        try {
          const text = await extractTextFromPdf(req.file.buffer);
          detectedAmount = extractLogisvertAmount(text);
        } catch (err) {
          console.error("Error extracting text from Logisvert PDF:", err);
        }
        if (detectedAmount === null) {
          try {
            const ocrText = await extractTextViaOcr(req.file.buffer);
            detectedAmount = extractLogisvertAmount(ocrText);
          } catch (err) {
            console.error("Error OCR-extracting Logisvert PDF:", err);
          }
        }
        // Render page 1 as an image so it displays inline like the other fiche technique sections.
        const imageFileName = `${projectId}_logisvert_${Date.now()}.png`;
        const imagePath = path.join(UPLOADS_DIR, imageFileName);
        const tmpDir = os.tmpdir();
        const uid = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
        const tmpPdf = path.join(tmpDir, `logisvert-${uid}.pdf`);
        const tmpImgPrefix = path.join(tmpDir, `logisvert-${uid}-img`);
        try {
          await fs.promises.writeFile(tmpPdf, req.file.buffer);
          await execFileAsync("pdftoppm", ["-png", "-r", "150", "-f", "1", "-l", "1", tmpPdf, tmpImgPrefix], { timeout: 45000 });
          await fs.promises.copyFile(`${tmpImgPrefix}-1.png`, imagePath);
          fileUrl = `/uploads/${imageFileName}`;
        } finally {
          await fs.promises.unlink(tmpPdf).catch(() => {});
          await fs.promises.unlink(`${tmpImgPrefix}-1.png`).catch(() => {});
        }
      } else {
        const fileName = `${projectId}_logisvert_${Date.now()}.jpg`;
        const filePath = path.join(UPLOADS_DIR, fileName);
        const normalizedBuffer = await normalizeImageBuffer(req.file.buffer, req.file.originalname);
        const compressed = await sharp(normalizedBuffer)
          .rotate()
          .resize({ width: 3000, height: 3000, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer();
        fs.writeFileSync(filePath, compressed);
        fileUrl = `/uploads/${fileName}`;
      }
      const updateData: any = { logisvertSubventionPdf: fileUrl };
      if (detectedAmount !== null) {
        updateData.subventionThermoManual = String(detectedAmount);
      }
      const updated = await storage.updateProject(projectId, updateData);
      res.json({ ...updated, detectedAmount });
    } catch (error: any) {
      console.error("Error uploading Logisvert PDF:", error);
      res.status(500).json({ message: error.message || "Failed to upload file" });
    }
  });

  app.delete("/api/projects/:id/logisvert-pdf", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const updated = await storage.updateProject(projectId, { logisvertSubventionPdf: null });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete file" });
    }
  });

  app.delete("/api/projects/:id/annex-image/:annexType", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const annexType = req.params.annexType;
      const validTypes = ["climateZone", "thermopompes", "robineterie", "ledLighting", "vrc", "chauffeEauThermopompe"];
      if (!validTypes.includes(annexType)) {
        return res.status(400).json({ message: "Invalid annex type" });
      }
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const updateData: any = {};
      if (annexType === "climateZone") updateData.annexClimateZoneImage = null;
      else if (annexType === "thermopompes") updateData.annexThermopompesImage = null;
      else if (annexType === "robineterie") updateData.annexRobineterieImage = null;
      else if (annexType === "ledLighting") updateData.annexLedLightingImage = null;
      else if (annexType === "vrc") updateData.annexVrcImage = null;
      else if (annexType === "chauffeEauThermopompe") updateData.annexChauffeEauThermopompeImage = null;
      const updated = await storage.updateProject(projectId, updateData);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete image" });
    }
  });

  async function buildCollectivePdf(cmp: ComparisonData, projectId?: string): Promise<Buffer> {
    const templatePath = path.join(process.cwd(), "server/templates/immeubles-collectifs-template.pdf");
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const now = new Date();

    const pages = pdfDoc.getPages();
    const page = pages[1];
    const { width, height } = page.getSize();

    const energyE = cmp.totalAfter;
    const energyR = cmp.totalBefore;
    const energySavings = energyR > 0 ? ((energyR - energyE) / energyR) * 100 : 0;
    const ghgE = cmp.ghsAfter;
    const ghgR = cmp.ghsBefore;
    const ghgSavings = ghgR > 0 ? ((ghgR - ghgE) / ghgR) * 100 : 0;

    const fmt = (n: number, d: number) => n.toFixed(d);
    const WHITE = rgb(1, 1, 1);
    const DARK = rgb(0.1, 0.1, 0.1);
    const TEAL = rgb(0.16, 0.49, 0.43);
    const FONT_SIZE = 10;

    const toPdfY = (ytop: number) => height - ytop;
    const ENERGY_ROW_Y_TOP = 115, ENERGY_ROW_Y_BOT = 145;
    const GES_ROW_Y_TOP = 148, GES_ROW_Y_BOT = 205;
    const COL_E_X1 = 248, COL_E_X2 = 360;
    const COL_R_X1 = 360, COL_R_X2 = 470;
    const COL_S_X1 = 470, COL_S_X2 = 600;

    const drawCell = (x1: number, x2: number, yTop: number, yBot: number, text: string, color = DARK) => {
      const pdfYBot = toPdfY(yBot);
      const pdfYTop = toPdfY(yTop);
      const cellH = pdfYTop - pdfYBot;
      page.drawRectangle({ x: x1, y: pdfYBot, width: x2 - x1, height: cellH, color: WHITE });
      const textW = font.widthOfTextAtSize(text, FONT_SIZE);
      const textX = x1 + (x2 - x1 - textW) / 2;
      const textY = pdfYBot + (cellH - FONT_SIZE) / 2;
      page.drawText(text, { x: textX, y: textY, size: FONT_SIZE, font, color });
    };

    drawCell(COL_E_X1, COL_E_X2, ENERGY_ROW_Y_TOP, ENERGY_ROW_Y_BOT, `${fmt(energyE, 3)} GJ`, DARK);
    drawCell(COL_R_X1, COL_R_X2, ENERGY_ROW_Y_TOP, ENERGY_ROW_Y_BOT, `${fmt(energyR, 3)} GJ`, DARK);
    drawCell(COL_S_X1, COL_S_X2, ENERGY_ROW_Y_TOP, ENERGY_ROW_Y_BOT, `${fmt(energySavings, 1)} %`, TEAL);
    drawCell(COL_E_X1, COL_E_X2, GES_ROW_Y_TOP, GES_ROW_Y_BOT, `${fmt(ghgE, 5)} T/A`, DARK);
    drawCell(COL_R_X1, COL_R_X2, GES_ROW_Y_TOP, GES_ROW_Y_BOT, `${fmt(ghgR, 5)} T/A`, DARK);
    drawCell(COL_S_X1, COL_S_X2, GES_ROW_Y_TOP, GES_ROW_Y_BOT, `${fmt(ghgSavings, 1)} %`, TEAL);

    // ── Signature numérique (zone droite du tableau) ──────────────────────────
    // Use the same Y range as the two data rows + extend above for label
    const SIG_X1 = COL_S_X2 + 4;
    const SIG_X2 = Math.min(width - 5, SIG_X1 + 220);
    const SIG_Y_TOP = ENERGY_ROW_Y_TOP - 5;
    const SIG_Y_BOT = GES_ROW_Y_BOT + 5;
    const sigPdfYBot = toPdfY(SIG_Y_BOT);
    const sigPdfYTop = toPdfY(SIG_Y_TOP);
    const sigZoneH = sigPdfYTop - sigPdfYBot;

    // White-out the signature zone to remove any template content
    page.drawRectangle({ x: SIG_X1 - 2, y: sigPdfYBot - 2, width: SIG_X2 - SIG_X1 + 4, height: sigZoneH + 4, color: WHITE });

    // Format timestamp in Eastern Time (Canada/Quebec)
    const etDateParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(now);
    const etTimeParts2 = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(now);
    const cYYYY = etDateParts.find((p) => p.type === "year")!.value;
    const cMM   = etDateParts.find((p) => p.type === "month")!.value;
    const cDD   = etDateParts.find((p) => p.type === "day")!.value;
    const cHH   = etTimeParts2.find((p) => p.type === "hour")!.value;
    const cMin  = etTimeParts2.find((p) => p.type === "minute")!.value;
    const cSec  = etTimeParts2.find((p) => p.type === "second")!.value;
    const sigDateStr = `${cYYYY}.${cMM}.${cDD} ${cHH}:${cMin}:${cSec}`;

    // ── Cadre de sécurité teal ────────────────────────────────────────────────
    const TEAL_BORDER = rgb(0x0f / 255, 0x76 / 255, 0x6e / 255);
    page.drawRectangle({
      x: SIG_X1 - 2, y: sigPdfYBot - 2,
      width: SIG_X2 - SIG_X1 + 4, height: sigZoneH + 4,
      borderColor: TEAL_BORDER, borderWidth: 1,
    });

    // Code de vérification déterministe
    const verifCode = (() => {
      const h = crypto.createHash("sha256").update(`MAB-${sigDateStr.slice(0, 10)}-${projectId || "collectif"}`).digest("hex").slice(0, 8).toUpperCase();
      return `${h.slice(0, 4)}-${h.slice(4)}`;
    })();

    // Layout — vertically centered in the zone
    const sigCenterY = sigPdfYBot + sigZoneH / 2;
    const NAME_SIZE = 11;
    const DETAIL_SIZE = 6;
    const lineSpacing = DETAIL_SIZE + 2;

    // "Marc-André Boucher" en italique gras — style manuscrit
    const fontScript = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
    const nameText = "Marc-Andr\u00E9 Boucher";
    const nameW = fontScript.widthOfTextAtSize(nameText, NAME_SIZE);
    page.drawText(nameText, {
      x: SIG_X1 + 6,
      y: sigCenterY - NAME_SIZE / 2 + 4,
      size: NAME_SIZE,
      font: fontScript,
      color: rgb(0x1e / 255, 0x3a / 255, 0x5f / 255),
    });
    // Trait sous la signature
    page.drawLine({
      start: { x: SIG_X1 + 6, y: sigCenterY - NAME_SIZE / 2 },
      end: { x: SIG_X1 + 6 + nameW, y: sigCenterY - NAME_SIZE / 2 },
      thickness: 0.6, color: TEAL_BORDER, opacity: 0.5,
    });

    // Detail block — right of the name
    const detailX = SIG_X1 + 10 + nameW;
    page.drawText("Signature v\u00E9rifi\u00E9e", {
      x: detailX, y: sigCenterY + lineSpacing * 1.0,
      size: DETAIL_SIZE, font, color: TEAL_BORDER,
    });
    page.drawText(`${sigDateStr.slice(0, 16)} (HE)`, {
      x: detailX, y: sigCenterY,
      size: DETAIL_SIZE, font: fontRegular, color: DARK,
    });
    page.drawText(`ID : ${verifCode}`, {
      x: detailX, y: sigCenterY - lineSpacing * 1.0,
      size: DETAIL_SIZE, font: fontRegular, color: rgb(0.45, 0.5, 0.55),
    });

    return Buffer.from(await pdfDoc.save());
  }

  app.get("/api/projects/:id/collective-pdf", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const cmp = project.comparisonData as ComparisonData | null;
      if (!cmp) return res.status(422).json({ message: "Comparison data not available" });

      const pdfBuffer = await buildCollectivePdf(cmp, projectId);
      res.setHeader("Content-Type", "application/pdf");
      const collectifAddr = sanitizeFileName((project.preReportData as any)?.buildingInfo?.address || "") || project.id;
      res.setHeader("Content-Disposition", `attachment; filename="Immeuble collectif - ${collectifAddr}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating collective PDF:", error);
      res.status(500).json({ message: error.message || "Failed to generate PDF" });
    }
  });

  // ─── ATTESTATION APH PDF ────────────────────────────────────────────────────

  const FRENCH_MONTHS = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];

  // Fills the AcroForm fields of the SCHL APH SELECT attestation template
  // with project-specific values. Uses pdf-lib's native form API so that
  // field values replace existing content cleanly (no white-rect hacks).
  async function buildAttestationPdf(project: any): Promise<Buffer> {
    const cmp = project.comparisonData as ComparisonData | null;
    const impPct = cmp?.improvementPercent ?? 0;
    const gesPct = cmp?.ghsImprovementPercent ?? 0;
    const isNew = project.buildingType === "new";

    // Niveau thresholds (existing: N1=15-24%, N2=25-39%, N3≥40%;  new: N1=20-24%)
    const niveau: 1 | 2 | 3 = impPct >= 40 ? 3 : impPct >= 25 ? 2 : 1;
    // Show both percentages when energy ≠ GES (rounded to 1 decimal)
    const pctText =
      Math.abs(impPct - gesPct) >= 0.05
        ? `${impPct.toFixed(1)} % et ${gesPct.toFixed(1)} %`
        : `${impPct.toFixed(1)} %`;

    // Adresse complète : priorité au nom du projet saisi par l'utilisateur (ex. "Lot 6199415 A1 Rue des cèdres, ..."),
    // suivi du code postal s'il n'y figure pas déjà.
    const projectName = (project.name || "").trim();
    const address = projectName
      ? [projectName, project.postalCode && !projectName.includes(project.postalCode) ? project.postalCode : null].filter(Boolean).join(", ")
      : [project.address, project.city, project.postalCode].filter(Boolean).join(", ") || "";

    const now = new Date();
    // Always use Eastern Time (Canada/Quebec) regardless of server timezone
    const etParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(now);
    const etYear = etParts.find((p) => p.type === "year")!.value;
    const etMonth = etParts.find((p) => p.type === "month")!.value;
    const etDay = etParts.find((p) => p.type === "day")!.value;
    const day = etDay;
    const monthName = FRENCH_MONTHS[parseInt(etMonth, 10) - 1];
    const year2 = etYear.slice(-2);
    const reportDate = `${etYear}-${etMonth}-${etDay}`;

    // Load the pre-filled template (contains evaluator credentials as real text)
    const templatePath = path.join(process.cwd(), "server/templates/attestation-filled-template.pdf");
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();

    // Helper: set a text field, silently skip if not found
    const setText = (name: string, value: string) => {
      try {
        const field = form.getTextField(name);
        // Remove MaxLen so long city names (e.g. "St-Germain-de-Grantham") are never truncated
        field.acroField.dict.delete(PDFName.of("MaxLen"));
        field.setText(value);
        field.enableReadOnly();
      } catch (_) {}
    };

    // Helper: check / uncheck a checkbox
    const setCheck = (name: string, checked: boolean) => {
      try {
        const field = form.getCheckBox(name);
        checked ? field.check() : field.uncheck();
        field.enableReadOnly();
      } catch (_) {}
    };

    // ── Evaluator identity fields ─────────────────────────────────────────────
    setText("nom", "Marc-André Boucher");
    setText("titre professionnel", "evaluateur en efficacité énergétique");
    setText("coordonnées", "438 521-9645");

    // ── Project address ───────────────────────────────────────────────────────
    setText("adresse municipale", address);

    // ── Date of the HOT2000 report ────────────────────────────────────────────
    setText("date du rapport", reportDate);

    // ── Signature date (DATÉ du …) ───────────────────────────────────────────
    setText("jour", day);
    setText("mois", monthName);
    setText("an", year2);

    // ── Niveau checkboxes + percentage values ─────────────────────────────────
    if (isNew) {
      // Pour la construction (Page 1)
      setCheck("construction, niveau 1, check box", niveau === 1);
      setCheck("construction, niveau 2, check box", niveau === 2);
      setCheck("construction, niveau 3, check box", niveau === 3);
      setText("construction, niveau 1, percent", niveau === 1 ? pctText : "");
      setText("construction, niveau 2, percent", niveau === 2 ? pctText : "");
      setText("construction, niveau 3, percent", niveau === 3 ? pctText : "");
      // Clear existing-properties fields
      setCheck("propriétés existantes, niveau 1, check box", false);
      setCheck("propriétés existantes, niveau 2, check box", false);
      setCheck("propriétés existantes, niveau 3, check box", false);
      setText("propriétés existantes, niveau 1, percent", "");
      setText("propriétés existantes, niveau 2, percent", "");
      setText("propriétés existantes, niveau 3, percent", "");
    } else {
      // Propriétés existantes (Page 2)
      setCheck("propriétés existantes, niveau 1, check box", niveau === 1);
      setCheck("propriétés existantes, niveau 2, check box", niveau === 2);
      setCheck("propriétés existantes, niveau 3, check box", niveau === 3);
      setText("propriétés existantes, niveau 1, percent", niveau === 1 ? pctText : "");
      setText("propriétés existantes, niveau 2, percent", niveau === 2 ? pctText : "");
      setText("propriétés existantes, niveau 3, percent", niveau === 3 ? pctText : "");
      // Clear new-construction fields
      setCheck("construction, niveau 1, check box", false);
      setCheck("construction, niveau 2, check box", false);
      setCheck("construction, niveau 3, check box", false);
      setText("construction, niveau 1, percent", "");
      setText("construction, niveau 2, percent", "");
      setText("construction, niveau 3, percent", "");
    }

    // ── Update digital signature date to download time ────────────────────────
    // The signature annotation's n2 appearance stream contains a hardcoded date.
    // We replace it with the actual download timestamp (no timezone suffix).
    const etTimeParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(now);
    const etHour = etTimeParts.find((p) => p.type === "hour")!.value;
    const etMin = etTimeParts.find((p) => p.type === "minute")!.value;
    const etSec = etTimeParts.find((p) => p.type === "second")!.value;
    const sigDateStr = `${etYear}.${etMonth}.${etDay} ${etHour}:${etMin}:${etSec}`;

    for (const page of pdfDoc.getPages()) {
      const annotsRef = page.node.get(PDFName.of("Annots") as any);
      if (!annotsRef) continue;
      const annots = (pdfDoc as any).context.lookup(annotsRef);
      for (let i = 0; i < annots.size(); i++) {
        try {
          const annotObj = (pdfDoc as any).context.lookup(annots.get(i));
          const ft = annotObj.get(PDFName.of("FT") as any);
          if (ft?.toString() !== "/Sig") continue;
          const ap = annotObj.get(PDFName.of("AP") as any);
          if (!ap) continue;
          const apN = (pdfDoc as any).context.lookup(ap.get(PDFName.of("N") as any));
          const apNRes = (pdfDoc as any).context.lookup(apN.dict.get(PDFName.of("Resources") as any));
          const apNXobj = (pdfDoc as any).context.lookup(apNRes.get(PDFName.of("XObject") as any));
          const frm = (pdfDoc as any).context.lookup(apNXobj.get(PDFName.of("FRM") as any));
          const frmRes = (pdfDoc as any).context.lookup(frm.dict.get(PDFName.of("Resources") as any));
          const frmXobj = (pdfDoc as any).context.lookup(frmRes.get(PDFName.of("XObject") as any));
          const n2 = (pdfDoc as any).context.lookup(frmXobj.get(PDFName.of("n2") as any));
          // Decompress (FlateDecode), replace date, store uncompressed
          const rawBytes = Buffer.from(n2.contents);
          const decompressed = inflateSync(rawBytes);
          const content = decompressed.toString("latin1");
          const newContent = content.replace(
            /\[\(Date : [\d.]+ \)-[\d.]+ \([\d:]+ -05'00'\)\]TJ/,
            `(Date : ${sigDateStr})Tj`
          );
          if (newContent !== content) {
            const newBytes = Buffer.from(newContent, "latin1");
            n2.contents = new Uint8Array(newBytes);
            n2.dict.delete(PDFName.of("Filter") as any);
            n2.dict.set(PDFName.of("Length") as any, (pdfDoc as any).context.obj(newBytes.length));
          }
        } catch (_) {}
      }
    }

    return Buffer.from(await pdfDoc.save());
  }

  app.get("/api/projects/:id/attestation-pdf", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.comparisonData) return res.status(422).json({ message: "Données manquantes" });

      const pdfBuffer = await buildAttestationPdf(project);
      res.setHeader("Content-Type", "application/pdf");
      const attestAddr = sanitizeFileName((project.preReportData as any)?.buildingInfo?.address || "") || project.id;
      res.setHeader("Content-Disposition", `attachment; filename="Attestation APH - ${attestAddr}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating attestation PDF:", error);
      res.status(500).json({ message: error.message || "Failed to generate PDF" });
    }
  });

  app.get("/api/projects/:id/attestation-pdf-image", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.comparisonData) return res.status(422).json({ message: "Données manquantes" });

      const pageNum = parseInt((req.query.page as string) || "1", 10);
      const pdfBuffer = await buildAttestationPdf(project);

      const tmpId = crypto.randomBytes(8).toString("hex");
      const tmpPdf = path.join(os.tmpdir(), `attestation-${tmpId}.pdf`);
      const tmpImgPrefix = path.join(os.tmpdir(), `attestation-${tmpId}-page`);

      fs.writeFileSync(tmpPdf, pdfBuffer);
      try {
        await execFileAsync("pdftoppm", [
          "-png", "-r", "150",
          "-f", String(pageNum), "-l", String(pageNum),
          tmpPdf, tmpImgPrefix,
        ]);

        const possibleNames = [
          `${tmpImgPrefix}-${String(pageNum).padStart(pageNum >= 10 ? 2 : 1, "0")}.png`,
          `${tmpImgPrefix}-${pageNum}.png`,
          `${tmpImgPrefix}-0${pageNum}.png`,
        ];
        const imgPath = possibleNames.find((p) => fs.existsSync(p));
        if (!imgPath) throw new Error("PNG output not found");

        const imgBuf = fs.readFileSync(imgPath);
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store");
        res.send(imgBuf);

        fs.unlinkSync(tmpPdf);
        fs.unlinkSync(imgPath);
      } catch (e) {
        if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf);
        throw e;
      }
    } catch (error: any) {
      console.error("Error generating attestation PDF image:", error);
      res.status(500).json({ message: error.message || "Failed to render PDF page" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────

  app.get("/api/projects/:id/collective-pdf-image", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const cmp = project.comparisonData as ComparisonData | null;
      if (!cmp) return res.status(422).json({ message: "Comparison data not available" });

      const pageNum = parseInt((req.query.page as string) || "1", 10);
      const pdfBuffer = await buildCollectivePdf(cmp, projectId);

      const tmpId = crypto.randomBytes(8).toString("hex");
      const tmpPdf = path.join(os.tmpdir(), `collective-${tmpId}.pdf`);
      const tmpImgPrefix = path.join(os.tmpdir(), `collective-${tmpId}-page`);

      fs.writeFileSync(tmpPdf, pdfBuffer);
      try {
        await execFileAsync("pdftoppm", [
          "-png", "-r", "150",
          "-f", String(pageNum), "-l", String(pageNum),
          tmpPdf, tmpImgPrefix,
        ]);

        const paddedPage = String(pageNum).padStart(pageNum >= 10 ? 2 : 1, "0");
        const possibleNames = [
          `${tmpImgPrefix}-${paddedPage}.png`,
          `${tmpImgPrefix}-${pageNum}.png`,
          `${tmpImgPrefix}-0${pageNum}.png`,
        ];
        const imgPath = possibleNames.find(p => fs.existsSync(p));
        if (!imgPath) throw new Error("PNG output not found");

        const imgBuf = fs.readFileSync(imgPath);
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store");
        res.send(imgBuf);

        fs.unlinkSync(tmpPdf);
        fs.unlinkSync(imgPath);
      } catch (e) {
        if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf);
        throw e;
      }
    } catch (error: any) {
      console.error("Error generating collective PDF image:", error);
      res.status(500).json({ message: error.message || "Failed to render PDF page" });
    }
  });

  // ── Mandats CRUD ──────────────────────────────────────────────────────────
  app.get("/api/mandats", async (req: Request, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });
      const isAdmin = req.session.userRole === "admin";
      const list = await storage.getMandats(isAdmin ? undefined : userId);
      res.json(list);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/mandats", async (req: Request, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });
      const created = await storage.createMandat({ ...req.body, userId });
      res.status(201).json(created);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/mandats/:id", async (req: Request, res) => {
    try {
      const userId = req.session.userId;
      const isAdmin = req.session.userRole === "admin";
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const m = await storage.getMandat(id);
      if (!m) return res.status(404).json({ message: "Non trouvé" });
      // Accès sans session autorisé uniquement pour le rendu PDF interne (localhost)
      const remote = req.socket.remoteAddress;
      const isInternal = remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1";
      if (!userId && !isInternal) return res.status(401).json({ message: "Non authentifié" });
      if (userId && !isAdmin && m.userId !== userId) return res.status(403).json({ message: "Interdit" });
      res.json(m);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/mandats/:id/export-pdf", async (req: Request, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });
      const isAdmin = req.session.userRole === "admin";
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const m = await storage.getMandat(id);
      if (!m) return res.status(404).json({ message: "Non trouvé" });
      if (!isAdmin && m.userId !== userId) return res.status(403).json({ message: "Interdit" });
      const internalOrigin = `http://localhost:${process.env.PORT || 5000}`;
      const reportUrl = `${internalOrigin}/mandats/${id}/print`;
      const pdfBuffer = await renderProjectPdf(reportUrl, "#mandat-print-content");
      const baseName = sanitizeFileName(`Feuille de mandat ${m.name || id}`) || `mandat-${id}`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}.pdf"`);
      return res.send(pdfBuffer);
    } catch (e: any) {
      console.error("Error exporting mandat PDF:", e);
      res.status(500).json({ message: e.message || "Failed to export PDF" });
    }
  });

  app.patch("/api/mandats/:id", async (req: Request, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });
      const isAdmin = req.session.userRole === "admin";
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const m = await storage.getMandat(id);
      if (!m) return res.status(404).json({ message: "Non trouvé" });
      if (!isAdmin && m.userId !== userId) return res.status(403).json({ message: "Interdit" });
      const updated = await storage.updateMandat(id, req.body);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/mandats/:id", async (req: Request, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });
      const isAdmin = req.session.userRole === "admin";
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const m = await storage.getMandat(id);
      if (!m) return res.status(404).json({ message: "Non trouvé" });
      if (!isAdmin && m.userId !== userId) return res.status(403).json({ message: "Interdit" });
      await storage.deleteMandat(id);
      res.status(204).send();
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Offres de service CRUD ────────────────────────────────────────────────
  app.get("/api/offres", async (req: Request, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });
      const isAdmin = req.session.userRole === "admin";
      const list = await storage.getOffres(isAdmin ? undefined : userId);
      res.json(list);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/offres", async (req: Request, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });
      const created = await storage.createOffre({ ...req.body, userId });
      res.status(201).json(created);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/offres/:id", async (req: Request, res) => {
    try {
      const userId = req.session.userId;
      const isAdmin = req.session.userRole === "admin";
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const o = await storage.getOffre(id);
      if (!o) return res.status(404).json({ message: "Non trouvé" });
      // Accès sans session autorisé uniquement pour le rendu PDF interne (localhost)
      const remote = req.socket.remoteAddress;
      const isInternal = remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1";
      if (!userId && !isInternal) return res.status(401).json({ message: "Non authentifié" });
      if (userId && !isAdmin && o.userId !== userId) return res.status(403).json({ message: "Interdit" });
      res.json(o);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/offres/:id/export-pdf", async (req: Request, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });
      const isAdmin = req.session.userRole === "admin";
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const o = await storage.getOffre(id);
      if (!o) return res.status(404).json({ message: "Non trouvé" });
      if (!isAdmin && o.userId !== userId) return res.status(403).json({ message: "Interdit" });
      const internalOrigin = `http://localhost:${process.env.PORT || 5000}`;
      const reportUrl = `${internalOrigin}/offres/${id}/print`;
      const pdfBuffer = await renderProjectPdf(reportUrl, "#offre-print-content");
      const baseName = sanitizeFileName(`Offre de service ${o.numero || o.name || id}`) || `offre-${id}`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}.pdf"`);
      return res.send(pdfBuffer);
    } catch (e: any) {
      console.error("Error exporting offre PDF:", e);
      res.status(500).json({ message: e.message || "Failed to export PDF" });
    }
  });

  app.patch("/api/offres/:id", async (req: Request, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });
      const isAdmin = req.session.userRole === "admin";
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const o = await storage.getOffre(id);
      if (!o) return res.status(404).json({ message: "Non trouvé" });
      if (!isAdmin && o.userId !== userId) return res.status(403).json({ message: "Interdit" });
      const updated = await storage.updateOffre(id, req.body);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/offres/:id", async (req: Request, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });
      const isAdmin = req.session.userRole === "admin";
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const o = await storage.getOffre(id);
      if (!o) return res.status(404).json({ message: "Non trouvé" });
      if (!isAdmin && o.userId !== userId) return res.status(403).json({ message: "Interdit" });
      await storage.deleteOffre(id);
      res.status(204).send();
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Profil utilisateur (propre compte) ───────────────────────────────────

  app.patch("/api/auth/profile", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Non authentifié" });
    try {
      const { currentPassword, newPassword, username } = req.body;
      const user = await storage.getUserById(req.session.userId);
      if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

      const updates: Record<string, any> = {};

      // Changement de mot de passe
      if (newPassword) {
        if (!currentPassword) return res.status(400).json({ message: "Mot de passe actuel requis" });
        const valid = await verifyPassword(currentPassword, user.passwordHash);
        if (!valid) return res.status(401).json({ message: "Mot de passe actuel incorrect" });
        if (newPassword.length < 6) return res.status(400).json({ message: "Le nouveau mot de passe doit contenir au moins 6 caractères" });
        updates.passwordHash = await hashPassword(newPassword);
      }

      // Changement de nom d'utilisateur
      if (username !== undefined && username !== user.username) {
        if (username) {
          const existing = await storage.getUserByUsername(username);
          if (existing && existing.id !== user.id) return res.status(409).json({ message: "Nom d'utilisateur déjà utilisé" });
        }
        updates.username = username || null;
      }

      if (Object.keys(updates).length === 0)
        return res.status(400).json({ message: "Aucune modification détectée" });

      await storage.updateUser(req.session.userId, updates);
      const updated = await storage.getUserById(req.session.userId);
      const { passwordHash: _, ...safe } = updated!;
      res.json(safe);
    } catch (e: any) { res.status(500).json({ message: e.message || "Erreur serveur" }); }
  });

  // ── Catalogue thermopompes ────────────────────────────────────────────────

  app.get("/api/heat-pumps", async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const list = await storage.getHeatPumps(type);
      res.json(list);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/heat-pumps", async (req, res) => {
    if (!req.session.userId)
      return res.status(401).json({ message: "Non authentifié" });
    try {
      const { name, brand, model, capacity, hspf2, seer2, type, isDefault } = req.body;
      if (!name) return res.status(400).json({ message: "Nom requis" });
      // Si isDefault → retirer le défaut actuel du même type
      if (isDefault) {
        const existing = await storage.getHeatPumps(type || "heatpump");
        for (const hp of existing.filter(h => h.isDefault)) {
          await storage.updateHeatPump(hp.id, { isDefault: false });
        }
      }
      const hp = await storage.createHeatPump({ name, brand, model, capacity, hspf2, seer2, type: type || "heatpump", isDefault: !!isDefault });
      res.json(hp);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/heat-pumps/:id", async (req, res) => {
    if (!req.session.userId)
      return res.status(401).json({ message: "Non authentifié" });
    try {
      const id = req.params.id;
      const hp = await storage.getHeatPump(id);
      if (!hp) return res.status(404).json({ message: "Non trouvé" });
      const { isDefault, type, ...rest } = req.body;
      const updates: any = { ...rest };
      if (typeof isDefault === "boolean") {
        if (isDefault) {
          const existing = await storage.getHeatPumps(hp.type);
          for (const h of existing.filter(h => h.isDefault && h.id !== id)) {
            await storage.updateHeatPump(h.id, { isDefault: false });
          }
        }
        updates.isDefault = isDefault;
      }
      const updated = await storage.updateHeatPump(id, updates);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/heat-pumps/:id", async (req, res) => {
    if (!req.session.userId)
      return res.status(401).json({ message: "Non authentifié" });
    try {
      await storage.deleteHeatPump(req.params.id);
      res.status(204).send();
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Upload d'une image (photo ou page de fiche technique) pour une thermopompe
  app.post("/api/heat-pumps/:id/upload-image", upload.single("file"), async (req, res) => {
    if (!req.session.userId)
      return res.status(401).json({ message: "Non authentifié" });
    try {
      const hp = await storage.getHeatPump(req.params.id);
      if (!hp) return res.status(404).json({ message: "Non trouvé" });
      if (!req.file) return res.status(400).json({ message: "Aucun fichier" });

      const hpDir = path.join("uploads", "heat-pumps");
      await fs.promises.mkdir(hpDir, { recursive: true });
      const uid = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
      const destName = `${uid}.jpg`;
      const destPath = path.join(hpDir, destName);

      const normalizedBuf = await normalizeImageBuffer(req.file.buffer, req.file.originalname);
      const jpegBuf = await sharp(normalizedBuf).jpeg({ quality: 90 }).toBuffer();
      await fs.promises.writeFile(destPath, jpegBuf);

      const url = `/uploads/heat-pumps/${destName}`;
      const field = req.query.field === "spec" ? "specPages" : "images";
      const current = (hp[field] as string[]) ?? [];
      const updated = await storage.updateHeatPump(hp.id, { [field]: [...current, url] });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/heat-pumps/:id/image", async (req, res) => {
    if (!req.session.userId)
      return res.status(401).json({ message: "Non authentifié" });
    try {
      const hp = await storage.getHeatPump(req.params.id);
      if (!hp) return res.status(404).json({ message: "Non trouvé" });
      const { url, field = "images" } = req.body as { url: string; field?: string };
      const key = field === "spec" || field === "specPages" ? "specPages" : "images";
      const current = (hp[key] as string[]) ?? [];
      const updated = current.filter(u => u !== url);
      const result = await storage.updateHeatPump(hp.id, { [key]: updated });
      // Supprimer le fichier physique
      if (url.startsWith("/uploads/")) {
        const filePath = url.slice(1); // retire le /
        await fs.promises.unlink(filePath).catch(() => {});
      }
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  return httpServer;
}
