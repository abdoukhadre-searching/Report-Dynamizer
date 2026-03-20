import type { Project, ReportData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer, TrendingDown, Zap, Droplets, Wind, Lightbulb, Flame, CheckCircle2 } from "lucide-react";
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

function getNumUnits(occupants?: string): number {
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
  const numUnits = getNumUnits(occupants);
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
  const fullLocation = [address, city, province].filter(Boolean).join(", ");

  const heatingPre = getHeatingLabel(pre);
  const hotWaterPre = getHotWaterLabel(pre);

  const SUBVENTION_THERMOPOMPE = 1296;
  const SUBVENTION_CHAUFFE_EAU_HP = 400;
  const SUBVENTION_VRC = 300;

  const subventionThermopompe = showHeatingStrategy ? thermopompeCount * SUBVENTION_THERMOPOMPE : 0;
  const subventionChauffeEau = showHeatPumpWaterHeaterStrategy ? numUnits * SUBVENTION_CHAUFFE_EAU_HP : 0;
  const subventionVrc = showVrcStrategy ? numUnits * SUBVENTION_VRC : 0;
  const subventionTotal = subventionThermopompe + subventionChauffeEau + subventionVrc;

  const postItems: { icon: React.ReactNode; label: string }[] = [];
  if (showAirTightnessStrategy && postCah !== undefined) {
    postItems.push({ icon: <Wind className="w-4 h-4" />, label: `Étanchéité améliorée — CAH : ${postCah}` });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2 print:hidden">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "#1e3a5f" }}>Stratégie</h2>
          <p className="text-sm text-muted-foreground">Cahier de stratégie énergétique</p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" />
          Imprimer
        </Button>
      </div>

      {/* ── Printable Document ── */}
      <div
        className="bg-white rounded-lg border shadow-sm mx-auto print:shadow-none print:border-none print:rounded-none"
        style={{ maxWidth: 820, fontFamily: "'Inter', sans-serif" }}
        data-testid="strategy-document"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-10 pt-8 pb-5 border-b-2" style={{ borderColor: "#1e3a5f" }}>
          <div>
            <img src={mabLogoPath} alt="MAB Logo" className="h-12 w-auto object-contain" />
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground tracking-widest uppercase">Cahier de</p>
            <p className="text-xl font-bold" style={{ color: "#1e3a5f", fontFamily: "Playfair Display, serif" }}>
              Stratégie
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">APH SELECT</p>
          </div>
        </div>

        {/* Building identity */}
        <div className="px-10 pt-6 pb-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Bâtiment</p>
          <h1 className="text-lg font-bold" style={{ color: "#1e3a5f", fontFamily: "Playfair Display, serif" }}>
            {project.name}
          </h1>
          {fullLocation && (
            <p className="text-sm text-muted-foreground mt-0.5">{fullLocation}</p>
          )}
        </div>

        {/* Energy summary banner */}
        <div className="mx-10 mb-6 rounded-lg overflow-hidden border" style={{ borderColor: "#1e3a5f22" }}>
          <div className="grid grid-cols-3 divide-x" style={{ borderColor: "#1e3a5f22" }}>
            <div className="px-6 py-4 text-center bg-slate-50">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">PRÉ-travaux</p>
              <p className="text-2xl font-bold" style={{ color: "#1e3a5f" }}>{preGJ.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">GJ / an</p>
            </div>
            <div className="px-6 py-4 text-center" style={{ backgroundColor: "#1e3a5f" }}>
              <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Amélioration</p>
              <p className="text-2xl font-bold text-white">{improvPct.toFixed(1)} %</p>
              <p className="text-xs text-blue-200">de réduction</p>
            </div>
            <div className="px-6 py-4 text-center bg-slate-50">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">POST-travaux</p>
              <p className="text-2xl font-bold" style={{ color: "#16a34a" }}>{postGJ.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">GJ / an</p>
            </div>
          </div>
        </div>

        {/* PRÉ / POST sections */}
        <div className="px-10 pb-6 grid grid-cols-2 gap-6">

          {/* PRÉ section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">État PRÉ-travaux</h3>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <tbody className="divide-y">
                  {preCah !== undefined && (
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground bg-slate-50 font-medium w-1/2">CAH @ 50 Pa</td>
                      <td className="px-3 py-2 font-semibold">{preCah}</td>
                    </tr>
                  )}
                  {preRoofRsi !== undefined && (
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground bg-slate-50 font-medium">RSI toit</td>
                      <td className="px-3 py-2 font-semibold">{preRoofRsi.toFixed(2)}</td>
                    </tr>
                  )}
                  {preWallRsi !== undefined && (
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground bg-slate-50 font-medium">RSI murs</td>
                      <td className="px-3 py-2 font-semibold">{preWallRsi.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="px-3 py-2 text-muted-foreground bg-slate-50 font-medium">Chauffage</td>
                    <td className="px-3 py-2 font-semibold">{heatingPre}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-muted-foreground bg-slate-50 font-medium">Eau chaude</td>
                    <td className="px-3 py-2 font-semibold">{hotWaterPre}</td>
                  </tr>
                  {numUnits > 0 && (
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground bg-slate-50 font-medium">Logements</td>
                      <td className="px-3 py-2 font-semibold">{numUnits}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* POST section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#16a34a" }} />
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#16a34a" }}>Mesures POST-travaux</h3>
            </div>
            {postItems.length > 0 ? (
              <div className="border rounded-lg overflow-hidden" style={{ borderColor: "#16a34a44" }}>
                <ul className="divide-y">
                  {postItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 px-3 py-2.5">
                      <span className="mt-0.5 flex-shrink-0 text-green-600">{item.icon}</span>
                      <span className="text-xs font-medium">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="border rounded-lg px-3 py-4 text-xs text-muted-foreground italic text-center">
                Aucune mesure détectée
              </div>
            )}

            {/* CAH POST if changed */}
            {showAirTightnessStrategy && postCah !== undefined && preCah !== undefined && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingDown className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span>Étanchéité : {preCah} → <span className="font-semibold text-foreground">{postCah} CAH @ 50 Pa</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Subventions section */}
        {subventionTotal > 0 && (
          <>
            <div className="mx-10 mb-6 border-t pt-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4" style={{ color: "#1e3a5f" }} />
                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#1e3a5f" }}>
                  Subventions estimées
                </h3>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left" style={{ backgroundColor: "#1e3a5f10" }}>
                      <th className="px-4 py-2 font-semibold text-muted-foreground">Mesure</th>
                      <th className="px-4 py-2 font-semibold text-muted-foreground text-center">Unités</th>
                      <th className="px-4 py-2 font-semibold text-muted-foreground text-right">Montant / unité</th>
                      <th className="px-4 py-2 font-semibold text-muted-foreground text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {showHeatingStrategy && thermopompeCount > 0 && (
                      <tr>
                        <td className="px-4 py-2 font-medium">Thermopompes</td>
                        <td className="px-4 py-2 text-center text-muted-foreground">{thermopompeCount}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{SUBVENTION_THERMOPOMPE.toLocaleString("fr-CA")} $</td>
                        <td className="px-4 py-2 text-right font-semibold">{subventionThermopompe.toLocaleString("fr-CA")} $</td>
                      </tr>
                    )}
                    {showHeatPumpWaterHeaterStrategy && numUnits > 0 && (
                      <tr>
                        <td className="px-4 py-2 font-medium">Chauffe-eaux thermopompe</td>
                        <td className="px-4 py-2 text-center text-muted-foreground">{numUnits}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{SUBVENTION_CHAUFFE_EAU_HP.toLocaleString("fr-CA")} $</td>
                        <td className="px-4 py-2 text-right font-semibold">{subventionChauffeEau.toLocaleString("fr-CA")} $</td>
                      </tr>
                    )}
                    {showVrcStrategy && numUnits > 0 && (
                      <tr>
                        <td className="px-4 py-2 font-medium">VRC</td>
                        <td className="px-4 py-2 text-center text-muted-foreground">{numUnits}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{SUBVENTION_VRC.toLocaleString("fr-CA")} $</td>
                        <td className="px-4 py-2 text-right font-semibold">{subventionVrc.toLocaleString("fr-CA")} $</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: "#1e3a5f" }}>
                      <td colSpan={3} className="px-4 py-2.5 text-white font-bold text-right">Total estimé</td>
                      <td className="px-4 py-2.5 text-white font-bold text-right">{subventionTotal.toLocaleString("fr-CA")} $</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2 italic">
                * Les montants de subvention sont des estimations à titre indicatif. Les montants réels peuvent varier selon les programmes en vigueur.
              </p>
            </div>
          </>
        )}

        {/* GES reduction */}
        {pre.annualSummary && post.annualSummary && (
          <div className="mx-10 mb-8">
            <div className="rounded-lg px-5 py-4 flex items-center justify-between" style={{ backgroundColor: "#1e3a5f08", border: "1px solid #1e3a5f22" }}>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Réduction GES estimée</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: "#1e3a5f" }}>
                  {((pre.annualSummary.ghgTotal ?? 0) - (post.annualSummary.ghgTotal ?? 0)).toFixed(3)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">T CO₂ éq. / an</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Économie GES</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: "#16a34a" }}>
                  {pre.annualSummary.ghgTotal && pre.annualSummary.ghgTotal > 0
                    ? (((pre.annualSummary.ghgTotal - (post.annualSummary.ghgTotal ?? 0)) / pre.annualSummary.ghgTotal) * 100).toFixed(1)
                    : "0"}{" "}
                  <span className="text-sm font-normal text-muted-foreground">%</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-10 py-4 border-t flex items-center justify-between" style={{ borderColor: "#1e3a5f22" }}>
          <p className="text-xs text-muted-foreground">MAB — Marc André Boucher, Conseils Immobiliers</p>
          <p className="text-xs text-muted-foreground">438 521-9645</p>
        </div>
      </div>
    </div>
  );
}
