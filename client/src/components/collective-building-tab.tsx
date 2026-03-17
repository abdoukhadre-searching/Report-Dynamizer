import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, ReportData, ComparisonData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, CheckCircle2, Building2, Zap, Wind, Droplets, Lightbulb, Flame } from "lucide-react";

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
  { id: "1", type: "Étanchéité", certBody: "", certStep: "", description: "Test d'infiltrométrie BLOWER DOOR", level: "" },
  { id: "2", type: "Thermopompe", certBody: "AHRI", certStep: "", description: "", level: "" },
  { id: "3", type: "Chauffe-eau", certBody: "ENERGY STAR", certStep: "", description: "", level: "" },
  { id: "4", type: "VRC", certBody: "HVI", certStep: "", description: "", level: "" },
  { id: "5", type: "Éclairage DEL", certBody: "ENERGY STAR", certStep: "", description: "", level: "" },
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
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
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

  const fmtGJ = (v?: number) => (v != null ? `${v.toFixed(3)} GJ` : "—");
  const fmtT = (v?: number) => (v != null ? `${v.toFixed(5)} T/A` : "—");
  const fmtPct = (v?: number) => (v != null ? `${v.toFixed(1)} %` : "—");

  const hasBoth = !!pre && !!post && !!cmp;

  return (
    <div className="space-y-0 print:space-y-0" id="collective-report">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "#1e3a5f" }}>
            Immeuble Collectif — Fiche de qualification
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Programme APH SELECT — Rapport de performance énergétique
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
            Imprimer
          </Button>
          <Button
            size="sm"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            style={{ backgroundColor: "#1e3a5f" }}
          >
            {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
            Sauvegarder
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden print:border-0">
        <div className="p-4 border-b" style={{ backgroundColor: "#1e3a5f" }}>
          <p className="text-white font-bold text-lg tracking-wide">IMMEUBLES COLLECTIFS</p>
          <p className="text-blue-200 text-sm">Programme APH SELECT — Qualification énergétique</p>
        </div>

        <div className="p-5 border-b bg-muted/20">
          <h3 className="font-semibold text-sm mb-4 uppercase tracking-wide text-muted-foreground">
            Identification du bâtiment
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Adresse</Label>
              <div className="mt-1 px-3 py-2 border rounded-md bg-white text-sm min-h-[36px]">
                {project.address || <span className="text-muted-foreground italic">—</span>}
              </div>
            </div>
            <div>
              <Label className="text-xs">Ville / Province / Code postal</Label>
              <div className="mt-1 px-3 py-2 border rounded-md bg-white text-sm min-h-[36px]">
                {[project.city, project.province, project.postalCode].filter(Boolean).join(" · ") || (
                  <span className="text-muted-foreground italic">—</span>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs">Nom du propriétaire / client</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nom du propriétaire"
                className="mt-1 h-9 text-sm"
                data-testid="input-client-name"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Année de construction</Label>
                <Input
                  value={yearBuilt}
                  onChange={(e) => setYearBuilt(e.target.value)}
                  placeholder="2024"
                  className="mt-1 h-9 text-sm"
                  data-testid="input-year-built"
                />
              </div>
              <div>
                <Label className="text-xs">Nb d'étages</Label>
                <Input
                  value={numFloors}
                  onChange={(e) => setNumFloors(e.target.value)}
                  placeholder="4"
                  className="mt-1 h-9 text-sm"
                  data-testid="input-num-floors"
                />
              </div>
              <div>
                <Label className="text-xs">Nb de logements</Label>
                <Input
                  value={numUnits}
                  onChange={(e) => setNumUnits(e.target.value)}
                  placeholder="12"
                  className="mt-1 h-9 text-sm"
                  data-testid="input-num-units"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Évaluateur agréé</Label>
              <Input
                value={evaluator}
                onChange={(e) => setEvaluator(e.target.value)}
                placeholder="Nom de l'évaluateur"
                className="mt-1 h-9 text-sm"
                data-testid="input-evaluator"
              />
            </div>
            <div>
              <Label className="text-xs">Date de l'évaluation</Label>
              <Input
                type="date"
                value={evaluationDate}
                onChange={(e) => setEvaluationDate(e.target.value)}
                className="mt-1 h-9 text-sm"
                data-testid="input-evaluation-date"
              />
            </div>
          </div>
        </div>

        <div className="p-5 border-b">
          <h3 className="font-semibold text-sm mb-4 uppercase tracking-wide text-muted-foreground">
            Résultats de performance énergétique
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wide">
                  <th className="text-left font-semibold py-2 pr-4 border-b" style={{ color: "#1e3a5f" }}>
                    Indicateur
                  </th>
                  <th className="text-center font-semibold py-2 px-3 border-b border-l">
                    Avant travaux
                  </th>
                  <th className="text-center font-semibold py-2 px-3 border-b border-l">
                    Après travaux
                  </th>
                  <th className="text-center font-semibold py-2 px-3 border-b border-l text-green-700">
                    Amélioration
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 pr-4 font-medium">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Consommation d'énergie annuelle totale
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 ml-5">Toutes sources confondues</div>
                  </td>
                  <td className="py-3 px-3 text-center border-l font-mono text-sm">
                    {hasBoth ? (
                      <span className="font-semibold">{fmtGJ(cmp.totalBefore)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center border-l font-mono text-sm">
                    {hasBoth ? (
                      <span className="font-semibold">{fmtGJ(cmp.totalAfter)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center border-l">
                    {hasBoth ? (
                      <Badge className="bg-green-600 text-white text-xs px-2">
                        ↓ {fmtPct(cmp.improvementPercent)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      Chauffage
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center border-l font-mono text-xs text-muted-foreground">
                    {hasBoth ? fmtGJ(cmp.heatingBefore) : "—"}
                  </td>
                  <td className="py-3 px-3 text-center border-l font-mono text-xs text-muted-foreground">
                    {hasBoth ? fmtGJ(cmp.heatingAfter) : "—"}
                  </td>
                  <td className="py-3 px-3 text-center border-l text-xs text-muted-foreground">
                    {hasBoth && cmp.heatingBefore > 0
                      ? `↓ ${(((cmp.heatingBefore - cmp.heatingAfter) / cmp.heatingBefore) * 100).toFixed(1)} %`
                      : "—"}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-3.5 h-3.5 text-blue-500" />
                      Eau chaude domestique
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center border-l font-mono text-xs text-muted-foreground">
                    {hasBoth ? fmtGJ(cmp.hotWaterBefore) : "—"}
                  </td>
                  <td className="py-3 px-3 text-center border-l font-mono text-xs text-muted-foreground">
                    {hasBoth ? fmtGJ(cmp.hotWaterAfter) : "—"}
                  </td>
                  <td className="py-3 px-3 text-center border-l text-xs text-muted-foreground">
                    {hasBoth && cmp.hotWaterBefore > 0
                      ? `↓ ${(((cmp.hotWaterBefore - cmp.hotWaterAfter) / cmp.hotWaterBefore) * 100).toFixed(1)} %`
                      : "—"}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Wind className="w-3.5 h-3.5 text-cyan-500" />
                      Ventilation
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center border-l font-mono text-xs text-muted-foreground">
                    {hasBoth ? fmtGJ(cmp.ventilationBefore) : "—"}
                  </td>
                  <td className="py-3 px-3 text-center border-l font-mono text-xs text-muted-foreground">
                    {hasBoth ? fmtGJ(cmp.ventilationAfter) : "—"}
                  </td>
                  <td className="py-3 px-3 text-center border-l text-xs text-muted-foreground">
                    {hasBoth && cmp.ventilationBefore > 0
                      ? `↓ ${(((cmp.ventilationBefore - cmp.ventilationAfter) / cmp.ventilationBefore) * 100).toFixed(1)} %`
                      : "—"}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
                      Charges de base (éclairage, appareils)
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center border-l font-mono text-xs text-muted-foreground">
                    {hasBoth ? fmtGJ(cmp.baseLoadsBefore) : "—"}
                  </td>
                  <td className="py-3 px-3 text-center border-l font-mono text-xs text-muted-foreground">
                    {hasBoth ? fmtGJ(cmp.baseLoadsAfter) : "—"}
                  </td>
                  <td className="py-3 px-3 text-center border-l text-xs text-muted-foreground">
                    {hasBoth && cmp.baseLoadsBefore > 0
                      ? `↓ ${(((cmp.baseLoadsBefore - cmp.baseLoadsAfter) / cmp.baseLoadsBefore) * 100).toFixed(1)} %`
                      : "—"}
                  </td>
                </tr>
                <tr className="bg-red-50">
                  <td className="py-3 pr-4 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-red-500 flex-shrink-0" />
                      Émissions de GES annuelles totales
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 ml-5">Tonnes CO₂ équivalent / an</div>
                  </td>
                  <td className="py-3 px-3 text-center border-l font-mono text-sm">
                    {hasBoth ? (
                      <span className="font-semibold">{fmtT(cmp.ghsBefore)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center border-l font-mono text-sm">
                    {hasBoth ? (
                      <span className="font-semibold">{fmtT(cmp.ghsAfter)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center border-l">
                    {hasBoth ? (
                      <Badge className="bg-green-600 text-white text-xs px-2">
                        ↓ {fmtPct(cmp.ghsImprovementPercent)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-5 border-b">
          <h3 className="font-semibold text-sm mb-4 uppercase tracking-wide text-muted-foreground">
            Étanchéité à l'air
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border rounded-md p-3 bg-muted/20">
              <div className="text-xs text-muted-foreground mb-1">CAH @ 50 Pa — Avant travaux</div>
              <div className="text-xl font-bold font-mono" style={{ color: "#1e3a5f" }}>
                {pre?.airLeakage?.cah50 != null ? `${pre.airLeakage.cah50}` : "—"}
                <span className="text-sm font-normal text-muted-foreground ml-1">rén/h</span>
              </div>
            </div>
            <div className="border rounded-md p-3 bg-muted/20">
              <div className="text-xs text-muted-foreground mb-1">CAH @ 50 Pa — Après travaux</div>
              <div className="text-xl font-bold font-mono" style={{ color: "#1e3a5f" }}>
                {post?.airLeakage?.cah50 != null ? `${post.airLeakage.cah50}` : "—"}
                <span className="text-sm font-normal text-muted-foreground ml-1">rén/h</span>
              </div>
            </div>
            <div className="border rounded-md p-3 bg-muted/20">
              <div className="text-xs text-muted-foreground mb-1">Amélioration étanchéité</div>
              <div className="text-xl font-bold font-mono text-green-700">
                {pre?.airLeakage?.cah50 != null && post?.airLeakage?.cah50 != null && pre.airLeakage.cah50 > 0
                  ? `↓ ${(((pre.airLeakage.cah50 - post.airLeakage.cah50) / pre.airLeakage.cah50) * 100).toFixed(1)} %`
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Produits et systèmes certifiés
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={addProductRow}
              className="text-xs h-7 print:hidden"
              data-testid="button-add-product"
            >
              + Ajouter
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left font-semibold py-2 px-3 border border-border">Type</th>
                  <th className="text-left font-semibold py-2 px-3 border border-border">Organisme de certification</th>
                  <th className="text-left font-semibold py-2 px-3 border border-border">Palier / Étape</th>
                  <th className="text-left font-semibold py-2 px-3 border border-border">Description</th>
                  <th className="text-left font-semibold py-2 px-3 border border-border">Niveau atteint</th>
                  <th className="py-2 px-2 border border-border print:hidden" />
                </tr>
              </thead>
              <tbody>
                {products.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="py-1 px-1 border border-border">
                      <Input
                        value={row.type}
                        onChange={(e) => updateProductRow(row.id, "type", e.target.value)}
                        className="h-7 text-xs border-0 bg-transparent focus:ring-0 focus:border-0"
                        placeholder="Type de produit"
                      />
                    </td>
                    <td className="py-1 px-1 border border-border">
                      <Input
                        value={row.certBody}
                        onChange={(e) => updateProductRow(row.id, "certBody", e.target.value)}
                        className="h-7 text-xs border-0 bg-transparent"
                        placeholder="ENERGY STAR, HVI..."
                      />
                    </td>
                    <td className="py-1 px-1 border border-border">
                      <Input
                        value={row.certStep}
                        onChange={(e) => updateProductRow(row.id, "certStep", e.target.value)}
                        className="h-7 text-xs border-0 bg-transparent"
                        placeholder="Étape / Palier"
                      />
                    </td>
                    <td className="py-1 px-1 border border-border">
                      <Input
                        value={row.description}
                        onChange={(e) => updateProductRow(row.id, "description", e.target.value)}
                        className="h-7 text-xs border-0 bg-transparent"
                        placeholder="Description du produit"
                      />
                    </td>
                    <td className="py-1 px-1 border border-border">
                      <Input
                        value={row.level}
                        onChange={(e) => updateProductRow(row.id, "level", e.target.value)}
                        className="h-7 text-xs border-0 bg-transparent"
                        placeholder="Niveau A / B..."
                      />
                    </td>
                    <td className="py-1 px-1 border border-border print:hidden">
                      <button
                        type="button"
                        onClick={() => removeProductRow(row.id)}
                        className="w-5 h-5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center text-xs font-bold"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-5 border-b">
          <h3 className="font-semibold text-sm mb-3 uppercase tracking-wide text-muted-foreground">
            Notes et observations
          </h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ajoutez des notes ou observations complémentaires..."
            className="text-sm min-h-[80px]"
            data-testid="textarea-notes"
          />
        </div>

        <div className="p-5 bg-muted/10">
          <h3 className="font-semibold text-sm mb-4 uppercase tracking-wide text-muted-foreground">
            Attestation
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-muted-foreground mb-2">Évaluateur agréé</div>
              <div className="border-b border-dashed border-border min-h-[60px] flex items-end pb-2">
                <div>
                  <div className="text-sm font-medium">{evaluator || <span className="text-muted-foreground italic">—</span>}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Signature</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Date : {evaluationDate || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-2">Propriétaire / Mandataire</div>
              <div className="border-b border-dashed border-border min-h-[60px]" />
              <div className="mt-2 text-xs text-muted-foreground">Date : _______________</div>
            </div>
          </div>
          {!hasBoth && (
            <div className="mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                Chargez les rapports PRE et POST pour remplir automatiquement les valeurs de performance.
              </p>
            </div>
          )}
          {hasBoth && (
            <div className="mt-4 p-3 rounded-md bg-green-50 border border-green-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-xs text-green-800">
                Les données de performance ont été remplies automatiquement à partir des rapports HOT2000.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
