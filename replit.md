# EnergiQualif - Qualification APH SELECT

## Overview
Web application for energy efficiency qualification under the APH SELECT program (Quebec, Canada). Users upload PRE and POST HOT2000 energy evaluation reports (PDF or text), the system parses the data, compares before/after metrics, and generates a qualification report (Cahier de Qualification).

## Architecture
- **Frontend**: React + TypeScript with shadcn/ui, Tailwind CSS, wouter routing, TanStack Query
- **Backend**: Express.js with PostgreSQL (Drizzle ORM)
- **Key Feature**: HOT2000 French-language report parser (`server/parser.ts`)
- **PDF Support**: Uses pdftotext (poppler_utils) for PDF text extraction

## Project Structure
- `shared/schema.ts` - Data models (projects table, report data schemas)
- `server/parser.ts` - HOT2000 report text parsing engine (French-language, line-by-line)
- `server/routes.ts` - API endpoints (text and PDF upload)
- `server/storage.ts` - Database CRUD operations
- `server/db.ts` - Database connection
- `client/src/pages/home.tsx` - Project list / home page
- `client/src/pages/project.tsx` - Project detail with tabs
- `client/src/components/upload-tab.tsx` - Upload PRE/POST reports (PDF or text)
- `client/src/components/dashboard-tab.tsx` - Comparison dashboard with charts
- `client/src/components/report-tab.tsx` - Generated qualification report view

## API Routes
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create a new project
- `GET /api/projects/:id` - Get a project by ID
- `PATCH /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project
- `POST /api/projects/:id/upload-pre` - Upload and parse PRE report text
- `POST /api/projects/:id/upload-post` - Upload and parse POST report text
- `POST /api/projects/:id/upload-pre-pdf` - Upload and parse PRE report PDF (multipart)
- `POST /api/projects/:id/upload-post-pdf` - Upload and parse POST report PDF (multipart)
- `GET /api/projects/:id/collective-pdf` - Generate filled APH SELECT immeubles collectifs form PDF
- `GET /api/projects/:id/collective-pdf-image?page=N` - Render collective PDF page as PNG image
- `GET /api/projects/:id/attestation-pdf` - Generate filled SCHL Attestation APH SELECT PDF
- `GET /api/projects/:id/attestation-pdf-image?page=N` - Render attestation PDF page as PNG image

## Parser Details
- Handles French-language HOT2000 reports from Quebec
- Line-by-line parsing (labels on separate lines from values)
- Extracts: building info, Zone 1/3 heat loss, ventilation, monthly energy, annual summary, GHG emissions, hot water, cooling, interior lighting kWh
- Text variants handled: "chauffeeau"/"chauffe-eau", "SOMMAIRE"/"SOMMAIRE", MJ format parsing
- Parses "SOMMAIRE DES CHARGES DE BASE" → "Éclairage intérieur" kWh annuel for LED strategy detection
- Parses fuel types: "Gaz naturel" or "Électricité" from INSTALLATION DE CHAUFFAGE and INSTALLATION DU CHAUFFE-EAU sections
- Parses "SOMMAIRE DE LA CONSOMMATION ANNUELLE ESTIMÉE DE L'ÉNERGIE" for both gas (m³) and electricity (kWh) breakdowns separately
- GES calculation: Gas = m³ × 1889.32 gCO2/m³ / 1,000,000; Electricity = kWh × 2.040 gCO2/kWh / 1,000,000 (Quebec 2019 factors)
- When kwhSummary has both gas and electric totals, uses those directly; otherwise falls back to MJ-based conversion (1 m³ gas = 37.89 MJ)

## Report Format (Cahier de Qualification)
The report tab generates a professional narrative PDF-style document with 7 sections + Annexes:
1. **Résumé exécutif** - Dynamic summary with GJ values, improvement %, GES reduction, strategy list
2. **Description du bâtiment** - Building info, CAH, heating system, window fraction, building photo upload
3. **Profil de consommation énergétique actuel** - Energy breakdown with pie chart (avant travaux)
4. **Stratégie d'optimisation énergétique** - Dynamic strategies shown based on PRE/POST comparison
5. **Performance énergétique après optimisation** - Comparison bar chart, post pie chart, monthly area chart
6. **Comparatif énergétique** - Table with Avant/Après GJ values per category
7. **Conclusion** - Dynamic summary referencing applied strategies
8. **Annexes** - Image uploads for climate zone, thermopompes, robinetterie, chauffe-eau, VRC

### Dynamic Strategies (conditionally shown):
- **Étanchéité**: Shown when PRE/POST air tightness (CAH@50Pa) differs
- **Thermopompes**: Shown when heating equipment changes and POST has thermopompe
- **Pommeaux de douches**: Shown when hot water daily consumption differs
- **DEL (LED)**: Shown when PRE interior lighting kWh > POST interior lighting kWh
- **VRC**: Shown when POST has central ventilation with sensible efficiency data
- **Chauffe-eaux Thermopompe**: Shown when POST hot water equipmentType matches /thermopompe/i
- **Conversion fossile vers Électricité**: Shown when PRE has fossil fuel and POST has electricity

## Immeubles Collectifs PDF
- Template: `server/templates/immeubles-collectifs-template.pdf` (A3, 4 pages)
- Endpoint draws white rectangles over sample values on page 2, then writes computed values:
  - E column (POST/evaluated): x=248–360, R column (PRE/reference): x=360–470, Savings: x=470–600
  - Energy row (Consommation): pdftotext y=115–145; GES row: y=148–205
  - Coordinate conversion: `pdf-lib_y = pageHeight(1191) - pdftotext_y`
- Values: E = POST totalGJ, R = PRE totalGJ, Savings = (R-E)/R × 100; same for GES (T/A)
- Uses `pdf-lib` (StandardFonts.HelveticaBold, 10pt) for overlay text

## SCHL Attestation APH SELECT PDF
- Template: `server/templates/attestation-filled-template.pdf` (unencrypted, 2 pages, pre-filled with evaluator credentials)
- Uses pdf-lib AcroForm API (`form.getTextField()`, `form.getCheckBox()`) — NOT white-rect overlays
- Fields updated per project: `"adresse municipale"`, `"date du rapport"`, `"jour"`, `"mois"`, `"an"`, Niveau checkboxes + percent fields
- Static fields kept from template: evaluator quality/expertise, Marc-André Boucher name/titre/coordonnées/signature
- Niveau thresholds: existing N1=15–24%, N2=25–39%, N3≥40%; new construction N1=20–24%, N2=25–39%, N3≥40%
- `buildingType === "new"` → fills "construction" section (page 1); else fills "propriétés existantes" (page 2)
- All updated fields are marked `enableReadOnly()` to prevent accidental edits in Acrobat

## Default Annex PDFs
- `client/public/defaults/thermopompe-innovair.pdf` — Innovair Q4 spec sheet; default for Thermopompes annex (when showHeatingStrategy)
- `client/public/defaults/faible-debit.pdf` — ECD faible débit spec sheet; default for Robinetterie annex (ALWAYS shown)
- `AnnexImageUpload` component accepts `defaultPdfUrl` prop; renders as `<object>` when no user image uploaded; user can replace with image upload
- Robinetterie faible débit annex is unconditionally shown (not conditional on showHotWaterStrategy)

## User Flow
1. Create a new project
2. Upload PRE-travaux HOT2000 report (PDF file or paste text)
3. Upload POST-travaux HOT2000 report (PDF file or paste text)
4. View comparison dashboard with charts
5. View/print generated qualification report (Cahier de Qualification)

## Design Tokens
- Font: Inter (sans), Playfair Display (serif headings), JetBrains Mono (mono)
- Report headings: Playfair Display, color #1e3a5f
- Color scheme: Blue-based primary (212 85%)
- Company logo: `@assets/Logo-3_1772954007262.jpg` (MAB - Marc André Boucher, Conseils Immobiliers)
- Report header: Logo left + "APH SELECT" right, dark blue (#1e3a5f) bottom border
- Report pages: Smaller logo header with "Cahier de qualification — APH SELECT" subtitle

## Table of Contents (Report)
The Table des matières page includes:
- Main sections 1-8 with clickable navigation
- "Liste des tableaux" (3 entries): monthly tables PRE/POST + comparatif table
- "Liste des figures" (5 entries): pie charts, bar charts, area chart, heat loss chart
- Numbered badges: blue (#1e3a5f) for tables, green (#16a34a) for figures
- Section references shown in italic on the right side

## PDF Extraction
- Uses `pdftotext` CLI (poppler_utils) instead of pdf-parse library
- Async extraction via `execFile` (non-blocking)
- Temp files use crypto random suffix for concurrency safety

## Running
- `npm run dev` starts Express + Vite dev server on port 5000
- `npm run db:push` syncs database schema
