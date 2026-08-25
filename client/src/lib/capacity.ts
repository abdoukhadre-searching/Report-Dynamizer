export type EquipmentCapacityType = "heatpump" | "waterheater";

export function formatEquipmentCapacity(
  capacity: string | null | undefined,
  type: EquipmentCapacityType,
): string {
  const value = capacity?.trim();
  if (!value) return "";

  if (type === "waterheater") {
    const withoutBtu = value.replace(/\s*BTU\s*(?:\/\s*h)?/gi, "").trim();
    const gallons = withoutBtu.match(/\d[\d\s.,]*/)?.[0].trim();
    return gallons ? `${gallons} gallons` : "";
  }

  if (/BTU\s*\/\s*h/i.test(value)) return value.replace(/BTU\s*\/\s*h/gi, "BTU/h");
  if (/BTU/i.test(value)) return value.replace(/BTU/gi, "BTU/h");
  if (/^\d/.test(value)) return `${value} BTU/h`;
  return value;
}