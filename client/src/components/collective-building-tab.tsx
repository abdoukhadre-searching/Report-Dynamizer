import { useState } from "react";
import type { Project, ComparisonData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, AlertCircle, FileText } from "lucide-react";

interface CollectiveBuildingTabProps {
  project: Project;
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
            Valeurs remplies automatiquement dans le formulaire officiel
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
          <div className="font-bold text-base">{energyE != null ? `${energyE.toFixed(3)} GJ` : "—"}</div>
        </div>
        <div className="border rounded p-3 bg-slate-50">
          <div className="text-xs text-muted-foreground mb-1">Énergie — Référence (R)</div>
          <div className="font-bold text-base">{energyR != null ? `${energyR.toFixed(3)} GJ` : "—"}</div>
        </div>
        <div className="border rounded p-3" style={{ backgroundColor: "#e8f5f2" }}>
          <div className="text-xs text-muted-foreground mb-1">Économies d'énergie</div>
          <div className="font-bold text-base" style={{ color: "#2a7d6e" }}>
            {energySavings != null ? `${energySavings.toFixed(1)} %` : "—"}
          </div>
        </div>
        <div className="border rounded p-3 bg-slate-50">
          <div className="text-xs text-muted-foreground mb-1">GES — Immeuble évalué (E)</div>
          <div className="font-bold text-base">{ghgE != null ? `${ghgE.toFixed(5)} T/A` : "—"}</div>
        </div>
        <div className="border rounded p-3 bg-slate-50">
          <div className="text-xs text-muted-foreground mb-1">GES — Référence (R)</div>
          <div className="font-bold text-base">{ghgR != null ? `${ghgR.toFixed(5)} T/A` : "—"}</div>
        </div>
        <div className="border rounded p-3" style={{ backgroundColor: "#e8f5f2" }}>
          <div className="text-xs text-muted-foreground mb-1">Réduction GES</div>
          <div className="font-bold text-base" style={{ color: "#2a7d6e" }}>
            {ghgSavings != null ? `${ghgSavings.toFixed(1)} %` : "—"}
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
          style={{ backgroundColor: "#f0f4f8" }}
          onClick={() => setShowPreview(!showPreview)}
        >
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "#1e3a5f" }}>
            <FileText className="w-4 h-4" />
            Aperçu du PDF rempli
          </div>
          <span className="text-xs text-muted-foreground">
            {showPreview ? "Masquer ▲" : "Afficher ▼"}
          </span>
        </div>

        {showPreview && (
          <div className="relative" style={{ height: "900px" }}>
            <iframe
              src={pdfUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Formulaire APH SELECT — Immeubles collectifs"
            />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none"
              style={{ background: "rgba(255,255,255,0)", zIndex: 0 }}
            />
          </div>
        )}

        {showPreview && (
          <div className="px-4 py-2 bg-amber-50 border-t text-xs text-amber-700 flex items-center gap-1.5">
            <span>⚠️</span>
            Si le PDF n'apparaît pas, utilisez le bouton{" "}
            <strong>Ouvrir</strong> pour le visualiser dans un nouvel onglet.
          </div>
        )}
      </div>
    </div>
  );
}
