import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, ReportData, ComparisonData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Printer } from "lucide-react";

interface CollectiveBuildingTabProps {
  project: Project;
}

type ProductRow = {
  id: string;
  type: string;
  certBody: string;
  certStep: string;
  description: string;
  level: string;
};

const DEFAULT_PRODUCTS: ProductRow[] = [
  { id: "1", type: "IPEX", certBody: "SB / CB", certStep: "Étape E", description: "Quartier 2 du LP (nerf): Step Code = 1 od Truss résidentiel", level: "Niveau A" },
  { id: "2", type: "LP Step Code", certBody: "SB / CB", certStep: "Étape E", description: "Quartier 2 du LP (nerf): Step Code = 1 od Truss résidentiel", level: "Niveau A" },
  { id: "3", type: "", certBody: "SB / CB", certStep: "Étape F", description: "Quartier 2 du LP (nerf): Step Code = 1 od Truss résidentiel", level: "Niveau F" },
  { id: "4", type: "", certBody: "SB / CB", certStep: "Étape J", description: "Quartier 2 du LP (nerf): Step Code = 1 od Truss résidentiel", level: "Niveau F" },
  { id: "5", type: "Novoclimat", certBody: "EBL", certStep: "Certifié", description: "Novoclimat — Petits bâtiments continuellement", level: "Niveau A" },
  { id: "6", type: "", certBody: "EBL", certStep: "Certifié", description: "Novoclimat — Grands bâtiments continuellement", level: "Niveau A" },
  { id: "7", type: "Juist Green", certBody: "", certStep: "Or", description: "Juist Green High Density", level: "Niveau A" },
  { id: "8", type: "", certBody: "ELA/QELA", certStep: "Platine", description: "Juist Green High Density", level: "Niveau A" },
];

export default function CollectiveBuildingTab({ project }: CollectiveBuildingTabProps) {
  const { toast } = useToast();
  const pre = project.preReportData as ReportData | null;
  const post = project.postReportData as ReportData | null;
  const cmp = project.comparisonData as ComparisonData | null;

  const [evaluator, setEvaluator] = useState(project.evaluator || "");
  const [evaluationDate, setEvaluationDate] = useState(project.evaluationDate || "");
  const [clientName, setClientName] = useState(project.clientName || "");
  const [numUnits, setNumUnits] = useState(project.numUnits || "");
  const [numFloors, setNumFloors] = useState(project.numFloors || (pre?.buildingInfo?.numFloors ?? ""));
  const [yearBuilt, setYearBuilt] = useState(project.yearBuilt || (pre?.buildingInfo?.yearBuilt ?? ""));
  const [products, setProducts] = useState<ProductRow[]>(DEFAULT_PRODUCTS);
  const [notes, setNotes] = useState("");

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/projects/${project.id}`, {
        evaluator: evaluator.trim(),
        evaluationDate: evaluationDate.trim(),
        clientName: clientName.trim(),
        numUnits: numUnits.trim(),
        numFloors: numFloors.trim(),
        yearBuilt: yearBuilt.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      toast({ title: "Informations sauvegardées" });
    },
  });

  const updateProductRow = (id: string, field: keyof ProductRow, value: string) => {
    setProducts((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addProductRow = () => {
    setProducts((rows) => [
      ...rows,
      { id: String(Date.now()), type: "", certBody: "", certStep: "", description: "", level: "" },
    ]);
  };

  const removeProductRow = (id: string) => {
    setProducts((rows) => rows.filter((r) => r.id !== id));
  };

  const hasBoth = !!pre && !!post && !!cmp;

  const energyE = cmp?.totalAfter;
  const energyR = cmp?.totalBefore;
  const energySavingsPct = energyR && energyE != null && energyR > 0
    ? ((energyR - energyE) / energyR) * 100
    : null;

  const ghgE = cmp?.ghsAfter;
  const ghgR = cmp?.ghsBefore;
  const ghgSavingsPct = ghgR && ghgE != null && ghgR > 0
    ? ((ghgR - ghgE) / ghgR) * 100
    : null;

  const TEAL = "#2a7d6e";
  const TEAL_LIGHT = "#e8f5f2";

  const colStyle = {
    header: {
      backgroundColor: TEAL,
      color: "white",
      fontWeight: "600" as const,
      padding: "10px 14px",
      textAlign: "center" as const,
      fontSize: "13px",
      lineHeight: "1.3",
    },
    cell: {
      padding: "10px 14px",
      textAlign: "center" as const,
      fontSize: "14px",
      borderBottom: "1px solid #e2e8f0",
    },
    labelCell: {
      padding: "10px 14px",
      textAlign: "left" as const,
      fontSize: "13px",
      borderBottom: "1px solid #e2e8f0",
      fontWeight: "600" as const,
      lineHeight: "1.4",
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "#1e3a5f" }}>
            Immeuble collectif — Fiche APH SELECT
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Données extraites automatiquement des rapports HOT2000
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" />
            Imprimer
          </Button>
          <Button
            size="sm"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            style={{ backgroundColor: "#1e3a5f" }}
            className="gap-1.5"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="p-5 border-b bg-slate-50">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Identification du bâtiment
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="col-span-2 sm:col-span-3">
              <Label className="text-xs">Adresse complète</Label>
              <div className="mt-1 px-3 py-2 border rounded bg-white text-sm">
                {[project.address, project.city, project.province, project.postalCode].filter(Boolean).join(", ") || (
                  <span className="text-muted-foreground italic">—</span>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs">Propriétaire / client</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nom" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Année de construction</Label>
              <Input value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} placeholder="2024" className="mt-1 h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Nb étages</Label>
                <Input value={numFloors} onChange={(e) => setNumFloors(e.target.value)} placeholder="3" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Nb logements</Label>
                <Input value={numUnits} onChange={(e) => setNumUnits(e.target.value)} placeholder="12" className="mt-1 h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Évaluateur agréé</Label>
              <Input value={evaluator} onChange={(e) => setEvaluator(e.target.value)} placeholder="Nom de l'évaluateur" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Date de l'évaluation</Label>
              <Input type="date" value={evaluationDate} onChange={(e) => setEvaluationDate(e.target.value)} className="mt-1 h-9 text-sm" />
            </div>
          </div>
        </div>

        <div className="p-5 border-b">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Performance énergétique
          </h3>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #e2e8f0",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr>
                <th style={{ ...colStyle.header, textAlign: "left", width: "36%" }}> </th>
                <th style={colStyle.header}>
                  Immeuble évalué (E)
                </th>
                <th style={colStyle.header}>
                  Immeuble de<br />référence (R)*
                </th>
                <th style={{ ...colStyle.header, backgroundColor: "#1e5c4f" }}>
                  Économies d'énergie<br />(en %)<br />(R-E)/R × 100
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: "white" }}>
                <td style={colStyle.labelCell}>
                  Consommation d'énergie annuelle totale
                  <div style={{ fontWeight: "normal", fontSize: "11px", color: "#666", marginTop: "2px" }}>
                    (GJ/année)
                  </div>
                </td>
                <td style={colStyle.cell}>
                  {energyE != null ? (
                    <span style={{ fontWeight: "600" }}>{energyE.toFixed(3)} GJ</span>
                  ) : (
                    <span style={{ color: "#aaa" }}>—</span>
                  )}
                </td>
                <td style={colStyle.cell}>
                  {energyR != null ? (
                    <span style={{ fontWeight: "600" }}>{energyR.toFixed(3)} GJ</span>
                  ) : (
                    <span style={{ color: "#aaa" }}>—</span>
                  )}
                </td>
                <td style={{ ...colStyle.cell, fontWeight: "700", color: TEAL, fontSize: "15px" }}>
                  {energySavingsPct != null ? `${energySavingsPct.toFixed(1)} %` : "—"}
                </td>
              </tr>
              <tr style={{ backgroundColor: TEAL_LIGHT }}>
                <td style={{ ...colStyle.labelCell, borderBottom: "none" }}>
                  Émissions de gaz à effet de serre annuelles totales
                  <div style={{ fontWeight: "normal", fontSize: "11px", color: "#555", marginTop: "2px" }}>
                    (nombre de tonnes d'équivalent CO₂ par année)
                  </div>
                </td>
                <td style={{ ...colStyle.cell, borderBottom: "none" }}>
                  {ghgE != null ? (
                    <span style={{ fontWeight: "600" }}>{ghgE.toFixed(5)} T/A</span>
                  ) : (
                    <span style={{ color: "#aaa" }}>—</span>
                  )}
                </td>
                <td style={{ ...colStyle.cell, borderBottom: "none" }}>
                  {ghgR != null ? (
                    <span style={{ fontWeight: "600" }}>{ghgR.toFixed(5)} T/A</span>
                  ) : (
                    <span style={{ color: "#aaa" }}>—</span>
                  )}
                </td>
                <td style={{ ...colStyle.cell, borderBottom: "none", fontWeight: "700", color: TEAL, fontSize: "15px" }}>
                  {ghgSavingsPct != null ? `${ghgSavingsPct.toFixed(1)} %` : "—"}
                </td>
              </tr>
            </tbody>
          </table>

          <p style={{ fontSize: "11px", color: "#555", fontStyle: "italic", marginTop: "8px" }}>
            *Dans le cas des immeubles existants, l'immeuble de référence (R) est pris en compte dans son état avant rénovation.
          </p>

          {!hasBoth && (
            <div className="mt-3 p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800">
              Chargez les rapports PRE et POST pour remplir automatiquement ce tableau.
            </div>
          )}
        </div>

        <div className="p-5 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Produits et systèmes certifiés
            </h3>
            <Button variant="outline" size="sm" onClick={addProductRow} className="text-xs h-7 print:hidden">
              + Ajouter
            </Button>
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr>
                <th style={{ ...colStyle.header, textAlign: "left", width: "16%" }}>Produit / Système</th>
                <th style={{ ...colStyle.header, width: "12%" }}>Organisme de certification</th>
                <th style={{ ...colStyle.header, width: "12%" }}>Palier / Étape</th>
                <th style={{ ...colStyle.header, textAlign: "left" }}>Description</th>
                <th style={{ ...colStyle.header, width: "12%" }}>Niveau atteint</th>
                <th style={{ ...colStyle.header, width: "32px", padding: "6px" }} className="print:hidden" />
              </tr>
            </thead>
            <tbody>
              {products.map((row, idx) => (
                <tr key={row.id} style={{ backgroundColor: idx % 2 === 0 ? "white" : TEAL_LIGHT }}>
                  <td style={{ padding: "4px 6px", borderBottom: "1px solid #e2e8f0" }}>
                    <input
                      value={row.type}
                      onChange={(e) => updateProductRow(row.id, "type", e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-xs"
                      placeholder="—"
                    />
                  </td>
                  <td style={{ padding: "4px 6px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                    <input
                      value={row.certBody}
                      onChange={(e) => updateProductRow(row.id, "certBody", e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-xs text-center"
                      placeholder="—"
                    />
                  </td>
                  <td style={{ padding: "4px 6px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                    <input
                      value={row.certStep}
                      onChange={(e) => updateProductRow(row.id, "certStep", e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-xs text-center"
                      placeholder="—"
                    />
                  </td>
                  <td style={{ padding: "4px 6px", borderBottom: "1px solid #e2e8f0" }}>
                    <input
                      value={row.description}
                      onChange={(e) => updateProductRow(row.id, "description", e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-xs"
                      placeholder="Description du produit ou système"
                    />
                  </td>
                  <td style={{ padding: "4px 6px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                    <input
                      value={row.level}
                      onChange={(e) => updateProductRow(row.id, "level", e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-xs text-center"
                      placeholder="—"
                    />
                  </td>
                  <td style={{ padding: "4px 6px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }} className="print:hidden">
                    <button
                      type="button"
                      onClick={() => removeProductRow(row.id)}
                      className="w-5 h-5 rounded text-muted-foreground hover:text-destructive text-xs font-bold"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-5 border-b">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Notes et observations
          </h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ajoutez des notes ou observations complémentaires..."
            className="text-sm min-h-[70px]"
          />
        </div>

        <div className="p-5 bg-slate-50">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Attestation
          </h3>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Évaluateur agréé</div>
              <div
                style={{
                  borderBottom: "1px dashed #aaa",
                  minHeight: "56px",
                  display: "flex",
                  alignItems: "flex-end",
                  paddingBottom: "4px",
                }}
              >
                <div>
                  <div className="text-sm font-medium">{evaluator || <span className="text-muted-foreground italic">—</span>}</div>
                  <div className="text-xs text-muted-foreground">Signature</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Date : {evaluationDate || "_______________"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Propriétaire / Mandataire</div>
              <div style={{ borderBottom: "1px dashed #aaa", minHeight: "56px" }} />
              <div className="text-xs text-muted-foreground mt-2">Date : _______________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
