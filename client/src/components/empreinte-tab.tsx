import { useState } from "react";
import type { Project, ReportData } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Zap, Droplets, Wind, Lightbulb, DollarSign, TrendingDown, Building2, Lock, Waves, Printer } from "lucide-react";
import innovairPage1Path from "@assets/Q4_Innovair_(003)_page-0001_1773707799066.jpg";
import innovairPage2Path from "@assets/Q4_Innovair_(003)_page-0002_1773707799066.jpg";
import ashpPage1Path from "@assets/ASHP_page-0001_1774063357553.jpg";
import ashpPage2Path from "@assets/ASHP_page-0002_1774063357552.jpg";
import rheemPage1Path from "@assets/112977A7-A4C8-4E50-B387-6EA23C05007A_(1)_pages-to-jpg-0001_1774062589098.jpg";
import rheemPage2Path from "@assets/112977A7-A4C8-4E50-B387-6EA23C05007A_(1)_pages-to-jpg-0002_1774062589099.jpg";
import rheemSpecPath from "@assets/RheemHeatPumpPROPH40T2RH37530-2026-03-17_page-0001_1774062648838.jpg";
const thermoSubventionImg = "/thermo-subvention-hydro.jpg";

interface EmpreinteTabProps {
  project: Project;
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

const SUBVENTION_THERMO = 1296;

export default function EmpreinteTab({ project }: EmpreinteTabProps) {
  const pre = project.preReportData as ReportData | null;
  const post = project.postReportData as ReportData | null;

  const [coutEtancheite, setCoutEtancheite] = useState(5000);
  const [coutThermo, setCoutThermo] = useState(2995);
  const [coutChauffeEau, setCoutChauffeEau] = useState(2305);
  const [coutVrc, setCoutVrc] = useState(0);
  const [coutFaibleDebit, setCoutFaibleDebit] = useState(0);
  const [coutLed, setCoutLed] = useState(0);

  if (!pre || !post) return null;

  const occupants = pre.buildingInfo?.occupants;
  const numUnits = getNumUnitsFromOccupants(occupants);

  const showHeatingStrategy = hasThermopompe(post) && !hasThermopompe(pre);
  const showHeatPumpWaterHeaterStrategy = hasHeatPumpWaterHeater(post);
  const showVrcStrategy = hasVrcInstallation(post);
  const showLedStrategy = hasLedImprovement(pre, post);

  const nbThermo = getThermopompeCount(occupants);
  const nbUnits = numUnits > 0 ? numUnits : 1;

  const preGJ = pre.annualSummary?.totalGJ ?? 0;
  const postGJ = post.annualSummary?.totalGJ ?? 0;
  const improvPct = preGJ > 0 ? ((preGJ - postGJ) / preGJ) * 100 : 0;

  const totalEtancheite = coutEtancheite;
  const totalThermo = showHeatingStrategy ? nbThermo * coutThermo : 0;
  const totalChauffeEau = showHeatPumpWaterHeaterStrategy ? nbUnits * coutChauffeEau : 0;
  const totalVrc = showVrcStrategy ? coutVrc : 0;
  const totalFaibleDebit = coutFaibleDebit;
  const totalLed = showLedStrategy ? coutLed : 0;

  const totalBrut = totalEtancheite + totalThermo + totalChauffeEau + totalVrc + totalFaibleDebit + totalLed;
  const totalSubvention = showHeatingStrategy ? nbThermo * SUBVENTION_THERMO : 0;
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
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header Card */}
      <Card className="overflow-hidden border-0 shadow-sm" style={{ borderTop: "4px solid #1e3a5f" }}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-5 h-5" style={{ color: "#1e3a5f" }} />
                <h2 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#1e3a5f" }}>
                  Empreinte économique
                </h2>
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
            </div>
            <div className="flex flex-col items-end gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80 print:hidden"
                style={{ backgroundColor: "#1e3a5f" }}
              >
                <Printer className="w-4 h-4" />
                Télécharger (PDF)
              </button>
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
            <span className="text-xs text-slate-400 ml-auto">
              Cliquez sur un montant pour le modifier
            </span>
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

              {/* Étanchéité — always shown */}
              <tr className="hover:bg-blue-50/40 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <IconBox><Lock className="w-4 h-4" style={{ color: "#1e3a5f" }} /></IconBox>
                    <div>
                      <p className="font-semibold text-slate-800">Étanchéité à l'air</p>
                      <p className="text-xs text-slate-400 mt-0.5">Travaux d'étanchéisation de l'enveloppe</p>
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

              {/* Thermopompes — conditional */}
              {showHeatingStrategy && (
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <IconBox><Zap className="w-4 h-4" style={{ color: "#1e3a5f" }} /></IconBox>
                      <div>
                        <p className="font-semibold text-slate-800">Thermopompes</p>
                        <p className="text-xs text-slate-400 mt-0.5">Innovair QHW12H2UZRA / QOS12H2BM5A</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center"><UnitBadge n={nbThermo} /></td>
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
                        <p className="text-xs text-slate-400 mt-0.5">Remplacement chauffe-eau existant</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center"><UnitBadge n={nbUnits} /></td>
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
                  <td className="px-5 py-4 text-center text-slate-400 text-xs">—</td>
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

              {/* Faible débit — always shown, like DEL */}
              <tr className="hover:bg-blue-50/40 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <IconBox><Waves className="w-4 h-4" style={{ color: "#1e3a5f" }} /></IconBox>
                    <div>
                      <p className="font-semibold text-slate-800">Robinetterie faible débit</p>
                      <p className="text-xs text-slate-400 mt-0.5">Pommeaux de douche et aérateurs ECD</p>
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

              {/* Éclairage DEL — conditional */}
              {showLedStrategy && (
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <IconBox><Lightbulb className="w-4 h-4" style={{ color: "#1e3a5f" }} /></IconBox>
                      <div>
                        <p className="font-semibold text-slate-800">Éclairage DEL</p>
                        <p className="text-xs text-slate-400 mt-0.5">Remplacement des luminaires existants</p>
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
                            {nbThermo} unité{nbThermo > 1 ? "s" : ""} × {SUBVENTION_THERMO.toLocaleString("fr-CA")} $/unité — Programme Hydro-Québec
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
            <CardHeader className="px-6 py-4 border-b" style={{ backgroundColor: "#f8fafc" }}>
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#1e3a5f" }} />
                <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#1e3a5f" }}>
                  Fiche technique — Thermopompe Innovair
                </h3>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <img
                src={innovairPage1Path}
                alt="Innovair Q4 — Spécifications techniques page 1"
                className="w-full rounded border border-slate-200 shadow-sm"
              />
              <img
                src={innovairPage2Path}
                alt="Innovair Q4 — Spécifications techniques page 2"
                className="w-full rounded border border-slate-200 shadow-sm"
              />
              <img
                src={ashpPage1Path}
                alt="ASHP — Caractéristiques page 1"
                className="w-full rounded border border-slate-200 shadow-sm"
              />
              <img
                src={ashpPage2Path}
                alt="ASHP — Caractéristiques page 2"
                className="w-full rounded border border-slate-200 shadow-sm"
              />
            </CardContent>
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

          {/* Subvention Hydro-Québec image */}
          <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="px-6 py-4 border-b" style={{ backgroundColor: "#f8fafc" }}>
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#16a34a" }} />
                <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#1e3a5f" }}>
                  Programme de subvention — Hydro-Québec
                </h3>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <img
                src={thermoSubventionImg}
                alt="Tableau des subventions Hydro-Québec pour thermopompes Innovair"
                className="w-full rounded-md border border-slate-200 shadow-sm"
              />
            </CardContent>
          </Card>
        </>
      )}

      <p className="text-xs text-slate-400 italic pb-2">
        * Les montants présentés sont des estimations à titre indicatif afin de planifier les travaux.
        Un devis détaillé doit être obtenu auprès d'entrepreneurs qualifiés avant de procéder.
      </p>
    </div>
  );
}
