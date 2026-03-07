import type { ReportData, BuildingZone, MonthlyEnergy } from "@shared/schema";

function getLines(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
}

function findLineIndex(lines: string[], marker: string, startFrom = 0): number {
  for (let i = startFrom; i < lines.length; i++) {
    if (lines[i].includes(marker)) return i;
  }
  return -1;
}

function collectNumbers(lines: string[], startIdx: number, count: number): number[] {
  const nums: number[] = [];
  for (let i = startIdx; i < lines.length && nums.length < count; i++) {
    const cleaned = lines[i].replace(/,/g, ".").replace(/\s/g, "");
    const val = parseFloat(cleaned);
    if (!isNaN(val) && /^[-\d.]+$/.test(cleaned)) {
      nums.push(val);
    }
  }
  return nums;
}

function extractValueAfterLabel(text: string, label: string): number | undefined {
  const idx = text.indexOf(label);
  if (idx === -1) return undefined;
  const after = text.substring(idx + label.length, idx + label.length + 200);
  const match = after.match(/([\d]+(?:[.,]\d+)?)/);
  if (match) {
    return parseFloat(match[1].replace(",", "."));
  }
  return undefined;
}

function extractStringAfterLabel(text: string, label: string): string | undefined {
  const idx = text.indexOf(label);
  if (idx === -1) return undefined;
  const after = text.substring(idx + label.length, idx + label.length + 200);
  const lines = after.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  return lines[0] || undefined;
}

export function parseHot2000Report(content: string): ReportData {
  const lines = getLines(content);
  const fullText = content;

  const buildingInfo = parseBuildingInfo(fullText, lines);
  const zone1 = parseZone1(lines);
  const zone1Total = parseZoneTotal(lines, "ZONE 1 Totaux:");
  const zone3 = parseZone3(lines);
  const zone3Total = parseZoneTotal(lines, "ZONE 3 Totaux:");
  const ventilation = parseVentilation(lines);
  const totalHeatLossMJ = parseTotalHeatLoss(fullText);
  const monthlyEnergy = parseMonthlyEnergy(lines);
  const annualEnergy = parseAnnualEnergy(lines);
  const airLeakage = parseAirLeakage(fullText);
  const airTightness = parseAirTightness(fullText);
  if (airTightness.preCAH50 !== undefined) {
    if (!airLeakage) {
    } else {
      airLeakage.cah50 = airTightness.preCAH50;
    }
  }
  const heating = parseHeating(fullText);
  const cooling = parseCooling(fullText);
  const hotWater = parseHotWater(fullText);
  const annualSummary = parseAnnualSummary(
    fullText, monthlyEnergy, annualEnergy,
    heating?.primaryType, hotWater?.primaryType
  );
  const interiorLightingKWh = parseInteriorLightingKWh(fullText);
  const centralVentilation = parseCentralVentilation(fullText);

  return {
    buildingInfo,
    zone1,
    zone1Total,
    zone3,
    zone3Total,
    ventilation,
    totalHeatLossMJ,
    monthlyEnergy,
    annualEnergy,
    airLeakage,
    heating,
    cooling,
    hotWater,
    interiorLightingKWh,
    centralVentilation,
    annualSummary,
  };
}

function parseBuildingInfo(text: string, lines: string[]): ReportData["buildingInfo"] {
  const info: NonNullable<ReportData["buildingInfo"]> = {};

  const clientIdx = findLineIndex(lines, "Nom du client:");
  if (clientIdx >= 0) {
    const addrIdx = findLineIndex(lines, "Adresse:", clientIdx);
    if (addrIdx >= 0) {
      const valuesStart = addrIdx + 1;
      const nextLabelIdx = Math.min(
        findLineIndex(lines, "Adresse:", valuesStart) >= 0 ? findLineIndex(lines, "Adresse:", valuesStart) : lines.length,
        findLineIndex(lines, "Province:", valuesStart) >= 0 ? findLineIndex(lines, "Province:", valuesStart) : lines.length
      );
      const valueLines: string[] = [];
      for (let i = valuesStart; i < nextLabelIdx && i < lines.length; i++) {
        const l = lines[i];
        if (l && !l.startsWith("Ville:") && !l.startsWith("Code") && !l.startsWith("Province:") && !l.startsWith("Adresse:")) {
          valueLines.push(l);
        }
      }
      if (valueLines.length >= 1) info.address = valueLines.length >= 2 ? valueLines[1] : valueLines[0];
    }
  }

  const fichierIdx = findLineIndex(lines, "Fichier:");
  const fileNameLine = fichierIdx >= 0 && fichierIdx + 1 < lines.length ? lines[fichierIdx + 1] : "";

  if (info.address) {
    const addrLineIdx = lines.indexOf(info.address);
    if (addrLineIdx >= 0) {
      for (let i = addrLineIdx + 1; i < Math.min(addrLineIdx + 3, lines.length); i++) {
        if (lines[i] && !/^[A-Z]\d[A-Z]/.test(lines[i]) && !/^\d/.test(lines[i]) && lines[i].length > 2) {
          info.city = lines[i];
          break;
        }
      }
    }
  }

  const provinceIdx = findLineIndex(lines, "Province:");
  if (provinceIdx >= 0) {
    for (let i = provinceIdx + 1; i < Math.min(provinceIdx + 5, lines.length); i++) {
      if (lines[i] && !lines[i].startsWith("T") && lines[i].length > 2) {
        info.province = lines[i];
        break;
      }
    }
  }

  for (const label of ["Code Postal:", "Code postal:"]) {
    const postalIdx = findLineIndex(lines, label);
    if (postalIdx >= 0) {
      for (let i = postalIdx + 1; i < Math.min(postalIdx + 5, lines.length); i++) {
        if (/^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i.test(lines[i])) {
          info.postalCode = lines[i];
          break;
        }
      }
      if (info.postalCode) break;
    }
  }

  const caracIdx = findLineIndex(lines, "CARACTÉRISTIQUES GÉNÉRALES DE LA MAISON");
  if (caracIdx >= 0) {
    const lastKnownLabel = findLineIndex(lines, "Niveau phréatique:", caracIdx);
    const searchEnd = lastKnownLabel >= 0 ? lastKnownLabel + 20 : caracIdx + 30;

    for (let i = caracIdx; i < Math.min(searchEnd, lines.length); i++) {
      const l = lines[i];
      if (!info.numFloors && /étage/i.test(l) && !/Nombre/i.test(l)) {
        info.numFloors = l;
      }
      if (!info.orientation) {
        const lLow = l.toLowerCase();
        if ((lLow === "nord" || lLow === "sud" || lLow === "est" || lLow === "ouest" ||
            lLow === "nord-est" || lLow === "nord-ouest" || lLow === "sud-est" || lLow === "sud-ouest") &&
            !lLow.includes("fenêtre")) {
          info.orientation = l;
        }
      }
      if (!info.yearBuilt && /^\d{4}$/.test(l)) {
        info.yearBuilt = l;
      }
    }
  }

  if (!info.yearBuilt) {
    const yearMatch = text.match(/Année construite:\s*\n?\s*(\d{4})/);
    if (yearMatch) info.yearBuilt = yearMatch[1];
  }

  if (!info.numFloors) {
    const floorsIdx = findLineIndex(lines, "Nombre d'étages:");
    if (floorsIdx >= 0) {
      for (let i = floorsIdx; i < Math.min(floorsIdx + 10, lines.length); i++) {
        const l = lines[i].toLowerCase();
        if (l.includes("étage") && !l.includes("nombre")) {
          info.numFloors = lines[i];
          break;
        }
      }
    }
  }

  if (!info.orientation) {
    const orientIdx = findLineIndex(lines, "Orientation de la façade:");
    if (orientIdx >= 0) {
      for (let i = orientIdx; i < Math.min(orientIdx + 10, lines.length); i++) {
        const l = lines[i].toLowerCase();
        if ((l.includes("nord") || l.includes("sud") || l.includes("est") || l.includes("ouest")) && !l.includes("orientation") && !l.includes("fenêtre")) {
          info.orientation = lines[i];
          break;
        }
      }
    }
  }

  const climateMatch = text.match(/Données du climat pour:\s*\n?\s*(.+?)(?:\n|$)/);
  if (climateMatch) info.climateData = climateMatch[1].trim();

  const occupantMatch = text.match(/(\d+)\s*adultes?\s*pour\s*([\d.]+)%/);
  if (occupantMatch) {
    info.occupants = `${occupantMatch[1]} adultes pour ${occupantMatch[2]}% du temps`;
  }

  return info;
}

function parseZone1(lines: string[]): BuildingZone[] {
  const zones: BuildingZone[] = [];
  const startIdx = findLineIndex(lines, "ZONE 1 : AU-DESSUS DU NIVEAU DU SOL");
  const endIdx = findLineIndex(lines, "ZONE 1 Totaux:");
  if (startIdx < 0 || endIdx < 0) return zones;

  const elements = [
    { name: "Plafond", search: "Plafond" },
    { name: "Murs principaux", search: "Murs principaux" },
    { name: "Portes", search: "Portes" },
    { name: "nord-est Fenêtres", search: "nord-est Fen" },
    { name: "sud-ouest Fenêtres", search: "sud-ouest Fen" },
  ];

  for (const el of elements) {
    let elIdx = -1;
    for (let i = startIdx; i < endIdx; i++) {
      if (lines[i].includes(el.search)) {
        elIdx = i;
        break;
      }
    }
    if (elIdx < 0) continue;

    const nums = collectNumbers(lines, elIdx + 1, 5);
    if (nums.length >= 5) {
      zones.push({
        element: el.name,
        grossArea: nums[0],
        netArea: nums[1],
        rsi: nums[2],
        heatLossMJ: nums[3],
        heatLossPercent: nums[4],
      });
    } else if (nums.length >= 4) {
      zones.push({
        element: el.name,
        grossArea: nums[0],
        netArea: nums[1],
        rsi: nums[2],
        heatLossMJ: nums[3],
        heatLossPercent: 0,
      });
    }
  }

  return zones;
}

function parseZone3(lines: string[]): BuildingZone[] {
  const zones: BuildingZone[] = [];
  const startIdx = findLineIndex(lines, "ZONE 3 : FONDATION");
  const endIdx = findLineIndex(lines, "ZONE 3 Totaux:");
  if (startIdx < 0 || endIdx < 0) return zones;

  const elements = [
    { name: "Superficie des murs", search: "Superficie des murs" },
    { name: "Solive de rive", search: "Solive de rive" },
  ];

  for (const el of elements) {
    let elIdx = -1;
    for (let i = startIdx; i < endIdx; i++) {
      if (lines[i].includes(el.search)) {
        elIdx = i;
        break;
      }
    }
    if (elIdx < 0) continue;

    const nums = collectNumbers(lines, elIdx + 1, 5);
    if (nums.length >= 5) {
      zones.push({
        element: el.name,
        grossArea: nums[0],
        netArea: nums[1],
        rsi: nums[2],
        heatLossMJ: nums[3],
        heatLossPercent: nums[4],
      });
    }
  }

  const airIdx = findLineIndex(lines, "Air", startIdx);
  if (airIdx > startIdx && airIdx < endIdx) {
    const fondIdx = findLineIndex(lines, "Fondation", airIdx);
    if (fondIdx > airIdx && fondIdx < endIdx) {
      const nums = collectNumbers(lines, fondIdx + 1, 4);
      if (nums.length >= 2) {
        zones.push({
          element: "Air Fondation",
          grossArea: nums[0],
          netArea: nums.length >= 2 ? nums[1] : undefined,
          heatLossMJ: 0,
          heatLossPercent: 0,
        });
      }
    }
  }

  return zones;
}

function parseZoneTotal(lines: string[], marker: string): { heatLossMJ: number; heatLossPercent: number } | undefined {
  const idx = findLineIndex(lines, marker);
  if (idx < 0) return undefined;

  const numPairs: Array<[number, number]> = [];
  const allNums: number[] = [];
  for (let i = Math.max(0, idx - 30); i < idx; i++) {
    const cleaned = lines[i].replace(/,/g, ".").replace(/\s/g, "");
    if (cleaned === "-" || cleaned === "") continue;
    const val = parseFloat(cleaned);
    if (!isNaN(val) && /^[-\d.]+$/.test(cleaned)) {
      allNums.push(val);
    }
  }

  for (let i = 0; i < allNums.length - 1; i++) {
    if (allNums[i] > 100 && allNums[i + 1] < 100 && allNums[i + 1] > 0) {
      numPairs.push([allNums[i], allNums[i + 1]]);
    }
  }

  if (numPairs.length > 0) {
    const best = numPairs[numPairs.length - 1];
    return {
      heatLossMJ: best[0],
      heatLossPercent: best[1],
    };
  }

  if (allNums.length >= 2) {
    return {
      heatLossMJ: allNums[allNums.length - 2],
      heatLossPercent: allNums[allNums.length - 1],
    };
  }
  return undefined;
}

function parseVentilation(lines: string[]): ReportData["ventilation"] {
  const ventIdx = findLineIndex(lines, "Ventilation");
  if (ventIdx < 0) return undefined;

  const volIdx = findLineIndex(lines, "Volume de la maison", ventIdx);
  if (volIdx < 0) return undefined;

  let volume: number | undefined;
  let airChange: number | undefined;
  let heatLossMJ: number | undefined;
  let heatLossPercent: number | undefined;

  for (let i = volIdx; i < Math.min(volIdx + 15, lines.length); i++) {
    const volMatch = lines[i].match(/([\d.]+)\s*m3/);
    if (volMatch && !volume) volume = parseFloat(volMatch[1]);

    const cahMatch = lines[i].match(/([\d.]+)\s*CAH/);
    if (cahMatch && !airChange) airChange = parseFloat(cahMatch[1]);
  }

  const cahIdx = findLineIndex(lines, "CAH", volIdx);
  if (cahIdx >= 0) {
    const nums = collectNumbers(lines, cahIdx + 1, 2);
    if (nums.length >= 2) {
      heatLossMJ = nums[0];
      heatLossPercent = nums[1];
    }
  }

  if (volume || airChange) {
    return { volume, airChange, heatLossMJ, heatLossPercent };
  }
  return undefined;
}

function parseTotalHeatLoss(text: string): number | undefined {
  const match = text.match(/Perte de chaleur brute:\s*\n?\s*([\d,. ]+)\s*MJ/);
  if (match) return parseFloat(match[1].replace(/\s/g, "").replace(",", "."));

  const match2 = text.match(/Perte de chaleur brute:\s*([\d]+)\s*MJ/);
  if (match2) return parseFloat(match2[1]);

  return undefined;
}

function parseMonthlyEnergy(lines: string[]): MonthlyEnergy[] {
  const months: MonthlyEnergy[] = [];
  const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Août", "Sep", "Oct", "Nov", "Déc"];

  const startIdx = findLineIndex(lines, "ESTIMATION DE LA CONSOMMATION MENSUELLE D'ÉNERGIE PAR APPAREIL");
  if (startIdx < 0) return months;

  for (const m of monthNames) {
    let mIdx = -1;
    for (let i = startIdx; i < lines.length; i++) {
      if (lines[i] === m) {
        mIdx = i;
        break;
      }
    }
    if (mIdx < 0) continue;

    const nums = collectNumbers(lines, mIdx + 1, 7);
    if (nums.length >= 7) {
      months.push({
        month: m,
        heatingPrimary: nums[0],
        heatingSecondary: nums[1],
        hotWaterPrimary: nums[2],
        hotWaterSecondary: nums[3],
        lightingAppliances: nums[4],
        ventilation: nums[5],
        cooling: nums[6],
      });
    }
  }

  return months;
}

function parseAnnualEnergy(lines: string[]): MonthlyEnergy | undefined {
  const startIdx = findLineIndex(lines, "ESTIMATION DE LA CONSOMMATION MENSUELLE D'ÉNERGIE PAR APPAREIL");
  if (startIdx < 0) return undefined;

  const annuelIdx = findLineIndex(lines, "Annuel", startIdx);
  if (annuelIdx < 0) return undefined;

  const allNums: number[] = [];
  const annuelLine = lines[annuelIdx];
  const inlineMatch = annuelLine.match(/Annuel\s+([\d.,]+)/);
  if (inlineMatch) {
    allNums.push(parseFloat(inlineMatch[1].replace(",", ".")));
  }

  for (let i = annuelIdx + 1; i < lines.length && allNums.length < 7; i++) {
    const cleaned = lines[i].replace(/,/g, ".").replace(/\s/g, "");
    const val = parseFloat(cleaned);
    if (!isNaN(val) && /^[-\d.]+$/.test(cleaned)) {
      allNums.push(val);
    }
    if (lines[i] === "Vent." || lines[i].includes("ESTIMATION DES COUTS")) break;
  }

  if (allNums.length >= 7) {
    return {
      month: "Annuel",
      heatingPrimary: allNums[0],
      heatingSecondary: allNums[1],
      hotWaterPrimary: allNums[2],
      hotWaterSecondary: allNums[3],
      lightingAppliances: allNums[4],
      ventilation: allNums[5],
      cooling: allNums[6],
    };
  }

  return undefined;
}

function parseAirLeakage(text: string): ReportData["airLeakage"] {
  let cah50: number | undefined;
  const cahMatch = text.match(/(?:fuite|essai)[^]*?=\s*([\d.]+)\s*CAH/i);
  if (cahMatch) cah50 = parseFloat(cahMatch[1]);

  let envelopeArea: number | undefined;
  const envMatch = text.match(/Superficie de l'enveloppe[^:]*:\s*\n?\s*([\d.,]+)\s*m2/i);
  if (envMatch) envelopeArea = parseFloat(envMatch[1].replace(",", "."));

  let leakageArea: number | undefined;
  const leakMatch = text.match(/([\d.,]+)\s*cm2/i);
  if (leakMatch) leakageArea = parseFloat(leakMatch[1].replace(",", "."));

  if (cah50 || envelopeArea || leakageArea) {
    return { cah50, envelopeArea, leakageArea };
  }
  return undefined;
}

function parseHeating(text: string): ReportData["heating"] {
  const result: NonNullable<ReportData["heating"]> = {};
  const lines = text.split("\n");

  const grossMatch = text.match(/Perte de chaleur brute:\s*\n?\s*([\d,. ]+)\s*MJ/);
  if (grossMatch) result.grossHeatLoss = parseFloat(grossMatch[1].replace(/\s/g, "").replace(",", "."));

  const chargeMatch = text.match(/Charge de l'installation de chauffage:\s*\n?\s*([\d,. ]+)\s*MJ/);
  if (chargeMatch) result.annualConsumption = parseFloat(chargeMatch[1].replace(/\s/g, "").replace(",", "."));

  const boilerMatch = text.match(/Consommation d'énergie annuelle de la\s*\n?\s*chaudière:\s*\n?\s*([\d,. ]+)\s*MJ/);
  if (boilerMatch) result.annualConsumption = parseFloat(boilerMatch[1].replace(/\s/g, "").replace(",", "."));

  const effMatch = text.match(/Efficacité saisonnière[^:]*:\s*\n?\s*([\d.,]+)\s*%/);
  if (effMatch) result.primaryEfficiency = effMatch[1].replace(",", ".") + "%";

  const installIdx = lines.findIndex(l => l.trim() === "INSTALLATION DE CHAUFFAGE");
  if (installIdx >= 0) {
    const labelLines: string[] = [];
    const valueLines: string[] = [];
    let phase = "labels";

    for (let i = installIdx + 1; i < Math.min(installIdx + 20, lines.length); i++) {
      const l = lines[i].trim();
      if (!l) continue;

      if (l === "Efficacité:" || l.startsWith("Mode de la ventil") || l.startsWith("Puissance à")) break;

      const isLabel = l.endsWith(":") || l.includes("PRIMAIRE") || l.includes("SECONDAIRE");
      if (phase === "labels" && isLabel) {
        labelLines.push(l);
      } else if (phase === "labels" && !isLabel) {
        phase = "values";
        valueLines.push(l);
      } else if (phase === "values" && !isLabel) {
        valueLines.push(l);
      } else {
        break;
      }
    }

    const energyLabelIdx = labelLines.findIndex(l =>
      l.includes("nergie") && l.includes("chauffage")
    );
    const equipLabelIdx = labelLines.findIndex(l =>
      l === "Equipment:" || l === "Chauffage des espaces:"
    );

    if (energyLabelIdx >= 0 && energyLabelIdx < valueLines.length) {
      result.primaryType = valueLines[energyLabelIdx];
    }
    if (equipLabelIdx >= 0 && equipLabelIdx < valueLines.length) {
      result.primaryEquipment = valueLines[equipLabelIdx];
    }

    if (!result.primaryEquipment) {
      for (let i = installIdx; i < Math.min(installIdx + 20, lines.length); i++) {
        const l = lines[i].trim();
        if (l.includes("Thermopompe") && !l.includes("Temp") && !l.includes("COP") && !l.includes("arrêt") && !l.includes("annuel")) {
          result.primaryEquipment = l;
          break;
        }
        if (l.includes("Plinthes") || l.includes("hydronique") || l.includes("plénum")) {
          result.primaryEquipment = l;
          break;
        }
      }
    }
  }

  return result;
}

function parseAirTightness(text: string): { preCAH50?: number; } {
  const lines = text.split("\n");
  let cah50: number | undefined;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.includes("essai de fuite") && l.includes("CAH")) {
      const match = l.match(/([\d.,]+)\s*CAH/);
      if (match) {
        cah50 = parseFloat(match[1].replace(",", "."));
      }
    }
  }

  return { preCAH50: cah50 };
}

function parseCooling(text: string): ReportData["cooling"] {
  const lines = text.split("\n");
  let annualEnergy: number | undefined;
  let cop: number | undefined;

  const sommIdx = lines.findIndex(l => l.includes("SOMMAIRE ANNUEL DE LA CLIMATISATION"));
  if (sommIdx >= 0) {
    const vals: number[] = [];
    for (let i = sommIdx; i < Math.min(sommIdx + 20, lines.length); i++) {
      const kwhMatch = lines[i].match(/([\d.,]+)\s*kWh/);
      if (kwhMatch) {
        annualEnergy = parseFloat(kwhMatch[1].replace(",", ".")) * 3.6;
      }
      const cleaned = lines[i].trim().replace(",", ".");
      if (/^\d+\.\d+$/.test(cleaned) && parseFloat(cleaned) > 1 && parseFloat(cleaned) < 10) {
        cop = parseFloat(cleaned);
      }
    }
  }

  return { annualEnergy, cop };
}

function parseHotWater(text: string): ReportData["hotWater"] {
  const lines = text.split("\n");
  let dailyConsumption: number | undefined;
  let annualConsumption: number | undefined;
  let efficiency: number | undefined;
  let primaryType: string | undefined;

  const installIdx = lines.findIndex(l =>
    l.trim().match(/INSTALLATION\s+DU\s+CHAUFFE[\s-]?EAU/i)
  );
  if (installIdx >= 0) {
    for (let i = installIdx; i < Math.min(installIdx + 20, lines.length); i++) {
      const l = lines[i].trim().toLowerCase();
      if (l.includes("sommaire")) break;
      for (const key of Object.keys(EMISSION_FACTORS)) {
        if (l.includes(key)) {
          primaryType = lines[i].trim();
          break;
        }
      }
      if (primaryType) break;
    }
  }

  const hwIdx = lines.findIndex(l => l.includes("SOMMAIRE ANNUEL DE PRODUCTION D'EAU CHAUDE") || l.includes("SOMMAIRE ANNUEL DE PRODUCTION D\u2019EAU CHAUDE"));
  if (hwIdx >= 0) {
    for (let i = hwIdx; i < Math.min(hwIdx + 30, lines.length); i++) {
      const litresMatch = lines[i].match(/([\d.,]+)\s*litres/i);
      if (litresMatch && !dailyConsumption) {
        dailyConsumption = parseFloat(litresMatch[1].replace(",", "."));
      }
      const mjMatch = lines[i].match(/([\d.,]+)\s*MJ/);
      if (mjMatch && !annualConsumption) {
        annualConsumption = parseFloat(mjMatch[1].replace(",", "."));
      }
      const percMatch = lines[i].match(/([\d.,]+)%/);
      if (percMatch && !efficiency) {
        efficiency = parseFloat(percMatch[1].replace(",", "."));
      }
    }
  }

  return { dailyConsumption, annualConsumption, energyFactor: efficiency, primaryType };
}

const EMISSION_FACTORS: Record<string, { co2ePerUnit: number; mjPerUnit: number; unit: string }> = {
  "gaz naturel":          { co2ePerUnit: 1889.320, mjPerUnit: 37.89, unit: "m³" },
  "électricité":          { co2ePerUnit: 2.040,    mjPerUnit: 3.60,  unit: "kWh" },
  "mazout léger no 1":    { co2ePerUnit: 2652.736, mjPerUnit: 38.78, unit: "L" },
  "mazout léger no 2":    { co2ePerUnit: 2734.736, mjPerUnit: 38.50, unit: "L" },
  "mazout lourd":         { co2ePerUnit: 3146.360, mjPerUnit: 42.50, unit: "L" },
  "mazout":               { co2ePerUnit: 2734.736, mjPerUnit: 38.50, unit: "L" },
  "propane":              { co2ePerUnit: 1543.984, mjPerUnit: 25.31, unit: "L" },
  "diesel":               { co2ePerUnit: 2789.793, mjPerUnit: 38.30, unit: "L" },
  "bois":                 { co2ePerUnit: 1834.970, mjPerUnit: 19.20, unit: "kg" },
  "granules":             { co2ePerUnit: 1834.970, mjPerUnit: 19.20, unit: "kg" },
  "biogaz":               { co2ePerUnit: 1889.320, mjPerUnit: 38.32, unit: "m³" },
  "butane":               { co2ePerUnit: 1763.984, mjPerUnit: 28.44, unit: "L" },
  "charbon":              { co2ePerUnit: 2346.830, mjPerUnit: 29.82, unit: "kg" },
  "kérosène":             { co2ePerUnit: 2543.736, mjPerUnit: 37.68, unit: "L" },
  "lignite":              { co2ePerUnit: 1486.830, mjPerUnit: 15.00, unit: "kg" },
  "essence":              { co2ePerUnit: 2361.200, mjPerUnit: 34.87, unit: "L" },
  "biodiésel":            { co2ePerUnit: 2497.000, mjPerUnit: 35.67, unit: "L" },
};

function getEmissionFactor(fuelType?: string): { co2ePerUnit: number; mjPerUnit: number; unit: string } | null {
  if (!fuelType) return null;
  const normalized = fuelType.toLowerCase().trim();
  for (const [key, factor] of Object.entries(EMISSION_FACTORS)) {
    if (normalized.includes(key)) return factor;
  }
  return null;
}

function isElectricity(fuelType?: string): boolean {
  if (!fuelType) return true;
  return /[eé]lectricit[eé]/i.test(fuelType);
}

function calculateGES(
  heatingMJ: number,
  hotWaterMJ: number,
  baseLoadsMJ: number,
  ventilationMJ: number,
  coolingMJ: number,
  heatingFuelType?: string,
  hotWaterFuelType?: string
): { ghgElectricity: number; ghgFossil: number; ghgTotal: number } {
  const elecFactor = EMISSION_FACTORS["électricité"];
  let ghgElectricity = 0;
  let ghgFossil = 0;

  const heatingEF = getEmissionFactor(heatingFuelType);
  if (heatingEF && !isElectricity(heatingFuelType)) {
    const units = heatingMJ / heatingEF.mjPerUnit;
    ghgFossil += (units * heatingEF.co2ePerUnit) / 1000000;
  } else {
    const kWh = heatingMJ / 3.6;
    ghgElectricity += (kWh * elecFactor.co2ePerUnit) / 1000000;
  }

  const hotWaterEF = getEmissionFactor(hotWaterFuelType);
  if (hotWaterEF && !isElectricity(hotWaterFuelType)) {
    const units = hotWaterMJ / hotWaterEF.mjPerUnit;
    ghgFossil += (units * hotWaterEF.co2ePerUnit) / 1000000;
  } else {
    const kWh = hotWaterMJ / 3.6;
    ghgElectricity += (kWh * elecFactor.co2ePerUnit) / 1000000;
  }

  const elecKWh = (baseLoadsMJ + ventilationMJ + coolingMJ) / 3.6;
  ghgElectricity += (elecKWh * elecFactor.co2ePerUnit) / 1000000;

  return {
    ghgElectricity,
    ghgFossil,
    ghgTotal: ghgElectricity + ghgFossil,
  };
}

function parseAnnualSummary(
  text: string,
  monthlyEnergy: MonthlyEnergy[],
  annualEnergy: MonthlyEnergy | undefined,
  heatingFuelType?: string,
  hotWaterFuelType?: string
): ReportData["annualSummary"] {
  let heatingMJ = 0;
  let hotWaterMJ = 0;
  let baseLoadsMJ = 0;
  let ventilationMJ = 0;
  let coolingMJ = 0;

  if (annualEnergy) {
    heatingMJ = annualEnergy.heatingPrimary + annualEnergy.heatingSecondary;
    hotWaterMJ = annualEnergy.hotWaterPrimary + annualEnergy.hotWaterSecondary;
    baseLoadsMJ = annualEnergy.lightingAppliances;
    ventilationMJ = annualEnergy.ventilation;
    coolingMJ = annualEnergy.cooling;
  } else if (monthlyEnergy.length > 0) {
    for (const m of monthlyEnergy) {
      heatingMJ += m.heatingPrimary + m.heatingSecondary;
      hotWaterMJ += m.hotWaterPrimary + m.hotWaterSecondary;
      baseLoadsMJ += m.lightingAppliances;
      ventilationMJ += m.ventilation;
      coolingMJ += m.cooling;
    }
  }

  if (!annualEnergy && monthlyEnergy.length === 0) {
    const summaryValues = parseSommaireMJ(text);
    if (summaryValues.heating > 0) heatingMJ = summaryValues.heating;
    if (summaryValues.hotWater > 0) hotWaterMJ = summaryValues.hotWater;
  }

  const kwhSummary = parseKwhSummary(text);

  const heatingGJ = heatingMJ / 1000;
  const hotWaterGJ = hotWaterMJ / 1000;
  const baseLoadsGJ = baseLoadsMJ / 1000;
  const ventilationGJ = ventilationMJ / 1000;
  const coolingGJ = coolingMJ / 1000;
  const totalGJ = heatingGJ + hotWaterGJ + baseLoadsGJ + ventilationGJ + coolingGJ;

  let ghgElectricity = 0;
  let ghgFossil = 0;
  let ghgTotal = 0;

  const heatingIsGaz = heatingFuelType && /gaz\s*naturel/i.test(heatingFuelType);
  const hotWaterIsGaz = hotWaterFuelType && /gaz\s*naturel/i.test(hotWaterFuelType);
  const hasFossilNonGaz = (heatingFuelType && !isElectricity(heatingFuelType) && !heatingIsGaz) ||
                           (hotWaterFuelType && !isElectricity(hotWaterFuelType) && !hotWaterIsGaz);

  if (!hasFossilNonGaz && kwhSummary && (kwhSummary.gasHeatingM3 !== undefined || kwhSummary.heatingKWh !== undefined)) {
    const gazFactor = EMISSION_FACTORS["gaz naturel"];
    const elecFactor = EMISSION_FACTORS["électricité"];

    const totalElecKWh = (kwhSummary.totalKWh ?? 0);
    ghgElectricity = (totalElecKWh * elecFactor.co2ePerUnit) / 1000000;

    const totalGasM3 = kwhSummary.gasTotalM3 ?? 0;
    ghgFossil = (totalGasM3 * gazFactor.co2ePerUnit) / 1000000;

    ghgTotal = ghgElectricity + ghgFossil;
  } else {
    const result = calculateGES(
      heatingMJ, hotWaterMJ, baseLoadsMJ, ventilationMJ, coolingMJ,
      heatingFuelType, hotWaterFuelType
    );
    ghgElectricity = result.ghgElectricity;
    ghgFossil = result.ghgFossil;
    ghgTotal = result.ghgTotal;
  }

  return {
    heatingGJ,
    hotWaterGJ,
    baseLoadsGJ,
    ventilationGJ,
    coolingGJ,
    totalGJ,
    ghgElectricity,
    ghgGas: ghgFossil,
    ghgTotal,
  };
}

function parseSommaireMJ(text: string): { heating: number; hotWater: number } {
  const lines = text.split("\n");
  let heating = 0;
  let hotWater = 0;

  const sommIdx = lines.findIndex(l => l.includes("SOMMAIRE DE LA CONSOMMATION ÉNERGÉTIQUE"));
  if (sommIdx < 0) return { heating, hotWater };

  const mjValues: number[] = [];
  for (let i = sommIdx; i < Math.min(sommIdx + 30, lines.length); i++) {
    const mjMatch = lines[i].match(/=\s*([\d.,]+)\s*MJ/);
    if (mjMatch) {
      mjValues.push(parseFloat(mjMatch[1].replace(",", ".")));
    }
  }

  if (mjValues.length >= 1) heating = mjValues[0];
  if (mjValues.length >= 3) hotWater = mjValues[2];

  return { heating, hotWater };
}


function parseCentralVentilation(text: string): ReportData["centralVentilation"] | undefined {
  const lines = text.split("\n");
  const idx = lines.findIndex(l => l.toUpperCase().includes("INSTALLATION DE VENTILATION CENTRALE"));
  if (idx < 0) return undefined;

  let type: string | undefined;
  let sensibleEfficiency0C: number | undefined;
  let sensibleEfficiencyMinus25C: number | undefined;

  for (let i = idx; i < Math.min(idx + 50, lines.length); i++) {
    const l = lines[i].trim();

    if (/type\s+d.install/i.test(l)) {
      const match = l.match(/type\s+d.install[^:]*:\s*(.+)/i);
      if (match) {
        type = match[1].trim();
      } else {
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const vl = lines[j].trim();
          if (vl.length > 0 && vl.length < 30) {
            type = vl;
            break;
          }
        }
      }
    }

    if (/r[eé]cup[eé]r.*chaleur\s+sensible/i.test(l)) {
      const hasTemp0 = /0[.,]0\s*°?\s*C/i.test(l) && !/[-−]/.test(l.replace(/r[eé]cup[eé]r/i, "").split("0.0")[0] || "");
      const hasTempM25 = /[-−]\s*25[.,]0\s*°?\s*C/i.test(l);

      const pctMatch = l.match(/([\d]+)\s*%/);
      let pctVal: number | undefined;
      if (pctMatch) {
        pctVal = parseInt(pctMatch[1], 10);
      }

      if (hasTemp0 && pctVal !== undefined && sensibleEfficiency0C === undefined) {
        sensibleEfficiency0C = pctVal;
      } else if (hasTempM25 && pctVal !== undefined && sensibleEfficiencyMinus25C === undefined) {
        sensibleEfficiencyMinus25C = pctVal;
      } else if (!hasTemp0 && !hasTempM25) {
        if (pctVal !== undefined) {
          for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
            const nl = lines[j].trim();
            if (/0[.,]0\s*°?\s*C/i.test(nl) && !/[-−]/.test(nl.split("0")[0] || "") && sensibleEfficiency0C === undefined) {
              sensibleEfficiency0C = pctVal;
              break;
            }
            if (/[-−]\s*25[.,]0\s*°?\s*C/i.test(nl) && sensibleEfficiencyMinus25C === undefined) {
              sensibleEfficiencyMinus25C = pctVal;
              break;
            }
          }
        } else {
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const nl = lines[j].trim();
            const pm = nl.match(/([\d]+)\s*%/);
            if (pm) {
              const val = parseInt(pm[1], 10);
              for (let k = j + 1; k < Math.min(j + 3, lines.length); k++) {
                const tl = lines[k].trim();
                if (/0[.,]0\s*°?\s*C/i.test(tl) && !/[-−]/.test(tl.split("0")[0] || "") && sensibleEfficiency0C === undefined) {
                  sensibleEfficiency0C = val;
                  break;
                }
                if (/[-−]\s*25[.,]0\s*°?\s*C/i.test(tl) && sensibleEfficiencyMinus25C === undefined) {
                  sensibleEfficiencyMinus25C = val;
                  break;
                }
              }
              break;
            }
          }
        }
      }
    }
  }

  return { type, sensibleEfficiency0C, sensibleEfficiencyMinus25C };
}

function parseInteriorLightingKWh(text: string): number | undefined {
  const lines = text.split("\n");
  const idx = lines.findIndex(l => l.toUpperCase().includes("SOMMAIRE DES CHARGES DE BASE"));
  if (idx < 0) return undefined;

  const labels: string[] = [];
  let labelStartIdx = -1;
  for (let i = idx + 1; i < Math.min(idx + 40, lines.length); i++) {
    const l = lines[i].trim();
    if (/[eé]clairage\s+int[eé]rieur/i.test(l)) {
      const allNums = l.match(/[\d]+(?:[.,]\d+)?/g);
      if (allNums && allNums.length >= 2) {
        return parseFloat(allNums[allNums.length - 1].replace(",", "."));
      }
      if (labelStartIdx < 0) labelStartIdx = i;
      labels.push("eclairage");
      continue;
    }
    if (labelStartIdx > 0 && labels.length > 0 && labels.length < 5) {
      if (/appareils|autres|usage|ext[eé]rieur/i.test(l) && !/[\d]/.test(l)) {
        labels.push(l);
        continue;
      }
    }
    if (l.toLowerCase().includes("kwh annuel")) {
      const eclairagePos = labels.indexOf("eclairage");
      if (eclairagePos >= 0) {
        let numCount = 0;
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const vl = lines[j].trim().replace(",", ".");
          if (/^[\d.]+$/.test(vl)) {
            if (numCount === eclairagePos) {
              return parseFloat(vl);
            }
            numCount++;
          } else if (vl.length > 0 && !/^[\d.,\s]+$/.test(vl)) {
            break;
          }
        }
      }
    }
  }

  return undefined;
}

function parseKwhSummary(text: string): { heatingKWh?: number; coolingKWh?: number; hotWaterKWh?: number; appliancesKWh?: number; ventilationKWh?: number; totalKWh?: number; gasHeatingM3?: number; gasCoolingM3?: number; gasHotWaterM3?: number; gasAppliancesM3?: number; gasVentilationM3?: number; gasTotalM3?: number } | undefined {
  const lines = text.split("\n");
  const idx = lines.findIndex(l => l.includes("SOMMAIRE DE LA CONSOMMATION ANNUELLE ESTIMÉE DE L'ÉNERGIE"));
  if (idx < 0) return undefined;

  let heatingKWh: number | undefined;
  let gasHeatingM3: number | undefined;
  const kwhValues: number[] = [];
  const gasValues: number[] = [];
  let collectingGas = false;
  let collectingElec = false;

  for (let i = idx; i < Math.min(idx + 50, lines.length); i++) {
    const l = lines[i].trim();
    if (l.includes("ESTIMATION DES COUTS") || l.includes("ESTIMATION DES COÛTS")) break;

    const gasLineMatch = l.match(/Gaz\s+naturel\s+\(m3\)\s*([\d.,]+)/i);
    if (gasLineMatch) {
      gasHeatingM3 = parseFloat(gasLineMatch[1].replace(",", "."));
      collectingGas = true;
      collectingElec = false;
      continue;
    }

    const kwhLineMatch = l.match(/[ÉE]lectricit[eé]\s+\(kWh\)\s*([\d.,]+)/i);
    if (kwhLineMatch) {
      heatingKWh = parseFloat(kwhLineMatch[1].replace(",", "."));
      collectingElec = true;
      collectingGas = false;
      continue;
    }

    const cleaned = l.replace(",", ".");
    if (/^[\d.]+$/.test(cleaned) && cleaned.length > 1) {
      if (collectingElec) {
        kwhValues.push(parseFloat(cleaned));
      } else if (collectingGas) {
        gasValues.push(parseFloat(cleaned));
      }
    }
  }

  const result: any = {};
  let hasData = false;

  if (heatingKWh !== undefined && kwhValues.length >= 4) {
    result.heatingKWh = heatingKWh;
    result.coolingKWh = kwhValues[0];
    result.hotWaterKWh = kwhValues[1];
    result.appliancesKWh = kwhValues[2];
    result.ventilationKWh = kwhValues[3];
    result.totalKWh = kwhValues.length >= 5 ? kwhValues[4] : undefined;
    hasData = true;
  }

  if (gasHeatingM3 !== undefined && gasValues.length >= 4) {
    result.gasHeatingM3 = gasHeatingM3;
    result.gasCoolingM3 = gasValues[0];
    result.gasHotWaterM3 = gasValues[1];
    result.gasAppliancesM3 = gasValues[2];
    result.gasVentilationM3 = gasValues[3];
    result.gasTotalM3 = gasValues.length >= 5 ? gasValues[4] : undefined;
    hasData = true;
  }

  return hasData ? result : undefined;
}

export function computeComparison(pre: ReportData, post: ReportData) {
  const preSummary = pre.annualSummary || {
    heatingGJ: 0, hotWaterGJ: 0, baseLoadsGJ: 0, ventilationGJ: 0, coolingGJ: 0, totalGJ: 0,
    ghgElectricity: 0, ghgGas: 0, ghgTotal: 0,
  };
  const postSummary = post.annualSummary || {
    heatingGJ: 0, hotWaterGJ: 0, baseLoadsGJ: 0, ventilationGJ: 0, coolingGJ: 0, totalGJ: 0,
    ghgElectricity: 0, ghgGas: 0, ghgTotal: 0,
  };

  const totalBefore = preSummary.totalGJ || 0;
  const totalAfter = postSummary.totalGJ || 0;
  const improvementPercent = totalBefore > 0
    ? ((totalBefore - totalAfter) / totalBefore) * 100
    : 0;

  const ghsElectricityBefore = preSummary.ghgElectricity || 0;
  const ghsElectricityAfter = postSummary.ghgElectricity || 0;
  const ghsGasBefore = preSummary.ghgGas || 0;
  const ghsGasAfter = postSummary.ghgGas || 0;
  const ghsBefore = preSummary.ghgTotal || 0;
  const ghsAfter = postSummary.ghgTotal || 0;
  const ghsImprovementPercent = ghsBefore > 0
    ? ((ghsBefore - ghsAfter) / ghsBefore) * 100
    : 0;

  return {
    heatingBefore: preSummary.heatingGJ || 0,
    heatingAfter: postSummary.heatingGJ || 0,
    hotWaterBefore: preSummary.hotWaterGJ || 0,
    hotWaterAfter: postSummary.hotWaterGJ || 0,
    baseLoadsBefore: preSummary.baseLoadsGJ || 0,
    baseLoadsAfter: postSummary.baseLoadsGJ || 0,
    ventilationBefore: preSummary.ventilationGJ || 0,
    ventilationAfter: postSummary.ventilationGJ || 0,
    coolingBefore: preSummary.coolingGJ || 0,
    coolingAfter: postSummary.coolingGJ || 0,
    totalBefore,
    totalAfter,
    improvementPercent,
    ghsElectricityBefore,
    ghsElectricityAfter,
    ghsGasBefore,
    ghsGasAfter,
    ghsBefore,
    ghsAfter,
    ghsImprovementPercent,
  };
}
