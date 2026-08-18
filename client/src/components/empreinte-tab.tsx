import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Project, ReportData, HeatPump } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Zap, Droplets, Wind, Lightbulb, DollarSign, TrendingDown, Building2, Lock, Waves, Printer, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import tclPhotoPath from "@assets/182568194_3810005075735040_7297035271127510089_n_1775165080896.jpg";
import tclSpecPage1Path from "@assets/ASHP_page-0001_1775165094129.jpg";
import tclSpecPage2Path from "@assets/ASHP_page-0002_1775165094129.jpg";
import rheemPage1Path from "@assets/112977A7-A4C8-4E50-B387-6EA23C05007A_(1)_pages-to-jpg-0001_1774062589098.jpg";
import rheemPage2Path from "@assets/112977A7-A4C8-4E50-B387-6EA23C05007A_(1)_pages-to-jpg-0002_1774062589099.jpg";
import rheemSpecPath from "@assets/RheemHeatPumpPROPH40T2RH37530-2026-03-17_page-0001_1774062648838.jpg";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";
import tclSubventionImg from "@assets/Subvention_TCL_1775167218708.png";

interface EmpreinteInitialValues {
  nbThermo?: number;
  nbUnits?: number;
  nbChauffeEauThermo?: number;
  nbPlinthes?: number;
  nbVrc?: number;
  coutEtancheite?: number;
  coutThermo?: number;
  coutChauffeEau?: number;
  coutVrc?: number;
  coutFaibleDebit?: number;
  coutLed?: number;
  coutPlinthes?: number;
  coutChauffeEauElecInd?: number;
  coutElecThermo?: number;
  coutBasementInsul?: number;
  subventionBasementInsul?: number;
  subventionThermoManual?: number;
  coutFenetres?: number;
  customMeasures?: { id: string; name: string; cost: number }[];
}

interface EmpreinteTabProps {
  project: Project;
  exportMode?: boolean;
  initialValues?: EmpreinteInitialValues;
}

function getOccupantCount(occupants?: string): number {
  if (!occupants) return 0;
  const m = occupants.match(/(\d+)\s*adultes?/i);
  return m ? parseInt(m[1], 10) : 0;
}

function getThermopompeCount(occupants?: string, puissance8_3kW?: number): number {
  if (puissance8_3kW && puissance8_3kW > 0) return Math.round(puissance8_3kW / 3.51);
  const count = getOccupantCount(occupants);
  return count > 0 ? Math.ceil(count / 2) : 0;
}

function getNumUnitsFromOccupants(occupants?: string): number {
  return getThermopompeCount(occupants);
}

function hasThermopompe(data: ReportData): boolean {
  const equip = (data.heating?.primaryEquipment || "").toLowerCase();
  return equip.includes("thermopompe") || equip.includes("source d'air");
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

function hasHeatPumpWaterHeater(post: ReportData): boolean {
  return /thermopompe/i.test(post.hotWater?.equipmentType || "");
}

function hasWindowImprovement(pre: ReportData, post: ReportData): boolean {
  const preWindows = pre.windows ?? [];
  const postWindows = post.windows ?? [];
  if (postWindows.length === 0) return false;
  const preTypes = new Set(preWindows.map((w) => w.type));
  return postWindows.some((w) => w.type.length >= 4 && w.type[3] === "2" && !preTypes.has(w.type));
}

function getWindowChangeInfo(pre: ReportData, post: ReportData): { changedCount: number; totalCount: number; allChanged: boolean } {
  const preWindows = pre.windows ?? [];
  const postWindows = post.windows ?? [];
  const preTypes = new Set(preWindows.map((w) => w.type));
  let changedCount = 0;
  let totalCount = 0;
  for (const w of postWindows) {
    totalCount += w.count;
    if (w.type.length >= 4 && w.type[3] === "2" && !preTypes.has(w.type)) changedCount += w.count;
  }
  return { changedCount, totalCount, allChanged: changedCount > 0 && changedCount === totalCount };
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

const SUBVENTION_THERMO = 1680;

export default function EmpreinteTab({ project, exportMode = false, initialValues }: EmpreinteTabProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const { data: heatPumpsData } = useQuery<HeatPump[]>({ queryKey: ["/api/heat-pumps"] });
  const defaultHeatPump = heatPumpsData?.find(hp => hp.type === "heatpump" && hp.isDefault) ?? heatPumpsData?.filter(hp => hp.type === "heatpump")[0];
  const defaultWaterHeater = heatPumpsData?.find(hp => hp.type === "waterheater" && hp.isDefault) ?? heatPumpsData?.filter(hp => hp.type === "waterheater")[0];
  const [selectedHeatPumpId, setSelectedHeatPumpId] = useState<string | null>((project as any).selectedHeatPumpId ?? null);
  const [selectedWaterHeaterId, setSelectedWaterHeaterId] = useState<string | null>((project as any).selectedWaterHeaterId ?? null);
  const selectedHeatPump: HeatPump | undefined = (selectedHeatPumpId ? heatPumpsData?.find(hp => hp.id === selectedHeatPumpId) : undefined) ?? defaultHeatPump;
  const selectedWaterHeater: HeatPump | undefined = (selectedWaterHeaterId ? heatPumpsData?.find(hp => hp.id === selectedWaterHeaterId) : undefined) ?? defaultWaterHeater;

  async function saveSelectedHeatPumpId(id: string) {
    setSelectedHeatPumpId(id);
    try {
      await apiRequest("PATCH", `/api/projects/${project.id}`, { selectedHeatPumpId: id });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    } catch {}
  }
  async function saveSelectedWaterHeaterId(id: string) {
    setSelectedWaterHeaterId(id);
    try {
      await apiRequest("PATCH", `/api/projects/${project.id}`, { selectedWaterHeaterId: id });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    } catch {}
  }
  const [coutElecThermo, setCoutElecThermo] = useState(initialValues?.coutElecThermo ?? 500);
  const [coutBasementInsul, setCoutBasementInsul] = useState(initialValues?.coutBasementInsul ?? 0);
  const [subventionBasementInsul, setSubventionBasementInsul] = useState(initialValues?.subventionBasementInsul ?? 0);
  const [coutFenetres, setCoutFenetres] = useState(initialValues?.coutFenetres ?? 0);
  const [programmeType, setProgrammeType] = useState<string>(project.programmeType || "optimisation");
  const [customMeasures, setCustomMeasures] = useState<{ id: string; name: string; cost: number }[]>(
    initialValues?.customMeasures ?? (project.customMeasures as { id: string; name: string; cost: number }[]) ?? []
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMeasureName, setNewMeasureName] = useState("");
  const [newMeasureCost, setNewMeasureCost] = useState<number | "">("");
  const pre = project.preReportData as ReportData | null;
  const post = project.postReportData as ReportData | null;

  const isNewBuilding = project.buildingType === "new";
  const subventionThermo = SUBVENTION_THERMO;

  async function saveProgrammeType(value: string) {
    setProgrammeType(value);
    try {
      await apiRequest("PATCH", `/api/projects/${project.id}`, { programmeType: value });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder le type de programme.", variant: "destructive" });
    }
  }

  async function saveCustomMeasuresList(updated: Array<{ id: string; name: string; cost: number }>) {
    setCustomMeasures(updated);
    try {
      await apiRequest("PATCH", `/api/projects/${project.id}`, { customMeasures: updated });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder les mesures.", variant: "destructive" });
    }
  }

  function addCustomMeasure() {
    const name = newMeasureName.trim();
    const cost = Number(newMeasureCost) || 0;
    if (!name) return;
    const updated = [...customMeasures, { id: crypto.randomUUID(), name, cost }];
    saveCustomMeasuresList(updated);
    setNewMeasureName("");
    setNewMeasureCost("");
    setShowAddForm(false);
  }

  function removeCustomMeasure(id: string) {
    const updated = customMeasures.filter((m) => m.id !== id);
    saveCustomMeasuresList(updated);
  }

  const [coutEtancheite, setCoutEtancheite] = useState(initialValues?.coutEtancheite ?? 5000);
  const [coutThermo, setCoutThermo] = useState(initialValues?.coutThermo ?? 2995);
  const [coutChauffeEau, setCoutChauffeEau] = useState(initialValues?.coutChauffeEau ?? 2485);
  const [coutVrc, setCoutVrc] = useState(initialValues?.coutVrc ?? 0);
  const [nbVrc, setNbVrc] = useState(() => {
    if (initialValues?.nbVrc !== undefined) return initialValues.nbVrc;
    const n = getNumUnitsFromOccupants((project.preReportData as ReportData | null)?.buildingInfo?.occupants);
    return n > 0 ? n : 1;
  });
  const [coutFaibleDebit, setCoutFaibleDebit] = useState(initialValues?.coutFaibleDebit ?? 0);
  const [coutLed, setCoutLed] = useState(initialValues?.coutLed ?? 0);
  const [coutPlinthes, setCoutPlinthes] = useState(initialValues?.coutPlinthes ?? 0);
  const [nbPlinthes, setNbPlinthes] = useState(() => {
    if (initialValues?.nbPlinthes !== undefined) return initialValues.nbPlinthes;
    const n = getNumUnitsFromOccupants((project.preReportData as ReportData | null)?.buildingInfo?.occupants);
    return n > 0 ? n : 1;
  });
  const [coutChauffeEauElecInd, setCoutChauffeEauElecInd] = useState(initialValues?.coutChauffeEauElecInd ?? 0);
  const [nbThermo, setNbThermo] = useState(() => {
    if (initialValues?.nbThermo !== undefined) return initialValues.nbThermo;
    const n = getThermopompeCount(
      (project.preReportData as ReportData | null)?.buildingInfo?.occupants,
      (project.postReportData as ReportData | null)?.heating?.puissance8_3kW,
    );
    return n > 0 ? n : 1;
  });
  const [nbUnits, setNbUnits] = useState(() => {
    if (initialValues?.nbUnits !== undefined) return initialValues.nbUnits;
    const n = getNumUnitsFromOccupants((project.preReportData as ReportData | null)?.buildingInfo?.occupants);
    return n > 0 ? n : 1;
  });
  const [nbChauffeEauThermo, setNbChauffeEauThermo] = useState(() => {
    if (initialValues?.nbChauffeEauThermo !== undefined) return initialValues.nbChauffeEauThermo;
    if (project.nbChauffeEauThermo != null) return project.nbChauffeEauThermo;
    const n = getNumUnitsFromOccupants((project.preReportData as ReportData | null)?.buildingInfo?.occupants);
    return n > 0 ? n : 1;
  });

  async function saveNbChauffeEauThermo(value: number) {
    queryClient.setQueryData(["/api/projects", project.id], (old: any) =>
      old ? { ...old, nbChauffeEauThermo: value } : old
    );
    try {
      await apiRequest("PATCH", `/api/projects/${project.id}`, { nbChauffeEauThermo: value });
    } catch {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
    }
  }

  const [subventionThermoManual, setSubventionThermoManual] = useState<number>(() => {
    if (initialValues?.subventionThermoManual !== undefined) return Number(initialValues.subventionThermoManual);
    if (project.subventionThermoManual != null && project.subventionThermoManual !== "") return Number(project.subventionThermoManual);
    return 0;
  });
  const [logisvertPdfUrl, setLogisvertPdfUrl] = useState<string | null>(project.logisvertSubventionPdf ?? null);
  const [isUploadingLogisvert, setIsUploadingLogisvert] = useState(false);
  const [logisvertAdmissible, setLogisvertAdmissible] = useState<boolean | null>(
    project.logisvertAdmissible ?? null
  );
  const [showAdmissibleDialog, setShowAdmissibleDialog] = useState(false);
  const [pendingExport, setPendingExport] = useState(false);

  async function saveLogisvertAdmissible(value: boolean) {
    setLogisvertAdmissible(value);
    try {
      await apiRequest("PATCH", `/api/projects/${project.id}`, { logisvertAdmissible: value });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
    } catch {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
    }
  }

  async function saveSubventionThermoManual(value: number) {
    setSubventionThermoManual(value);
    try {
      await apiRequest("PATCH", `/api/projects/${project.id}`, { subventionThermoManual: String(value) });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder le montant de la subvention.", variant: "destructive" });
    }
  }

  async function handleLogisvertUpload(file: File) {
    setIsUploadingLogisvert(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/projects/${project.id}/upload-logisvert-pdf`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      const updated = await res.json();
      setLogisvertPdfUrl(updated.logisvertSubventionPdf ?? null);
      if (updated.detectedAmount != null) {
        setSubventionThermoManual(Number(updated.detectedAmount));
        toast({ title: "Document ajouté", description: `Montant détecté automatiquement : ${Number(updated.detectedAmount).toLocaleString("fr-CA")} $` });
      } else {
        toast({ title: "Document ajouté", description: "Le PDF Logisvert a été enregistré. Aucun montant n'a pu être détecté automatiquement, veuillez l'inscrire manuellement." });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
    } catch {
      toast({ title: "Erreur", description: "Impossible de téléverser le document.", variant: "destructive" });
    } finally {
      setIsUploadingLogisvert(false);
    }
  }

  async function handleLogisvertDelete() {
    try {
      await apiRequest("DELETE", `/api/projects/${project.id}/logisvert-pdf`);
      setLogisvertPdfUrl(null);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer le document.", variant: "destructive" });
    }
  }

  if (!pre || !post) return null;

  const showHeatingStrategy = hasThermopompe(post) && !hasThermopompe(pre);
  const showHeatPumpWaterHeaterStrategy = hasHeatPumpWaterHeater(post);
  const showVrcStrategy = hasVrcInstallation(post) && !hasVrcInstallation(pre) && !isNewBuilding;
  const showLedStrategy = hasLedImprovement(pre, post);
  const showAirTightnessStrategy = hasAirTightnessChanged(pre, post);
  const showHotWaterStrategy = hasHotWaterChanged(pre, post);
  const showGasConversionHeatingToElec = !!pre.heating?.primaryType && !!post.heating?.primaryType && getFuelDisplayName(pre.heating.primaryType) !== getFuelDisplayName(post.heating.primaryType);
  const showGasConversionHotWaterToElec = !!pre.hotWater?.primaryType && !!post.hotWater?.primaryType && getFuelDisplayName(pre.hotWater.primaryType) !== getFuelDisplayName(post.hotWater.primaryType);
  const postFoundationRsi = post?.buildingInfo?.foundationRsi ?? 0;
  const preFoundationRsi = pre?.buildingInfo?.foundationRsi ?? 0;
  const showBasementInsulationStrategy = postFoundationRsi > preFoundationRsi;
  const autoBasementRValue = Math.round(postFoundationRsi * 5.678);
  const basementRValue = project.basementInsulationRValue ? Number(project.basementInsulationRValue) : autoBasementRValue;
  const showWindowImprovementStrategy = hasWindowImprovement(pre, post);
  const windowChangeInfo = getWindowChangeInfo(pre, post);

  const preGJ = pre.annualSummary?.totalGJ ?? 0;
  const postGJ = post.annualSummary?.totalGJ ?? 0;
  const improvPct = preGJ > 0 ? ((preGJ - postGJ) / preGJ) * 100 : 0;

  const totalEtancheite = showAirTightnessStrategy ? coutEtancheite : 0;
  const totalThermo = showHeatingStrategy ? nbThermo * coutThermo : 0;
  const totalElecThermo = showHeatingStrategy ? nbThermo * coutElecThermo : 0;
  const totalChauffeEau = showHeatPumpWaterHeaterStrategy ? nbChauffeEauThermo * coutChauffeEau : 0;
  const totalVrc = showVrcStrategy ? nbVrc * coutVrc : 0;
  const totalFaibleDebit = showHotWaterStrategy ? coutFaibleDebit : 0;
  const totalLed = showLedStrategy ? coutLed : 0;
  const totalPlinthes = showGasConversionHeatingToElec ? coutPlinthes : 0;
  const totalChauffeEauElecInd = showGasConversionHotWaterToElec ? nbUnits * coutChauffeEauElecInd : 0;
  const totalBasementInsul = showBasementInsulationStrategy ? coutBasementInsul : 0;
  const totalFenetres = showWindowImprovementStrategy ? coutFenetres : 0;

  const totalCustom = customMeasures.reduce((sum, m) => sum + m.cost, 0);
  const totalBrut = totalEtancheite + totalThermo + totalElecThermo + totalChauffeEau + totalVrc + totalFaibleDebit + totalLed + totalPlinthes + totalChauffeEauElecInd + totalBasementInsul + totalFenetres + totalCustom;
  // Non-admissible → standard fixed amount (SUBVENTION_THERMO × nbThermo)
  // Admissible or unknown → Logisvert manual amount
  const totalSubventionThermo = showHeatingStrategy
    ? (logisvertAdmissible === false ? nbThermo * subventionThermo : subventionThermoManual)
    : 0;
  const totalSubventionBasement = showBasementInsulationStrategy ? subventionBasementInsul : 0;
  const totalSubvention = totalSubventionThermo + totalSubventionBasement;
  const totalApresSubvention = totalBrut - totalSubvention;

  const address = project.address || pre.buildingInfo?.address || "";
  const city = project.city || pre.buildingInfo?.city || "";
  const province = project.province || pre.buildingInfo?.province || "";
  const postalCode = project.postalCode || (pre.buildingInfo as any)?.postalCode || "";
  const fullAddress = project.name?.trim() || [address, city, postalCode].filter(Boolean).join(", ");

  const inputCls = "w-28 text-right text-slate-800 font-medium bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400";

  function UnitBadge({ n }: { n: number }) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold" style={{ backgroundColor: "#1e3a5f10", color: "#1e3a5f" }}>
        {n}
      </span>
    );
  }

  function IconBox({ children }: { children: React.ReactNode }) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#1e3a5f15" }}>
        {children}
      </div>
    );
  }

  async function triggerExportAfterAdmissible(admissible: boolean) {
    setShowAdmissibleDialog(false);
    if (!pendingExport) return;
    setPendingExport(false);
    if (admissible === true && !logisvertPdfUrl) {
      toast({
        title: "Document manquant",
        description: "Ce projet est admissible à la bonification Logisvert. Veuillez téléverser le document de subvention avant de télécharger.",
        variant: "destructive",
      });
      setTimeout(() => {
        document.getElementById("section-subvention-logisvert")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }
    // proceed with export
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        nbThermo: String(nbThermo),
        nbUnits: String(nbUnits),
        nbChauffeEauThermo: String(nbChauffeEauThermo),
        nbPlinthes: String(nbPlinthes),
        nbVrc: String(nbVrc),
        coutEtancheite: String(coutEtancheite),
        coutThermo: String(coutThermo),
        coutChauffeEau: String(coutChauffeEau),
        coutVrc: String(coutVrc),
        coutFaibleDebit: String(coutFaibleDebit),
        coutLed: String(coutLed),
        coutPlinthes: String(coutPlinthes),
        coutChauffeEauElecInd: String(coutChauffeEauElecInd),
        coutElecThermo: String(coutElecThermo),
        coutBasementInsul: String(coutBasementInsul),
        subventionBasementInsul: String(subventionBasementInsul),
        subventionThermoManual: String(subventionThermoManual),
        customMeasures: JSON.stringify(customMeasures),
      });
      const response = await fetch(`/api/projects/${project.id}/export-empreinte-pdf?${params}`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Échec de génération du PDF");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `Empreinte Économique - ${project.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      toast({ title: "Erreur export PDF", description: error.message || "Impossible d'exporter le rapport", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div id="empreinte-content" className="space-y-6 max-w-4xl mx-auto">

      {/* Admissibilité Logisvert — dialog au clic télécharger */}
      <Dialog open={showAdmissibleDialog} onOpenChange={(open) => { if (!open) { setShowAdmissibleDialog(false); setPendingExport(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: "#1e3a5f" }}>Bonification Logisvert</DialogTitle>
            <DialogDescription>
              Ce projet est-il admissible à la bonification du programme Logisvert ?
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-500 -mt-2">
            Si la zone du bâtiment est admissible, vous devrez téléverser le document de subvention Logisvert. Sinon, le calcul standard sera utilisé.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={async () => {
                await saveLogisvertAdmissible(true);
                triggerExportAfterAdmissible(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#16a34a" }}
              data-testid="button-logisvert-admissible-oui"
            >
              <CheckCircle2 className="w-4 h-4" />
              Oui, admissible
            </button>
            <button
              onClick={async () => {
                await saveLogisvertAdmissible(false);
                triggerExportAfterAdmissible(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#64748b" }}
              data-testid="button-logisvert-admissible-non"
            >
              <XCircle className="w-4 h-4" />
              Non, pas admissible
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header Card */}
      <Card className="overflow-hidden border-0 shadow-sm" style={{ borderTop: "4px solid #1e3a5f" }}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src={mabLogoPath} alt="MAB Logo" style={{ height: "36px", width: "auto", objectFit: "contain", borderRadius: "4px" }} />
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" style={{ color: "#1e3a5f" }} />
                  <h2 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#1e3a5f" }}>
                    Empreinte économique
                  </h2>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Estimation des coûts de réalisation des travaux selon les stratégies retenues
              </p>
              {fullAddress && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-xs text-slate-400">{fullAddress}</p>
                </div>
              )}
              {/* Programme type selector — only when heating strategy active */}
              {(isNewBuilding || showHeatingStrategy) && (
                <div className="flex items-center gap-2 mt-3">
                  {isNewBuilding ? (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "#1e3a5f15", color: "#1e3a5f" }}>
                      Nouvelle construction
                    </span>
                  ) : exportMode ? (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "#1e3a5f15", color: "#1e3a5f" }}>
                      {programmeType === "remplacement" ? "Optimisation — remplacement de machine" : "Optimisation"}
                    </span>
                  ) : (
                    <select
                      data-testid="select-programme-type"
                      value={programmeType}
                      onChange={(e) => saveProgrammeType(e.target.value)}
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        padding: "3px 28px 3px 10px",
                        borderRadius: "6px",
                        border: "1px solid #1e3a5f40",
                        color: "#1e3a5f",
                        backgroundColor: "#f8fafc",
                        cursor: "pointer",
                        outline: "none",
                        appearance: "auto",
                      }}
                    >
                      <option value="optimisation">Optimisation</option>
                      <option value="remplacement">Optimisation remplacement de machine</option>
                    </select>
                  )}
                </div>
              )}
              {showHeatingStrategy && !isNewBuilding && (
                <div className="flex items-center gap-2 mt-2">
                  {!exportMode && heatPumpsData && heatPumpsData.filter(hp => hp.type === "heatpump").length > 1 ? (
                    <select
                      value={selectedHeatPumpId ?? (defaultHeatPump?.id ?? "")}
                      onChange={e => saveSelectedHeatPumpId(e.target.value)}
                      style={{ fontSize: "12px", fontWeight: 600, padding: "3px 24px 3px 10px", borderRadius: "6px", border: "1px solid #dc262640", color: "#dc2626", backgroundColor: "#fff5f5", cursor: "pointer", outline: "none", appearance: "auto" }}
                    >
                      {heatPumpsData.filter(hp => hp.type === "heatpump").map(hp => (
                        <option key={hp.id} value={hp.id}>{hp.name}{hp.model ? ` ${hp.model}` : ""}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "#dc262615", color: "#dc2626" }}>
                      {selectedHeatPump ? `${selectedHeatPump.name}${selectedHeatPump.model ? ` ${selectedHeatPump.model}` : ""}` : "Thermopompe TCL T-Pro-25ES"}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              {!exportMode && (
                <button
                  onClick={async () => {
                    if (isExporting) return;
                    if (showHeatingStrategy) {
                      // If admissibility not yet answered, show dialog first
                      if (logisvertAdmissible === null) {
                        setPendingExport(true);
                        setShowAdmissibleDialog(true);
                        return;
                      }
                      // Admissible but no PDF uploaded yet
                      if (logisvertAdmissible === true && !logisvertPdfUrl) {
                        toast({
                          title: "Document manquant",
                          description: "Ce projet est admissible à la bonification Logisvert. Veuillez téléverser le document de subvention avant de télécharger.",
                          variant: "destructive",
                        });
                        document.getElementById("section-subvention-logisvert")?.scrollIntoView({ behavior: "smooth", block: "center" });
                        return;
                      }
                    }
                    setIsExporting(true);
                    try {
                      const params = new URLSearchParams({
                        nbThermo: String(nbThermo),
                        nbUnits: String(nbUnits),
                        nbChauffeEauThermo: String(nbChauffeEauThermo),
                        nbPlinthes: String(nbPlinthes),
                        nbVrc: String(nbVrc),
                        coutEtancheite: String(coutEtancheite),
                        coutThermo: String(coutThermo),
                        coutChauffeEau: String(coutChauffeEau),
                        coutVrc: String(coutVrc),
                        coutFaibleDebit: String(coutFaibleDebit),
                        coutLed: String(coutLed),
                        coutPlinthes: String(coutPlinthes),
                        coutChauffeEauElecInd: String(coutChauffeEauElecInd),
                        coutElecThermo: String(coutElecThermo),
                        coutBasementInsul: String(coutBasementInsul),
                        subventionBasementInsul: String(subventionBasementInsul),
                        subventionThermoManual: String(subventionThermoManual),
                        customMeasures: JSON.stringify(customMeasures),
                      });
                      const response = await fetch(`/api/projects/${project.id}/export-empreinte-pdf?${params}`);
                      if (!response.ok) {
                        const data = await response.json().catch(() => null);
                        throw new Error(data?.message || "Échec de génération du PDF");
                      }
                      const blob = await response.blob();
                      const downloadUrl = window.URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = downloadUrl;
                      link.download = `Empreinte Économique - ${pre.buildingInfo?.address || address || project.name}.pdf`;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.URL.revokeObjectURL(downloadUrl);
                    } catch (error: any) {
                      toast({ title: "Erreur export PDF", description: error.message || "Impossible d'exporter le rapport", variant: "destructive" });
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80 print:hidden disabled:opacity-60"
                  style={{ backgroundColor: "#1e3a5f" }}
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  {isExporting ? "Génération..." : "Télécharger (PDF)"}
                </button>
              )}
              <div className="text-center px-5 py-3 rounded-xl" style={{ backgroundColor: "#1e3a5f" }}>
                <p className="text-xs text-white uppercase tracking-wider mb-0.5">Amélioration</p>
                <p className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {improvPct.toFixed(1)} %
                </p>
                <p className="text-xs text-white opacity-70">de réduction énergétique</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Table */}
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="px-6 py-4 border-b" style={{ backgroundColor: "#f8fafc" }}>
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#16a34a" }} />
            <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#1e3a5f" }}>
              Coût des travaux
            </h3>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#1e3a5f" }}>
                <th className="px-5 py-3 text-left text-white font-semibold text-xs uppercase tracking-wider">Mesure</th>
                <th className="px-5 py-3 text-center text-white font-semibold text-xs uppercase tracking-wider">Unités</th>
                <th className="px-5 py-3 text-right text-white font-semibold text-xs uppercase tracking-wider">Coût / unité</th>
                <th className="px-5 py-3 text-right text-white font-semibold text-xs uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">

              {/* Étanchéité — conditional on air tightness change */}
              {showAirTightnessStrategy && (
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <IconBox><Lock className="w-4 h-4" style={{ color: "#1e3a5f" }} /></IconBox>
                      <div>
                        <p className="font-semibold text-slate-800">Étanchéité à l'air</p>
                        <p className="text-xs text-slate-400 mt-0.5">Travaux d'étanchéisation pour réduire les fuites d'air</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center text-slate-400 text-xs">—</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={coutEtancheite}
                        onChange={(e) => setCoutEtancheite(Number(e.target.value))}
                        className={inputCls}
                      />
                      <span className="text-slate-400 text-xs">$</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {totalEtancheite > 0
                      ? <span className="font-bold text-base" style={{ color: "#1e3a5f" }}>{totalEtancheite.toLocaleString("fr-CA")} $</span>
                      : <span className="text-slate-400 text-sm">—</span>
                    }
                  </td>
                </tr>
              )}

              {/* Thermopompes — conditional */}
              {showHeatingStrategy && (
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <IconBox><Zap className="w-4 h-4" style={{ color: "#1e3a5f" }} /></IconBox>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {selectedHeatPump ? `${selectedHeatPump.name}${selectedHeatPump.model ? ` ${selectedHeatPump.model}` : ""}` : "Thermopompe TCL T-Pro-25ES"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {[
                            selectedHeatPump?.capacity,
                            selectedHeatPump?.hspf2 ? `HSPF2 ${selectedHeatPump.hspf2}` : null,
                            selectedHeatPump?.seer2 ? `SEER2 ${selectedHeatPump.seer2}` : null,
                          ].filter(Boolean).join(" | ") || "12 000 BTU | HSPF2 10.5 | SEER2 25"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {exportMode ? <UnitBadge n={nbThermo} /> : (
                      <input
                        data-testid="input-nb-thermo"
                        type="number"
                        min={1}
                        value={nbThermo}
                        onChange={(e) => setNbThermo(Math.max(1, Number(e.target.value) || 1))}
                        style={{ width: "56px", textAlign: "center", fontSize: "13px", fontWeight: 700, padding: "3px 6px", borderRadius: "6px", border: "1px solid #93c5fd", outline: "none", backgroundColor: "#eff6ff", color: "#1e3a5f" }}
                      />
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={coutThermo}
                        onChange={(e) => setCoutThermo(Number(e.target.value))}
                        className={inputCls}
                      />
                      <span className="text-slate-400 text-xs">$</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-bold text-base" style={{ color: "#1e3a5f" }}>
                      {totalThermo.toLocaleString("fr-CA")} $
                    </span>
                  </td>
                </tr>
              )}

              {/* Travaux électriques thermopompe — conditional */}
              {showHeatingStrategy && (
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <IconBox><Zap className="w-4 h-4" style={{ color: "#1e3a5f" }} /></IconBox>
                      <div>
                        <p className="font-semibold text-slate-800">Travaux électriques : Thermopompes</p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Disjoncteur, interrupteur de sécurité ext. et câblage requis — Montant estimatif</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {exportMode ? <UnitBadge n={nbThermo} /> : (
                      <span className="text-slate-400 text-sm font-semibold">{nbThermo}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={coutElecThermo}
                        onChange={(e) => setCoutElecThermo(Number(e.target.value))}
                        className={inputCls}
                      />
                      <span className="text-slate-400 text-xs">$</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-bold text-base" style={{ color: "#1e3a5f" }}>
                      {totalElecThermo.toLocaleString("fr-CA")} $
                    </span>
                  </td>
                </tr>
              )}

              {/* Chauffe-eau thermopompe — conditional */}
              {showHeatPumpWaterHeaterStrategy && (
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <IconBox><Droplets className="w-4 h-4" style={{ color: "#1e3a5f" }} /></IconBox>
                      <div>
                        <p className="font-semibold text-slate-800">Chauffe-eau thermopompe</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {selectedWaterHeater
                            ? `${selectedWaterHeater.name}${selectedWaterHeater.model ? ` ${selectedWaterHeater.model}` : ""}`
                            : "Installation de chauffe-eau thermopompe Rheem"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {exportMode ? <UnitBadge n={nbChauffeEauThermo} /> : (
                      <input
                        data-testid="input-nb-chauffe-eau-thermo"
                        type="number"
                        min={1}
                        value={nbChauffeEauThermo}
                        onChange={(e) => { const v = Math.max(1, Number(e.target.value) || 1); setNbChauffeEauThermo(v); saveNbChauffeEauThermo(v); }}
                        style={{ width: "56px", textAlign: "center", fontSize: "13px", fontWeight: 700, padding: "3px 6px", borderRadius: "6px", border: "1px solid #93c5fd", outline: "none", backgroundColor: "#eff6ff", color: "#1e3a5f" }}
                      />
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={coutChauffeEau}
                        onChange={(e) => setCoutChauffeEau(Number(e.target.value))}
                        className={inputCls}
                      />
                      <span className="text-slate-400 text-xs">$</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-bold text-base" style={{ color: "#1e3a5f" }}>
                      {totalChauffeEau.toLocaleString("fr-CA")} $
                    </span>
                  </td>
                </tr>
              )}

              {/* VRC — conditional, montant global comme DEL */}
              {showVrcStrategy && (
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <IconBox><Wind className="w-4 h-4" style={{ color: "#1e3a5f" }} /></IconBox>
                      <div>
                        <p className="font-semibold text-slate-800">VRC</p>
                        <p className="text-xs text-slate-400 mt-0.5">Ventilateur récupérateur de chaleur</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {exportMode ? <UnitBadge n={nbVrc} /> : (
                      <input
                        data-testid="input-nb-vrc"
                        type="number"
                        min={1}
                        value={nbVrc}
                        onChange={(e) => setNbVrc(Math.max(1, Number(e.target.value) || 1))}
                        style={{ width: "56px", textAlign: "center", fontSize: "13px", fontWeight: 700, padding: "3px 6px", borderRadius: "6px", border: "1px solid #93c5fd", outline: "none", backgroundColor: "#eff6ff", color: "#1e3a5f" }}
                      />
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={coutVrc}
                        onChange={(e) => setCoutVrc(Number(e.target.value))}
                        placeholder="0"
                        className={inputCls}
                      />
                      <span className="text-slate-400 text-xs">$</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {totalVrc > 0
                      ? <span className="font-bold text-base" style={{ color: "#1e3a5f" }}>{totalVrc.toLocaleString("fr-CA")} $</span>
                      : <span className="text-xs italic text-slate-400">Variable</span>
                    }
                  </td>
                </tr>
              )}

              {/* Faible débit — si stratégie pommeaux de douche */}
              {showHotWaterStrategy && (
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <IconBox><Waves className="w-4 h-4" style={{ color: "#1e3a5f" }} /></IconBox>
                      <div>
                        <p className="font-semibold text-slate-800">Robinetterie faible débit</p>
                        <p className="text-xs text-slate-400 mt-0.5">Pommeaux de douche et Robinets de salle de bain</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center text-slate-400 text-xs">—</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={coutFaibleDebit}
                        onChange={(e) => setCoutFaibleDebit(Number(e.target.value))}
                        placeholder="0"
                        className={inputCls}
                      />
                      <span className="text-slate-400 text-xs">$</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {totalFaibleDebit > 0
                      ? <span className="font-bold text-base" style={{ color: "#1e3a5f" }}>{totalFaibleDebit.toLocaleString("fr-CA")} $</span>
                      : <span className="text-xs italic text-slate-400">Variable</span>
                    }
                  </td>
                </tr>
              )}

              {/* Plinthes électriques — conversion fossile chauffage */}
              {showGasConversionHeatingToElec && (
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <IconBox><Zap className="w-4 h-4" style={{ color: "#1e3a5f" }} /></IconBox>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {!isFossilFuel(post?.heating?.primaryType)
                            ? "Installation de plinthes électriques dans chaque logement"
                            : "Conversion du système de chauffage"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{`${getFuelDisplayName(pre?.heating?.primaryType)} vers ${getFuelDisplayName(post?.heating?.primaryType)}`}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-slate-400 text-sm">—</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={coutPlinthes}
                        onChange={(e) => setCoutPlinthes(Number(e.target.value))}
                        className={inputCls}
                      />
                      <span className="text-slate-400 text-xs">$</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {totalPlinthes > 0
                      ? <span className="font-bold text-base" style={{ color: "#1e3a5f" }}>{totalPlinthes.toLocaleString("fr-CA")} $</span>
                      : <span className="text-xs italic text-slate-400">Variable</span>
                    }
                  </td>
                </tr>
              )}

              {/* Chauffe-eau électrique indépendant — conversion fossile eau chaude */}
              {showGasConversionHotWaterToElec && (
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <IconBox><Droplets className="w-4 h-4" style={{ color: "#1e3a5f" }} /></IconBox>
                      <div>
                        <p className="font-semibold text-slate-800">{`Conversion énergie primaire du chauffe-eau`}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{`${getFuelDisplayName(pre?.hotWater?.primaryType)} vers ${getFuelDisplayName(post?.hotWater?.primaryType)}`}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {exportMode ? <UnitBadge n={nbUnits} /> : (
                      <input
                        data-testid="input-nb-units"
                        type="number"
                        min={1}
                        value={nbUnits}
                        onChange={(e) => setNbUnits(Math.max(1, Number(e.target.value) || 1))}
                        style={{ width: "56px", textAlign: "center", fontSize: "13px", fontWeight: 700, padding: "3px 6px", borderRadius: "6px", border: "1px solid #93c5fd", outline: "none", backgroundColor: "#eff6ff", color: "#1e3a5f" }}
                      />
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={coutChauffeEauElecInd}
                        onChange={(e) => setCoutChauffeEauElecInd(Number(e.target.value))}
                        className={inputCls}
                      />
                      <span className="text-slate-400 text-xs">$</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {totalChauffeEauElecInd > 0
                      ? <span className="font-bold text-base" style={{ color: "#1e3a5f" }}>{totalChauffeEauElecInd.toLocaleString("fr-CA")} $</span>
                      : <span className="text-xs italic text-slate-400">Variable</span>
                    }
                  </td>
                </tr>
              )}

              {/* Éclairage DEL — conditional */}
              {showLedStrategy && (
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <IconBox><Lightbulb className="w-4 h-4" style={{ color: "#1e3a5f" }} /></IconBox>
                      <div>
                        <p className="font-semibold text-slate-800">Éclairage DEL</p>
                        <p className="text-xs text-slate-400 mt-0.5">Installation de luminaires DEL</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center text-slate-400 text-xs">—</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={coutLed}
                        onChange={(e) => setCoutLed(Number(e.target.value))}
                        placeholder="0"
                        className={inputCls}
                      />
                      <span className="text-slate-400 text-xs">$</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {totalLed > 0
                      ? <span className="font-bold text-base" style={{ color: "#1e3a5f" }}>{totalLed.toLocaleString("fr-CA")} $</span>
                      : <span className="text-xs italic text-slate-400">Variable</span>
                    }
                  </td>
                </tr>
              )}

              {/* Isolation du sous-sol — conditional */}
              {showBasementInsulationStrategy && (
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <IconBox><Building2 className="w-4 h-4" style={{ color: "#1e3a5f" }} /></IconBox>
                      <div>
                        <p className="font-semibold text-slate-800">Isolation du sous-sol (R-{basementRValue})</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {[project.basementInsulationInches ? `${project.basementInsulationInches} po` : "", project.basementInsulationType].filter(Boolean).join(" de ") || "Isolant à préciser"}
                        </p>
                        {!exportMode && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <TrendingDown className="w-3 h-3 text-green-600 flex-shrink-0" />
                            <span className="text-xs text-green-700 font-medium">Subvention :</span>
                            <input
                              data-testid="input-subvention-basement-insul"
                              type="number"
                              value={subventionBasementInsul}
                              onChange={(e) => setSubventionBasementInsul(Number(e.target.value))}
                              placeholder="0"
                              style={{ width: "72px", fontSize: "12px", padding: "2px 6px", borderRadius: "5px", border: "1px solid #86efac", outline: "none", backgroundColor: "#f0fdf4", color: "#15803d" }}
                            />
                            <span className="text-xs text-green-600">$</span>
                          </div>
                        )}
                        {exportMode && subventionBasementInsul > 0 && (
                          <p className="text-xs text-green-700 mt-1">Subvention : {subventionBasementInsul.toLocaleString("fr-CA")} $</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center text-slate-400 text-xs">—</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        data-testid="input-cout-basement-insul"
                        type="number"
                        value={coutBasementInsul}
                        onChange={(e) => setCoutBasementInsul(Number(e.target.value))}
                        placeholder="0"
                        className={inputCls}
                      />
                      <span className="text-slate-400 text-xs">$</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {totalBasementInsul > 0
                      ? <span className="font-bold text-base" style={{ color: "#1e3a5f" }}>{totalBasementInsul.toLocaleString("fr-CA")} $</span>
                      : <span className="text-xs italic text-slate-400">Variable</span>
                    }
                  </td>
                </tr>
              )}

              {/* Fenêtres haute efficacité — conditional */}
              {showWindowImprovementStrategy && (
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <IconBox><span style={{ fontSize: "16px", color: "#1e3a5f" }}>🪟</span></IconBox>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {windowChangeInfo.allChanged
                            ? "Remplacement de toutes les fenêtres"
                            : `Remplacement de ${windowChangeInfo.changedCount} fenêtre${windowChangeInfo.changedCount > 1 ? "s" : ""}`}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Fenêtres à haute efficacité (Low-E, gaz inerte)</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center text-slate-400 text-xs">—</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        data-testid="input-cout-fenetres"
                        type="number"
                        value={coutFenetres}
                        onChange={(e) => setCoutFenetres(Number(e.target.value))}
                        placeholder="0"
                        className={inputCls}
                      />
                      <span className="text-slate-400 text-xs">$</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {totalFenetres > 0
                      ? <span className="font-bold text-base" style={{ color: "#1e3a5f" }}>{totalFenetres.toLocaleString("fr-CA")} $</span>
                      : <span className="text-xs italic text-slate-400">Variable</span>
                    }
                  </td>
                </tr>
              )}

              {/* Mesures manuelles */}
              {customMeasures.map((measure) => (
                <tr key={measure.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <IconBox>
                        <span style={{ fontSize: "14px", color: "#1e3a5f" }}>+</span>
                      </IconBox>
                      <div>
                        <p className="font-semibold text-slate-800">{measure.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Mesure ajoutée manuellement</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center text-slate-400 text-xs">—</td>
                  <td className="px-5 py-4 text-right text-xs text-slate-400 italic">Forfait</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-bold text-base" style={{ color: "#1e3a5f" }}>
                        {measure.cost.toLocaleString("fr-CA")} $
                      </span>
                      {!exportMode && (
                        <button
                          data-testid={`btn-remove-measure-${measure.id}`}
                          onClick={() => removeCustomMeasure(measure.id)}
                          title="Supprimer cette mesure"
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            border: "1px solid #fca5a5",
                            backgroundColor: "#fff1f2",
                            color: "#dc2626",
                            fontSize: "14px",
                            lineHeight: "1",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {/* Formulaire d'ajout de mesure */}
              {!exportMode && (
                showAddForm ? (
                  <tr style={{ backgroundColor: "#f0f7ff" }}>
                    <td className="px-5 py-3" colSpan={2}>
                      <input
                        data-testid="input-new-measure-name"
                        type="text"
                        value={newMeasureName}
                        onChange={(e) => setNewMeasureName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addCustomMeasure(); if (e.key === "Escape") { setShowAddForm(false); setNewMeasureName(""); setNewMeasureCost(""); } }}
                        placeholder="Nom de la mesure…"
                        autoFocus
                        style={{
                          width: "100%",
                          fontSize: "13px",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          border: "1px solid #93c5fd",
                          outline: "none",
                          backgroundColor: "#fff",
                        }}
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          data-testid="input-new-measure-cost"
                          type="number"
                          value={newMeasureCost}
                          onChange={(e) => setNewMeasureCost(e.target.value === "" ? "" : Number(e.target.value))}
                          onKeyDown={(e) => { if (e.key === "Enter") addCustomMeasure(); }}
                          placeholder="0"
                          style={{
                            width: "100px",
                            textAlign: "right",
                            fontSize: "13px",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: "1px solid #93c5fd",
                            outline: "none",
                            backgroundColor: "#fff",
                          }}
                        />
                        <span className="text-slate-400 text-xs">$</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          data-testid="btn-confirm-add-measure"
                          onClick={addCustomMeasure}
                          disabled={!newMeasureName.trim()}
                          style={{
                            padding: "4px 14px",
                            fontSize: "12px",
                            fontWeight: 600,
                            borderRadius: "6px",
                            border: "none",
                            cursor: newMeasureName.trim() ? "pointer" : "not-allowed",
                            backgroundColor: newMeasureName.trim() ? "#1e3a5f" : "#94a3b8",
                            color: "#fff",
                          }}
                        >
                          Ajouter
                        </button>
                        <button
                          data-testid="btn-cancel-add-measure"
                          onClick={() => { setShowAddForm(false); setNewMeasureName(""); setNewMeasureCost(""); }}
                          style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #e2e8f0", cursor: "pointer", backgroundColor: "#fff", color: "#64748b" }}
                        >
                          Annuler
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-2">
                      <button
                        data-testid="btn-add-custom-measure"
                        onClick={() => setShowAddForm(true)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#1e3a5f",
                          border: "1px dashed #1e3a5f50",
                          borderRadius: "6px",
                          padding: "5px 14px",
                          cursor: "pointer",
                          backgroundColor: "transparent",
                          opacity: 0.75,
                        }}
                      >
                        <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span>
                        Ajouter une mesure
                      </button>
                    </td>
                  </tr>
                )
              )}

            </tbody>

            <tfoot>
              <tr style={{ backgroundColor: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                <td colSpan={3} className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total brut des travaux
                </td>
                <td className="px-5 py-3 text-right font-bold text-slate-800 text-base">
                  {totalBrut.toLocaleString("fr-CA")} $
                </td>
              </tr>

              {(totalSubvention > 0 || showHeatingStrategy) && (
                <>
                  {showHeatingStrategy && (
                    <tr className="bg-green-50">
                      <td className="px-5 py-3" colSpan={2}>
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-3.5 h-3.5 text-green-600" />
                          <div>
                            <p className="text-xs font-semibold text-green-800">Subvention — Thermopompes</p>
                            <p className="text-xs text-green-600 mt-0.5">
                              {logisvertAdmissible === false
                                ? `Subvention standard Hydro-Québec (${subventionThermo.toLocaleString("fr-CA")} $/unité)`
                                : (<>Programme Logisvert (montant selon calcul en ligne — voir PDF){" "}
                                    <a
                                      href="#section-subvention-logisvert"
                                      onClick={(e) => { e.preventDefault(); document.getElementById("section-subvention-logisvert")?.scrollIntoView({ behavior: "smooth" }); }}
                                      className="underline font-semibold"
                                      style={{ color: "#16a34a" }}
                                    >↓ Détails</a>
                                  </>)
                              }
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-green-600 font-medium" colSpan={2}>
                        {(exportMode || logisvertAdmissible === false) ? (
                          `− ${totalSubventionThermo.toLocaleString("fr-CA")} $`
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <span>−</span>
                            <input
                              data-testid="input-subvention-thermo-manual"
                              type="number"
                              value={subventionThermoManual}
                              onChange={(e) => saveSubventionThermoManual(Number(e.target.value))}
                              placeholder="0"
                              style={{ width: "80px", fontSize: "12px", padding: "2px 6px", borderRadius: "5px", border: "1px solid #86efac", outline: "none", backgroundColor: "#f0fdf4", color: "#15803d", textAlign: "right" }}
                            />
                            <span>$</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  {totalSubventionBasement > 0 && (
                    <tr className="bg-green-50">
                      <td className="px-5 py-3" colSpan={2}>
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-3.5 h-3.5 text-green-600" />
                          <div>
                            <p className="text-xs font-semibold text-green-800">Subvention — Isolation du sous-sol</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-green-600 font-medium" colSpan={2}>
                        − {totalSubventionBasement.toLocaleString("fr-CA")} $
                      </td>
                    </tr>
                  )}
                  <tr style={{ backgroundColor: "#1e3a5f" }}>
                    <td colSpan={3} className="px-5 py-4 text-right text-white font-semibold text-xs uppercase tracking-wider">
                      Montant estimé après subvention
                    </td>
                    <td className="px-5 py-4 text-right text-white font-bold text-xl">
                      {totalApresSubvention.toLocaleString("fr-CA")} $
                    </td>
                  </tr>
                </>
              )}

              {totalSubvention === 0 && !showHeatingStrategy && totalBrut > 0 && (
                <tr style={{ backgroundColor: "#1e3a5f" }}>
                  <td colSpan={3} className="px-5 py-4 text-right text-white font-semibold text-xs uppercase tracking-wider">
                    Total estimé des travaux
                  </td>
                  <td className="px-5 py-4 text-right text-white font-bold text-xl">
                    {totalBrut.toLocaleString("fr-CA")} $
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Summary KPI row */}
      {totalBrut > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Coût brut</p>
              <p className="text-lg font-bold" style={{ color: "#1e3a5f", fontFamily: "'Playfair Display', serif" }}>
                {totalBrut.toLocaleString("fr-CA")} $
              </p>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Subventions possibles</p>
              <p className="text-lg font-bold text-green-600" style={{ fontFamily: "'Playfair Display', serif" }}>
                {totalSubvention > 0 ? `${totalSubvention.toLocaleString("fr-CA")} $` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Net après subvention</p>
              <p className="text-lg font-bold" style={{ color: "#16a34a", fontFamily: "'Playfair Display', serif" }}>
                {totalApresSubvention.toLocaleString("fr-CA")} $
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Thermopompe spec sheet + subvention image — only when thermopompe strategy active */}
      {showHeatingStrategy && (
        <>
          {/* Fiche technique thermopompe */}
          <Card className="overflow-hidden border shadow-sm">
            <div style={{ breakInside: "avoid" }}>
              <CardHeader className="px-6 py-4 border-b" style={{ backgroundColor: "#f8fafc" }}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#1e3a5f" }} />
                    <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#1e3a5f" }}>
                      Fiche technique — {selectedHeatPump ? `${selectedHeatPump.name}${selectedHeatPump.model ? ` ${selectedHeatPump.model}` : ""}` : "Thermopompe TCL T-Pro-25ES"}
                    </h3>
                  </div>
                  {!exportMode && heatPumpsData && heatPumpsData.filter(hp => hp.type === "heatpump").length > 1 && (
                    <select
                      value={selectedHeatPumpId ?? (defaultHeatPump?.id ?? "")}
                      onChange={e => saveSelectedHeatPumpId(e.target.value)}
                      className="text-xs border rounded px-2 py-1 text-slate-600 bg-white"
                    >
                      {heatPumpsData.filter(hp => hp.type === "heatpump").map(hp => (
                        <option key={hp.id} value={hp.id}>{hp.name}{hp.model ? ` ${hp.model}` : ""}</option>
                      ))}
                    </select>
                  )}
                </div>
              </CardHeader>
              {/* Images dynamiques du catalogue, ou fallback TCL hardcodé */}
              {selectedHeatPump && ((selectedHeatPump.images as string[])?.length > 0 || (selectedHeatPump.specPages as string[])?.length > 0) ? (
                <>
                  {(selectedHeatPump.images as string[])?.length > 0 && (
                    <div className="p-4 space-y-4">
                      {(selectedHeatPump.images as string[]).map((url, i) => (
                        <img key={i} src={url} alt={`${selectedHeatPump.name} — photo ${i + 1}`} className="w-full rounded border border-slate-200 shadow-sm" />
                      ))}
                    </div>
                  )}
                  {(selectedHeatPump.specPages as string[])?.length > 0 && (
                    <div className="p-4 space-y-4">
                      {(selectedHeatPump.specPages as string[]).map((url, i) => (
                        <img key={i} src={url} alt={`${selectedHeatPump.name} — fiche technique page ${i + 1}`} className="w-full rounded border border-slate-200 shadow-sm" />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="p-4">
                    <img src={tclPhotoPath} alt="TCL T-Pro-25ES — Thermopompe murale" className="w-full rounded border border-slate-200 shadow-sm" />
                  </div>
                  <div className="p-4 space-y-4">
                    <img src={tclSpecPage1Path} alt="TCL T-Pro-25ES — Spécifications techniques page 1" className="w-full rounded border border-slate-200 shadow-sm" />
                    <img src={tclSpecPage2Path} alt="TCL T-Pro-25ES — Spécifications techniques page 2" className="w-full rounded border border-slate-200 shadow-sm" />
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Fiche technique chauffe-eau thermopompe — si stratégie active */}
          {showHeatPumpWaterHeaterStrategy && (
            <Card className="overflow-hidden border shadow-sm">
              <CardHeader className="px-6 py-4 border-b" style={{ backgroundColor: "#f8fafc" }}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#1e3a5f" }} />
                    <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#1e3a5f" }}>
                      Fiche technique — {selectedWaterHeater ? `${selectedWaterHeater.name}${selectedWaterHeater.model ? ` ${selectedWaterHeater.model}` : ""}` : "Chauffe-eau thermopompe Rheem"}
                    </h3>
                  </div>
                  {!exportMode && heatPumpsData && heatPumpsData.filter(hp => hp.type === "waterheater").length > 1 && (
                    <select
                      value={selectedWaterHeaterId ?? (defaultWaterHeater?.id ?? "")}
                      onChange={e => saveSelectedWaterHeaterId(e.target.value)}
                      className="text-xs border rounded px-2 py-1 text-slate-600 bg-white"
                    >
                      {heatPumpsData.filter(hp => hp.type === "waterheater").map(hp => (
                        <option key={hp.id} value={hp.id}>{hp.name}{hp.model ? ` ${hp.model}` : ""}</option>
                      ))}
                    </select>
                  )}
                </div>
              </CardHeader>
              {/* Images dynamiques du catalogue, ou fallback Rheem hardcodé */}
              {selectedWaterHeater && ((selectedWaterHeater.images as string[])?.length > 0 || (selectedWaterHeater.specPages as string[])?.length > 0) ? (
                <CardContent className="p-4 space-y-4">
                  {(selectedWaterHeater.images as string[])?.map((url, i) => (
                    <img key={i} src={url} alt={`${selectedWaterHeater.name} — photo ${i + 1}`} className="w-full rounded border border-slate-200 shadow-sm" />
                  ))}
                  {(selectedWaterHeater.specPages as string[])?.map((url, i) => (
                    <img key={i} src={url} alt={`${selectedWaterHeater.name} — fiche technique page ${i + 1}`} className="w-full rounded border border-slate-200 shadow-sm" />
                  ))}
                </CardContent>
              ) : (
                <CardContent className="p-4 space-y-4">
                  <img src={rheemPage1Path} alt="Chauffe-eau hybride Rheem Professional Prestige ProTerra — page 1" className="w-full rounded border border-slate-200 shadow-sm" />
                  <img src={rheemPage2Path} alt="Données techniques Rheem ProTerra — page 2" className="w-full rounded border border-slate-200 shadow-sm" />
                  <img src={rheemSpecPath} alt="Fiche technique Rheem PROPH40 T2 RH375-30 Energy Star" className="w-full rounded border border-slate-200 shadow-sm" />
                </CardContent>
              )}
            </Card>
          )}

          {/* Subvention Logisvert — document + montant */}
          <Card id="section-subvention-logisvert" className="overflow-hidden border shadow-sm">
            <CardHeader className="px-6 py-4 border-b" style={{ backgroundColor: "#f8fafc" }}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#16a34a" }} />
                  <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#1e3a5f" }}>
                    Programme de subvention — Logisvert
                  </h3>
                </div>
                {!exportMode && (
                  <div className="flex items-center gap-2">
                    {logisvertAdmissible === true && (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#16a34a18", color: "#16a34a" }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Zone admissible
                      </span>
                    )}
                    {logisvertAdmissible === false && (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#64748b18", color: "#64748b" }}>
                        <XCircle className="w-3.5 h-3.5" /> Non admissible
                      </span>
                    )}
                    {logisvertAdmissible !== null && (
                      <button
                        type="button"
                        onClick={() => setShowAdmissibleDialog(true)}
                        className="text-xs text-slate-400 underline hover:text-slate-600"
                      >
                        Modifier
                      </button>
                    )}
                    {logisvertAdmissible === null && (
                      <button
                        type="button"
                        onClick={() => setShowAdmissibleDialog(true)}
                        className="text-xs font-medium px-2.5 py-1 rounded-full border border-dashed border-amber-400 text-amber-600 hover:bg-amber-50"
                      >
                        Confirmer l'admissibilité
                      </button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Not admissible — show standard calculation info */}
              {logisvertAdmissible === false && !exportMode && (
                <div className="flex items-start gap-3 rounded-lg p-3" style={{ backgroundColor: "#f1f5f9" }}>
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
                  <p className="text-sm text-slate-600">
                    La zone de ce projet n'est pas admissible à la bonification Logisvert. Le calcul de subvention standard est utilisé.
                  </p>
                </div>
              )}

              {/* Admissible or unknown — show amount + upload */}
              {logisvertAdmissible !== false && (
                <>
                  {!exportMode && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-slate-600">Montant de la subvention calculé sur Logisvert :</span>
                      <div className="flex items-center gap-1">
                        <input
                          data-testid="input-subvention-thermo-manual-2"
                          type="number"
                          value={subventionThermoManual}
                          onChange={(e) => saveSubventionThermoManual(Number(e.target.value))}
                          placeholder="0"
                          className={inputCls}
                        />
                        <span className="text-slate-400 text-xs">$</span>
                      </div>
                    </div>
                  )}

                  {logisvertPdfUrl ? (
                    <div className="space-y-2">
                      <img src={logisvertPdfUrl} alt="Document de subvention Logisvert" className="w-full rounded border border-slate-200 shadow-sm" />
                      {!exportMode && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            data-testid="button-delete-logisvert-pdf"
                            onClick={handleLogisvertDelete}
                            className="text-xs text-red-600 underline"
                          >
                            Supprimer le document
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    !exportMode && (
                      <label
                        htmlFor="logisvert-pdf-upload"
                        className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg py-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                      >
                        {isUploadingLogisvert ? (
                          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        ) : (
                          <>
                            <DollarSign className="w-5 h-5 text-slate-400" />
                            <span className="text-sm text-slate-500">Cliquez pour téléverser le PDF (ou capture d'écran) de la subvention Logisvert</span>
                          </>
                        )}
                        <input
                          id="logisvert-pdf-upload"
                          data-testid="input-upload-logisvert-pdf"
                          type="file"
                          accept="application/pdf,image/*,.heic,.heif"
                          className="hidden"
                          disabled={isUploadingLogisvert}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogisvertUpload(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )
                  )}

                  {exportMode && !logisvertPdfUrl && (
                    <img
                      src={tclSubventionImg}
                      alt="Tableau des subventions Hydro-Québec pour thermopompes TCL T-Pro-25ES"
                      className="w-full rounded-md border border-slate-200 shadow-sm"
                    />
                  )}
                </>
              )}

              {/* Export mode + non admissible — show standard subvention image */}
              {exportMode && logisvertAdmissible === false && (
                <img
                  src={tclSubventionImg}
                  alt="Tableau des subventions Hydro-Québec pour thermopompes TCL T-Pro-25ES"
                  className="w-full rounded-md border border-slate-200 shadow-sm"
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
}
