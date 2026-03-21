import type { Project, ReportData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, TrendingDown, Zap, Droplets, Wind, Lightbulb, Flame } from "lucide-react";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";

interface StrategyTabProps {
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

function hasHeatPumpWaterHeater(post: ReportData): boolean {
  return /thermopompe/i.test(post.hotWater?.equipmentType || "");
}

function getHeatingLabel(data: ReportData): string {
  const equip = data.heating?.primaryEquipment || "";
  const type = data.heating?.primaryType || "";
  if (/thermopompe|source d'air/i.test(equip)) return "Thermopompe";
  if (/plinthe|résistance|électrique/i.test(equip) || /électricité/i.test(type)) return "Plinthes électriques";
  if (/gaz naturel/i.test(type)) return "Fournaise au gaz naturel";
  if (/mazout/i.test(type)) return "Fournaise au mazout";
  return equip || type || "N/A";
}

function getHotWaterLabel(data: ReportData): string {
  const equip = data.hotWater?.equipmentType || "";
  const type = data.hotWater?.primaryType || "";
  if (/thermopompe/i.test(equip)) return "Chauffe-eau thermopompe";
  if (/réser/i.test(equip) && /électricité/i.test(type)) return "Chauffe-eau électrique";
  if (/gaz naturel/i.test(type)) return "Chauffe-eau au gaz naturel";
  return equip || "N/A";
}


export default function StrategyTab({ project }: StrategyTabProps) {
  const pre = project.preReportData as ReportData | null;
  const post = project.postReportData as ReportData | null;

  if (!pre || !post) return null;

  const preGJ = pre.annualSummary?.totalGJ ?? 0;
  const postGJ = post.annualSummary?.totalGJ ?? 0;
  const improvPct = preGJ > 0 ? ((preGJ - postGJ) / preGJ) * 100 : 0;

  const preCah = pre.airLeakage?.cah50;
  const postCah = post.airLeakage?.cah50;

  const preRoofRsi = pre.zone1?.find((z) => /plafond/i.test(z.element))?.rsi;
  const preWallRsi = pre.buildingInfo?.wallMaxRsi;

  const occupants = pre.buildingInfo?.occupants;
  const numUnits = getNumUnitsFromOccupants(occupants);
  const thermopompeCount = getThermopompeCount(occupants);

  const showHeatingStrategy = hasThermopompe(post) && !hasThermopompe(pre);
  const showAirTightnessStrategy = hasAirTightnessChanged(pre, post);
  const showHotWaterStrategy = hasHotWaterChanged(pre, post);
  const showLedStrategy = hasLedImprovement(pre, post);
  const showVrcStrategy = hasVrcInstallation(post);
  const showGasConversionStrategy = hasFossilConversion(pre, post);
  const showHeatPumpWaterHeaterStrategy = hasHeatPumpWaterHeater(post);

  const address = project.address || pre.buildingInfo?.address || "";
  const city = project.city || pre.buildingInfo?.city || "";
  const province = project.province || pre.buildingInfo?.province || "";
  const fullAddress = [address, city, province].filter(Boolean).join(", ");

  const heatingPre = getHeatingLabel(pre);
  const hotWaterPre = getHotWaterLabel(pre);


  const postItems: { icon: React.ReactNode; label: string }[] = [];
  if (showAirTightnessStrategy && postCah !== undefined) {
    postItems.push({ icon: <Wind className="w-4 h-4" />, label: `Améliorer l'étanchéité à ${postCah} CAH @ 50 Pa` });
  }
  if (showHeatingStrategy) {
    postItems.push({ icon: <Zap className="w-4 h-4" />, label: `${thermopompeCount} Thermopompe${thermopompeCount > 1 ? "s" : ""} haute efficacité` });
  }
  if (showHeatPumpWaterHeaterStrategy) {
    postItems.push({ icon: <Droplets className="w-4 h-4" />, label: `${numUnits > 0 ? numUnits : ""} Chauffe-eau${numUnits > 1 ? "x" : ""} Thermopompe` });
  } else if (showHotWaterStrategy) {
    postItems.push({ icon: <Droplets className="w-4 h-4" />, label: "Pommeaux de douche et robinets à faible débit" });
  }
  if (showVrcStrategy) {
    postItems.push({ icon: <Wind className="w-4 h-4" />, label: `${numUnits > 0 ? numUnits : ""} VRC (Ventilateur récupérateur de chaleur)` });
  }
  if (showLedStrategy) {
    postItems.push({ icon: <Lightbulb className="w-4 h-4" />, label: "Remplacement des luminaires DEL" });
  }
  if (showGasConversionStrategy) {
    postItems.push({ icon: <Flame className="w-4 h-4" />, label: "Conversion fossile vers électricité" });
  }

  const handlePrint = () => window.print();

  const ghgBefore = pre.annualSummary?.ghgTotal ?? 0;
  const ghgAfter = post.annualSummary?.ghgTotal ?? 0;
  const ghgDelta = ghgBefore - ghgAfter;
  const ghgPct = ghgBefore > 0 ? (ghgDelta / ghgBefore) * 100 : 0;

  const dateStr = new Date().toLocaleDateString("fr-CA", { year: "numeric", month: "2-digit", day: "2-digit" });

  return (
    <div
      className="space-y-4"
      style={{ "--card": "0 0% 100%", "--background": "0 0% 100%" } as React.CSSProperties}
    >
      <div className="flex items-center justify-between gap-4 mb-4 print:hidden">
        <h2 className="font-medium" style={{ color: "#1e3a5f" }}>Cahier de stratégie APH SELECT</h2>
        <Button variant="secondary" size="sm" onClick={handlePrint} className="gap-2" data-testid="button-print-strategy">
          <Printer className="w-4 h-4" />
          Imprimer / PDF
        </Button>
      </div>

      <div id="strategy-content">
        {/* ── PAGE PRINCIPALE ── */}
        <Card className="print:shadow-none print:border-none overflow-hidden" data-testid="strategy-document">
          <CardContent className="p-0 report-prose">
            <div className="flex" style={{ minHeight: "600px" }}>
              {/* Left accent bar — same gradient as the report */}
              <div
                className="w-3 flex-shrink-0"
                style={{ background: "linear-gradient(to bottom, #1e3a5f, #c0392b)" }}
              />

              <div className="flex-1 flex flex-col">
                {/* Cover header */}
                <div className="flex items-start justify-between px-8 pt-8 pb-4">
                  <div>
                    <h1
                      className="text-2xl font-bold leading-snug mb-1"
                      style={{ fontFamily: "'Playfair Display', serif", color: "#1e3a5f", maxWidth: "440px" }}
                    >
                      Cahier de Stratégie
                    </h1>
                    <p className="text-sm text-slate-500" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {fullAddress}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-6">
                    <p className="text-5xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#c0392b" }}>
                      {new Date().getFullYear()}
                    </p>
                  </div>
                </div>

                {/* Energy banner */}
                <div className="mx-8 mb-6 rounded-lg overflow-hidden border" style={{ borderColor: "#1e3a5f33" }}>
                  <div className="grid grid-cols-3 divide-x divide-slate-200">
                    <div className="px-6 py-5 text-center bg-slate-50">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">PRÉ-travaux</p>
                      <p className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#1e3a5f" }}>
                        {preGJ.toFixed(1)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">GJ / an</p>
                    </div>
                    <div className="px-6 py-5 text-center" style={{ backgroundColor: "#1e3a5f" }}>
                      <p className="text-xs text-white uppercase tracking-wider mb-1">Amélioration</p>
                      <p className="text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {improvPct.toFixed(1)} %
                      </p>
                      <p className="text-xs text-white mt-0.5">de réduction</p>
                    </div>
                    <div className="px-6 py-5 text-center bg-slate-50">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">POST-travaux</p>
                      <p className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#16a34a" }}>
                        {postGJ.toFixed(1)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">GJ / an</p>
                    </div>
                  </div>
                </div>

                {/* PRÉ / POST two-column */}
                <div className="px-8 pb-6 grid grid-cols-2 gap-6">
                  {/* PRÉ */}
                  <div>
                    <h3
                      className="text-xs font-bold uppercase tracking-widest mb-3"
                      style={{ color: "#1e3a5f", fontFamily: "'Inter', sans-serif" }}
                    >
                      État PRÉ-travaux
                    </h3>
                    <table className="w-full text-xs border rounded-lg overflow-hidden">
                      <tbody className="divide-y divide-slate-100">
                        {preCah !== undefined && (
                          <tr>
                            <td className="px-3 py-2 bg-slate-50 text-slate-500 font-medium w-1/2">CAH @ 50 Pa</td>
                            <td className="px-3 py-2 font-semibold">{preCah}</td>
                          </tr>
                        )}
                        {preRoofRsi !== undefined && (
                          <tr>
                            <td className="px-3 py-2 bg-slate-50 text-slate-500 font-medium">RSI toit</td>
                            <td className="px-3 py-2 font-semibold">{preRoofRsi.toFixed(2)}</td>
                          </tr>
                        )}
                        {preWallRsi !== undefined && (
                          <tr>
                            <td className="px-3 py-2 bg-slate-50 text-slate-500 font-medium">RSI murs</td>
                            <td className="px-3 py-2 font-semibold">{preWallRsi.toFixed(2)}</td>
                          </tr>
                        )}
                        <tr>
                          <td className="px-3 py-2 bg-slate-50 text-slate-500 font-medium">Chauffage</td>
                          <td className="px-3 py-2 font-semibold">{heatingPre}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 bg-slate-50 text-slate-500 font-medium">Eau chaude</td>
                          <td className="px-3 py-2 font-semibold">{hotWaterPre}</td>
                        </tr>
                        {numUnits > 0 && (
                          <tr>
                            <td className="px-3 py-2 bg-slate-50 text-slate-500 font-medium">Logements</td>
                            <td className="px-3 py-2 font-semibold">{numUnits}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* POST */}
                  <div>
                    <h3
                      className="text-xs font-bold uppercase tracking-widest mb-3"
                      style={{ color: "#16a34a", fontFamily: "'Inter', sans-serif" }}
                    >
                      Mesures POST-travaux
                    </h3>
                    {postItems.length > 0 ? (
                      <ul
                        className="text-xs divide-y rounded-lg overflow-hidden border"
                        style={{ borderColor: "#16a34a44" }}
                      >
                        {postItems.map((item, i) => (
                          <li key={i} className="flex items-start gap-2.5 px-3 py-2.5">
                            <span className="mt-0.5 flex-shrink-0 text-green-600">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="border rounded-lg px-3 py-4 text-xs text-slate-400 italic text-center">
                        Aucune mesure détectée
                      </div>
                    )}

                  </div>
                </div>


                {/* GES reduction */}
                {ghgBefore > 0 && (
                  <div className="mx-8 mb-6">
                    <div
                      className="rounded-lg px-6 py-4 flex items-center justify-between"
                      style={{ backgroundColor: "#1e3a5f08", border: "1px solid #1e3a5f22" }}
                    >
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Réduction GES estimée</p>
                        <p className="text-xl font-bold mt-0.5" style={{ fontFamily: "'Playfair Display', serif", color: "#1e3a5f" }}>
                          {ghgDelta.toFixed(3)}{" "}
                          <span className="text-sm font-normal text-slate-400">T CO₂ éq. / an</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Économie GES</p>
                        <p className="text-xl font-bold mt-0.5" style={{ fontFamily: "'Playfair Display', serif", color: "#16a34a" }}>
                          {ghgPct.toFixed(1)}{" "}
                          <span className="text-sm font-normal text-slate-400">%</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer — same as report */}
                <div className="mt-auto px-8 pb-8">
                  <div
                    className="flex items-end justify-between pt-5"
                    style={{ borderTop: "2px solid #1e3a5f" }}
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={mabLogoPath}
                        alt="MAB — Marc André Boucher, Conseils Immobiliers"
                        className="h-16 w-auto object-contain"
                      />
                    </div>
                    <div className="text-right text-xs text-slate-500" style={{ fontFamily: "'Inter', sans-serif" }}>
                      <p className="font-semibold text-slate-700">9433-6450 QC INC.</p>
                      <p>{dateStr}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
