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

## Parser Details
- Handles French-language HOT2000 reports from Quebec
- Line-by-line parsing (labels on separate lines from values)
- Extracts: building info, Zone 1/3 heat loss, ventilation, monthly energy, annual summary, GHG emissions, hot water, cooling, interior lighting kWh
- Text variants handled: "chauffeeau"/"chauffe-eau", "SOMMAIRE"/"SOMMAIRE", MJ format parsing
- Parses "SOMMAIRE DES CHARGES DE BASE" → "Éclairage intérieur" kWh annuel for LED strategy detection

## Dynamic Strategies (Report Tab)
Strategies in "Stratégies utilisées pour améliorer l'efficacité du bâtiment" are conditionally shown:
- **Étanchéité**: Shown when PRE/POST air tightness (CAH@50Pa) differs
- **Système de chauffage**: Shown when heating equipment changes and POST has thermopompe
- **Pommeaux de douches**: Shown when hot water daily consumption differs
- **Lumière LED**: Shown when PRE interior lighting kWh > POST interior lighting kWh (from SOMMAIRE DES CHARGES DE BASE)
Each strategy also gets a corresponding annex section with image upload capability.

## User Flow
1. Create a new project
2. Upload PRE-travaux HOT2000 report (PDF file or paste text)
3. Upload POST-travaux HOT2000 report (PDF file or paste text)
4. View comparison dashboard with charts
5. View/print generated qualification report (Cahier de Qualification)

## Design Tokens
- Font: Inter (sans), Merriweather (serif), JetBrains Mono (mono)
- Color scheme: Blue-based primary (212 85%)

## Running
- `npm run dev` starts Express + Vite dev server on port 5000
- `npm run db:push` syncs database schema
