import type { Project, ComparisonData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, AlertCircle } from "lucide-react";

interface AttestationTabProps {
  project: Project;
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
    </div>
  );
}
