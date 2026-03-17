import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Project, ReportData, ComparisonData, MonthlyEnergy } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Printer, Upload, Loader2, ImageIcon } from "lucide-react";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";
import buildingCoverPath from "@assets/building-cover.png";
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
  exportMode?: boolean;
}

function getAnnexImageForType(imageUrl: string | null | undefined, annexType: string): string | null {
  if (!imageUrl) return null;
  return imageUrl.includes(`_${annexType}_`) ? imageUrl : null;
}

function AnnexImageUpload({
  projectId,
  annexType,
  label,
  currentImage,
  defaultPdfUrl,
}: {
  projectId: string;
  annexType: string;
  label: string;
  currentImage: string | null;
  defaultPdfUrl?: string;
}) {
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, annexType }: { file: File; annexType: string }) => {
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

  if (currentImage) {
    return (
      <div className="mt-3 space-y-2 flex flex-col items-center">
        <img
          src={currentImage}
          alt={label}
          className="max-w-full rounded-md border"
          style={{ maxHeight: "500px" }}
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
              if (file) uploadMutation.mutate({ file, annexType });
            }}
          />
        </label>
      </div>
    );
  }

  if (defaultPdfUrl) {
    return (
      <div className="mt-3">
        <div className="border rounded-md overflow-hidden" style={{ height: "500px" }}>
          <object
            data={defaultPdfUrl}
            type="application/pdf"
            width="100%"
            height="100%"
            data-testid={`pdf-annex-${annexType}`}
          >
            <a href={defaultPdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline p-4 block">
              Ouvrir le document PDF
            </a>
          </object>
        </div>
        <label className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 border border-dashed rounded-md cursor-pointer text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30 print:hidden">
          <Upload className="w-3 h-3" />
          Remplacer par une image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate({ file, annexType });
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="mt-3">
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
            if (file) uploadMutation.mutate({ file, annexType });
          }}
        />
      </label>
    </div>
  );
}

function MonthlyEnergyTable({ data, annual, label }: { data: MonthlyEnergy[]; annual?: MonthlyEnergy; label: string }) {
  const rows = [...data];
  if (annual) rows.push(annual);

  const cols: { header: string; key: keyof MonthlyEnergy; group: string }[] = [
    { header: "Chauf. P.", key: "heatingPrimary", group: "Chauffage" },
    { header: "Chauf. S.", key: "heatingSecondary", group: "Chauffage" },
    { header: "Eau ch. P.", key: "hotWaterPrimary", group: "Eau chaude" },
    { header: "Eau ch. S.", key: "hotWaterSecondary", group: "Eau chaude" },
    { header: "Charges", key: "lightingAppliances", group: "Charges" },
    { header: "Ventil.", key: "ventilation", group: "Ventil." },
    { header: "Climat.", key: "cooling", group: "Climat." },
  ];

  const groupColors: Record<string, string> = {
    "Chauffage": "#dc2626",
    "Eau chaude": "#2563eb",
    "Charges": "#7c3aed",
    "Ventil.": "#0d9488",
    "Climat.": "#ea580c",
  };

  return (
    <div className="my-6">
      <p className="text-xs text-center text-slate-400 mb-3 italic tracking-wide">{label}</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-sm">
        <table className="w-full text-[10.5px] border-collapse" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
          <thead>
            <tr style={{ backgroundColor: '#1e3a5f', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
              <th className="text-left py-2.5 px-3 font-semibold text-white/90 text-[9px] uppercase tracking-widest border-r border-white/10">Mois</th>
              {cols.map((c) => (
                <th key={c.key as string} className="text-right py-2.5 px-2 font-medium text-white/80 text-[9px] uppercase tracking-wide border-r border-white/10 last:border-r-0">
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 mb-0.5 align-middle" style={{ backgroundColor: groupColors[c.group], opacity: 0.85 }} />
                  {c.header}
                </th>
              ))}
              <th className="text-right py-2.5 px-3 font-bold text-white text-[9px] uppercase tracking-widest">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const total = cols.reduce((sum, c) => sum + ((row[c.key] as number) ?? 0), 0);
              const isAnnual = row.month === "Annuel";
              return (
                <tr
                  key={i}
                  style={isAnnual
                    ? { backgroundColor: '#1e3a5f', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties
                    : i % 2 === 0
                      ? { backgroundColor: '#ffffff' } as React.CSSProperties
                      : { backgroundColor: '#f8fafc', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties
                  }
                  className={isAnnual ? "border-t-2 border-slate-300/50" : "border-b border-slate-100"}
                >
                  <td className={`py-2 px-3 border-r ${isAnnual ? "border-white/10 font-semibold text-white" : "border-slate-100 font-semibold text-slate-600"}`}>{row.month}</td>
                  {cols.map((c) => (
                    <td key={c.key as string} className={`py-2 px-2 text-right font-mono border-r ${isAnnual ? "border-white/10 text-white/90" : "border-slate-100 text-slate-600"}`}>
                      {((row[c.key] as number) ?? 0).toFixed(0)}
                    </td>
                  ))}
                  <td className={`py-2 px-3 text-right font-mono font-bold ${isAnnual ? "text-white" : "text-slate-800"}`}>{total.toFixed(0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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

function hasThermopompe(data: ReportData): boolean {
  const equip = (data.heating?.primaryEquipment || "").toLowerCase();
  return equip.includes("thermopompe") || equip.includes("source d'air");
}

function isThermopompeAdded(post: ReportData): boolean {
  return hasThermopompe(post);
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

export default function ReportTab({ project, exportMode = false }: ReportTabProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const pre = project.preReportData as ReportData | null;
  const post = project.postReportData as ReportData | null;
  const comparison = project.comparisonData as ComparisonData | null;

  const annexImages = {
    climateZone: getAnnexImageForType(project.annexClimateZoneImage, "climateZone"),
    thermopompes: getAnnexImageForType(project.annexThermopompesImage, "thermopompes"),
    robineterie: getAnnexImageForType(project.annexRobineterieImage, "robineterie"),
    ledLighting: getAnnexImageForType(project.annexLedLightingImage, "ledLighting"),
    vrc: getAnnexImageForType(project.annexVrcImage, "vrc"),
    chauffeEauThermopompe: getAnnexImageForType(project.annexChauffeEauThermopompeImage, "chauffeEauThermopompe"),
  };

  if (!pre || !post || !comparison) return null;

  const handlePrint = async () => {
    if (exportMode || isExporting) return;

    setIsExporting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/export-pdf`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Échec de génération du PDF");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${project.name || "cahier-qualification"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      toast({ title: "Erreur export PDF", description: error.message || "Impossible d'exporter le rapport", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const showAirTightnessStrategy = hasAirTightnessChanged(pre, post);
  const showHeatingStrategy = hasThermopompe(post) && !hasThermopompe(pre);
  const showHotWaterStrategy = hasHotWaterChanged(pre, post);
  const showLedStrategy = hasLedImprovement(pre, post);
  const showVrcStrategy = hasVrcInstallation(post);
  const showGasConversionStrategy = hasFossilConversion(pre, post);
  const showHeatPumpWaterHeaterStrategy = !!(post.hotWater?.equipmentType && /thermopompe/i.test(post.hotWater.equipmentType));
  const thermopompeCount = getThermopompeCount(pre.buildingInfo?.occupants);

  const activeStrategies: { key: string; label: string }[] = [];
  if (showAirTightnessStrategy) activeStrategies.push({ key: "air", label: "Amélioration de l'étanchéité du bâtiment" });
  if (showHeatingStrategy) activeStrategies.push({ key: "heat", label: "Installation de thermopompes haute efficacité" });
  if (showHotWaterStrategy) activeStrategies.push({ key: "hw", label: "Réduction de la consommation d'eau chaude domestique" });
  if (showLedStrategy) activeStrategies.push({ key: "led", label: "Conversion de l'éclairage vers la technologie DEL" });
  if (showVrcStrategy) activeStrategies.push({ key: "vrc", label: "Ventilation avec récupération de chaleur (VRC)" });
  if (showHeatPumpWaterHeaterStrategy) activeStrategies.push({ key: "hwt", label: "Chauffe-eaux Thermopompe" });
  if (showGasConversionStrategy) activeStrategies.push({ key: "gas", label: `Conversion ${getPreFossilFuelLabel(pre)} vers Électricité` });
  const stratNum = (key: string) => (activeStrategies.findIndex(s => s.key === key) + 1);
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
        {!exportMode && (
          <Button variant="secondary" size="sm" onClick={handlePrint} disabled={isExporting} data-testid="button-print">
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
            Imprimer / PDF
          </Button>
        )}
      </div>

      <div className="print:p-0" id="report-content">
        {/* ── COVER PAGE ── */}
        <Card className="print:shadow-none print:border-none overflow-hidden">
          <CardContent className="p-0 report-prose">
            <div className="flex cover-page-container" style={{ minHeight: '700px' }}>
              <div className="w-3 flex-shrink-0" style={{ background: 'linear-gradient(to bottom, #1e3a5f, #c0392b)' }} />

              <div className="flex-1 flex flex-col">
                <div className="flex items-start justify-between px-8 pt-8 pb-2">
                  <div>
                    <h1 className="text-2xl font-bold leading-snug mb-2" style={{ fontFamily: "'Playfair Display', serif", color: '#1e3a5f', maxWidth: '440px' }} data-testid="text-report-title">
                      Cahier préparatoire pour la qualification au programme APH SELECT
                    </h1>
                    <p className="text-sm text-slate-500 mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>{fullAddress}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-6">
                    <p className="text-5xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#c0392b' }}>{new Date().getFullYear()}</p>
                  </div>
                </div>

                <div className="px-8 py-6 flex-1 flex items-center justify-center">
                  <div className="w-full overflow-hidden rounded-lg shadow-lg" style={{ border: '3px solid #1e3a5f' }}>
                    <img
                      src={buildingCoverPath}
                      alt="Photo du bâtiment"
                      className="w-full object-cover cover-building-img"
                      style={{ height: '360px' }}
                      data-testid="img-cover-building"
                    />
                  </div>
                </div>

                <div className="px-8 pt-2 pb-4">
                  <p className="text-sm italic text-slate-600 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Évaluation réalisée par la firme d'évaluation en efficacité{'\u00A0'}énergétique Marc-André Boucher
                  </p>
                </div>

                <div className="mt-auto px-8 pb-8">
                  <div className="flex items-end justify-between pt-5" style={{ borderTop: '2px solid #1e3a5f' }}>
                    <div className="flex items-center gap-4">
                      <img
                        src={mabLogoPath}
                        alt="MAB - Marc André Boucher, Conseils Immobiliers"
                        className="h-16 w-auto object-contain"
                        data-testid="img-company-logo"
                      />
                    </div>
                    <div className="text-right text-xs text-slate-500" style={{ fontFamily: "'Inter', sans-serif" }}>
                      <p className="font-semibold text-slate-700">9433-6450 QC INC.</p>
                      <p>{new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })}</p>
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

            <div className="relative z-10 flex items-center justify-between pb-3 mb-2" style={{ borderBottom: '2px solid #1e3a5f' }}>
              <img src={mabLogoPath} alt="MAB" className="h-10 w-auto object-contain opacity-80" />
              <p className="text-xs text-slate-400 tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>Cahier de qualification — APH SELECT</p>
            </div>

            <section id="toc-resume" className="relative z-10">
              <h2 className="" data-testid="text-section-resume">
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 not-prose" data-testid="kpi-summary-cards">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 print:bg-slate-50" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/><path d="M12 8v4l2 2"/></svg>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total AVANT</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>{totalBeforeGJ.toFixed(2)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">GJ/an</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 print:bg-slate-50" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total APRÈS</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>{totalAfterGJ.toFixed(2)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">GJ/an</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 print:bg-slate-50" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Amélioration</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>{improvementPct.toFixed(1)}%</p>
                  <p className="text-xs text-slate-400 mt-0.5">Réduction énergie</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 print:bg-slate-50" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-3.8 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">GES Réduction</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>{ghsImprovementPct.toFixed(1)}%</p>
                  <p className="text-xs text-slate-400 mt-0.5">T/an CO2</p>
                </div>
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
            <div className="relative z-10 flex items-center justify-between pb-3 mb-6" style={{ borderBottom: '2px solid #1e3a5f' }}>
              <img src={mabLogoPath} alt="MAB" className="h-10 w-auto object-contain opacity-80" />
              <p className="text-xs text-slate-400 tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>Cahier de qualification — APH SELECT</p>
            </div>
            <section className="relative z-10">
              <h2 className="text-lg font-semibold mb-6" style={{ color: '#1e3a5f', fontFamily: "'Playfair Display', serif" }}>Table des matières</h2>
              <nav className="space-y-1.5 text-xs">
                {tocItems.map((item, idx) => {
                  const ids = ["toc-resume", "toc-description", "toc-profil", "toc-strategies", "toc-performance", "toc-comparatif", "toc-conclusion", "toc-annexes"];
                  const sectionLabels = ["Section 1", "Section 2", "Section 3", "Section 4", "Section 5", "Section 6", "Section 7", "Annexes"];
                  const isStrategiesSection = idx === 3;
                  return (
                    <div key={idx}>
                      <a
                        href={`#${ids[idx]}`}
                        className="flex items-center gap-2 py-1.5 px-3 rounded text-slate-700 hover:bg-slate-50 hover:text-primary cursor-pointer transition-colors print:text-foreground print:px-0 print:hover:bg-transparent"
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(ids[idx])?.scrollIntoView({ behavior: "smooth" });
                          window.location.hash = ids[idx];
                        }}
                        data-testid={`link-toc-${idx}`}
                      >
                        <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1e3a5f' }}>{idx + 1}</span>
                        <span className="flex-1">{item}</span>
                        <span className="text-[10px] text-slate-400 italic">{sectionLabels[idx]}</span>
                      </a>
                      {isStrategiesSection && activeStrategies.length > 0 && (
                        <div className="ml-6 mt-0.5 mb-0.5 space-y-0.5">
                          {activeStrategies.map((s, si) => (
                            <a
                              key={si}
                              href="#toc-strategies"
                              className="flex items-center gap-2 py-1 px-2 rounded text-slate-500 hover:text-primary hover:bg-slate-50 cursor-pointer transition-colors text-[11px] print:text-foreground print:px-0"
                              onClick={(e) => { e.preventDefault(); document.getElementById("toc-strategies")?.scrollIntoView({ behavior: "smooth" }); }}
                            >
                              <span className="w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ backgroundColor: '#475569' }}>{si + 1}</span>
                              <span className="text-slate-500">{s.label}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              <div className="mt-8 pt-6" style={{ borderTop: '1px solid #e2e8f0' }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: '#1e3a5f', fontFamily: "'Playfair Display', serif" }}>Liste des tableaux</h3>
                <nav className="space-y-1.5 text-xs">
                  {[
                    { id: "toc-profil", label: "Tableau 1 — Consommation mensuelle détaillée (Avant travaux)", section: "Section 3" },
                    { id: "toc-performance", label: "Tableau 2 — Consommation mensuelle détaillée (Après travaux)", section: "Section 5" },
                    { id: "toc-comparatif", label: "Tableau 3 — Comparatif énergétique Avant / Après", section: "Section 6" },
                  ].map((item, idx) => (
                    <a
                      key={idx}
                      href={`#${item.id}`}
                      className="flex items-center gap-2 py-1.5 px-3 rounded text-slate-600 hover:bg-slate-50 hover:text-primary cursor-pointer transition-colors print:text-foreground print:px-0"
                      onClick={(e) => { e.preventDefault(); document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" }); }}
                      data-testid={`link-toc-table-${idx}`}
                    >
                      <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1e3a5f' }}>{idx + 1}</span>
                      <span className="flex-1">{item.label}</span>
                      <span className="text-[10px] text-slate-400 italic">{item.section}</span>
                    </a>
                  ))}
                </nav>
              </div>

              <div className="mt-6 pt-6" style={{ borderTop: '1px solid #e2e8f0' }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: '#1e3a5f', fontFamily: "'Playfair Display', serif" }}>Liste des figures</h3>
                <nav className="space-y-1.5 text-xs">
                  {[
                    { id: "toc-profil", label: "Figure 1 — Répartition énergétique par catégorie (Avant travaux)", section: "Section 3" },
                    { id: "toc-performance", label: "Figure 2 — Comparaison Avant / Après par catégorie (GJ)", section: "Section 5" },
                    { id: "toc-performance", label: "Figure 3 — Répartition énergétique par catégorie (Après travaux)", section: "Section 5" },
                    { id: "toc-performance", label: "Figure 4 — Consommation mensuelle totale (Après travaux)", section: "Section 5" },
                    { id: "toc-annexes", label: "Figure 5 — Répartition des déperditions thermiques", section: "Annexes" },
                  ].map((item, idx) => (
                    <a
                      key={idx}
                      href={`#${item.id}`}
                      className="flex items-center gap-2 py-1.5 px-3 rounded text-slate-600 hover:bg-slate-50 hover:text-primary cursor-pointer transition-colors print:text-foreground print:px-0"
                      onClick={(e) => { e.preventDefault(); document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" }); }}
                      data-testid={`link-toc-figure-${idx}`}
                    >
                      <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: '#16a34a' }}>{idx + 1}</span>
                      <span className="flex-1">{item.label}</span>
                      <span className="text-[10px] text-slate-400 italic">{item.section}</span>
                    </a>
                  ))}
                </nav>
              </div>
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

            <div className="relative z-10 flex items-center justify-between pb-3 mb-6" style={{ borderBottom: '2px solid #1e3a5f' }}>
              <img src={mabLogoPath} alt="MAB" className="h-10 w-auto object-contain opacity-80" />
              <p className="text-xs text-slate-400 tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>Cahier de qualification — APH SELECT</p>
            </div>

            <section id="toc-description" className="relative z-10">
              <h2 className="" data-testid="text-section-description">
                2. Description du bâtiment
              </h2>
              {(() => {
                const numFloors = pre.buildingInfo?.numFloors || post.buildingInfo?.numFloors || "";
                const floorsMatch = numFloors.match(/(\d+(?:[.,]\d+)?(?:\s*(?:et\s*demi|½|1\/2))?)/i);
                const floorsDisplay = floorsMatch ? floorsMatch[0].trim() : numFloors || "?";
                return (
                  <div className="space-y-3 text-sm leading-relaxed">
                    <p>
                      Le bâtiment analysé est un immeuble résidentiel situé au <span className="font-semibold">{fullAddress}</span>{numUnits > 0 && <>, comprenant <span className="font-semibold">{numUnits} logements locatifs</span></>}.
                    </p>
                    <p>
                      Construit en <span className="font-semibold">{pre.buildingInfo?.yearBuilt || post.buildingInfo?.yearBuilt || "N/A"}</span>, il s'agit d'un bâtiment représentatif des constructions résidentielles de cette période.
                      {numFloors && <> Le bâtiment comporte <span className="font-semibold">{floorsDisplay} étage{floorsDisplay !== "1" ? "s" : ""}</span>.</>} La façade principale du bâtiment est illustrée ci-dessous par une photographie prise lors de la visite d'inspection.
                    </p>

                    <AnnexImageUpload
                      key="description-climate-zone"
                      projectId={project.id}
                      annexType="ledLighting"
                      label="Photo du bâtiment"
                      currentImage={annexImages.ledLighting}
                    />

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
                );
              })()}
            </section>

            <div className="relative z-10 my-6" style={{ borderTop: "1px solid #e8eef4", marginLeft: "0" }} />

            <section id="toc-profil" className="relative z-10">
              <h2 className="" data-testid="text-section-profil">
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
                  <p className="text-xs text-center text-muted-foreground mb-2 italic">Figure 1 — Répartition de la consommation énergétique avant travaux (GJ/an)</p>
                  <div className="flex justify-center">
                    <div className="h-[320px] w-full max-w-[560px]">
                      {exportMode ? (
                        <PieChart width={560} height={320}>
                          <Pie
                            data={prePieData}
                            cx={280}
                            cy={130}
                            outerRadius={95}
                            dataKey="value"
                            isAnimationActive={false}
                          >
                            {prePieData.map((entry, idx) => (
                              <Cell key={idx} fill={CATEGORY_COLORS[entry.name] || "hsl(var(--chart-1))"} />
                            ))}
                          </Pie>
                          <Legend iconType="circle" iconSize={8} formatter={(value: string, entry: any) => `${value}: ${entry.payload?.value ?? ""} GJ`} />
                        </PieChart>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={prePieData} cx="50%" cy="42%" outerRadius={95} dataKey="value">
                              {prePieData.map((entry, idx) => (
                                <Cell key={idx} fill={CATEGORY_COLORS[entry.name] || "hsl(var(--chart-1))"} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${value} GJ`} />
                            <Legend iconType="circle" iconSize={9} formatter={(value: string, entry: any) => `${value} : ${entry.payload?.value ?? ""} GJ`} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                {pre.monthlyEnergy && (
                  <MonthlyEnergyTable
                    data={pre.monthlyEnergy}
                    annual={pre.annualEnergy}
                    label="Estimation de la consommation mensuelle d'énergie par appareil — Avant travaux (MJ)"
                  />
                )}
              </div>
            </section>

            <div className="relative z-10 my-6" style={{ borderTop: "1px solid #e8eef4", marginLeft: "0" }} />

            <section id="toc-strategies" className="relative z-10">
              <h2 className="" data-testid="text-section-strategies">
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
                  <div className="mt-5" data-testid="strategy-air-tightness">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1e3a5f' }}>{stratNum("air")}</span>
                      Amélioration de l'étanchéité du bâtiment
                    </h3>
                    <p>
                      Une amélioration de l'étanchéité de l'enveloppe du bâtiment est recommandée afin de réduire les infiltrations d'air et les pertes thermiques.
                    </p>
                    <p className="mt-1">
                      L'objectif est de réduire le taux de changement d'air à environ <span className="font-semibold">{post.airLeakage?.cah50 ?? "N/A"} CAH</span> à 50 Pa, ce qui permettrait d'améliorer l'efficacité du système de chauffage et de réduire les pertes énergétiques associées à l'infiltration d'air.
                    </p>
                  </div>
                )}

                {showHeatingStrategy && (
                  <div className="mt-5" data-testid="strategy-thermopompe">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1e3a5f' }}>{stratNum("heat")}</span>
                      Installation de thermopompes haute efficacité
                    </h3>
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
                  <div className="mt-5" data-testid="strategy-hot-water">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1e3a5f' }}>{stratNum("hw")}</span>
                      Réduction de la consommation d'eau chaude domestique
                    </h3>
                    <p>
                      L'installation de pommeaux de douche et de robinets à faible débit est recommandée afin de réduire la consommation d'eau chaude domestique.
                    </p>
                    <p className="mt-1">
                      Cette mesure permet de diminuer la quantité d'énergie nécessaire pour chauffer l'eau utilisée dans les logements tout en maintenant un niveau de confort adéquat pour les occupants.
                    </p>
                  </div>
                )}

                {showLedStrategy && (
                  <div className="mt-5" data-testid="strategy-led">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1e3a5f' }}>{stratNum("led")}</span>
                      Conversion de l'éclairage vers la technologie DEL
                    </h3>
                    <p>
                      La conversion d'au moins 75 % de l'éclairage du bâtiment vers des luminaires DEL est également recommandée.
                    </p>
                    <p className="mt-1">
                      Les luminaires DEL consomment significativement moins d'énergie que les ampoules traditionnelles et contribuent à réduire la consommation électrique associée aux charges de base du bâtiment.
                    </p>
                  </div>
                )}

                {showVrcStrategy && (
                  <div className="mt-5" data-testid="strategy-vrc">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1e3a5f' }}>{stratNum("vrc")}</span>
                      Ventilation avec récupération de chaleur (VRC)
                    </h3>
                    <p>
                      L'installation de systèmes de ventilation avec récupération de chaleur (VRC) est recommandée, présentant une efficacité de récupération de chaleur sensible d'environ <span className="font-semibold">{post.centralVentilation?.sensibleEfficiency0C ?? "—"} %</span> à 0 °C et <span className="font-semibold">{post.centralVentilation?.sensibleEfficiencyMinus25C ?? "—"} %</span> à -25 °C, afin d'améliorer la qualité de l'air intérieur tout en réduisant les pertes de chaleur liées au renouvellement de l'air.
                    </p>
                  </div>
                )}

                {showHeatPumpWaterHeaterStrategy && (
                  <div className="mt-5" data-testid="strategy-heat-pump-water-heater">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1e3a5f' }}>{stratNum("hwt")}</span>
                      Chauffe-eaux Thermopompe
                    </h3>
                    <p>
                      L'installation de <span className="font-semibold">{thermopompeCount}</span> chauffe-eaux thermopompe {post.hotWater?.manufacturer || ""} {post.hotWater?.model || ""} est recommandée afin d'améliorer l'efficacité de la production d'eau chaude domestique.
                    </p>
                  </div>
                )}

                {showGasConversionStrategy && (
                  <div className="mt-5" data-testid="strategy-gas-conversion">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1e3a5f' }}>{stratNum("gas")}</span>
                      Conversion {getPreFossilFuelLabel(pre)} vers Électricité
                    </h3>
                    {isFossilFuel(pre.hotWater?.primaryType) && !isFossilFuel(post.hotWater?.primaryType) && (
                      <p>
                        Le système actuel de production d'eau chaude domestique, alimenté au gaz naturel, sera converti à l'électricité. Deux options peuvent être envisagées : soit l'installation d'un chauffe-eau électrique indépendant dans chaque unité afin d'assurer une production d'eau chaude autonome et efficace, soit l'installation d'une chaudière électrique commune desservant l'ensemble du bâtiment.
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

            <div className="relative z-10 my-6" style={{ borderTop: "1px solid #e8eef4", marginLeft: "0" }} />

            <section id="toc-performance" className="relative z-10">
              <h2 className="" data-testid="text-section-performance">
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
                  <p className="text-xs text-center text-muted-foreground mb-2 italic">Figure 2 — Comparatif énergétique Avant / Après travaux (GJ/an)</p>
                  <div className="flex justify-center">
                    <div className="h-[320px] w-full max-w-[620px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonBarData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                          <YAxis tick={{ fontSize: 11 }} label={{ value: "GJ/an", angle: -90, position: "insideLeft", offset: 5, style: { fontSize: 10 } }} />
                          <Tooltip formatter={(value: number) => `${value} GJ`} />
                          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                          <Bar dataKey="avant" name="Avant travaux" fill="hsl(var(--chart-1))" radius={[2,2,0,0]} />
                          <Bar dataKey="apres" name="Après travaux" fill="hsl(var(--chart-4))" radius={[2,2,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="my-6">
                  <p className="text-xs text-center text-muted-foreground mb-2 italic">Figure 3 — Répartition de la consommation énergétique après travaux (GJ/an)</p>
                  <div className="flex justify-center">
                    <div className="h-[320px] w-full max-w-[560px]">
                      {exportMode ? (
                        <PieChart width={560} height={320}>
                          <Pie
                            data={postPieData}
                            cx={280}
                            cy={130}
                            outerRadius={95}
                            dataKey="value"
                            isAnimationActive={false}
                          >
                            {postPieData.map((entry, idx) => (
                              <Cell key={idx} fill={CATEGORY_COLORS[entry.name] || "hsl(var(--chart-1))"} />
                            ))}
                          </Pie>
                          <Legend iconType="circle" iconSize={8} formatter={(value: string, entry: any) => `${value}: ${entry.payload?.value ?? ""} GJ`} />
                        </PieChart>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={postPieData} cx="50%" cy="42%" outerRadius={95} dataKey="value">
                              {postPieData.map((entry, idx) => (
                                <Cell key={idx} fill={CATEGORY_COLORS[entry.name] || "hsl(var(--chart-1))"} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${value} GJ`} />
                            <Legend iconType="circle" iconSize={9} formatter={(value: string, entry: any) => `${value} : ${entry.payload?.value ?? ""} GJ`} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
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
                  <p className="text-xs text-center text-muted-foreground mb-2 italic">Figure 4 — Évolution mensuelle de la consommation énergétique – Avant / Après travaux (GJ)</p>
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

                {post.monthlyEnergy && (
                  <MonthlyEnergyTable
                    data={post.monthlyEnergy}
                    annual={post.annualEnergy}
                    label="Estimation de la consommation mensuelle d'énergie par appareil — Après travaux (MJ)"
                  />
                )}
              </div>
            </section>

            <div className="relative z-10 my-6" style={{ borderTop: "1px solid #e8eef4", marginLeft: "0" }} />

            <section id="toc-comparatif" className="relative z-10">
              <h2 className="" data-testid="text-section-comparatif">
                6. Comparatif énergétique
              </h2>
              <div className="overflow-hidden rounded-xl border border-slate-200/80 shadow-sm">
                <table className="w-full border-collapse text-[11px]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                  <thead>
                    <tr style={{ backgroundColor: '#1e3a5f', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                      <th className="py-3 px-4 text-left text-white/90 font-medium text-[9px] uppercase tracking-widest border-r border-white/10">Catégorie</th>
                      <th className="py-3 px-4 text-right font-medium text-[9px] uppercase tracking-wide border-r border-white/10" style={{ color: '#fca5a5' }}>Avant (GJ)</th>
                      <th className="py-3 px-4 text-right font-medium text-[9px] uppercase tracking-wide border-r border-white/10" style={{ color: '#86efac' }}>Après (GJ)</th>
                      <th className="py-3 px-4 text-right font-medium text-[9px] uppercase tracking-wide border-r border-white/10 text-white/70">Variation</th>
                      <th className="py-3 px-4 text-right font-medium text-[9px] uppercase tracking-wide text-white/70">Réduction</th>
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
                      const variation = row.avant - row.apres;
                      const pct = row.avant > 0 ? ((row.avant - row.apres) / row.avant) * 100 : 0;
                      return (
                        <tr key={idx}
                          className="border-b border-slate-100"
                          style={idx % 2 === 1 ? { backgroundColor: '#f8fafc', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties : {}}>
                          <td className="py-3 px-4 border-r border-slate-100 font-medium text-slate-700">{row.label}</td>
                          <td className="py-3 px-4 text-right font-mono border-r border-slate-100 text-slate-500">{row.avant.toFixed(1)}</td>
                          <td className="py-3 px-4 text-right font-mono border-r border-slate-100 text-slate-500">{row.apres.toFixed(1)}</td>
                          <td className={`py-3 px-4 text-right font-mono border-r border-slate-100 font-semibold ${variation > 0 ? "text-emerald-600" : variation < 0 ? "text-red-500" : "text-slate-400"}`}>
                            {variation > 0 ? "+" : ""}{variation.toFixed(1)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {pct > 0 ? (
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: '#059669', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                                ↓ {pct.toFixed(1)}%
                              </span>
                            ) : pct < 0 ? (
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: '#dc2626' } as React.CSSProperties}>
                                ↑ {Math.abs(pct).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-slate-300 text-[10px]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ backgroundColor: '#1e3a5f', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                      <td className="py-3.5 px-4 text-white font-bold border-r border-white/10">Total consommation</td>
                      <td className="py-3.5 px-4 text-right font-mono text-white font-bold border-r border-white/10">{totalBeforeGJ.toFixed(1)}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-white font-bold border-r border-white/10">{totalAfterGJ.toFixed(1)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold border-r border-white/10" style={{ color: '#86efac' }}>
                        +{(totalBeforeGJ - totalAfterGJ).toFixed(1)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold" style={{ backgroundColor: '#fff', color: '#1e3a5f', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>↓ {improvementPct.toFixed(1)}%</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center not-prose" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                <div className="rounded-lg border border-slate-200 p-4 shadow-sm" style={{ borderTop: '3px solid #dc2626', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-3.8 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">GES Avant</p>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-slate-800">{ghsBefore.toFixed(3)}</p>
                  <p className="text-[10px] text-slate-400">T CO₂/an</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 shadow-sm" style={{ borderTop: '3px solid #16a34a', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-3.8 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">GES Après</p>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-slate-800">{ghsAfter.toFixed(3)}</p>
                  <p className="text-[10px] text-slate-400">T CO₂/an</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 shadow-sm" style={{ borderTop: '3px solid #059669', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Réduction GES</p>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-slate-800">{ghsImprovementPct.toFixed(1)}%</p>
                  <p className="text-[10px] text-slate-400">{(ghsBefore - ghsAfter).toFixed(3)} T CO₂/an</p>
                </div>
              </div>
            </section>

            <div className="relative z-10 my-6" style={{ borderTop: "1px solid #e8eef4", marginLeft: "0" }} />

            <section id="toc-conclusion" className="relative z-10">
              <h2 className="" data-testid="text-section-conclusion">
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

            <div className="relative z-10 my-6" style={{ borderTop: "1px solid #e8eef4", marginLeft: "0" }} />

            <section id="toc-annexes" className="relative z-10">
              <h2 className="" data-testid="text-annexes-title">
                8. Annexes
              </h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold mb-2">1. Zone climatique</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    Données climatiques: {pre.buildingInfo?.climateData || "-"}
                  </p>
                  <AnnexImageUpload
                    key="annex-climate-zone"
                    projectId={project.id}
                    annexType="climateZone"
                    label="Zone climatique"
                    currentImage={annexImages.climateZone}
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
                            key="annex-thermopompes"
                            projectId={project.id}
                            annexType="thermopompes"
                            label="Thermopompes"
                            currentImage={annexImages.thermopompes}
                            defaultPdfUrl="/defaults/thermopompe-innovair.pdf"
                          />
                        </div>
                      )}

                      <div id="annex-robineterie">
                        <h3 className="text-sm font-semibold mb-2">
                          {annexNum++}. Robinetterie faible débit
                        </h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          Installation de pommeaux de douche et de robinets à faible débit afin de réduire la consommation d'eau chaude domestique et, par conséquent, la charge associée à sa production.
                        </p>
                        <AnnexImageUpload
                          key="annex-robineterie"
                          projectId={project.id}
                          annexType="robineterie"
                          label="Robinetterie faible débit"
                          currentImage={annexImages.robineterie}
                          defaultPdfUrl="/defaults/faible-debit.pdf"
                        />
                      </div>

                      {showHeatPumpWaterHeaterStrategy && (
                        <div id="annex-chauffe-eau-thermopompe">
                          <h3 className="text-sm font-semibold mb-2">
                            {annexNum++}. Chauffe-eaux Thermopompe
                          </h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            Installation de {thermopompeCount} Chauffe-eaux Thermopompe {post.hotWater?.manufacturer || ""} {post.hotWater?.model || ""}.
                          </p>
                          <AnnexImageUpload
                            key="annex-chauffe-eau-thermopompe"
                            projectId={project.id}
                            annexType="chauffeEauThermopompe"
                            label="Chauffe-eaux Thermopompe"
                            currentImage={annexImages.chauffeEauThermopompe}
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
                            key="annex-vrc"
                            projectId={project.id}
                            annexType="vrc"
                            label="VRC"
                            currentImage={annexImages.vrc}
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
