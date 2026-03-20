import type { Express } from "express";
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
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

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

function getProjectId(param: string | string[] | undefined): string {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9-_\s]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/projects", async (_req, res) => {
    try {
      const projects = await storage.getProjects();
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

      const origin = `${req.protocol}://${req.get("host")}`;
      const reportUrl = `${origin}/project/${projectId}/print`;
      const pdfBuffer = await renderProjectPdf(reportUrl);

      const baseName = sanitizeFileName(project.name || `project-${projectId}`) || `project-${projectId}`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}.pdf"`);
      return res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      return res.status(500).json({ message: error.message || "Failed to export PDF" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const project = await storage.createProject({
        name: req.body.name || "Nouveau projet",
        status: "draft",
      });
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
      await storage.deleteProject(projectId);
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

  app.post("/api/projects/:id/upload-pre", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Content is required" });
      }
      const updated = await handleReportUpload(projectId, content, "pre");
      if (!updated) return res.status(404).json({ message: "Project not found" });
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

      const ext = path.extname(req.file.originalname) || ".png";
      const fileName = `${projectId}_${annexType}_${Date.now()}${ext}`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      fs.writeFileSync(filePath, req.file.buffer);

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

  async function buildCollectivePdf(cmp: ComparisonData): Promise<Buffer> {
    const templatePath = path.join(process.cwd(), "server/templates/immeubles-collectifs-template.pdf");
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pages = pdfDoc.getPages();
    const page = pages[1];
    const { height } = page.getSize();

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

    return Buffer.from(await pdfDoc.save());
  }

  app.get("/api/projects/:id/collective-pdf", async (req, res) => {
    try {
      const projectId = getProjectId(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const cmp = project.comparisonData as ComparisonData | null;
      if (!cmp) return res.status(422).json({ message: "Comparison data not available" });

      const pdfBuffer = await buildCollectivePdf(cmp);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="immeubles-collectifs-${project.id}.pdf"`);
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

  // Fills the new clean SCHL APH SELECT attestation template (no AcroForm, no
  // embedded digital signature) using white-rectangle overlays + pdf-lib drawing.
  // The signature / nom / titre professionnel / coordonnées section is NOT touched.
  async function buildAttestationPdf(project: any): Promise<Buffer> {
    const cmp = project.comparisonData as ComparisonData | null;
    const impPct = cmp?.improvementPercent ?? 0;
    const isNew = project.buildingType === "new";

    // Niveau thresholds (existing: N1=15-24%, N2=25-39%, N3≥40%;  new: N1=20-24%)
    const niveau: 1 | 2 | 3 = impPct >= 40 ? 3 : impPct >= 25 ? 2 : 1;
    const pctText = `${impPct.toFixed(1)} %`;

    const address = [project.address, project.city, project.province, project.postalCode]
      .filter(Boolean).join(", ");

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const monthName = FRENCH_MONTHS[now.getMonth()];
    const year2 = String(now.getFullYear()).slice(-2);
    const reportDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Build a fresh PDF using pre-rendered PNG backgrounds (the original template PDF
    // has broken xref entries that prevent pdf-lib from loading it directly).
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const templatesDir = path.join(process.cwd(), "server/templates");
    const png1Bytes = fs.readFileSync(path.join(templatesDir, "attestation-page1.png"));
    const png2Bytes = fs.readFileSync(path.join(templatesDir, "attestation-page2.png"));
    const img1 = await pdfDoc.embedPng(png1Bytes);
    const img2 = await pdfDoc.embedPng(png2Bytes);

    const W = 612, H1 = 792, H2 = 792;
    const page1 = pdfDoc.addPage([W, H1]);
    const page2 = pdfDoc.addPage([W, H2]);

    // Draw template backgrounds (full page)
    page1.drawImage(img1, { x: 0, y: 0, width: W, height: H1 });
    page2.drawImage(img2, { x: 0, y: 0, width: W, height: H2 });

    // Helper: convert pdftotext (top-left) y to pdf-lib (bottom-left) y
    const y1 = (ptY: number) => H1 - ptY;
    const y2 = (ptY: number) => H2 - ptY;

    // Helper: draw white rect + text overlay (pdftotext coords for rect)
    const overlay = (
      page: typeof page1,
      yFn: (n: number) => number,
      rx: number, ry: number, rw: number, rh: number, // pdftotext rect (x, y_top, w, h)
      text: string,
      tx: number, ty: number, // pdftotext text baseline
      fontSize = 8,
      color = rgb(0, 0, 0),
    ) => {
      page.drawRectangle({ x: rx, y: yFn(ry + rh), width: rw, height: rh, color: rgb(1, 1, 1) });
      page.drawText(text, { x: tx, y: yFn(ty), font: helvetica, size: fontSize, color });
    };

    // Helper: draw a filled dark checkmark box inside a checkbox
    const drawCheck = (page: typeof page1, yFn: (n: number) => number, cx: number, cy: number) => {
      // cx, cy = pdftotext top-left of checkbox area (~14x14pt)
      page.drawRectangle({ x: cx + 2, y: yFn(cy + 11), width: 10, height: 10, color: rgb(0.1, 0.1, 0.5) });
    };

    // ── PAGE 1 ─────────────────────────────────────────────────────────────────

    // 1. Adresse municipale  (grey box ~398-562, pdftotext y=219-239)
    overlay(page1, y1, 398, 219, 164, 20, address, 400, 233, 8);

    // 2. Quality field  (grey box ~398-575, pdftotext y=255-305, ~3 lines)
    overlay(page1, y1, 398, 255, 177, 50,
      "EVALUATEUR EN EFFICACITÉ ÉNERGÉTIQUE", 400, 270, 7.5);

    // 3. Expertise field  (grey box ~398-575, pdftotext y=308-340, 2 lines)
    page1.drawRectangle({ x: 398, y: y1(308 + 32), width: 177, height: 32, color: rgb(1, 1, 1) });
    page1.drawText("MODELISATION ET OPTIMISATION", { x: 400, y: y1(322), font: helvetica, size: 7, color: rgb(0, 0, 0) });
    page1.drawText("EN EFFICACITÉ ENERGETIQUE", { x: 400, y: y1(333), font: helvetica, size: 7, color: rgb(0, 0, 0) });

    // 4. Date du rapport  (grey box ~41-190, pdftotext y=370-388)
    overlay(page1, y1, 41, 370, 149, 18, reportDate, 43, 381, 8);

    // 5. Construction niveau checkboxes (pdftotext y=578-592, checkbox offset ~76/262/448)
    if (isNew) {
      if (niveau === 1) drawCheck(page1, y1, 76, 578);
      if (niveau === 2) drawCheck(page1, y1, 262, 578);
      if (niveau === 3) drawCheck(page1, y1, 448, 578);

      // <%> boxes (pdftotext y=650-663)
      const pcts1 = [{ x: 47, w: 60 }, { x: 233, w: 61 }, { x: 419, w: 61 }];
      pcts1.forEach(({ x, w }, i) => {
        // White out all three, then fill the active one
        page1.drawRectangle({ x, y: y1(650 + 13 + 5), width: w, height: 21, color: rgb(1, 1, 1) });
        if (i + 1 === niveau) {
          page1.drawText(pctText, { x: x + 2, y: y1(660), font: helvetica, size: 8, color: rgb(0, 0, 0) });
        }
      });
    }

    // ── PAGE 2 ─────────────────────────────────────────────────────────────────

    // 6. Existing-properties niveau checkboxes (pdftotext y=120-134)
    if (!isNew) {
      if (niveau === 1) drawCheck(page2, y2, 76, 120);
      if (niveau === 2) drawCheck(page2, y2, 262, 120);
      if (niveau === 3) drawCheck(page2, y2, 448, 120);

      // <%> boxes (pdftotext y=214-227)
      const pcts2 = [{ x: 58, w: 60 }, { x: 244, w: 61 }, { x: 431, w: 61 }];
      pcts2.forEach(({ x, w }, i) => {
        page2.drawRectangle({ x, y: y2(214 + 13 + 5), width: w, height: 20, color: rgb(1, 1, 1) });
        if (i + 1 === niveau) {
          page2.drawText(pctText, { x: x + 2, y: y2(224), font: helvetica, size: 8, color: rgb(0, 0, 0) });
        }
      });
    }

    // 7. DATÉ du fields (pdftotext y=360-377)
    //    <jour> grey box ~100-200, <mois> ~206-333, <an> ~333-381
    overlay(page2, y2, 100, 360, 100, 17, day,        102, 372, 9);
    overlay(page2, y2, 206, 360, 127, 17, monthName,  208, 372, 9);
    overlay(page2, y2, 333, 360,  48, 17, year2,      335, 372, 9);

    // 8. Nom (pdftotext y=432-444, grey box ~x=100-490)
    overlay(page2, y2, 100, 432, 390, 14, "Marc-André Boucher", 102, 442, 9);

    // 9. Titre professionnel (pdftotext y=453-477, grey box ~x=100-490, 2 label lines)
    overlay(page2, y2, 100, 453, 390, 26, "evaluateur en efficacité énergétique", 102, 466, 9);

    // 10. Coordonnées (pdftotext y=490-502, grey box ~x=100-490)
    overlay(page2, y2, 100, 490, 390, 14, "438 521-9645", 102, 500, 9);

    // Signature: NOT touched (left blank for manual signing).

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
      res.setHeader("Content-Disposition", `attachment; filename="attestation-aph-${project.id}.pdf"`);
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
      const pdfBuffer = await buildCollectivePdf(cmp);

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

  return httpServer;
}
