import { useState } from "react";
import type { Project, ComparisonData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface AttestationTabProps {
  project: Project;
}

function PdfPageImage({ projectId, page }: { projectId: string; page: number }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const src = `/api/projects/${projectId}/attestation-pdf-image?page=${page}`;

  return (
    <div className="relative w-full" style={{ background: "#f5f5f5", minHeight: "200px" }}>
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
          <AlertCircle className="w-4 h-4" />
          Erreur de chargement de la page {page}
        </div>
      ) : (
        <img
          src={src}
          alt={`Page ${page} de l'attestation`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            width: "100%",
            display: loaded ? "block" : "none",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          }}
        />
      )}
    </div>
  );
}

function getNiveau(impPct: number, isNew: boolean): { niveau: 1 | 2 | 3; label: string; range: string } {
  if (isNew) {
    if (impPct >= 40) return { niveau: 3, label: "Niveau 3", range: "≥ 40 % sous le CNÉB/CNB" };
    if (impPct >= 25) return { niveau: 2, label: "Niveau 2", range: "25 – 39 % sous le CNÉB/CNB" };
    return { niveau: 1, label: "Niveau 1", range: "20 – 24 % sous le CNÉB/CNB" };
  } else {
    if (impPct >= 40) return { niveau: 3, label: "Niveau 3", range: "≥ 40 % de réduction" };
    if (impPct >= 25) return { niveau: 2, label: "Niveau 2", range: "25 – 39 % de réduction" };
    return { niveau: 1, label: "Niveau 1", range: "15 – 24 % de réduction" };
  }
}

export default function AttestationTab({ project }: AttestationTabProps) {
  const cmp = project.comparisonData as ComparisonData | null;
  const [showPreview, setShowPreview] = useState(false);

  const pdfUrl = `/api/projects/${project.id}/attestation-pdf`;
  const isNew = project.buildingType === "new";

  if (!cmp) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <AlertCircle className="w-8 h-8" />
        <p className="text-sm">Chargez les rapports PRE et POST pour générer cette attestation.</p>
      </div>
    );
  }

  const impPct = cmp.improvementPercent ?? 0;
  const { niveau, label: niveauLabel, range: niveauRange } = getNiveau(impPct, isNew);
  const address = [project.address, project.city, project.province, project.postalCode]
    .filter(Boolean)
    .join(", ");

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const niveauColors = {
    1: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
    2: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
    3: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
  } as const;
  const nc = niveauColors[niveau];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "#1e3a5f" }}>
            Attestation APH SELECT — SCHL
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Formulaire officiel rempli automatiquement avec les données du projet
          </p>
        </div>
        <div className="flex gap-2">
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir
            </Button>
          </a>
          <a href={pdfUrl} download={`attestation-aph-${project.id}.pdf`}>
            <Button size="sm" style={{ backgroundColor: "#1e3a5f" }} className="gap-1.5 text-white">
              <Download className="w-3.5 h-3.5" />
              Télécharger
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="border rounded p-3 bg-slate-50 col-span-2">
          <div className="text-xs text-muted-foreground mb-1">Adresse du projet</div>
          <div className="text-sm">{address || "—"}</div>
        </div>
        <div className="border rounded p-3 bg-slate-50">
          <div className="text-xs text-muted-foreground mb-1">Type de bâtiment</div>
          <div className="text-sm">{isNew ? "Nouvelle construction" : "Propriété existante"}</div>
        </div>
        <div className="border rounded p-3 bg-slate-50">
          <div className="text-xs text-muted-foreground mb-1">Date d'attestation</div>
          <div className="text-sm">{dateStr}</div>
        </div>
        <div className="border rounded p-3 bg-slate-50">
          <div className="text-xs text-muted-foreground mb-1">Réduction énergétique</div>
          <div className="text-sm">{impPct.toFixed(1)} %</div>
        </div>
        <div
          className="border rounded p-3"
          style={{ backgroundColor: nc.bg, borderColor: nc.border }}
        >
          <div className="text-xs text-muted-foreground mb-1">Qualification APH SELECT</div>
          <div className="font-medium text-sm" style={{ color: nc.text }}>
            {niveauLabel} — {niveauRange}
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
          style={{ backgroundColor: "#f0f4f8" }}
          onClick={() => setShowPreview(!showPreview)}
        >
          <span className="text-sm font-medium" style={{ color: "#1e3a5f" }}>
            Aperçu de l'attestation (2 pages)
          </span>
          {showPreview ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {showPreview && (
          <div className="bg-gray-100 p-4 space-y-4">
            {[1, 2].map((pageNum) => (
              <div key={pageNum}>
                <div className="text-xs text-muted-foreground mb-2 font-medium">Page {pageNum}</div>
                <PdfPageImage projectId={project.id} page={pageNum} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
