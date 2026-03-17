import { useState } from "react";
import type { Project, ComparisonData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface CollectiveBuildingTabProps {
  project: Project;
}

function PdfPageImage({ projectId, page }: { projectId: string; page: number }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const src = `/api/projects/${projectId}/collective-pdf-image?page=${page}`;

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
          alt={`Page ${page} du formulaire`}
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

export default function CollectiveBuildingTab({ project }: CollectiveBuildingTabProps) {
  const cmp = project.comparisonData as ComparisonData | null;
  const [showPreview, setShowPreview] = useState(false);

  const pdfUrl = `/api/projects/${project.id}/collective-pdf`;

  const energyE = cmp?.totalAfter;
  const energyR = cmp?.totalBefore;
  const energySavings =
    energyR && energyE != null && energyR > 0
      ? ((energyR - energyE) / energyR) * 100
      : null;
  const ghgE = cmp?.ghsAfter;
  const ghgR = cmp?.ghsBefore;
  const ghgSavings =
    ghgR && ghgE != null && ghgR > 0
      ? ((ghgR - ghgE) / ghgR) * 100
      : null;

  if (!cmp) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <AlertCircle className="w-8 h-8" />
        <p className="text-sm">Chargez les rapports PRE et POST pour générer ce formulaire.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "#1e3a5f" }}>
            Formulaire APH SELECT — Immeubles collectifs
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Valeurs calculées et insérées automatiquement dans le formulaire officiel
          </p>
        </div>
        <div className="flex gap-2">
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir
            </Button>
          </a>
          <a href={pdfUrl} download={`immeubles-collectifs-${project.id}.pdf`}>
            <Button size="sm" style={{ backgroundColor: "#1e3a5f" }} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Télécharger
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="border rounded p-3 bg-slate-50">
          <div className="text-xs text-muted-foreground mb-1">Énergie — Immeuble évalué (E)</div>
          <div className="text-base">{energyE != null ? `${energyE.toFixed(3)} GJ` : "—"}</div>
        </div>
        <div className="border rounded p-3 bg-slate-50">
          <div className="text-xs text-muted-foreground mb-1">Énergie — Référence (R)</div>
          <div className="text-base">{energyR != null ? `${energyR.toFixed(3)} GJ` : "—"}</div>
        </div>
        <div className="border rounded p-3 bg-slate-50">
          <div className="text-xs text-muted-foreground mb-1">Économies d'énergie</div>
          <div className="text-base">
            {energySavings != null ? `${energySavings.toFixed(1)} %` : "—"}
          </div>
        </div>
        <div className="border rounded p-3 bg-slate-50">
          <div className="text-xs text-muted-foreground mb-1">GES — Immeuble évalué (E)</div>
          <div className="text-base">{ghgE != null ? `${ghgE.toFixed(5)} T/A` : "—"}</div>
        </div>
        <div className="border rounded p-3 bg-slate-50">
          <div className="text-xs text-muted-foreground mb-1">GES — Référence (R)</div>
          <div className="text-base">{ghgR != null ? `${ghgR.toFixed(5)} T/A` : "—"}</div>
        </div>
        <div className="border rounded p-3 bg-slate-50">
          <div className="text-xs text-muted-foreground mb-1">Réduction GES</div>
          <div className="text-base">
            {ghgSavings != null ? `${ghgSavings.toFixed(1)} %` : "—"}
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
            Aperçu du formulaire complet (4 pages)
          </span>
          {showPreview ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {showPreview && (
          <div className="bg-gray-100 p-4 space-y-4">
            {[1, 2, 3, 4].map((pageNum) => (
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
