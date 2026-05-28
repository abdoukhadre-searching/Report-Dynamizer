import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Project, ReportData, ComparisonData } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Printer, Upload, Loader2, ImageIcon, Trash2 } from "lucide-react";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";
import buildingCoverPath from "@assets/multi-racial-builders-standing-outdoors-back-view-wearing-unif_1774203867359.jpg";
import tclPhotoPath from "@assets/182568194_3810005075735040_7297035271127510089_n_1775165080896.jpg";
import tclSpecPage1Path from "@assets/ASHP_page-0001_1775165094129.jpg";
import tclSpecPage2Path from "@assets/ASHP_page-0002_1775165094129.jpg";
import faibleDebitPath from "@assets/ECD_Faible_Débit_page-0001_1773707805841.jpg";
import rheemPage1Path from "@assets/112977A7-A4C8-4E50-B387-6EA23C05007A_(1)_pages-to-jpg-0001_1774062589098.jpg";
import rheemPage2Path from "@assets/112977A7-A4C8-4E50-B387-6EA23C05007A_(1)_pages-to-jpg-0002_1774062589099.jpg";
import rheemSpecPath from "@assets/RheemHeatPumpPROPH40T2RH37530-2026-03-17_page-0001_1774062648838.jpg";
import chauffeEauInstallPath from "@assets/Cahier_Recommandations_750_B_Rue_Georges_Vanier,_Chicoutimi-7__1774066082289.jpg";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface RecommandationsTabProps {
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
  defaultImageUrl,
  maxImageHeight,
}: {
  projectId: string;
  annexType: string;
  label: string;
  currentImage: string | null;
  defaultImageUrl?: string;
  maxImageHeight?: number;
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/annex-image/${annexType}`, { method: "DELETE" });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message || "Erreur"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Image supprimée" });
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
          style={{ maxHeight: maxImageHeight ? `${maxImageHeight}px` : "500px" }}
        />
        <div className="flex gap-2 print:hidden">
          <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-dashed rounded-md cursor-pointer text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30">
            <Upload className="w-3 h-3" />
            Remplacer (image ou PDF)
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadMutation.mutate({ file, annexType }); }} />
          </label>
          <button
            type="button"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-dashed rounded-md text-xs text-red-500 transition-colors hover:border-red-400 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
            Supprimer
          </button>
        </div>
      </div>
    );
  }

  if (defaultImageUrl) {
    return (
      <div className="mt-3">
        <img src={defaultImageUrl} alt={label} className="w-full rounded-md border" />
        <label className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 border border-dashed rounded-md cursor-pointer text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30 print:hidden">
          <Upload className="w-3 h-3" />
          Remplacer par une image ou PDF personnalisé
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadMutation.mutate({ file, annexType }); }} />
        </label>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <label className="flex items-center justify-center gap-2 px-4 py-6 border border-dashed rounded-md cursor-pointer text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30 print:hidden">
        {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
        Importer image ou PDF pour {label}
        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadMutation.mutate({ file, annexType }); }} />
      </label>
    </div>
  );
}

function getOccupantCount(occupants?: string): number {
  if (!occupants) return 0;
  const match = occupants.match(/(\d+)\s*adultes?/);
  return match ? parseInt(match[1], 10) : 0;
}

function getThermopompeCount(occupants?: string, puissance8_3kW?: number): number {
  if (puissance8_3kW && puissance8_3kW > 0) return Math.round(puissance8_3kW / 3.51);
  const count = getOccupantCount(occupants);
  return count > 0 ? Math.ceil(count / 2) : 0;
}

function getNumUnitsFromOccupants(occupants?: string): number {
  const count = getOccupantCount(occupants);
  return count > 0 ? Math.ceil(count / 2) : 0;
}

function hasThermopompe(data: ReportData): boolean {
  const equip = (data.heating?.primaryEquipment || "").toLowerCase();
  return equip.includes("thermopompe") || equip.includes("source d'air");
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

function getFuelDisplayName(fuelType?: string): string {
  if (!fuelType) return "combustible fossile";
  const f = fuelType.toLowerCase();
  if (/mazout/.test(f)) return "mazout";
  if (/gaz\s*naturel/.test(f)) return "gaz naturel";
  if (/propane/.test(f)) return "propane";
  if (/diesel/.test(f)) return "diesel";
  if (/butane/.test(f)) return "butane";
  return f;
}

function hasFossilConversion(pre: ReportData, post: ReportData): boolean {
  const preHeatingFossil = isFossilFuel(pre.heating?.primaryType);
  const preHotWaterFossil = isFossilFuel(pre.hotWater?.primaryType);
  const postHeatingFossil = isFossilFuel(post.heating?.primaryType);
  const postHotWaterFossil = isFossilFuel(post.hotWater?.primaryType);
  return (preHeatingFossil !== postHeatingFossil) || (preHotWaterFossil !== postHotWaterFossil);
}

function getPreFossilFuelLabel(pre: ReportData): string {
  const types: string[] = [];
  if (isFossilFuel(pre.heating?.primaryType)) types.push(pre.heating!.primaryType!);
  if (isFossilFuel(pre.hotWater?.primaryType) && !types.includes(pre.hotWater!.primaryType!)) types.push(pre.hotWater!.primaryType!);
  return types.length > 0 ? types.join(" / ") : "Combustible fossile";
}

function getWindowFraction(pre: ReportData): string {
  if (pre.buildingInfo?.windowFraction) return pre.buildingInfo.windowFraction;
  const zone1 = pre.zone1;
  if (!zone1) return "N/A";
  const wallGross = zone1.find((z) => z.element.toLowerCase().includes("murs principaux"))?.grossArea ?? 0;
  const windowAreas = zone1.filter((z) => z.element.toLowerCase().includes("fenêtres") || z.element.toLowerCase().includes("fenetres"));
  const totalWindowArea = windowAreas.reduce((sum, w) => sum + (w.grossArea ?? 0), 0);
  if (wallGross > 0 && totalWindowArea > 0) {
    return ((totalWindowArea / (wallGross + totalWindowArea)) * 100).toFixed(1) + " %";
  }
  return "N/A";
}

function PageHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="relative z-10 flex items-center justify-between pb-3 mb-6" style={{ borderBottom: "2px solid #1e3a5f" }}>
      <img src={mabLogoPath} alt="MAB" className="h-10 w-auto object-contain opacity-80" />
      <p className="text-xs text-slate-400 tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>
        {subtitle || "Cahier de recommandations — APH SELECT"}
      </p>
    </div>
  );
}

function Watermark() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.03] z-0 print:opacity-[0.04]" aria-hidden="true">
      <p className="text-[120px] font-bold tracking-widest text-slate-900 rotate-[-30deg] whitespace-nowrap" style={{ fontFamily: "'Playfair Display', serif" }}>
        APH SELECT
      </p>
    </div>
  );
}

export default function RecommandationsTab({ project, exportMode = false }: RecommandationsTabProps) {
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);
  const [constructionYear, setConstructionYear] = useState(
    project.yearBuilt || (project.preReportData as any)?.buildingInfo?.yearBuilt || (project.postReportData as any)?.buildingInfo?.yearBuilt || ""
  );
  const yearMutation = useMutation({
    mutationFn: async (year: string) => {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearBuilt: year }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
    },
  });
  const recInsulMutation = useMutation({
    mutationFn: async (data: { basementInsulationType?: string; basementInsulationInches?: string }) => {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
    },
  });
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
    if (isPrinting) return;
    setIsPrinting(true);
    const addressLabel = pre.buildingInfo?.address || project.name || "recommandations";
    try {
      const response = await fetch(`/api/projects/${project.id}/export-recommandations-pdf`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Échec de génération du PDF");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `Cahier de Recommandations - ${addressLabel}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      toast({ title: "Erreur export PDF", description: error.message || "Impossible d'exporter le rapport", variant: "destructive" });
    } finally {
      setIsPrinting(false);
    }
  };

  const showAirTightnessStrategy = hasAirTightnessChanged(pre, post);
  const showHeatingStrategy = hasThermopompe(post) && !hasThermopompe(pre);
  const showHotWaterStrategy = hasHotWaterChanged(pre, post);
  const showLedStrategy = hasLedImprovement(pre, post);
  const showVrcStrategy = hasVrcInstallation(post) && project.buildingType !== "new";
  const showGasConversionHeatingToElec = !!pre.heating?.primaryType && !!post.heating?.primaryType && getFuelDisplayName(pre.heating.primaryType) !== getFuelDisplayName(post.heating.primaryType);
  const showGasConversionHotWaterToElec = !!pre.hotWater?.primaryType && !!post.hotWater?.primaryType && getFuelDisplayName(pre.hotWater.primaryType) !== getFuelDisplayName(post.hotWater.primaryType);
  const showHeatPumpWaterHeaterStrategy = !!(post.hotWater?.equipmentType && /thermopompe/i.test(post.hotWater.equipmentType));
  const thermopompeCount = getThermopompeCount(pre.buildingInfo?.occupants, post.heating?.puissance8_3kW);
  const postFoundationRsi = post.buildingInfo?.foundationRsi ?? 0;
  const preFoundationRsi = pre.buildingInfo?.foundationRsi ?? 0;
  const showBasementInsulationStrategy = postFoundationRsi > preFoundationRsi;
  const basementRValue = Math.round(postFoundationRsi * 5.678);

  const activeStrategies: { key: string; label: string }[] = [];
  if (showAirTightnessStrategy) activeStrategies.push({ key: "air", label: "Amélioration de l'étanchéité du bâtiment" });
  if (showHeatingStrategy) activeStrategies.push({ key: "heat", label: "Installation de thermopompes haute efficacité" });
  if (showHotWaterStrategy) activeStrategies.push({ key: "hw", label: "Réduction de la consommation d'eau chaude domestique" });
  if (showLedStrategy) activeStrategies.push({ key: "led", label: "Conversion de l'éclairage vers la technologie DEL" });
  if (showVrcStrategy) activeStrategies.push({ key: "vrc", label: "Ventilation avec récupération de chaleur (VRC)" });
  if (showHeatPumpWaterHeaterStrategy) activeStrategies.push({ key: "hwt", label: "Chauffe-eaux Thermopompe" });
  if (showGasConversionHeatingToElec) activeStrategies.push({ key: "gasHeat", label: `Conversion du système de chauffage : ${getFuelDisplayName(pre.heating?.primaryType)} vers ${getFuelDisplayName(post.heating?.primaryType)}` });
  if (showGasConversionHotWaterToElec) activeStrategies.push({ key: "gasHW", label: `Conversion énergie primaire du chauffe-eau : ${getFuelDisplayName(pre.hotWater?.primaryType)} vers ${getFuelDisplayName(post.hotWater?.primaryType)}` });
  if (showBasementInsulationStrategy) activeStrategies.push({ key: "basement", label: `Isolation du sous-sol (R-${basementRValue})` });

  const stratNum = (key: string) => activeStrategies.findIndex((s) => s.key === key) + 1;
  const numUnits = getNumUnitsFromOccupants(pre.buildingInfo?.occupants);
  const commercialUnitsCount = project.hasCommercialUnits ? (project.commercialUnits ?? 0) : 0;
  const residentialUnits = commercialUnitsCount > 0 ? Math.max(0, numUnits - commercialUnitsCount) : numUnits;

  const address = project.address || pre.buildingInfo?.address || "N/A";
  const city = project.city || pre.buildingInfo?.city || "N/A";
  const province = project.province || pre.buildingInfo?.province || "N/A";
  const postalCode = project.postalCode || pre.buildingInfo?.postalCode || "";
  const fullAddress = address;

  const totalBeforeGJ = comparison.totalBefore ?? 0;
  const totalAfterGJ = comparison.totalAfter ?? 0;
  const improvementPct = comparison.improvementPercent ?? 0;
  const ghsBefore = comparison.ghsBefore ?? 0;
  const ghsAfter = comparison.ghsAfter ?? 0;
  const ghsImprovementPct = comparison.ghsImprovementPercent ?? 0;

  const windowFraction = getWindowFraction(pre);

  const heatLossComponents = (() => {
    const items: { name: string; avant: number; apres: number }[] = [];
    const preZ1 = pre.zone1 || [];
    const postZ1 = post.zone1 || [];
    const preZ3 = pre.zone3 || [];
    const postZ3 = post.zone3 || [];
    const elementNames = new Set([...preZ1.map((z) => z.element), ...postZ1.map((z) => z.element)]);
    elementNames.forEach((name) => {
      const preItem = preZ1.find((z) => z.element === name);
      const postItem = postZ1.find((z) => z.element === name);
      if ((preItem?.heatLossMJ ?? 0) > 0 || (postItem?.heatLossMJ ?? 0) > 0) {
        items.push({ name, avant: parseFloat(((preItem?.heatLossMJ ?? 0) / 1000).toFixed(2)), apres: parseFloat(((postItem?.heatLossMJ ?? 0) / 1000).toFixed(2)) });
      }
    });
    const z3Names = new Set([...preZ3.map((z) => z.element), ...postZ3.map((z) => z.element)]);
    z3Names.forEach((name) => {
      const preItem = preZ3.find((z) => z.element === name);
      const postItem = postZ3.find((z) => z.element === name);
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

  const tocSections = [
    { id: "rec-description", label: "Description du bâtiment" },
    { id: "rec-strategies", label: "Stratégie d'optimisation énergétique" },
    { id: "rec-approbation", label: "Approbation de l'évaluateur et signature" },
    { id: "rec-annexes", label: "Annexes" },
  ];

  return (
    <div className="space-y-4" style={{ "--card": "0 0% 100%", "--background": "0 0% 100%" } as React.CSSProperties}>
      {!exportMode && (
        <div className="flex items-center justify-between gap-4 mb-4 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-medium">Cahier de recommandations APH SELECT</h2>
          </div>
          <Button variant="secondary" size="sm" onClick={handlePrint} disabled={isPrinting} data-testid="button-print-recommandations">
            {isPrinting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
            {isPrinting ? "Génération..." : "Télécharger (PDF)"}
          </Button>
        </div>
      )}

      <div className="print:p-0" id="recommandations-content">

        {/* ── COVER PAGE ── */}
        <Card className="print:shadow-none print:border-none overflow-hidden">
          <CardContent className="p-0 report-prose">
            <div className="flex cover-page-container" style={{ minHeight: "700px" }}>
              <div className="w-3 flex-shrink-0" style={{ background: "linear-gradient(to bottom, #1e3a5f, #c0392b)" }} />
              <div className="flex-1 flex flex-col">
                <div className="flex items-start justify-between px-8 pt-8 pb-2">
                  <div>
                    <h1
                      className="text-2xl font-bold leading-snug mb-2"
                      style={{ fontFamily: "'Playfair Display', serif", color: "#1e3a5f", maxWidth: "440px" }}
                      data-testid="text-recommandations-title"
                    >
                      Cahier de recommandations — Programme APH SELECT
                    </h1>
                    <p className="text-sm text-slate-500 mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {fullAddress}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-6">
                    <p className="text-5xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#c0392b" }}>
                      {new Date().getFullYear()}
                    </p>
                  </div>
                </div>

                <div className="px-8 py-6 flex-1 flex items-center justify-center">
                  <div className="w-full overflow-hidden rounded-lg shadow-lg" style={{ border: "3px solid #1e3a5f" }}>
                    <img
                      src={buildingCoverPath}
                      alt="Photo du bâtiment"
                      className="w-full object-cover cover-building-img"
                      style={{ height: "360px" }}
                    />
                  </div>
                </div>

                <div className="px-8 pt-2 pb-4">
                  <p className="text-sm italic text-slate-600 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Évaluation réalisée par la firme d'évaluation en efficacité{"\u00A0"}énergétique Marc-André Boucher
                  </p>
                </div>

                <div className="mt-auto px-8 pb-8">
                  <div className="flex items-end justify-between pt-5" style={{ borderTop: "2px solid #1e3a5f" }}>
                    <div className="flex items-center gap-4">
                      <img src={mabLogoPath} alt="MAB - Marc André Boucher, Conseils Immobiliers" className="h-16 w-auto object-contain" />
                    </div>
                    <div className="text-right text-xs text-slate-500" style={{ fontFamily: "'Inter', sans-serif" }}>
                      <p className="font-semibold text-slate-700">9433-6450 QC INC.</p>
                      <p>{new Date().toLocaleDateString("fr-CA", { year: "numeric", month: "2-digit", day: "2-digit" })}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── TABLE DES MATIÈRES ── */}
        <Card className="print:shadow-none print:border-none print:break-before-page mt-6">
          <CardContent className="p-8 report-prose relative overflow-hidden">
            <Watermark />
            <PageHeader />
            <section className="relative z-10">
              <h2 className="text-lg font-semibold mb-6" style={{ color: "#1e3a5f", fontFamily: "'Playfair Display', serif" }}>
                Table des matières
              </h2>
              <nav className="space-y-2.5 text-xs">
                {tocSections.map((item, idx) => {
                  const isStrategiesSection = idx === 1;
                  return (
                    <div key={idx}>
                      <a
                        href={`#${item.id}`}
                        className="flex items-center gap-2 py-1.5 px-3 rounded text-slate-700 hover:bg-slate-50 hover:text-primary cursor-pointer transition-colors print:text-foreground print:px-0 print:hover:bg-transparent"
                        onClick={(e) => { e.preventDefault(); document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" }); window.location.hash = item.id; }}
                        data-testid={`link-rec-toc-${idx}`}
                      >
                        <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: "#1e3a5f" }}>
                          {idx + 1}
                        </span>
                        <span className="flex-1">{item.label}</span>
                      </a>
                      {isStrategiesSection && activeStrategies.length > 0 && (
                        <div className="ml-6 mt-1.5 mb-1.5 space-y-2">
                          {activeStrategies.map((s, si) => (
                            <a
                              key={si}
                              href="#rec-strategies"
                              className="flex items-center gap-2 py-1.5 px-3 rounded text-slate-700 hover:bg-slate-50 hover:text-primary cursor-pointer transition-colors print:text-foreground print:px-0 print:hover:bg-transparent"
                              onClick={(e) => { e.preventDefault(); document.getElementById("rec-strategies")?.scrollIntoView({ behavior: "smooth" }); }}
                            >
                              <span className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ backgroundColor: "#1e3a5f" }}>
                                2.{si + 1}
                              </span>
                              <span className="flex-1">{s.label}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </section>
          </CardContent>
        </Card>

        {/* ── SECTION 1 : DESCRIPTION DU BÂTIMENT ── */}
        <Card className="print:shadow-none print:border-none print:break-before-page mt-6">
          <CardContent className="p-8 space-y-8 report-prose relative overflow-hidden">
            <Watermark />
            <PageHeader />
            <section id="rec-description" className="relative z-10">
              <h2 className="" data-testid="text-rec-section-description">
                1. Description du bâtiment
              </h2>
              {(() => {
                const numFloors = pre.buildingInfo?.numFloors || post.buildingInfo?.numFloors || "";
                const floorsLabel = (() => {
                  if (!numFloors) return "N/A";
                  const stripped = numFloors.replace(/\s*étages?\s*$/i, "").trim();
                  if (/étage|demi/i.test(stripped)) return stripped;
                  const n = stripped || numFloors.trim();
                  if (!n) return "N/A";
                  if (n === "1" || /^un$/i.test(n)) return `${n} étage`;
                  return `${n} étages`;
                })();
                const floorsDisplay = floorsLabel !== "N/A" ? floorsLabel : "";
                const cah50 = pre.airLeakage?.cah50 ?? null;
                const heatingLabel = (() => {
                  const eq = (pre.heating?.primaryEquipment || "").toLowerCase();
                  const fuel = pre.heating?.primaryType || "";
                  if (/thermopompe/i.test(eq)) return "thermopompe à air";
                  if (/plinthe/i.test(eq) || /électricité/i.test(fuel)) return "plinthes électriques";
                  if (/chaudière/i.test(eq)) return `Chaudière au ${getFuelDisplayName(fuel)}`;
                  if (/fournaise/i.test(eq)) return `Fournaise au ${getFuelDisplayName(fuel)}`;
                  if (/mazout/i.test(fuel)) return "Chaudière au mazout";
                  if (/gaz naturel/i.test(fuel)) return "Fournaise au gaz naturel";
                  return eq || "N/A";
                })();
                const hotWaterLabel = (() => {
                  const type = (pre.hotWater?.primaryType || "").toLowerCase();
                  const equip = (pre.hotWater?.equipmentType || "").toLowerCase();
                  if (/thermopompe/i.test(equip)) return "chauffe-eau thermopompe";
                  if (/réser/i.test(equip) || type.includes("électr") || type.includes("electr")) return "chauffe-eau électrique";
                  if (/gaz/i.test(type)) return "chauffe-eau au gaz naturel";
                  return equip || "N/A";
                })();
                const roofRsi =
                  pre.zone1?.find((z) => /^plafond$/i.test(z.element))?.rsi
                  ?? pre.buildingInfo?.roofMaxRsi;
                const wallRsi =
                  pre.zone1?.find((z) => /murs principaux/i.test(z.element))?.rsi
                  ?? pre.buildingInfo?.wallMaxRsi;
                const roofThermal = roofRsi ? `${(roofRsi * 5.678).toFixed(1)}` : "N/A";
                const wallThermal = wallRsi != null ? `${(wallRsi * 5.678).toFixed(1)}` : "N/A";
                const chars = [
                  { label: "Nombre d'étages", value: floorsLabel || "N/A" },
                  { label: "Lieu climatique", value: pre.buildingInfo?.climateData || post.buildingInfo?.climateData || "N/A" },
                  { label: "Valeur thermique du toit (R)", value: roofThermal },
                  { label: "Valeur thermique des murs extérieurs (R)", value: wallThermal },
                  { label: "Taux de renouvellement d'air", value: cah50 !== null ? `${cah50} CAH à 50 Pa` : "N/A" },
                  { label: "Système de chauffage", value: heatingLabel },
                  { label: "Système de production d'eau chaude domestique", value: hotWaterLabel },
                  { label: "Ratio de fenestration (murs hors-terre)", value: windowFraction },
                ];
                const isNew = project.buildingType === "new";
                return (
                  <div className="space-y-4 text-sm leading-relaxed">
                    {isNew ? (
                      <>
                        <p>
                          Le bâtiment analysé correspond à un immeuble résidentiel multifamilial qui sera construit au{" "}
                          <span className="font-semibold">{fullAddress}</span>.{" "}
                          {numUnits > 0 && (<>Il comprendra <span className="font-semibold">{residentialUnits} logements locatifs</span>{commercialUnitsCount > 0 && (<> et <span className="font-semibold">{commercialUnitsCount} unité{commercialUnitsCount > 1 ? "s" : ""} commerciale{commercialUnitsCount > 1 ? "s" : ""}</span></>)}{floorsDisplay && (<> répartis sur <span className="font-semibold">{floorsLabel}</span></>)}. </>)}
                          Le bâtiment sera construit en{" "}
                          {exportMode ? (
                            <span className="font-semibold">{constructionYear || "—"}</span>
                          ) : (
                            <input
                              type="text"
                              value={constructionYear}
                              onChange={e => setConstructionYear(e.target.value)}
                              onBlur={() => yearMutation.mutate(constructionYear)}
                              placeholder="2026"
                              style={{ display: "inline", width: "60px", border: "none", borderBottom: "1px solid #1e3a5f", fontWeight: "600", textAlign: "center", background: "transparent", outline: "none", fontSize: "inherit" }}
                            />
                          )}
                          .{" "}
                          La façade principale du bâtiment est présentée ci-dessous à partir des plans architecturaux du projet.
                        </p>
                        <div className="print:break-inside-avoid">
                          <AnnexImageUpload key="rec-description-photo" projectId={project.id} annexType="ledLighting" label="Plans architecturaux / façade du bâtiment" currentImage={annexImages.ledLighting} maxImageHeight={220} />
                          <p className="font-bold mt-4 mb-2">Caractéristiques générales du bâtiment de référence :</p>
                          <ul className="space-y-1.5 ml-1">
                            {chars.map(({ label, value }) => (
                              <li key={label} className="flex items-start gap-2">
                                <span className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#1e3a5f" }} />
                                <span><span className="text-muted-foreground">{label} :</span> <span className="font-medium">{value}</span></span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    ) : (
                      <>
                        <p>
                          Le bâtiment analysé est un immeuble résidentiel situé au{" "}
                          <span className="font-semibold">{fullAddress}</span>
                          {numUnits > 0 && (<>, comprenant <span className="font-semibold">{residentialUnits} logements locatifs</span>{commercialUnitsCount > 0 && (<> et <span className="font-semibold">{commercialUnitsCount} unité{commercialUnitsCount > 1 ? "s" : ""} commerciale{commercialUnitsCount > 1 ? "s" : ""}</span></>)}</>)}, construit en{" "}
                          <span className="font-semibold">{constructionYear || "N/A"}</span>.
                          {floorsDisplay && (<> Le bâtiment comporte <span className="font-semibold">{floorsLabel}</span>.</>)}{" "}
                          La façade principale du bâtiment est illustrée ci-dessous par une photographie prise lors de la visite d'inspection.
                        </p>
                        <div className="print:break-inside-avoid">
                          <AnnexImageUpload key="rec-description-building-photo" projectId={project.id} annexType="ledLighting" label="Photo du bâtiment" currentImage={annexImages.ledLighting} maxImageHeight={220} />
                          <p className="font-bold mt-4 mb-2">Caractéristiques générales :</p>
                          <ul className="space-y-1.5 ml-1">
                            {chars.map(({ label, value }) => (
                              <li key={label} className="flex items-start gap-2">
                                <span className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#1e3a5f" }} />
                                <span><span className="text-muted-foreground">{label} :</span> <span className="font-medium">{value}</span></span>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-4">Ces caractéristiques sont représentatives des bâtiments construits avant l'introduction des normes modernes d'efficacité énergétique, ce qui explique le potentiel important d'amélioration énergétique.</p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </section>
          </CardContent>
        </Card>

        {/* ── SECTION 2 : STRATÉGIE D'OPTIMISATION ── */}
        <Card className="print:shadow-none print:border-none print:break-before-page mt-6">
          <CardContent className="p-8 space-y-8 report-prose relative overflow-hidden">
            <Watermark />
            <PageHeader />
            <section id="rec-strategies" className="relative z-10">
              <h2 className="" data-testid="text-rec-section-strategies">
                2. Stratégie d'optimisation énergétique
              </h2>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>À la suite de l'analyse énergétique et des relevés effectués sur le bâtiment, plusieurs mesures d'amélioration énergétique ont été identifiées afin d'optimiser la performance énergétique de l'immeuble.</p>
                <p>Ces mesures ont été sélectionnées en fonction de leur impact énergétique, de leur faisabilité technique et de leur capacité à réduire la consommation énergétique globale du bâtiment.</p>

                {showAirTightnessStrategy && (
                  <div className="mt-12" data-testid="rec-strategy-air-tightness">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: "#1e3a5f" }}>2.{stratNum("air")}</span>
                      Amélioration de l'étanchéité du bâtiment
                    </h3>
                    <p>Une amélioration de l'étanchéité de l'enveloppe du bâtiment est recommandée afin de réduire les infiltrations d'air et les pertes thermiques.</p>
                    <p className="mt-1">L'objectif est de réduire le taux de changement d'air à environ <span className="font-semibold">{post.airLeakage?.cah50 ?? "N/A"} CAH</span> à 50 Pa, ce qui permettrait d'améliorer l'efficacité du système de chauffage et de réduire les pertes énergétiques associées à l'infiltration d'air.</p>
                  </div>
                )}

                {showHeatingStrategy && (
                  <div className="mt-12" data-testid="rec-strategy-thermopompe">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: "#1e3a5f" }}>2.{stratNum("heat")}</span>
                      Installation de thermopompes haute efficacité
                    </h3>
                    <p>L'installation de <span className="font-semibold">{thermopompeCount}</span> thermopompes murales haute efficacité est proposée afin d'améliorer la performance énergétique du système de chauffage et de climatisation.</p>
                    <p className="mt-1">Les thermopompes recommandées possèdent une capacité minimale de 12 000 BTU, avec une efficacité d'environ 10.5 HSPF2 et 25 SEER2.</p>
                    <p className="mt-1">Ces équipements permettent de produire plus d'énergie thermique qu'ils n'en consomment, ce qui contribue à réduire la consommation énergétique associée au chauffage des logements.{" "}
                      <a href="#rec-annex-thermopompes" className="text-xs font-medium text-primary underline cursor-pointer print:hidden" onClick={(e) => { e.preventDefault(); document.getElementById("rec-annex-thermopompes")?.scrollIntoView({ behavior: "smooth" }); }}>[Voir détails]</a>
                    </p>
                  </div>
                )}

                {showHotWaterStrategy && (
                  <div className="mt-12" data-testid="rec-strategy-hot-water">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: "#1e3a5f" }}>2.{stratNum("hw")}</span>
                      Réduction de la consommation d'eau chaude domestique
                    </h3>
                    <p>L'installation de pommeaux de douche et de robinets à faible débit est recommandée afin de réduire la consommation d'eau chaude domestique.</p>
                    <p className="mt-1">Cette mesure permet de diminuer la quantité d'énergie nécessaire pour chauffer l'eau utilisée dans les logements tout en maintenant un niveau de confort adéquat pour les occupants.{" "}
                      <a href="#rec-annex-robineterie" className="text-xs font-medium text-primary underline cursor-pointer print:hidden" onClick={(e) => { e.preventDefault(); document.getElementById("rec-annex-robineterie")?.scrollIntoView({ behavior: "smooth" }); }}>[Voir détails]</a>
                    </p>
                  </div>
                )}

                {showLedStrategy && (
                  <div className="mt-12" data-testid="rec-strategy-led">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: "#1e3a5f" }}>2.{stratNum("led")}</span>
                      Conversion de l'éclairage vers la technologie DEL
                    </h3>
                    <p>La conversion d'au moins 75 % de l'éclairage du bâtiment vers des luminaires DEL est également recommandée.</p>
                    <p className="mt-1">Les luminaires DEL consomment significativement moins d'énergie que les ampoules traditionnelles et contribuent à réduire la consommation électrique associée aux charges de base du bâtiment.</p>
                  </div>
                )}

                {showVrcStrategy && (
                  <div className="mt-12" data-testid="rec-strategy-vrc">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: "#1e3a5f" }}>2.{stratNum("vrc")}</span>
                      Ventilation avec récupération de chaleur (VRC)
                    </h3>
                    <p>L'installation de systèmes de ventilation avec récupération de chaleur (VRC) est recommandée, présentant une efficacité de récupération de chaleur sensible d'environ{" "}
                      <span className="font-semibold">{post.centralVentilation?.sensibleEfficiency0C ?? "—"} %</span> à 0 °C et{" "}
                      <span className="font-semibold">{post.centralVentilation?.sensibleEfficiencyMinus25C ?? "—"} %</span> à -25 °C, afin d'améliorer la qualité de l'air intérieur tout en réduisant les pertes de chaleur liées au renouvellement de l'air.</p>
                  </div>
                )}

                {showHeatPumpWaterHeaterStrategy && (
                  <div className="mt-12" data-testid="rec-strategy-heat-pump-water-heater">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: "#1e3a5f" }}>2.{stratNum("hwt")}</span>
                      Chauffe-eaux Thermopompe
                    </h3>
                    <p>Installation de <span className="font-semibold">{numUnits > 0 ? numUnits : "—"}</span> Chauffe-eaux Thermopompe Rheem Hybrid electric water heater PROPH40 T2 RH375-30.{" "}
                      <a href="#rec-annex-chauffe-eau-thermopompe" className="text-xs font-medium text-primary underline cursor-pointer print:hidden" onClick={(e) => { e.preventDefault(); document.getElementById("rec-annex-chauffe-eau-thermopompe")?.scrollIntoView({ behavior: "smooth" }); }}>[Voir détails]</a>
                    </p>
                  </div>
                )}

                {showGasConversionHeatingToElec && (
                  <div className="mt-12" data-testid="rec-strategy-gas-conversion-heating">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: "#1e3a5f" }}>2.{stratNum("gasHeat")}</span>
                      {`Conversion du système de chauffage : ${getFuelDisplayName(pre.heating?.primaryType)} vers ${getFuelDisplayName(post.heating?.primaryType)}`}
                    </h3>
                    <p>
                      {`Le système de chauffage actuel, alimenté au ${getFuelDisplayName(pre.heating?.primaryType)}, sera converti vers ${getFuelDisplayName(post.heating?.primaryType)}`}
                      {!isFossilFuel(post.heating?.primaryType)
                        ? ` par l'installation de plinthes électriques dans chaque logement, permettant d'assurer un chauffage autonome, simple et adapté aux besoins des occupants.`
                        : `.`}
                    </p>
                  </div>
                )}

                {showGasConversionHotWaterToElec && (
                  <div className="mt-12" data-testid="rec-strategy-gas-conversion-hotwater">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: "#1e3a5f" }}>2.{stratNum("gasHW")}</span>
                      {`Conversion énergie primaire du chauffe-eau : ${getFuelDisplayName(pre.hotWater?.primaryType)} vers ${getFuelDisplayName(post.hotWater?.primaryType)}`}
                    </h3>
                    <p>{`Le système actuel de production d'eau chaude domestique, alimenté au ${getFuelDisplayName(pre.hotWater?.primaryType)}, sera converti vers ${getFuelDisplayName(post.hotWater?.primaryType)}.`}</p>
                  </div>
                )}

                {showBasementInsulationStrategy && (
                  <div className="mt-12" data-testid="rec-strategy-basement-insulation">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: "#1e3a5f" }}>2.{stratNum("basement")}</span>
                      {`Isolation du sous-sol (R-${basementRValue})`}
                    </h3>
                    <p>{`Améliorer l'isolation du sous-sol jusqu'à une résistance thermique minimale de R-${basementRValue} afin de réduire les pertes thermiques et d'améliorer l'efficacité énergétique du bâtiment.`}</p>
                    {(project.basementInsulationInches || project.basementInsulationType) && (
                      <p className="mt-1">
                        Isolant recommandé :{" "}
                        {[project.basementInsulationInches ? `${project.basementInsulationInches} po` : "", project.basementInsulationType].filter(Boolean).join(" de ")}.
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-4 items-end print:hidden" data-testid="rec-insul-fields">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Nombre de pouces</label>
                        <input
                          data-testid="rec-input-insul-inches"
                          type="text"
                          defaultValue={project.basementInsulationInches || ""}
                          onBlur={(e) => recInsulMutation.mutate({ basementInsulationInches: e.target.value })}
                          placeholder="ex. 3.5"
                          style={{ width: "90px", fontSize: "13px", padding: "4px 8px", borderRadius: "6px", border: "1px solid #93c5fd", outline: "none", backgroundColor: "#eff6ff", color: "#1e3a5f" }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Type d'isolant</label>
                        <input
                          data-testid="rec-input-insul-type"
                          type="text"
                          defaultValue={project.basementInsulationType || ""}
                          onBlur={(e) => recInsulMutation.mutate({ basementInsulationType: e.target.value })}
                          placeholder="ex. polyuréthane giclé"
                          style={{ width: "220px", fontSize: "13px", padding: "4px 8px", borderRadius: "6px", border: "1px solid #93c5fd", outline: "none", backgroundColor: "#eff6ff", color: "#1e3a5f" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </CardContent>
        </Card>

        {/* ── SECTION 3 : APPROBATION + SECTION 4 : ANNEXES ── */}
        <Card className="print:shadow-none print:border-none print:break-before-page mt-6">
          <CardContent className="p-8 space-y-8 report-prose relative overflow-hidden">
            <Watermark />
            <PageHeader />

            <section id="rec-approbation" className="relative z-10">
              <h2 className="" data-testid="text-rec-section-approbation">
                3. Approbation de l'évaluateur et signature
              </h2>
              <div className="space-y-6 text-sm">
                <table className="w-full border-collapse text-xs" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}>
                  <thead>
                    <tr style={{ backgroundColor: "#1e3a5f" } as React.CSSProperties}>
                      <th className="py-3 px-4 text-left text-white font-semibold border-r border-white/20 w-[45%]"></th>
                      <th className="py-3 px-4 text-center text-white font-semibold border-r border-white/20">Immeuble évalué (E)</th>
                      <th className="py-3 px-4 text-center text-white font-semibold border-r border-white/20">Immeuble de référence (R)</th>
                      <th className="py-3 px-4 text-center text-white font-semibold">Économie d'énergie (en%)<br />(R−E) / R×100</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 px-4 font-medium text-slate-700 border-r border-slate-100">Consommation d'énergie annuelle totale (GJ/A)</td>
                      <td className="py-3 px-4 text-center font-mono border-r border-slate-100">{totalAfterGJ.toFixed(3)} GJ</td>
                      <td className="py-3 px-4 text-center font-mono border-r border-slate-100">{totalBeforeGJ.toFixed(3)} GJ</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-3 py-1 rounded text-white text-xs font-bold" style={{ backgroundColor: "#16a34a", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}>
                          {improvementPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-slate-700 border-r border-slate-100">Émission de gaz à effet de serre annuelle totale (nombre de tonnes équivalent CO₂ par année)</td>
                      <td className="py-3 px-4 text-center font-mono border-r border-slate-100">{ghsAfter.toFixed(5)} T/A</td>
                      <td className="py-3 px-4 text-center font-mono border-r border-slate-100">{ghsBefore.toFixed(5)} T/A</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-3 py-1 rounded text-white text-xs font-bold" style={{ backgroundColor: "#16a34a", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}>
                          {ghsImprovementPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-8 pt-6" style={{ borderTop: "1px solid #e2e8f0" }}>
                  <p className="text-sm font-bold mb-4">Document approuvé par :</p>
                </div>
              </div>
            </section>

            <div className="relative z-10 my-6" style={{ borderTop: "1px solid #e8eef4" }} />

            <section id="rec-annexes" className="relative z-10 print:break-before-page">
              <h2 className="" data-testid="text-rec-annexes-title">
                4. Annexes
              </h2>

              <div className="space-y-8">

                {(() => {
                  let annexNum = 1;
                  return (
                    <>
                      {showHeatingStrategy && (
                        <>
                          <div id="rec-annex-thermopompes" className="print:break-after-page">
                            <h3 className="text-sm font-semibold mb-2">{annexNum++}. Thermopompes — Caractéristiques (page 1)</h3>
                            <p className="text-xs text-muted-foreground mb-2">
                              {`Ajout de ${thermopompeCount} Thermopompes TCL T-Pro-25ES — 12 000 BTU, 10.5 HSPF2 et 25 SEER2.`}
                            </p>
                            <AnnexImageUpload key="rec-annex-thermopompes" projectId={project.id} annexType="thermopompes"
                              label="Thermopompes – photo"
                              currentImage={annexImages.thermopompes}
                              defaultImageUrl={tclPhotoPath} />
                          </div>
                          <>
                            <div className="print:break-after-page">
                              <h3 className="text-sm font-semibold mb-2">(suite) TCL T-Pro-25ES — Spécifications techniques (page 1)</h3>
                              <img src={tclSpecPage1Path} alt="TCL T-Pro-25ES — Spécifications techniques page 1" className="w-full rounded-md border" />
                            </div>
                            <div className="print:break-after-page">
                              <h3 className="text-sm font-semibold mb-2">(suite) TCL T-Pro-25ES — Spécifications techniques (page 2)</h3>
                              <img src={tclSpecPage2Path} alt="TCL T-Pro-25ES — Spécifications techniques page 2" className="w-full rounded-md border" />
                            </div>
                          </>
                        </>
                      )}

                      {showHotWaterStrategy && !showHeatPumpWaterHeaterStrategy && (
                        <div id="rec-annex-robineterie" className="print:break-after-page">
                          <h3 className="text-sm font-semibold mb-2">{annexNum++}. Robinetterie faible débit</h3>
                          <p className="text-xs text-muted-foreground mb-2">Installation de pommeaux de douche et de robinets à faible débit afin de réduire la consommation d'eau chaude domestique et, par conséquent, la charge associée à sa production.</p>
                          <AnnexImageUpload key="rec-annex-robineterie" projectId={project.id} annexType="robineterie" label="Robinetterie faible débit" currentImage={annexImages.robineterie} defaultImageUrl={faibleDebitPath} />
                        </div>
                      )}

                      {showHeatPumpWaterHeaterStrategy && (
                        <div id="rec-annex-chauffe-eau-thermopompe" className="print:break-before-page">
                          <h3 className="text-sm font-semibold mb-2">{annexNum++}. Chauffe-eaux Thermopompe Rheem PROPH40 T2 RH375-30</h3>
                          <p className="text-xs text-muted-foreground mb-4">Installation de {numUnits > 0 ? numUnits : "—"} Chauffe-eaux Thermopompe Rheem Hybrid electric water heater PROPH40 T2 RH375-30.</p>
                          <div className="space-y-4 print:break-inside-avoid">
                            <img src={rheemPage1Path} alt="Chauffe-eau hybride Rheem Professional Prestige ProTerra — page 1" className="w-full rounded border" />
                            <img src={rheemPage2Path} alt="Données techniques Rheem ProTerra — page 2" className="w-full rounded border" />
                            <img src={rheemSpecPath} alt="Fiche technique Rheem PROPH40 T2 RH375-30 Energy Star" className="w-full rounded border" />
                            <img src={chauffeEauInstallPath} alt="Schéma d'installation chauffe-eau thermopompe" className="w-full rounded border" />
                          </div>
                        </div>
                      )}

                    </>
                  );
                })()}
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
