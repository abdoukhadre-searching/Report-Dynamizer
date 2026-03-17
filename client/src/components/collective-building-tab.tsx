import type { Project, ComparisonData } from "@shared/schema";

interface CollectiveBuildingTabProps {
  project: Project;
}

export default function CollectiveBuildingTab({ project }: CollectiveBuildingTabProps) {
  const cmp = project.comparisonData as ComparisonData | null;

  const energyE = cmp?.totalAfter;
  const energyR = cmp?.totalBefore;
  const energySavingsPct =
    energyR && energyE != null && energyR > 0
      ? ((energyR - energyE) / energyR) * 100
      : null;

  const ghgE = cmp?.ghsAfter;
  const ghgR = cmp?.ghsBefore;
  const ghgSavingsPct =
    ghgR && ghgE != null && ghgR > 0
      ? ((ghgR - ghgE) / ghgR) * 100
      : null;

  const TEAL = "#2a7d6e";
  const TEAL_LIGHT = "#e8f5f2";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold mb-1" style={{ color: "#1e3a5f" }}>
          Immeuble collectif — Tableau à remplir dans le formulaire
        </h2>
        <p className="text-sm text-muted-foreground">
          Valeurs calculées automatiquement depuis les rapports HOT2000. Reportez-les dans le tableau du PDF ci-dessous.
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              <th
                style={{
                  backgroundColor: TEAL,
                  color: "white",
                  padding: "10px 14px",
                  textAlign: "left",
                  fontWeight: 600,
                  width: "38%",
                }}
              />
              <th
                style={{
                  backgroundColor: TEAL,
                  color: "white",
                  padding: "10px 14px",
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                Immeuble évalué (E)
              </th>
              <th
                style={{
                  backgroundColor: TEAL,
                  color: "white",
                  padding: "10px 14px",
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                Immeuble de référence (R)*
              </th>
              <th
                style={{
                  backgroundColor: "#1e5c4f",
                  color: "white",
                  padding: "10px 14px",
                  textAlign: "center",
                  fontWeight: 600,
                  lineHeight: "1.3",
                }}
              >
                Économies d'énergie (en %)
                <br />
                (R-E)/R × 100
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: "white", borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                Consommation d'énergie annuelle totale
                <div style={{ fontWeight: "normal", fontSize: "11px", color: "#666", marginTop: "2px" }}>
                  (GJ/année)
                </div>
              </td>
              <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, fontSize: "15px" }}>
                {energyE != null ? `${energyE.toFixed(3)} GJ` : <span style={{ color: "#aaa" }}>—</span>}
              </td>
              <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, fontSize: "15px" }}>
                {energyR != null ? `${energyR.toFixed(3)} GJ` : <span style={{ color: "#aaa" }}>—</span>}
              </td>
              <td
                style={{
                  padding: "12px 14px",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: "16px",
                  color: TEAL,
                }}
              >
                {energySavingsPct != null ? `${energySavingsPct.toFixed(1)} %` : "—"}
              </td>
            </tr>
            <tr style={{ backgroundColor: TEAL_LIGHT }}>
              <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                Émissions de gaz à effet de serre annuelles totales
                <div style={{ fontWeight: "normal", fontSize: "11px", color: "#555", marginTop: "2px" }}>
                  (nombre de tonnes d'équivalent CO₂ par année)
                </div>
              </td>
              <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, fontSize: "15px" }}>
                {ghgE != null ? `${ghgE.toFixed(5)} T/A` : <span style={{ color: "#aaa" }}>—</span>}
              </td>
              <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, fontSize: "15px" }}>
                {ghgR != null ? `${ghgR.toFixed(5)} T/A` : <span style={{ color: "#aaa" }}>—</span>}
              </td>
              <td
                style={{
                  padding: "12px 14px",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: "16px",
                  color: TEAL,
                }}
              >
                {ghgSavingsPct != null ? `${ghgSavingsPct.toFixed(1)} %` : "—"}
              </td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontSize: "11px", color: "#555", fontStyle: "italic", padding: "8px 14px", borderTop: "1px solid #e2e8f0" }}>
          *Dans le cas des immeubles existants, l'immeuble de référence (R) est pris en compte dans son état avant rénovation.
        </p>
      </div>

      {!cmp && (
        <div className="p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800">
          Chargez les rapports PRE et POST pour calculer automatiquement les valeurs.
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Formulaire APH SELECT — Immeubles collectifs</h3>
        <object
          data="/defaults/immeubles-collectifs-template.pdf"
          type="application/pdf"
          style={{ width: "100%", height: "900px", border: "1px solid #e2e8f0", borderRadius: "8px" }}
        >
          <div className="p-4 text-sm text-muted-foreground border rounded">
            Votre navigateur ne supporte pas l'affichage PDF intégré.{" "}
            <a href="/defaults/immeubles-collectifs-template.pdf" target="_blank" className="underline text-primary">
              Télécharger le PDF
            </a>
          </div>
        </object>
      </div>
    </div>
  );
}
