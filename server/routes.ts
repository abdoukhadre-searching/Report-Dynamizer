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
import { PDFDocument, rgb, StandardFonts, PDFName } from "pdf-lib";
import { inflateSync, deflateSync } from "zlib";

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

  // Fills the AcroForm fields of the SCHL APH SELECT attestation template
  // with project-specific values. Uses pdf-lib's native form API so that
  // field values replace existing content cleanly (no white-rect hacks).
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

    // Load the pre-filled template (contains evaluator credentials as real text)
    const templatePath = path.join(process.cwd(), "server/templates/attestation-filled-template.pdf");
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();

    // Helper: set a text field, silently skip if not found
    const setText = (name: string, value: string) => {
      try {
        const field = form.getTextField(name);
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
    const sigDateStr = [
      `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`,
      ` ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`,
    ].join("");

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
