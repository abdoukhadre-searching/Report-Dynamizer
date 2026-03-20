import { useState } from "react";
import type { Project, ComparisonData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, ExternalLink, AlertCircle, Save, CheckCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
  const queryClient = useQueryClient();

  const [sigName, setSigName] = useState(project.signatoryName || "");
  const [sigTitle, setSigTitle] = useState(project.signatoryTitle || "");
  const [sigCoord, setSigCoord] = useState(project.signatoryCoordonnees || "");
  const [saved, setSaved] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/projects/${project.id}`, {
        signatoryName: sigName,
        signatoryTitle: sigTitle,
        signatoryCoordonnees: sigCoord,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

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
            <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-open-attestation">
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir
            </Button>
          </a>
          <a href={pdfUrl} download={`attestation-aph-${project.id}.pdf`}>
            <Button size="sm" style={{ backgroundColor: "#1e3a5f" }} className="gap-1.5 text-white" data-testid="button-download-attestation">
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

      {/* Signatory section */}
      <div className="border rounded-lg p-4 space-y-4" style={{ borderColor: "#cbd5e1" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "#1e3a5f" }}>Signataire</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ces informations seront inscrites dans le PDF. La signature reste à apposer manuellement.
            </p>
          </div>
          <Button
            size="sm"
            variant={saved ? "default" : "outline"}
            className="gap-1.5"
            style={saved ? { backgroundColor: "#15803d", color: "white" } : {}}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            data-testid="button-save-signatory"
          >
            {saved ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? "Sauvegardé" : saveMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sig-name" className="text-xs">Nom</Label>
            <Input
              id="sig-name"
              value={sigName}
              onChange={(e) => { setSigName(e.target.value); setSaved(false); }}
              placeholder="Marc-André Boucher"
              className="h-8 text-sm"
              data-testid="input-signatory-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sig-title" className="text-xs">Titre professionnel</Label>
            <Input
              id="sig-title"
              value={sigTitle}
              onChange={(e) => { setSigTitle(e.target.value); setSaved(false); }}
              placeholder="Évaluateur en efficacité énergétique"
              className="h-8 text-sm"
              data-testid="input-signatory-title"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sig-coord" className="text-xs">Coordonnées</Label>
            <Input
              id="sig-coord"
              value={sigCoord}
              onChange={(e) => { setSigCoord(e.target.value); setSaved(false); }}
              placeholder="438 521-9645 — exemple@email.com"
              className="h-8 text-sm"
              data-testid="input-signatory-coordonnees"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
