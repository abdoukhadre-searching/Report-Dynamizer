import type { Project, ReportData, ComparisonData } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportTabProps {
  project: Project;
}

export default function ReportTab({ project }: ReportTabProps) {
  const pre = project.preReportData as ReportData | null;
  const post = project.postReportData as ReportData | null;
  const comparison = project.comparisonData as ComparisonData | null;

  if (!pre || !post || !comparison) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 mb-4 print:hidden">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-medium">Cahier de qualification APH SELECT</h2>
        </div>
        <Button variant="secondary" size="sm" onClick={handlePrint} data-testid="button-print">
          <Printer className="w-4 h-4 mr-2" />
          Imprimer
        </Button>
      </div>

      <div className="print:p-0" id="report-content">
        <Card className="print:shadow-none print:border-none">
          <CardContent className="p-8 space-y-8">
            <div className="text-center space-y-2 pb-6 border-b">
              <p className="text-sm text-muted-foreground">2025</p>
              <h1 className="text-xl font-semibold">
                Cahier preparatoire pour la qualification au programme APH SELECT
              </h1>
              <p className="text-sm text-muted-foreground">
                Evaluation realisee par la firme d'evaluation en efficacite energetique
              </p>
            </div>

            <section>
              <h2 className="text-base font-semibold mb-4">1. Information sur le projet</h2>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Adresse:</span>{" "}
                  <span className="font-medium">{project.address || pre.buildingInfo?.address || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ville:</span>{" "}
                  <span className="font-medium">{project.city || pre.buildingInfo?.city || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Province:</span>{" "}
                  <span className="font-medium">{project.province || pre.buildingInfo?.province || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Annee de construction:</span>{" "}
                  <span className="font-medium">{pre.buildingInfo?.yearBuilt || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Nombre d'etages:</span>{" "}
                  <span className="font-medium">{pre.buildingInfo?.numFloors || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Orientation:</span>{" "}
                  <span className="font-medium">{pre.buildingInfo?.orientation || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Donnees climatiques:</span>{" "}
                  <span className="font-medium">{pre.buildingInfo?.climateData || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Occupants:</span>{" "}
                  <span className="font-medium">{pre.buildingInfo?.occupants || "-"}</span>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-base font-semibold mb-4">2. Sommaire des parametres du batiment avant les travaux</h2>
              {pre.zone1 && pre.zone1.length > 0 && (
                <>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">Zone 1: Au-dessus du niveau du sol</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Elements</TableHead>
                        <TableHead className="text-xs text-right">Superf. m2 Brute</TableHead>
                        <TableHead className="text-xs text-right">Superf. m2 Nette</TableHead>
                        <TableHead className="text-xs text-right">Eff. (RSI)</TableHead>
                        <TableHead className="text-xs text-right">Chaleur perdue MJ</TableHead>
                        <TableHead className="text-xs text-right">% Annuel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pre.zone1.map((z, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium">{z.element}</TableCell>
                          <TableCell className="text-xs text-right">{z.grossArea?.toFixed(2) ?? "-"}</TableCell>
                          <TableCell className="text-xs text-right">{z.netArea?.toFixed(2) ?? "-"}</TableCell>
                          <TableCell className="text-xs text-right">{z.rsi?.toFixed(2) ?? "-"}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{z.heatLossMJ.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right">{z.heatLossPercent.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      {pre.zone1Total && (
                        <TableRow className="font-semibold">
                          <TableCell className="text-xs" colSpan={4}>ZONE 1 Totaux</TableCell>
                          <TableCell className="text-xs text-right font-mono">{pre.zone1Total.heatLossMJ.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right">{pre.zone1Total.heatLossPercent.toFixed(2)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}

              {pre.ventilation && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">Ventilation</h3>
                  <div className="grid gap-2 sm:grid-cols-4 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Volume</span>
                      <p className="font-mono text-sm">{pre.ventilation.volume?.toFixed(2)} m3</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">CAH</span>
                      <p className="font-mono text-sm">{pre.ventilation.airChange?.toFixed(3)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Perte MJ</span>
                      <p className="font-mono text-sm">{pre.ventilation.heatLossMJ?.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">%</span>
                      <p className="font-mono text-sm">{pre.ventilation.heatLossPercent?.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>
              )}

              {pre.totalHeatLossMJ && (
                <div className="mt-4 p-3 rounded-md bg-muted/50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Total chaleur perdue</span>
                    <span className="text-sm font-mono font-semibold">{pre.totalHeatLossMJ.toFixed(2)} MJ</span>
                  </div>
                </div>
              )}
            </section>

            <Separator />

            <section>
              <h2 className="text-base font-semibold mb-4">3. Sommaire des parametres du batiment apres optimisation</h2>
              {post.zone1 && post.zone1.length > 0 && (
                <>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">Zone 1: Au-dessus du niveau du sol</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Elements</TableHead>
                        <TableHead className="text-xs text-right">Superf. m2 Brute</TableHead>
                        <TableHead className="text-xs text-right">Superf. m2 Nette</TableHead>
                        <TableHead className="text-xs text-right">Eff. (RSI)</TableHead>
                        <TableHead className="text-xs text-right">Chaleur perdue MJ</TableHead>
                        <TableHead className="text-xs text-right">% Annuel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {post.zone1.map((z, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium">{z.element}</TableCell>
                          <TableCell className="text-xs text-right">{z.grossArea?.toFixed(2) ?? "-"}</TableCell>
                          <TableCell className="text-xs text-right">{z.netArea?.toFixed(2) ?? "-"}</TableCell>
                          <TableCell className="text-xs text-right">{z.rsi?.toFixed(2) ?? "-"}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{z.heatLossMJ.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right">{z.heatLossPercent.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      {post.zone1Total && (
                        <TableRow className="font-semibold">
                          <TableCell className="text-xs" colSpan={4}>ZONE 1 Totaux</TableCell>
                          <TableCell className="text-xs text-right font-mono">{post.zone1Total.heatLossMJ.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right">{post.zone1Total.heatLossPercent.toFixed(2)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}

              {post.ventilation && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">Ventilation</h3>
                  <div className="grid gap-2 sm:grid-cols-4 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Volume</span>
                      <p className="font-mono text-sm">{post.ventilation.volume?.toFixed(2)} m3</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">CAH</span>
                      <p className="font-mono text-sm">{post.ventilation.airChange?.toFixed(3)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Perte MJ</span>
                      <p className="font-mono text-sm">{post.ventilation.heatLossMJ?.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">%</span>
                      <p className="font-mono text-sm">{post.ventilation.heatLossPercent?.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>
              )}

              {post.totalHeatLossMJ && (
                <div className="mt-4 p-3 rounded-md bg-muted/50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Total chaleur perdue</span>
                    <span className="text-sm font-mono font-semibold">{post.totalHeatLossMJ.toFixed(2)} MJ</span>
                  </div>
                </div>
              )}
            </section>

            <Separator />

            <section>
              <h2 className="text-base font-semibold mb-4">4. Comparatif global en GJ/annee</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Poste</TableHead>
                    <TableHead className="text-xs text-right">Avant (GJ)</TableHead>
                    <TableHead className="text-xs text-right">Apres (GJ)</TableHead>
                    <TableHead className="text-xs text-right">Reduction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs">Chauffage des locaux</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.heatingBefore.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.heatingAfter.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">
                      {comparison.heatingBefore > 0
                        ? ((1 - comparison.heatingAfter / comparison.heatingBefore) * 100).toFixed(1)
                        : "0.0"}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Eau chaude domestique</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.hotWaterBefore.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.hotWaterAfter.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">
                      {comparison.hotWaterBefore > 0
                        ? ((1 - comparison.hotWaterAfter / comparison.hotWaterBefore) * 100).toFixed(1)
                        : "0.0"}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Charges electriques de base</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.baseLoadsBefore.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.baseLoadsAfter.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">
                      {comparison.baseLoadsBefore > 0
                        ? ((1 - comparison.baseLoadsAfter / comparison.baseLoadsBefore) * 100).toFixed(1)
                        : "0.0"}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Electricite pour ventilation</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.ventilationBefore.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.ventilationAfter.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">
                      {comparison.ventilationBefore > 0
                        ? ((1 - comparison.ventilationAfter / comparison.ventilationBefore) * 100).toFixed(1)
                        : "0.0"}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Climatisation des locaux</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.coolingBefore.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.coolingAfter.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">
                      {comparison.coolingBefore > 0
                        ? ((1 - comparison.coolingAfter / comparison.coolingBefore) * 100).toFixed(1)
                        : "0.0"}%
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-semibold border-t-2">
                    <TableCell className="text-xs">Depenses annuelles TOTALES</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.totalBefore.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.totalAfter.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">
                      <Badge variant="default">{comparison.improvementPercent.toFixed(1)}%</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </section>

            <Separator />

            <section>
              <h2 className="text-base font-semibold mb-4">5. GES (Gaz a effet de serre)</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Indicateur</TableHead>
                    <TableHead className="text-xs text-right">Avant (T/A)</TableHead>
                    <TableHead className="text-xs text-right">Apres (T/A)</TableHead>
                    <TableHead className="text-xs text-right">Amelioration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs">GES Electricite</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.ghsBefore.toFixed(5)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.ghsAfter.toFixed(5)}</TableCell>
                    <TableCell className="text-xs text-right">
                      <Badge variant="default">{comparison.ghsImprovementPercent.toFixed(1)}%</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-semibold">
                    <TableCell className="text-xs">GES TOTAL</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.ghsBefore.toFixed(5)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.ghsAfter.toFixed(5)}</TableCell>
                    <TableCell className="text-xs text-right">
                      <Badge variant="default">{comparison.ghsImprovementPercent.toFixed(1)}%</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </section>

            <Separator />

            <section>
              <h2 className="text-base font-semibold mb-4">6. Approbation</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Mesure</TableHead>
                    <TableHead className="text-xs text-right">Immeuble evalue (E)</TableHead>
                    <TableHead className="text-xs text-right">Immeuble de reference (R)</TableHead>
                    <TableHead className="text-xs text-right">Economie (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs">Consommation d'energie annuelle totale (GJ/A)</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.totalAfter.toFixed(3)} GJ</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.totalBefore.toFixed(3)} GJ</TableCell>
                    <TableCell className="text-xs text-right">
                      <Badge variant="default">{comparison.improvementPercent.toFixed(1)}%</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Emission de GES annuelle totale (T CO2/A)</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.ghsAfter.toFixed(5)} T/A</TableCell>
                    <TableCell className="text-xs text-right font-mono">{comparison.ghsBefore.toFixed(5)} T/A</TableCell>
                    <TableCell className="text-xs text-right">
                      <Badge variant="default">{comparison.ghsImprovementPercent.toFixed(1)}%</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </section>

            <div className="pt-8 border-t text-center">
              <p className="text-xs text-muted-foreground">
                Document genere automatiquement par EnergiQualif - Qualification APH SELECT
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
