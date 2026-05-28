import { useState } from "react";
import type { Project, ReportData } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Zap, Droplets, Wind, Lightbulb, DollarSign, TrendingDown, Building2, Lock, Waves, Printer, Loader2 } from "lucide-react";
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

function getThermopompeCount(occupants?: string): number {
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
    const n = getThermopompeCount((project.preReportData as ReportData | null)?.buildingInfo?.occupants);
    return n > 0 ? n : 1;
  });
  const [nbUnits, setNbUnits] = useState(() => {
    if (initialValues?.nbUnits !== undefined) return initialValues.nbUnits;
    const n = getNumUnitsFromOccupants((project.preReportData as ReportData | null)?.buildingInfo?.occupants);
    return n > 0 ? n : 1;
  });

  if (!pre || !post) return null;

  const showHeatingStrategy = hasThermopompe(post) && !hasThermopompe(pre);
  const showHeatPumpWaterHeaterStrategy = hasHeatPumpWaterHeater(post);
  const showVrcStrategy = hasVrcInstallation(post) && !isNewBuilding;
  const showLedStrategy = hasLedImprovement(pre, post);
  const showAirTightnessStrategy = hasAirTightnessChanged(pre, post);
  const showHotWaterStrategy = hasHotWaterChanged(pre, post);
  const showGasConversionHeatingToElec = !!pre.heating?.primaryType && !!post.heating?.primaryType && getFuelDisplayName(pre.heating.primaryType) !== getFuelDisplayName(post.heating.primaryType);
  const showGasConversionHotWaterToElec = !!pre.hotWater?.primaryType && !!post.hotWater?.primaryType && getFuelDisplayName(pre.hotWater.primaryType) !== getFuelDisplayName(post.hotWater.primaryType);

  const preGJ = pre.annualSummary?.totalGJ ?? 0;
  const postGJ = post.annualSummary?.totalGJ ?? 0;
  const improvPct = preGJ > 0 ? ((preGJ - postGJ) / preGJ) * 100 : 0;

  const totalEtancheite = showAirTightnessStrategy ? coutEtancheite : 0;
  const totalThermo = showHeatingStrategy ? nbThermo * coutThermo : 0;
  const totalChauffeEau = showHeatPumpWaterHeaterStrategy ? nbUnits * coutChauffeEau : 0;
  const totalVrc = showVrcStrategy ? nbVrc * coutVrc : 0;
  const totalFaibleDebit = showHotWaterStrategy ? coutFaibleDebit : 0;
  const totalLed = showLedStrategy ? coutLed : 0;
  const totalPlinthes = showGasConversionHeatingToElec ? coutPlinthes : 0;
  const totalChauffeEauElecInd = showGasConversionHotWaterToElec ? nbUnits * coutChauffeEauElecInd : 0;

  const totalCustom = customMeasures.reduce((sum, m) => sum + m.cost, 0);
  const totalBrut = totalEtancheite + totalThermo + totalChauffeEau + totalVrc + totalFaibleDebit + totalLed + totalPlinthes + totalChauffeEauElecInd + totalCustom;
  const totalSubvention = showHeatingStrategy ? nbThermo * subventionThermo : 0;
  const totalApresSubvention = totalBrut - totalSubvention;

  const address = project.address || pre.buildingInfo?.address || "";
  const city = project.city || pre.buildingInfo?.city || "";
  const province = project.province || pre.buildingInfo?.province || "";
  const fullAddress = [address, city, province].filter(Boolean).join(", ");

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

  return (
    <div id="empreinte-content" className="space-y-6 max-w-4xl mx-auto">

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
              {/* Programme type selector */}
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
              {!isNewBuilding && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "#dc262615", color: "#dc2626" }}>
                    Thermopompe TCL T-Pro-25ES
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              {!exportMode && (
                <button
                  onClick={async () => {
                    if (isExporting) return;
                    setIsExporting(true);
                    try {
                      const params = new URLSearchParams({
                        nbThermo: String(nbThermo),
                        nbUnits: String(nbUnits),
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
                      link.download = `Empreinte Économique - ${fullAddress || address || project.name}.pdf`;
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
                        <p className="font-semibold text-slate-800">Thermopompe TCL T-Pro-25ES</p>
                        <p className="text-xs text-slate-400 mt-0.5">12 000 BTU | HSPF2 10.5 | SEER2 25</p>
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

              {/* Chauffe-eau thermopompe — conditional */}
              {showHeatPumpWaterHeaterStrategy && (
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <IconBox><Droplets className="w-4 h-4" style={{ color: "#1e3a5f" }} /></IconBox>
                      <div>
                        <p className="font-semibold text-slate-800">Chauffe-eau thermopompe</p>
                        <p className="text-xs text-slate-400 mt-0.5">Installation de chauffe-eau thermopompe Rheem</p>
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
                        <p className="font-semibold text-slate-800">{`Conversion du système de chauffage`}</p>
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

              {totalSubvention > 0 && (
                <>
                  <tr className="bg-green-50">
                    <td className="px-5 py-3" colSpan={2}>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-3.5 h-3.5 text-green-600" />
                        <div>
                          <p className="text-xs font-semibold text-green-800">Possibilité de subvention — Thermopompes</p>
                          <p className="text-xs text-green-600 mt-0.5">
                            {nbThermo} unité{nbThermo > 1 ? "s" : ""} × {subventionThermo.toLocaleString("fr-CA")} $/unité — Programme Logisvert{" "}
                            <a
                              href="#section-subvention-logisvert"
                              onClick={(e) => { e.preventDefault(); document.getElementById("section-subvention-logisvert")?.scrollIntoView({ behavior: "smooth" }); }}
                              className="underline font-semibold"
                              style={{ color: "#16a34a" }}
                            >↓ Détails</a>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-green-600 font-medium" colSpan={2}>
                      − {totalSubvention.toLocaleString("fr-CA")} $
                    </td>
                  </tr>
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

              {totalSubvention === 0 && totalBrut > 0 && (
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
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#1e3a5f" }} />
                  <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#1e3a5f" }}>
                    Fiche technique — Thermopompe TCL T-Pro-25ES
                  </h3>
                </div>
              </CardHeader>
              <>
                <div className="p-4">
                  <img src={tclPhotoPath} alt="TCL T-Pro-25ES — Thermopompe murale" className="w-full rounded border border-slate-200 shadow-sm" />
                </div>
                <div className="p-4 space-y-4">
                  <img src={tclSpecPage1Path} alt="TCL T-Pro-25ES — Spécifications techniques page 1" className="w-full rounded border border-slate-200 shadow-sm" />
                  <img src={tclSpecPage2Path} alt="TCL T-Pro-25ES — Spécifications techniques page 2" className="w-full rounded border border-slate-200 shadow-sm" />
                </div>
              </>
            </div>
          </Card>

          {/* Fiche technique chauffe-eau thermopompe — si stratégie active */}
          {showHeatPumpWaterHeaterStrategy && (
            <Card className="overflow-hidden border shadow-sm">
              <CardHeader className="px-6 py-4 border-b" style={{ backgroundColor: "#f8fafc" }}>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#1e3a5f" }} />
                  <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#1e3a5f" }}>
                    Fiche technique — Chauffe-eau thermopompe Rheem
                  </h3>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <img
                  src={rheemPage1Path}
                  alt="Chauffe-eau hybride Rheem Professional Prestige ProTerra — page 1"
                  className="w-full rounded border border-slate-200 shadow-sm"
                />
                <img
                  src={rheemPage2Path}
                  alt="Données techniques Rheem ProTerra — page 2"
                  className="w-full rounded border border-slate-200 shadow-sm"
                />
                <img
                  src={rheemSpecPath}
                  alt="Fiche technique Rheem PROPH40 T2 RH375-30 Energy Star"
                  className="w-full rounded border border-slate-200 shadow-sm"
                />
              </CardContent>
            </Card>
          )}

          {/* Subvention Logisvert image */}
          <Card id="section-subvention-logisvert" className="overflow-hidden border shadow-sm">
            <CardHeader className="px-6 py-4 border-b" style={{ backgroundColor: "#f8fafc" }}>
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#16a34a" }} />
                <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#1e3a5f" }}>
                  Programme de subvention — Logisvert
                </h3>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <img
                src={tclSubventionImg}
                alt="Tableau des subventions Hydro-Québec pour thermopompes TCL T-Pro-25ES"
                className="w-full rounded-md border border-slate-200 shadow-sm"
              />
            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
}
