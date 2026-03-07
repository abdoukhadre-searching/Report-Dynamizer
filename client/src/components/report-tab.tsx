import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
import { FileText, Printer, Upload, CheckCircle2, Loader2, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ReportTabProps {
  project: Project;
}

function AnnexImageUpload({
  projectId,
  annexType,
  label,
  currentImage,
}: {
  projectId: string;
  annexType: string;
  label: string;
  currentImage: string | null;
}) {
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("annexType", annexType);
      const res = await fetch(`/api/projects/${projectId}/upload-annex-image`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erreur");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Image ajoutee avec succes" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="mt-3">
      {currentImage ? (
        <div className="space-y-2">
          <img
            src={currentImage}
            alt={label}
            className="max-w-full rounded-md border"
            style={{ maxHeight: "400px" }}
            data-testid={`img-annex-${annexType}`}
          />
          <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-dashed rounded-md cursor-pointer text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30 print:hidden">
            <Upload className="w-3 h-3" />
            Remplacer l'image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
              }}
            />
          </label>
        </div>
      ) : (
        <label
          className="flex items-center justify-center gap-2 px-4 py-6 border border-dashed rounded-md cursor-pointer text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30 print:hidden"
          data-testid={`upload-annex-${annexType}`}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
          Importer une image pour {label}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
            }}
          />
        </label>
      )}
    </div>
  );
}

function getOccupantCount(occupants?: string): number {
  if (!occupants) return 0;
  const match = occupants.match(/(\d+)\s*adultes?/);
  return match ? parseInt(match[1], 10) : 0;
}

function getThermopompeCount(occupants?: string): number {
  const count = getOccupantCount(occupants);
  return count > 0 ? Math.ceil(count / 2) : 0;
}

function hasHeatingChanged(pre: ReportData, post: ReportData): boolean {
  const preEquip = pre.heating?.primaryEquipment || "";
  const postEquip = post.heating?.primaryEquipment || "";
  return preEquip !== postEquip && preEquip.length > 0 && postEquip.length > 0;
}

function isThermopompeAdded(post: ReportData): boolean {
  const equip = post.heating?.primaryEquipment || "";
  return equip.toLowerCase().includes("thermopompe") || equip.toLowerCase().includes("source d'air");
}

function hasAirTightnessChanged(pre: ReportData, post: ReportData): boolean {
  const preCah = pre.airLeakage?.cah50;
  const postCah = post.airLeakage?.cah50;
  return preCah !== undefined && postCah !== undefined && preCah !== postCah;
}

function hasHotWaterChanged(pre: ReportData, post: ReportData): boolean {
  const preDailyHW = pre.hotWater?.dailyConsumption;
  const postDailyHW = post.hotWater?.dailyConsumption;
  return preDailyHW !== undefined && postDailyHW !== undefined && preDailyHW !== postDailyHW;
}

function hasLedImprovement(pre: ReportData, post: ReportData): boolean {
  const preLighting = pre.interiorLightingKWh;
  const postLighting = post.interiorLightingKWh;
  return preLighting !== undefined && postLighting !== undefined && preLighting > postLighting;
}

function hasVrcInstallation(post: ReportData): boolean {
  if (!post.centralVentilation) return false;
  const cv = post.centralVentilation;
  return cv.sensibleEfficiency0C !== undefined || cv.sensibleEfficiencyMinus25C !== undefined;
}

function isFossilFuel(fuelType?: string): boolean {
  if (!fuelType) return false;
  return /gaz\s*naturel|mazout|propane|diesel|butane|charbon|kérosène|bois|granules|lignite|essence/i.test(fuelType);
}

function hasFossilConversion(pre: ReportData, post: ReportData): boolean {
  const preHeatingFossil = isFossilFuel(pre.heating?.primaryType);
  const preHotWaterFossil = isFossilFuel(pre.hotWater?.primaryType);
  const postHeatingFossil = isFossilFuel(post.heating?.primaryType);
  const postHotWaterFossil = isFossilFuel(post.hotWater?.primaryType);
  return (preHeatingFossil && !postHeatingFossil) || (preHotWaterFossil && !postHotWaterFossil);
}

function getPreFossilFuelLabel(pre: ReportData): string {
  const types: string[] = [];
  if (isFossilFuel(pre.heating?.primaryType)) types.push(pre.heating!.primaryType!);
  if (isFossilFuel(pre.hotWater?.primaryType) && !types.includes(pre.hotWater!.primaryType!)) types.push(pre.hotWater!.primaryType!);
  return types.length > 0 ? types.join(" / ") : "Combustible fossile";
}

export default function ReportTab({ project }: ReportTabProps) {
  const pre = project.preReportData as ReportData | null;
  const post = project.postReportData as ReportData | null;
  const comparison = project.comparisonData as ComparisonData | null;
  const [gasConversionOptions, setGasConversionOptions] = useState<{ option1: boolean; option2: boolean }>({ option1: true, option2: true });

  if (!pre || !post || !comparison) return null;

  const handlePrint = () => {
    window.print();
  };

  const showAirTightnessStrategy = hasAirTightnessChanged(pre, post);
  const showHeatingStrategy = hasHeatingChanged(pre, post) && isThermopompeAdded(post);
  const showHotWaterStrategy = hasHotWaterChanged(pre, post);
  const showLedStrategy = hasLedImprovement(pre, post);
  const showVrcStrategy = hasVrcInstallation(post);
  const showGasConversionStrategy = hasFossilConversion(pre, post);
  const thermopompeCount = getThermopompeCount(pre.buildingInfo?.occupants);
  const hasAnyStrategy = showAirTightnessStrategy || showHeatingStrategy || showHotWaterStrategy || showLedStrategy || showVrcStrategy || showGasConversionStrategy;

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
                Cahier préparatoire pour la qualification au programme APH SELECT
              </h1>
              <p className="text-sm text-muted-foreground">
                Évaluation réalisée par la firme d'évaluation en efficacité énergétique
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
              <h2 className="text-base font-semibold mb-4">2. Sommaire des paramètres du bâtiment avant les travaux</h2>
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
              <h2 className="text-base font-semibold mb-4">3. Sommaire des paramètres du bâtiment après optimisation</h2>
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

            {hasAnyStrategy && (
              <>
                <section>
                  <h2 className="text-base font-semibold mb-4" data-testid="text-strategies-title">
                    4. Stratégies utilisées pour améliorer l'efficacité du bâtiment
                  </h2>

                  <div className="space-y-4">
                    {showAirTightnessStrategy && (
                      <div className="p-4 rounded-md border bg-muted/30" data-testid="strategy-air-tightness">
                        <h3 className="text-sm font-medium mb-2">Étanchéité</h3>
                        <p className="text-sm">
                          Améliorer l'étanchéité du bâtiment à CAH maximum de{" "}
                          <span className="font-semibold">{post.airLeakage?.cah50}</span> @ 50 Pa.
                        </p>
                      </div>
                    )}

                    {showHeatingStrategy && (
                      <div className="p-4 rounded-md border bg-muted/30" data-testid="strategy-thermopompe">
                        <h3 className="text-sm font-medium mb-2">Système de chauffage</h3>
                        <p className="text-sm">
                          Ajout de{" "}
                          <span className="font-semibold">{thermopompeCount}</span>{" "}
                          Thermopompes d'au moins 12 000 btu, 10 HSPF2 et 23 SEER2.
                        </p>
                      </div>
                    )}

                    {showHotWaterStrategy && (
                      <div className="p-4 rounded-md border bg-muted/30" data-testid="strategy-hot-water">
                        <h3 className="text-sm font-medium mb-2">Pommeaux de douches et robinets</h3>
                        <p className="text-sm">
                          Installation de pommeaux de douches et robinets faible débit (réduction charge eau chaude domestique). (Voir détails)
                        </p>
                      </div>
                    )}

                    {showLedStrategy && (
                      <div className="p-4 rounded-md border bg-muted/30" data-testid="strategy-led">
                        <h3 className="text-sm font-medium mb-2">Lumière LED</h3>
                        <p className="text-sm">
                          Installation d'au moins 75% de LED dans le bâtiment.
                        </p>
                      </div>
                    )}

                    {showVrcStrategy && (
                      <div className="p-4 rounded-md border bg-muted/30" data-testid="strategy-vrc">
                        <h3 className="text-sm font-medium mb-2">Ventilation avec récupération de chaleur (VRC)</h3>
                        <p className="text-sm">
                          Installation de systèmes de ventilation avec récupération de chaleur (VRC) dans chaque logement, présentant une efficacité de récupération de chaleur sensible d'environ{" "}
                          <span className="font-semibold">{post.centralVentilation?.sensibleEfficiency0C ?? "—"} %</span> à 0 °C et{" "}
                          <span className="font-semibold">{post.centralVentilation?.sensibleEfficiencyMinus25C ?? "—"} %</span> à -25 °C, afin d'améliorer la qualité de l'air intérieur tout en réduisant les pertes de chaleur liées au renouvellement de l'air.
                        </p>
                      </div>
                    )}

                    {showGasConversionStrategy && (
                      <div className="p-4 rounded-md border bg-muted/30" data-testid="strategy-gas-conversion">
                        <h3 className="text-sm font-medium mb-2">Conversion {getPreFossilFuelLabel(pre)} vers Électricité</h3>
                        <div className="space-y-3">
                          {gasConversionOptions.option1 && (
                            <div className="relative group">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                                onClick={() => setGasConversionOptions(prev => ({ ...prev, option1: false }))}
                                data-testid="button-remove-gas-option1"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              {gasConversionOptions.option2 && <p className="text-sm font-medium mb-1">Option 1 :</p>}
                              <p className="text-sm">
                                {isFossilFuel(pre.hotWater?.primaryType) && !isFossilFuel(post.hotWater?.primaryType) && (
                                  <>Le système actuel de production d'eau chaude domestique au {pre.hotWater?.primaryType?.toLowerCase()} sera converti à l'électricité. Un chauffe-eau électrique indépendant sera installé dans chaque unité afin d'assurer une production d'eau chaude autonome et plus efficace.</>
                                )}
                              </p>
                            </div>
                          )}
                          {gasConversionOptions.option2 && (
                            <div className="relative group">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                                onClick={() => setGasConversionOptions(prev => ({ ...prev, option2: false }))}
                                data-testid="button-remove-gas-option2"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              {gasConversionOptions.option1 && <p className="text-sm font-medium mb-1">Option 2 :</p>}
                              <p className="text-sm">
                                Remplacement de la chaudière au {pre.heating?.primaryType?.toLowerCase() || "combustible fossile"} existante par une chaudière électrique, permettant d'éliminer l'utilisation de combustibles fossiles et de réduire les émissions de gaz à effet de serre, tout en assurant le chauffage du bâtiment à partir d'une source d'énergie électrique.
                              </p>
                            </div>
                          )}
                          {(!gasConversionOptions.option1 || !gasConversionOptions.option2) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="print:hidden"
                              onClick={() => setGasConversionOptions({ option1: true, option2: true })}
                              data-testid="button-restore-gas-options"
                            >
                              Restaurer les options
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <Separator />
              </>
            )}

            <section>
              <h2 className="text-base font-semibold mb-4">
                {hasAnyStrategy ? "5" : "4"}. Comparatif global en GJ/année
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Poste</TableHead>
                    <TableHead className="text-xs text-right">Avant (GJ)</TableHead>
                    <TableHead className="text-xs text-right">Après (GJ)</TableHead>
                    <TableHead className="text-xs text-right">Réduction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs">Chauffage des locaux</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.heatingBefore ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.heatingAfter ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">
                      {(comparison.heatingBefore ?? 0) > 0
                        ? ((1 - (comparison.heatingAfter ?? 0) / comparison.heatingBefore) * 100).toFixed(1)
                        : "0.0"}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Eau chaude domestique</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.hotWaterBefore ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.hotWaterAfter ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">
                      {(comparison.hotWaterBefore ?? 0) > 0
                        ? ((1 - (comparison.hotWaterAfter ?? 0) / comparison.hotWaterBefore) * 100).toFixed(1)
                        : "0.0"}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Charges électriques de base</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.baseLoadsBefore ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.baseLoadsAfter ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">
                      {(comparison.baseLoadsBefore ?? 0) > 0
                        ? ((1 - (comparison.baseLoadsAfter ?? 0) / comparison.baseLoadsBefore) * 100).toFixed(1)
                        : "0.0"}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Électricité pour ventilation</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.ventilationBefore ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.ventilationAfter ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">
                      {(comparison.ventilationBefore ?? 0) > 0
                        ? ((1 - (comparison.ventilationAfter ?? 0) / comparison.ventilationBefore) * 100).toFixed(1)
                        : "0.0"}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Climatisation des locaux</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.coolingBefore ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.coolingAfter ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">
                      {(comparison.coolingBefore ?? 0) > 0
                        ? ((1 - (comparison.coolingAfter ?? 0) / comparison.coolingBefore) * 100).toFixed(1)
                        : "0.0"}%
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-semibold border-t-2">
                    <TableCell className="text-xs">Depenses annuelles TOTALES</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.totalBefore ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.totalAfter ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">
                      <Badge variant="default">{(comparison.improvementPercent ?? 0).toFixed(1)}%</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </section>

            <Separator />

            <section>
              <h2 className="text-base font-semibold mb-4">
                {hasAnyStrategy ? "6" : "5"}. GES (Gaz à effet de serre)
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Indicateur</TableHead>
                    <TableHead className="text-xs text-right">Avant (T/A)</TableHead>
                    <TableHead className="text-xs text-right">Après (T/A)</TableHead>
                    <TableHead className="text-xs text-right">Amélioration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs">GES Électricité</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.ghsElectricityBefore ?? 0).toFixed(5)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.ghsElectricityAfter ?? 0).toFixed(5)}</TableCell>
                    <TableCell className="text-xs text-right">
                    </TableCell>
                  </TableRow>
                  {((comparison.ghsGasBefore ?? 0) > 0 || (comparison.ghsGasAfter ?? 0) > 0) && (
                    <TableRow>
                      <TableCell className="text-xs">GES {getPreFossilFuelLabel(pre)}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{(comparison.ghsGasBefore ?? 0).toFixed(5)}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{(comparison.ghsGasAfter ?? 0).toFixed(5)}</TableCell>
                      <TableCell className="text-xs text-right">
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="font-semibold">
                    <TableCell className="text-xs">GES TOTAL</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.ghsBefore ?? 0).toFixed(5)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(comparison.ghsAfter ?? 0).toFixed(5)}</TableCell>
                    <TableCell className="text-xs text-right">
                      <Badge variant="default">{(comparison.ghsImprovementPercent ?? 0).toFixed(1)}%</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </section>

            <Separator />

            <section>
              <h2 className="text-base font-semibold mb-4">
                {hasAnyStrategy ? "7" : "6"}. Approbation
              </h2>
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
                    <TableCell className="text-xs">Consommation d'énergie annuelle totale (GJ/A)</TableCell>
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

            <Separator />

            <section>
              <h2 className="text-base font-semibold mb-6" data-testid="text-annexes-title">
                {hasAnyStrategy ? "8" : "7"}. Annexes
              </h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold mb-2">1. Zone climatique</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    Données climatiques: {pre.buildingInfo?.climateData || "-"}
                  </p>
                  <AnnexImageUpload
                    projectId={project.id}
                    annexType="climateZone"
                    label="Zone climatique"
                    currentImage={project.annexClimateZoneImage}
                  />
                </div>

                {(() => {
                  let annexNum = 2;
                  return (
                    <>
                      {showHeatingStrategy && (
                        <div>
                          <h3 className="text-sm font-semibold mb-2">{annexNum++}. Thermopompes</h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            Ajout de {thermopompeCount} Thermopompes d'au moins 12 000 btu, 10 HSPF2 et 23 SEER2.
                          </p>
                          <AnnexImageUpload
                            projectId={project.id}
                            annexType="thermopompes"
                            label="Thermopompes"
                            currentImage={project.annexThermopompesImage}
                          />
                        </div>
                      )}

                      {showHotWaterStrategy && (
                        <div>
                          <h3 className="text-sm font-semibold mb-2">
                            {annexNum++}. Robinetterie faible débit
                          </h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            Installation de pommeaux de douches et robinets faible débit (réduction charge eau chaude domestique).
                          </p>
                          <AnnexImageUpload
                            projectId={project.id}
                            annexType="robineterie"
                            label="Robinetterie faible débit"
                            currentImage={project.annexRobineterieImage}
                          />
                        </div>
                      )}


                      {showVrcStrategy && (
                        <div>
                          <h3 className="text-sm font-semibold mb-2">
                            {annexNum++}. Ventilation avec récupération de chaleur (VRC)
                          </h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            Installation de systèmes de ventilation avec récupération de chaleur (VRC).
                          </p>
                          <AnnexImageUpload
                            projectId={project.id}
                            annexType="vrc"
                            label="VRC"
                            currentImage={project.annexVrcImage}
                          />
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
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
