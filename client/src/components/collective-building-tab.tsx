import type { Project, ComparisonData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, AlertCircle } from "lucide-react";

interface CollectiveBuildingTabProps {
  project: Project;
}

export default function CollectiveBuildingTab({ project }: CollectiveBuildingTabProps) {
  const cmp = project.comparisonData as ComparisonData | null;

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
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "#1e3a5f" }}>
            Formulaire APH SELECT — Immeubles collectifs
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Valeurs remplies automatiquement dans le formulaire officiel
          </p>
        </div>
        <a href={pdfUrl} download={`immeubles-collectifs-${project.id}.pdf`}>
          <Button size="sm" style={{ backgroundColor: "#1e3a5f" }} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Télécharger PDF rempli
          </Button>
        </a>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="border rounded p-3 bg-slate-50">
          <div className="text-xs text-muted-foreground mb-1">Consommation — Immeuble évalué (E)</div>
          <div className="font-bold text-base">{energyE != null ? `${energyE.toFixed(3)} GJ` : "—"}</div>
        </div>
        <div className="border rounded p-3 bg-slate-50">
          <div className="text-xs text-muted-foreground mb-1">Consommation — Référence (R)</div>
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

      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2">
          Aperçu du formulaire (valeurs insérées dans le PDF original)
        </h3>
        <object
          data={pdfUrl}
          type="application/pdf"
          style={{ width: "100%", height: "920px", border: "1px solid #e2e8f0", borderRadius: "8px" }}
        >
          <div className="p-4 text-sm text-muted-foreground border rounded text-center">
            Votre navigateur ne supporte pas l'affichage PDF intégré.{" "}
            <a href={pdfUrl} target="_blank" className="underline text-primary">
              Ouvrir le PDF
            </a>
          </div>
        </object>
      </div>
    </div>
  );
}
