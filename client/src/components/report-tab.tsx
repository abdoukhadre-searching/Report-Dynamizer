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
import { FileText, Printer, Upload, Loader2, ImageIcon } from "lucide-react";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";
import buildingCoverPath from "@assets/building-sketch-cover.png";
import cmhcLogoPath from "@assets/1689212055229_1772954865707.jpg";
import aphSelectBannerPath from "@assets/large_aph_select_1772954873435.png";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

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
      toast({ title: "Image ajoutée avec succès" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="mt-3">
      {currentImage ? (
        <div className="space-y-2 flex flex-col items-center">
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

function getNumUnitsFromOccupants(occupants?: string): number {
  const count = getOccupantCount(occupants);
  return count > 0 ? Math.ceil(count / 2) : 0;
}

function getWindowFraction(pre: ReportData): string {
  if (pre.buildingInfo?.windowFraction) return pre.buildingInfo.windowFraction;
  const zone1 = pre.zone1;
  if (!zone1) return "N/A";
  const wallGross = zone1.find(z => z.element.toLowerCase().includes("murs principaux"))?.grossArea ?? 0;
  const windowAreas = zone1.filter(z => z.element.toLowerCase().includes("fenêtres") || z.element.toLowerCase().includes("fenetres"));
  const totalWindowArea = windowAreas.reduce((sum, w) => sum + (w.grossArea ?? 0), 0);
  if (wallGross > 0 && totalWindowArea > 0) {
    return ((totalWindowArea / (wallGross + totalWindowArea)) * 100).toFixed(1) + " %";
  }
  return "N/A";
}

const CATEGORY_COLORS: Record<string, string> = {
  "Chauffage": "hsl(var(--chart-1))",
  "Eau chaude": "hsl(var(--chart-2))",
  "Charges de base": "hsl(var(--chart-3))",
  "Ventilation": "hsl(var(--chart-4))",
  "Climatisation": "hsl(var(--chart-5))",
};

export default function ReportTab({ project }: ReportTabProps) {
  const pre = project.preReportData as ReportData | null;
  const post = project.postReportData as ReportData | null;
  const comparison = project.comparisonData as ComparisonData | null;

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
  const showHeatPumpWaterHeaterStrategy = !!(post.hotWater?.equipmentType && /thermopompe/i.test(post.hotWater.equipmentType));
  const thermopompeCount = getThermopompeCount(pre.buildingInfo?.occupants);
  const numUnits = getNumUnitsFromOccupants(pre.buildingInfo?.occupants);

  const address = project.address || pre.buildingInfo?.address || "N/A";
  const city = project.city || pre.buildingInfo?.city || "N/A";
  const province = project.province || pre.buildingInfo?.province || "N/A";
  const postalCode = project.postalCode || pre.buildingInfo?.postalCode || "";
  const fullAddress = `${address}, ${city} (${province}) ${postalCode}`.trim();

  const totalBeforeGJ = comparison.totalBefore ?? 0;
  const totalAfterGJ = comparison.totalAfter ?? 0;
  const improvementPct = comparison.improvementPercent ?? 0;
  const ghsBefore = comparison.ghsBefore ?? 0;
  const ghsAfter = comparison.ghsAfter ?? 0;
  const ghsImprovementPct = comparison.ghsImprovementPercent ?? 0;

  const heatingBeforeGJ = comparison.heatingBefore ?? 0;
  const hotWaterBeforeGJ = comparison.hotWaterBefore ?? 0;
  const baseLoadsBeforeGJ = comparison.baseLoadsBefore ?? 0;
  const ventilationBeforeGJ = comparison.ventilationBefore ?? 0;
  const coolingBeforeGJ = comparison.coolingBefore ?? 0;

  const heatingAfterGJ = comparison.heatingAfter ?? 0;
  const hotWaterAfterGJ = comparison.hotWaterAfter ?? 0;
  const baseLoadsAfterGJ = comparison.baseLoadsAfter ?? 0;
  const ventilationAfterGJ = comparison.ventilationAfter ?? 0;
  const coolingAfterGJ = comparison.coolingAfter ?? 0;

  const prePieData = [
    { name: "Chauffage", value: parseFloat(heatingBeforeGJ.toFixed(2)) },
    { name: "Eau chaude", value: parseFloat(hotWaterBeforeGJ.toFixed(2)) },
    { name: "Charges de base", value: parseFloat(baseLoadsBeforeGJ.toFixed(2)) },
    { name: "Ventilation", value: parseFloat(ventilationBeforeGJ.toFixed(2)) },
    { name: "Climatisation", value: parseFloat(coolingBeforeGJ.toFixed(2)) },
  ].filter(d => d.value > 0);

  const postPieData = [
    { name: "Chauffage", value: parseFloat(heatingAfterGJ.toFixed(2)) },
    { name: "Eau chaude", value: parseFloat(hotWaterAfterGJ.toFixed(2)) },
    { name: "Charges de base", value: parseFloat(baseLoadsAfterGJ.toFixed(2)) },
    { name: "Ventilation", value: parseFloat(ventilationAfterGJ.toFixed(2)) },
    { name: "Climatisation", value: parseFloat(coolingAfterGJ.toFixed(2)) },
  ].filter(d => d.value > 0);

  const comparisonBarData = [
    { name: "Chauffage", avant: parseFloat(heatingBeforeGJ.toFixed(2)), apres: parseFloat(heatingAfterGJ.toFixed(2)) },
    { name: "Eau chaude", avant: parseFloat(hotWaterBeforeGJ.toFixed(2)), apres: parseFloat(hotWaterAfterGJ.toFixed(2)) },
    { name: "Charges de base", avant: parseFloat(baseLoadsBeforeGJ.toFixed(2)), apres: parseFloat(baseLoadsAfterGJ.toFixed(2)) },
    { name: "Ventilation", avant: parseFloat(ventilationBeforeGJ.toFixed(2)), apres: parseFloat(ventilationAfterGJ.toFixed(2)) },
    { name: "Climatisation", avant: parseFloat(coolingBeforeGJ.toFixed(2)), apres: parseFloat(coolingAfterGJ.toFixed(2)) },
  ];

  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Août", "Sep", "Oct", "Nov", "Déc"];
  const monthlyChartData = months.map((m, idx) => {
    const preMonth = pre.monthlyEnergy?.[idx];
    const postMonth = post.monthlyEnergy?.[idx];
    const preTotal = preMonth
      ? (preMonth.heatingPrimary ?? 0) + (preMonth.heatingSecondary ?? 0) + (preMonth.hotWaterPrimary ?? 0) + (preMonth.hotWaterSecondary ?? 0) + (preMonth.lightingAppliances ?? 0) + (preMonth.ventilation ?? 0) + (preMonth.cooling ?? 0)
      : 0;
    const postTotal = postMonth
      ? (postMonth.heatingPrimary ?? 0) + (postMonth.heatingSecondary ?? 0) + (postMonth.hotWaterPrimary ?? 0) + (postMonth.hotWaterSecondary ?? 0) + (postMonth.lightingAppliances ?? 0) + (postMonth.ventilation ?? 0) + (postMonth.cooling ?? 0)
      : 0;
    return { month: m, avant: parseFloat((preTotal / 1000).toFixed(2)), apres: parseFloat((postTotal / 1000).toFixed(2)) };
  });

  const strategies: string[] = [];
  if (showHeatingStrategy) strategies.push("l'installation de thermopompes haute efficacité");
  if (showAirTightnessStrategy) strategies.push("l'amélioration de l'étanchéité du bâtiment");
  if (showHotWaterStrategy) strategies.push("la réduction de la consommation d'eau chaude domestique");
  if (showLedStrategy) strategies.push("la conversion de l'éclairage vers la technologie DEL (LED)");
  if (showVrcStrategy) strategies.push("l'installation de systèmes de ventilation avec récupération de chaleur (VRC)");
  if (showGasConversionStrategy) strategies.push(`la conversion du ${getPreFossilFuelLabel(pre).toLowerCase()} vers l'électricité`);
  if (showHeatPumpWaterHeaterStrategy) strategies.push("l'installation de chauffe-eaux thermopompe");

  const preHeatingEquipment = pre.heating?.primaryEquipment || "plinthes électriques";
  const windowFraction = getWindowFraction(pre);

  const heatLossComponents = (() => {
    const items: { name: string; avant: number; apres: number }[] = [];
    const preZ1 = pre.zone1 || [];
    const postZ1 = post.zone1 || [];
    const preZ3 = pre.zone3 || [];
    const postZ3 = post.zone3 || [];
    const elementNames = new Set([...preZ1.map(z => z.element), ...postZ1.map(z => z.element)]);
    elementNames.forEach(name => {
      const preItem = preZ1.find(z => z.element === name);
      const postItem = postZ1.find(z => z.element === name);
      if ((preItem?.heatLossMJ ?? 0) > 0 || (postItem?.heatLossMJ ?? 0) > 0) {
        items.push({ name, avant: parseFloat(((preItem?.heatLossMJ ?? 0) / 1000).toFixed(2)), apres: parseFloat(((postItem?.heatLossMJ ?? 0) / 1000).toFixed(2)) });
      }
    });
    const z3Names = new Set([...preZ3.map(z => z.element), ...postZ3.map(z => z.element)]);
    z3Names.forEach(name => {
      const preItem = preZ3.find(z => z.element === name);
      const postItem = postZ3.find(z => z.element === name);
      if ((preItem?.heatLossMJ ?? 0) > 0 || (postItem?.heatLossMJ ?? 0) > 0) {
        items.push({ name: `${name} (Fond.)`, avant: parseFloat(((preItem?.heatLossMJ ?? 0) / 1000).toFixed(2)), apres: parseFloat(((postItem?.heatLossMJ ?? 0) / 1000).toFixed(2)) });
      }
    });
    const preVent = pre.ventilation?.heatLossMJ ?? 0;
    const postVent = post.ventilation?.heatLossMJ ?? 0;
    if (preVent > 0 || postVent > 0) {
      items.push({ name: "Ventilation", avant: parseFloat((preVent / 1000).toFixed(2)), apres: parseFloat((postVent / 1000).toFixed(2)) });
    }
    return items;
  })();

  const tocItems = [
    "Résumé exécutif",
    "Description du bâtiment",
    "Profil de consommation énergétique actuel",
    "Stratégie d'optimisation énergétique",
    "Performance énergétique après optimisation",
    "Comparatif énergétique",
    "Conclusion",
    "Annexes",
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 mb-4 print:hidden">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-medium">Cahier de qualification APH SELECT</h2>
        </div>
        <Button variant="secondary" size="sm" onClick={handlePrint} data-testid="button-print">
          <Printer className="w-4 h-4 mr-2" />
          Imprimer / PDF
        </Button>
      </div>

      <div className="print:p-0" id="report-content">
        {/* ── COVER PAGE ── */}
        <Card className="print:shadow-none print:border-none overflow-hidden cover-page-card">
          <CardContent className="p-0 report-prose">
            <div className="flex" style={{ height: '100vh', maxHeight: '1056px', minHeight: '750px' }}>
              <div className="w-3 flex-shrink-0" style={{ background: 'linear-gradient(to bottom, #0d5257, #0a7b72, #0d5257)' }} />

              <div className="flex-1 flex flex-col justify-between">
                <div className="px-10 pt-10">
                  <div className="flex items-start justify-between mb-8">
                    <img
                      src={cmhcLogoPath}
                      alt="CMHC / SCHL"
                      className="h-14 w-auto object-contain"
                      data-testid="img-cmhc-logo"
                    />
                    <p className="text-5xl font-bold flex-shrink-0 ml-6" style={{ fontFamily: "'Playfair Display', serif", color: '#0d5257' }}>{new Date().getFullYear()}</p>
                  </div>

                  <h1 className="text-3xl font-bold leading-tight mb-5" style={{ fontFamily: "'Playfair Display', serif", color: '#0d5257' }} data-testid="text-report-title">
                    Cahier préparatoire pour la qualification<br />au programme APH SELECT
                  </h1>
                  <p className="text-lg font-medium mt-3" style={{ fontFamily: "'Inter', sans-serif", color: '#334155' }}>{fullAddress}</p>
                </div>

                <div className="px-10 py-6 flex items-center justify-center">
                  <div className="w-full overflow-hidden rounded-lg shadow-xl" style={{ border: '2px solid #0d5257' }}>
                    <img
                      src={aphSelectBannerPath}
                      alt="APH SELECT — Pour immeubles collectifs"
                      className="w-full h-auto object-cover"
                      data-testid="img-aph-select-banner"
                    />
                  </div>
                </div>

                <div className="px-10 pt-4 pb-2">
                  <p className="text-base italic text-center leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: '#334155' }}>
                    Évaluation réalisée par la firme d'évaluation en efficacité{'\u00A0'}énergétique<br />
                    <span className="font-semibold not-italic" style={{ color: '#0d5257' }}>Marc-André Boucher</span>
                  </p>
                </div>

                <div className="px-10 pb-8 mt-auto">
                  <div className="flex items-end justify-between pt-5" style={{ borderTop: '3px solid #0d5257' }}>
                    <img
                      src={mabLogoPath}
                      alt="MAB - Marc André Boucher, Conseils Immobiliers"
                      className="h-18 w-auto object-contain"
                      data-testid="img-company-logo"
                    />
                    <div className="text-right text-xs text-slate-500" style={{ fontFamily: "'Inter', sans-serif" }}>
                      <p className="font-semibold" style={{ color: '#0d5257' }}>9433-6450 QC INC.</p>
                      <p className="mt-1">{new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── RESUME EXECUTIF (Card 2 with cover page) ── */}
        <Card className="print:shadow-none print:border-none print:break-before-page mt-6">
          <CardContent className="p-8 space-y-8 report-prose relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.03] z-0 print:opacity-[0.04]" aria-hidden="true">
              <p className="text-[120px] font-bold tracking-widest text-slate-900 rotate-[-30deg] whitespace-nowrap" style={{ fontFamily: "'Playfair Display', serif" }}>
                APH SELECT
              </p>
            </div>

            <div className="relative z-10 flex items-center justify-between pb-3 mb-2" style={{ borderBottom: '2px solid #0d5257' }}>
              <img src={mabLogoPath} alt="MAB" className="h-10 w-auto object-contain opacity-80" />
              <p className="text-xs text-slate-400 tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>Cahier de qualification — APH SELECT</p>
            </div>

            <section id="toc-resume" className="relative z-10">
              <h2 className="text-base font-semibold mb-4" data-testid="text-section-resume">
                1. Résumé exécutif
              </h2>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  Le présent rapport présente l'analyse de performance énergétique du bâtiment résidentiel situé au {fullAddress}.
                  {numUnits > 0 && <> L'immeuble comprend {numUnits} unités résidentielles{pre.buildingInfo?.numFloors ? ` réparties sur ${pre.buildingInfo.numFloors.toLowerCase()}` : ""}.</>}
                </p>
                <p>
                  Une modélisation énergétique du bâtiment a été réalisée à l'aide du logiciel Hot2000 afin d'évaluer la consommation énergétique actuelle de l'immeuble et d'identifier des mesures permettant d'améliorer son efficacité énergétique.
                </p>
                <p>
                  Les résultats de la simulation démontrent qu'en appliquant les mesures d'amélioration proposées, la consommation énergétique annuelle du bâtiment pourrait être réduite de <span className="font-semibold">{totalBeforeGJ.toFixed(2)} GJ</span> par année à <span className="font-semibold">{totalAfterGJ.toFixed(2)} GJ</span> par année, soit une amélioration énergétique globale d'environ <span className="font-semibold">{improvementPct.toFixed(1)} %</span>.
                </p>
                {strategies.length > 0 && (
                  <>
                    <p>Cette amélioration est principalement attribuable :</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                      {strategies.map((s, i) => (
                        <li key={i}>à {s}</li>
                      ))}
                    </ul>
                  </>
                )}
                <p>
                  Ces mesures permettent également de réduire les émissions annuelles de gaz à effet de serre, qui passeraient de <span className="font-semibold">{ghsBefore.toFixed(3)} tonne</span> de CO₂ par année à <span className="font-semibold">{ghsAfter.toFixed(3)} tonne</span>, soit également une réduction d'environ <span className="font-semibold">{ghsImprovementPct.toFixed(1)} %</span>.
                </p>
                <p>
                  L'ensemble des interventions proposées permet ainsi d'améliorer significativement la performance énergétique du bâtiment tout en contribuant à réduire ses coûts d'exploitation et son empreinte environnementale.
                </p>
              </div>
            </section>

          </CardContent>
        </Card>

        <Card className="print:shadow-none print:border-none print:break-before-page mt-6">
          <CardContent className="p-8 report-prose relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.03] z-0 print:opacity-[0.04]" aria-hidden="true">
              <p className="text-[120px] font-bold tracking-widest text-slate-900 rotate-[-30deg] whitespace-nowrap" style={{ fontFamily: "'Playfair Display', serif" }}>
                APH SELECT
              </p>
            </div>
            <div className="relative z-10 flex items-center justify-between pb-3 mb-6" style={{ borderBottom: '2px solid #0d5257' }}>
              <img src={mabLogoPath} alt="MAB" className="h-10 w-auto object-contain opacity-80" />
              <p className="text-xs text-slate-400 tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>Cahier de qualification — APH SELECT</p>
            </div>
            <section className="relative z-10">
              <h2 className="text-base font-semibold mb-6">Table des matières</h2>
              <nav className="space-y-2 text-sm">
                {tocItems.map((item, idx) => {
                  const ids = ["toc-resume", "toc-description", "toc-profil", "toc-strategies", "toc-performance", "toc-comparatif", "toc-conclusion", "toc-annexes"];
                  return (
                    <a
                      key={idx}
                      href={`#${ids[idx]}`}
                      className="flex items-center gap-3 py-2 px-3 rounded-md text-primary hover:bg-primary/5 hover:underline cursor-pointer transition-colors print:text-foreground print:underline print:px-0 print:hover:bg-transparent"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(ids[idx])?.scrollIntoView({ behavior: "smooth" });
                        window.location.hash = ids[idx];
                      }}
                      data-testid={`link-toc-${idx}`}
                    >
                      <span className="font-semibold min-w-[1.5rem]">{idx + 1}.</span>
                      <span>{item}</span>
                    </a>
                  );
                })}
              </nav>
            </section>
          </CardContent>
        </Card>

        <Card className="print:shadow-none print:border-none print:break-before-page mt-6">
          <CardContent className="p-8 space-y-8 report-prose relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.03] z-0 print:opacity-[0.04]" aria-hidden="true">
              <p className="text-[120px] font-bold tracking-widest text-slate-900 rotate-[-30deg] whitespace-nowrap" style={{ fontFamily: "'Playfair Display', serif" }}>
                APH SELECT
              </p>
            </div>

            <div className="relative z-10 flex items-center justify-between pb-3 mb-6" style={{ borderBottom: '2px solid #0d5257' }}>
              <img src={mabLogoPath} alt="MAB" className="h-10 w-auto object-contain opacity-80" />
              <p className="text-xs text-slate-400 tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>Cahier de qualification — APH SELECT</p>
            </div>

            <section id="toc-description" className="relative z-10">
              <h2 className="text-base font-semibold mb-4" data-testid="text-section-description">
                2. Description du bâtiment
              </h2>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  Le bâtiment analysé est un immeuble résidentiel situé au {fullAddress}
                  {numUnits > 0 && <>, comprenant {numUnits} logements locatifs</>}.
                </p>
                {pre.buildingInfo?.yearBuilt && (
                  <p>
                    Construit en {pre.buildingInfo.yearBuilt}, il s'agit d'un bâtiment typique du parc immobilier montréalais. La façade principale du bâtiment est illustrée ci-dessous par une photographie prise lors de la visite d'inspection.
                  </p>
                )}

                <AnnexImageUpload
                  projectId={project.id}
                  annexType="climateZone"
                  label="Photo du bâtiment"
                  currentImage={project.annexClimateZoneImage}
                />

                <p>
                  Le bâtiment possède un toit plat et des murs extérieurs présentant une isolation limitée selon les standards actuels. Les fenêtres sont de type coulissant à double vitrage avec cadre en aluminium.
                </p>
                <p>
                  L'analyse énergétique indique un taux de changement d'air de <span className="font-semibold">{pre.airLeakage?.cah50 ?? "N/A"} CAH</span> à 50 Pa, ce qui témoigne d'un niveau relativement élevé d'infiltration d'air et contribue aux pertes thermiques du bâtiment.
                </p>
                <p>
                  Le système de chauffage des logements est assuré par <span className="font-semibold">{preHeatingEquipment.toLowerCase()}</span>, tandis que la production d'eau chaude domestique est réalisée par des chauffe-eau{pre.hotWater?.primaryType ? ` ${pre.hotWater.primaryType.toLowerCase() === "électricité" ? "électriques" : `au ${pre.hotWater.primaryType.toLowerCase()}`}` : ""}.
                </p>
                <p>
                  La fraction de la surface des murs hors-terre occupée par les fenêtres est estimée à environ <span className="font-semibold">{windowFraction}</span>, ce qui influence également les pertes thermiques de l'enveloppe du bâtiment.
                </p>
                <p>
                  Ces caractéristiques sont représentatives des bâtiments construits avant l'introduction des normes modernes d'efficacité énergétique, ce qui explique le potentiel important d'amélioration énergétique.
                </p>
              </div>
            </section>

            <Separator className="relative z-10" />

            <section id="toc-profil" className="relative z-10">
              <h2 className="text-base font-semibold mb-4" data-testid="text-section-profil">
                3. Profil de consommation énergétique actuel
              </h2>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  La consommation énergétique annuelle totale du bâtiment est estimée à <span className="font-semibold">{totalBeforeGJ.toFixed(2)} GJ</span> par année.
                </p>
                <p>
                  L'analyse de la répartition de cette consommation énergétique démontre que la plus grande portion de l'énergie est utilisée pour le chauffage des locaux, qui représente environ <span className="font-semibold">{heatingBeforeGJ.toFixed(0)} GJ</span> par année{totalBeforeGJ > 0 ? <>, soit près de {((heatingBeforeGJ / totalBeforeGJ) * 100).toFixed(0)} % de la consommation énergétique totale du bâtiment</> : ""}.
                </p>
                <p>
                  La deuxième source de consommation énergétique est associée aux charges électriques de base, incluant l'éclairage et les appareils utilisés par les occupants. Cette catégorie représente environ <span className="font-semibold">{baseLoadsBeforeGJ.toFixed(0)} GJ</span> par année.
                </p>
                <p>
                  La production d'eau chaude domestique représente quant à elle environ <span className="font-semibold">{hotWaterBeforeGJ.toFixed(0)} GJ</span> par année.
                </p>
                <p>
                  Les systèmes de ventilation et de climatisation représentent une portion plus faible de la consommation énergétique globale du bâtiment.
                </p>
                <p>
                  Cette répartition démontre que les stratégies visant à améliorer l'efficacité du système de chauffage et à réduire les pertes thermiques du bâtiment constituent les interventions les plus efficaces pour diminuer la consommation énergétique globale.
                </p>

                <div className="my-6">
                  <p className="text-xs text-center text-muted-foreground mb-2 italic">Répartition de la consommation énergétique avant travaux (GJ/an)</p>
                  <div className="flex justify-center">
                    <div className="h-[280px] w-full max-w-[500px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={prePieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value} GJ`}>
                            {prePieData.map((entry, idx) => (
                              <Cell key={idx} fill={CATEGORY_COLORS[entry.name] || "hsl(var(--chart-1))"} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `${value} GJ`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="relative z-10" />

            <section id="toc-strategies" className="relative z-10">
              <h2 className="text-base font-semibold mb-4" data-testid="text-section-strategies">
                4. Stratégie d'optimisation énergétique
              </h2>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  À la suite de l'analyse énergétique et des relevés effectués sur le bâtiment, plusieurs mesures d'amélioration énergétique ont été identifiées afin d'optimiser la performance énergétique de l'immeuble.
                </p>
                <p>
                  Ces mesures ont été sélectionnées en fonction de leur impact énergétique, de leur faisabilité technique et de leur capacité à réduire la consommation énergétique globale du bâtiment.
                </p>

                {showAirTightnessStrategy && (
                  <div className="mt-4" data-testid="strategy-air-tightness">
                    <h3 className="text-sm font-semibold mb-2">Amélioration de l'étanchéité du bâtiment</h3>
                    <p>
                      Une amélioration de l'étanchéité de l'enveloppe du bâtiment est recommandée afin de réduire les infiltrations d'air et les pertes thermiques.
                    </p>
                    <p className="mt-1">
                      L'objectif est de réduire le taux de changement d'air à environ <span className="font-semibold">{post.airLeakage?.cah50 ?? "N/A"} CAH</span> à 50 Pa, ce qui permettrait d'améliorer l'efficacité du système de chauffage et de réduire les pertes énergétiques associées à l'infiltration d'air.
                    </p>
                  </div>
                )}

                {showHeatingStrategy && (
                  <div className="mt-4" data-testid="strategy-thermopompe">
                    <h3 className="text-sm font-semibold mb-2">Installation de thermopompes haute efficacité</h3>
                    <p>
                      L'installation de <span className="font-semibold">{thermopompeCount}</span> thermopompes murales haute efficacité est proposée afin d'améliorer la performance énergétique du système de chauffage et de climatisation.
                    </p>
                    <p className="mt-1">
                      Les thermopompes recommandées possèdent une capacité minimale de 12 000 BTU, avec une efficacité d'environ 10 HSPF2 et 23 SEER2.
                    </p>
                    <p className="mt-1">
                      Ces équipements permettent de produire plus d'énergie thermique qu'ils n'en consomment, ce qui contribue à réduire la consommation énergétique associée au chauffage des logements.
                    </p>
                  </div>
                )}

                {showHotWaterStrategy && (
                  <div className="mt-4" data-testid="strategy-hot-water">
                    <h3 className="text-sm font-semibold mb-2">Réduction de la consommation d'eau chaude domestique</h3>
                    <p>
                      L'installation de pommeaux de douche et de robinets à faible débit est recommandée afin de réduire la consommation d'eau chaude domestique.
                    </p>
                    <p className="mt-1">
                      Cette mesure permet de diminuer la quantité d'énergie nécessaire pour chauffer l'eau utilisée dans les logements tout en maintenant un niveau de confort adéquat pour les occupants.
                    </p>
                  </div>
                )}

                {showLedStrategy && (
                  <div className="mt-4" data-testid="strategy-led">
                    <h3 className="text-sm font-semibold mb-2">Conversion de l'éclairage vers la technologie DEL</h3>
                    <p>
                      La conversion d'au moins 75 % de l'éclairage du bâtiment vers des luminaires DEL est également recommandée.
                    </p>
                    <p className="mt-1">
                      Les luminaires DEL consomment significativement moins d'énergie que les ampoules traditionnelles et contribuent à réduire la consommation électrique associée aux charges de base du bâtiment.
                    </p>
                  </div>
                )}

                {showVrcStrategy && (
                  <div className="mt-4" data-testid="strategy-vrc">
                    <h3 className="text-sm font-semibold mb-2">Ventilation avec récupération de chaleur (VRC)</h3>
                    <p>
                      L'installation de systèmes de ventilation avec récupération de chaleur (VRC) est recommandée, présentant une efficacité de récupération de chaleur sensible d'environ <span className="font-semibold">{post.centralVentilation?.sensibleEfficiency0C ?? "—"} %</span> à 0 °C et <span className="font-semibold">{post.centralVentilation?.sensibleEfficiencyMinus25C ?? "—"} %</span> à -25 °C, afin d'améliorer la qualité de l'air intérieur tout en réduisant les pertes de chaleur liées au renouvellement de l'air.
                    </p>
                  </div>
                )}

                {showHeatPumpWaterHeaterStrategy && (
                  <div className="mt-4" data-testid="strategy-heat-pump-water-heater">
                    <h3 className="text-sm font-semibold mb-2">Chauffe-eaux Thermopompe</h3>
                    <p>
                      L'installation de <span className="font-semibold">{thermopompeCount}</span> chauffe-eaux thermopompe {post.hotWater?.manufacturer || ""} {post.hotWater?.model || ""} est recommandée afin d'améliorer l'efficacité de la production d'eau chaude domestique.
                    </p>
                  </div>
                )}

                {showGasConversionStrategy && (
                  <div className="mt-4" data-testid="strategy-gas-conversion">
                    <h3 className="text-sm font-semibold mb-2">Conversion {getPreFossilFuelLabel(pre)} vers Électricité</h3>
                    {isFossilFuel(pre.hotWater?.primaryType) && !isFossilFuel(post.hotWater?.primaryType) && (
                      <p>
                        Le système actuel de production d'eau chaude domestique au {pre.hotWater?.primaryType?.toLowerCase()} sera converti à l'électricité. Un chauffe-eau électrique indépendant sera installé dans chaque unité afin d'assurer une production d'eau chaude autonome et plus efficace.
                      </p>
                    )}
                    {isFossilFuel(pre.heating?.primaryType) && !isFossilFuel(post.heating?.primaryType) && (
                      <p className="mt-1">
                        Remplacement de la chaudière au {pre.heating?.primaryType?.toLowerCase() || "combustible fossile"} existante par un système électrique, permettant d'éliminer l'utilisation de combustibles fossiles et de réduire les émissions de gaz à effet de serre.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            <Separator className="relative z-10" />

            <section id="toc-performance" className="relative z-10">
              <h2 className="text-base font-semibold mb-4" data-testid="text-section-performance">
                5. Performance énergétique après optimisation
              </h2>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  La modélisation énergétique réalisée avec l'ensemble des mesures proposées démontre une amélioration significative de la performance énergétique du bâtiment.
                </p>
                <p>
                  Après l'implantation des mesures recommandées, la consommation énergétique annuelle totale du bâtiment passerait de :
                </p>
                <p className="text-center font-semibold text-base my-2">
                  {totalBeforeGJ.toFixed(2)} GJ/an → {totalAfterGJ.toFixed(2)} GJ/an
                </p>
                <p>
                  ce qui correspond à une amélioration énergétique globale d'environ <span className="font-semibold">{improvementPct.toFixed(1)} %</span>.
                </p>
                <p>
                  La réduction la plus importante est observée au niveau du chauffage des locaux, principalement grâce à l'installation de thermopompes et à l'amélioration de l'étanchéité du bâtiment.
                </p>
                <p>
                  La consommation énergétique liée à la climatisation diminue également, tandis que les charges de base et la consommation d'eau chaude domestique sont légèrement réduites grâce aux mesures d'efficacité énergétique mises en place.
                </p>

                <div className="my-6">
                  <p className="text-xs text-center text-muted-foreground mb-2 italic">Comparatif énergétique Avant / Après travaux (GJ/an)</p>
                  <div className="flex justify-center">
                    <div className="h-[300px] w-full max-w-[600px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonBarData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(value: number) => `${value} GJ`} />
                          <Legend />
                          <Bar dataKey="avant" name="Avant travaux" fill="hsl(var(--chart-1))" />
                          <Bar dataKey="apres" name="Après travaux" fill="hsl(var(--chart-4))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="my-6">
                  <p className="text-xs text-center text-muted-foreground mb-2 italic">Répartition de la consommation énergétique après travaux (GJ/an)</p>
                  <div className="flex justify-center">
                    <div className="h-[280px] w-full max-w-[500px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={postPieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value} GJ`}>
                            {postPieData.map((entry, idx) => (
                              <Cell key={idx} fill={CATEGORY_COLORS[entry.name] || "hsl(var(--chart-1))"} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `${value} GJ`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <p>
                  Afin d'illustrer l'évolution de la consommation énergétique au cours de l'année, le graphique suivant présente le profil énergétique mensuel du bâtiment avant et après l'implantation des mesures d'efficacité énergétique.
                </p>
                <p>
                  On observe que les gains énergétiques les plus importants se produisent durant la période hivernale, lorsque les besoins en chauffage sont les plus élevés. L'installation de thermopompes et l'amélioration de l'étanchéité du bâtiment permettent ainsi de réduire significativement la consommation énergétique pendant les mois les plus froids.
                </p>

                <div className="my-6">
                  <p className="text-xs text-center text-muted-foreground mb-2 italic">Évolution mensuelle de la consommation énergétique – Avant / Après travaux (GJ)</p>
                  <div className="flex justify-center">
                    <div className="h-[300px] w-full max-w-[600px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(value: number) => `${value} GJ`} />
                          <Legend />
                          <Area type="monotone" dataKey="avant" name="Avant travaux" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.2} />
                          <Area type="monotone" dataKey="apres" name="Après travaux" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4))" fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <p>
                  Cette analyse mensuelle confirme que les mesures proposées permettent d'améliorer la performance énergétique du bâtiment tout au long de l'année, avec un impact particulièrement marqué durant la saison de chauffage.
                </p>
              </div>
            </section>

            <Separator className="relative z-10" />

            <section id="toc-comparatif" className="relative z-10">
              <h2 className="text-base font-semibold mb-4" data-testid="text-section-comparatif">
                6. Comparatif énergétique
              </h2>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full border-collapse" style={{ borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ backgroundColor: "#e0f0f0", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                      <th className="text-xs font-semibold py-3 px-4 text-left text-slate-700 border-r border-slate-200">Usage énergétique</th>
                      <th className="text-xs font-semibold py-3 px-4 text-right text-slate-700 border-r border-slate-200">Avant travaux (GJ)</th>
                      <th className="text-xs font-semibold py-3 px-4 text-right text-slate-700 border-r border-slate-200">Après travaux (GJ)</th>
                      <th className="text-xs font-semibold py-3 px-4 text-right text-slate-700 border-r border-slate-200">Variation (GJ)</th>
                      <th className="text-xs font-semibold py-3 px-4 text-right text-slate-700">Réduction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Chauffage des locaux", avant: heatingBeforeGJ, apres: heatingAfterGJ },
                      { label: "Eau chaude domestique", avant: hotWaterBeforeGJ, apres: hotWaterAfterGJ },
                      { label: "Charges électriques de base", avant: baseLoadsBeforeGJ, apres: baseLoadsAfterGJ },
                      { label: "Ventilation", avant: ventilationBeforeGJ, apres: ventilationAfterGJ },
                      { label: "Climatisation", avant: coolingBeforeGJ, apres: coolingAfterGJ },
                    ].map((row, idx) => {
                      const variation = row.apres - row.avant;
                      const pct = row.avant > 0 ? ((row.avant - row.apres) / row.avant) * 100 : 0;
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-blue-50/50" : "bg-white"}>
                          <td className="text-xs py-2.5 px-4 border-r border-gray-200">{row.label}</td>
                          <td className="text-xs text-right py-2.5 px-4 tabular-nums border-r border-gray-200">{row.avant.toFixed(2)}</td>
                          <td className="text-xs text-right py-2.5 px-4 tabular-nums border-r border-gray-200">{row.apres.toFixed(2)}</td>
                          <td className={`text-xs text-right py-2.5 px-4 tabular-nums border-r border-gray-200 ${variation < 0 ? "text-green-600" : variation > 0 ? "text-red-600" : ""}`}>
                            {variation < 0 ? "" : "+"}{variation.toFixed(2)}
                          </td>
                          <td className="text-xs text-right py-2.5 px-4">
                            {pct > 0 ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                {pct.toFixed(1)} %
                              </span>
                            ) : pct < 0 ? (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                +{Math.abs(pct).toFixed(1)} %
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ backgroundColor: "#e0f0f0", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} className="font-semibold border-t-2 border-slate-300">
                      <td className="text-xs py-3 px-4 text-slate-700 border-r border-slate-200">Consommation totale</td>
                      <td className="text-xs text-right py-3 px-4 tabular-nums text-slate-700 border-r border-slate-200">{totalBeforeGJ.toFixed(2)}</td>
                      <td className="text-xs text-right py-3 px-4 tabular-nums text-slate-700 border-r border-slate-200">{totalAfterGJ.toFixed(2)}</td>
                      <td className={`text-xs text-right py-3 px-4 tabular-nums border-r border-slate-200 ${(totalAfterGJ - totalBeforeGJ) < 0 ? "text-green-600" : ""}`}>
                        {(totalAfterGJ - totalBeforeGJ) < 0 ? "" : "+"}{(totalAfterGJ - totalBeforeGJ).toFixed(2)}
                      </td>
                      <td className="text-xs text-right py-3 px-4">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">{improvementPct.toFixed(1)} %</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">GES Avant</p>
                  <p className="text-sm font-semibold tabular-nums">{ghsBefore.toFixed(3)} T CO₂</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">GES Après</p>
                  <p className="text-sm font-semibold tabular-nums">{ghsAfter.toFixed(3)} T CO₂</p>
                </div>
                <div className="rounded-lg border bg-green-50 p-3">
                  <p className="text-xs text-muted-foreground">Réduction GES</p>
                  <p className="text-sm font-semibold text-green-700 tabular-nums">{ghsImprovementPct.toFixed(1)} %</p>
                </div>
              </div>
            </section>

            <Separator className="relative z-10" />

            <section id="toc-conclusion" className="relative z-10">
              <h2 className="text-base font-semibold mb-4" data-testid="text-section-conclusion">
                7. Conclusion
              </h2>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  L'analyse énergétique réalisée démontre que l'implantation des mesures d'efficacité énergétique proposées permettrait d'améliorer significativement la performance énergétique du bâtiment.
                </p>
                <p>
                  La consommation énergétique annuelle pourrait être réduite d'environ {improvementPct.toFixed(0)} %, ce qui entraînerait également une réduction importante des émissions de gaz à effet de serre.
                </p>
                <p>
                  Les mesures recommandées
                  {strategies.length > 0 && <> — notamment {strategies.slice(0, 4).map((s, i) => {
                    const label = s.replace(/^(l'|la |le |les )/, "");
                    if (i === 0) return label;
                    if (i === strategies.slice(0, 4).length - 1) return ` et ${label}`;
                    return `, ${label}`;
                  }).join("")}</>}
                  {" "}— constituent des interventions efficaces et techniquement réalisables.
                </p>
                <p>
                  La mise en œuvre de ces stratégies permettra non seulement de réduire les coûts d'exploitation du bâtiment, mais également d'améliorer le confort des occupants et de valoriser la performance énergétique de l'immeuble à long terme.
                </p>
              </div>
            </section>

            <Separator className="relative z-10" />

            <section id="toc-annexes" className="relative z-10">
              <h2 className="text-base font-semibold mb-6" data-testid="text-annexes-title">
                8. Annexes
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
                        <div id="annex-thermopompes">
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
                        <div id="annex-robineterie">
                          <h3 className="text-sm font-semibold mb-2">
                            {annexNum++}. Robinetterie faible débit
                          </h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            Installation de pommeaux de douche et de robinets à faible débit afin de réduire la consommation d'eau chaude domestique et, par conséquent, la charge associée à sa production.
                          </p>
                          <AnnexImageUpload
                            projectId={project.id}
                            annexType="robineterie"
                            label="Robinetterie faible débit"
                            currentImage={project.annexRobineterieImage}
                          />
                        </div>
                      )}

                      {showHeatPumpWaterHeaterStrategy && (
                        <div id="annex-chauffe-eau-thermopompe">
                          <h3 className="text-sm font-semibold mb-2">
                            {annexNum++}. Chauffe-eaux Thermopompe
                          </h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            Installation de {thermopompeCount} Chauffe-eaux Thermopompe {post.hotWater?.manufacturer || ""} {post.hotWater?.model || ""}.
                          </p>
                          <AnnexImageUpload
                            projectId={project.id}
                            annexType="chauffeEauThermopompe"
                            label="Chauffe-eaux Thermopompe"
                            currentImage={project.annexChauffeEauThermopompeImage}
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

                      <div>
                        <h3 className="text-sm font-semibold mb-2">{annexNum++}. Pertes thermiques par composante</h3>
                        <p className="text-xs text-muted-foreground mb-3">
                          Comparaison des pertes thermiques annuelles par composante du bâtiment, avant et après travaux (GJ/an).
                        </p>
                        {heatLossComponents.length > 0 && (
                          <div className="flex justify-center">
                            <div className="h-[350px] w-full max-w-[600px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={heatLossComponents} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis type="number" tick={{ fontSize: 11 }} unit=" GJ" />
                                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                                  <Tooltip formatter={(value: number) => `${value} GJ`} />
                                  <Legend />
                                  <Bar dataKey="avant" name="Avant travaux" fill="hsl(var(--chart-1))" barSize={12} />
                                  <Bar dataKey="apres" name="Après travaux" fill="hsl(var(--chart-4))" barSize={12} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </section>

            <div className="pt-8 border-t text-center">
              <p className="text-xs text-muted-foreground">
                Document généré automatiquement par EnergiQualif — Qualification APH SELECT
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
