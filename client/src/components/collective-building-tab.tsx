import { useState } from "react";
import type { Project, ComparisonData } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Download, ExternalLink, AlertCircle, ChevronDown, ChevronUp, Loader2, Building2, BarChart3, Leaf } from "lucide-react";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";

interface CollectiveBuildingTabProps {
  project: Project;
}

function PdfPageImage({ projectId, page }: { projectId: string; page: number }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const src = `/api/projects/${projectId}/collective-pdf-image?page=${page}`;

  return (
    <div className="relative w-full" style={{ background: "#f5f5f5", minHeight: "200px" }}>
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
          <AlertCircle className="w-4 h-4" />
          Erreur de chargement de la page {page}
        </div>
      ) : (
        <img
          src={src}
          alt={`Page ${page} du formulaire`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            width: "100%",
            display: loaded ? "block" : "none",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          }}
        />
      )}
    </div>
  );
}

function MetricCell({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: accent ? "#1e3a5f" : "#f8fafc", border: accent ? "none" : "1px solid #e2e8f0" }}
    >
      <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: accent ? "rgba(255,255,255,0.7)" : "#64748b" }}>
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold" style={{ color: accent ? "#ffffff" : "#1e3a5f", fontFamily: "'Playfair Display', serif" }}>
          {value}
        </span>
        {unit && (
          <span className="text-xs" style={{ color: accent ? "rgba(255,255,255,0.6)" : "#94a3b8" }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

export default function CollectiveBuildingTab({ project }: CollectiveBuildingTabProps) {
  const cmp = project.comparisonData as ComparisonData | null;
  const [showPreview, setShowPreview] = useState(false);

  const pdfUrl = `/api/projects/${project.id}/collective-pdf`;

  const energyE = cmp?.totalAfter;
  const energyR = cmp?.totalBefore;
  const energySavings =
    energyR && energyE != null && energyR > 0
      ? ((energyR - energyE) / energyR) * 100
      : null;
  const ghgE = cmp?.ghsAfter;
  const ghgR = cmp?.ghsBefore;
  const ghgSavings =
    ghgR && ghgE != null && ghgR > 0
      ? ((ghgR - ghgE) / ghgR) * 100
      : null;

  const address = project.address || "";
  const city = project.city || "";
  const province = project.province || "";
  const fullAddress = [address, city, province].filter(Boolean).join(", ");

  if (!cmp) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <AlertCircle className="w-8 h-8" />
        <p className="text-sm">Chargez les rapports PRE et POST pour générer ce formulaire.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Header card */}
      <Card className="overflow-hidden border-0 shadow-sm" style={{ borderTop: "4px solid #1e3a5f" }}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src={mabLogoPath} alt="MAB Logo" style={{ height: "36px", width: "auto", objectFit: "contain", borderRadius: "4px" }} />
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" style={{ color: "#1e3a5f" }} />
                  <h2 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#1e3a5f" }}>
                    Formulaire APH SELECT — Immeubles collectifs
                  </h2>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Valeurs calculées et insérées automatiquement dans le formulaire officiel
              </p>
              {fullAddress && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-xs text-slate-400">{fullAddress}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:bg-slate-50"
                  style={{ color: "#1e3a5f", borderColor: "#1e3a5f" }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Ouvrir
                </button>
              </a>
              <a href={pdfUrl} download={`immeubles-collectifs-${project.id}.pdf`}>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "#1e3a5f" }}
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Values table + Signature side by side */}
      <div className="flex gap-5 items-start">

        {/* Values table */}
        <div className="flex-1 min-w-0">
          <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="px-6 py-4 border-b" style={{ backgroundColor: "#f8fafc" }}>
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#1e3a5f" }} />
                <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#1e3a5f" }}>
                  Valeurs du formulaire
                </h3>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "#1e3a5f" }}>
                    <th className="px-5 py-3 text-left text-white font-semibold text-xs uppercase tracking-wider">Indicateur</th>
                    <th className="px-5 py-3 text-center text-white font-semibold text-xs uppercase tracking-wider">Évalué (E)</th>
                    <th className="px-5 py-3 text-center text-white font-semibold text-xs uppercase tracking-wider">Référence (R)</th>
                    <th className="px-5 py-3 text-center text-white font-semibold text-xs uppercase tracking-wider">Économies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#1e3a5f15" }}>
                          <BarChart3 className="w-4 h-4" style={{ color: "#1e3a5f" }} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">Consommation d'énergie</p>
                          <p className="text-xs text-slate-400 mt-0.5">Gigajoules par année</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="font-bold text-base" style={{ color: "#1e3a5f" }}>
                        {energyE != null ? energyE.toFixed(3) : "—"}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">GJ</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="font-semibold text-slate-700">
                        {energyR != null ? energyR.toFixed(3) : "—"}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">GJ</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {energySavings != null ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: "#16a34a15", color: "#16a34a" }}>
                          {energySavings.toFixed(1)} %
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                  <tr className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#16a34a15" }}>
                          <Leaf className="w-4 h-4" style={{ color: "#16a34a" }} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">Émissions GES</p>
                          <p className="text-xs text-slate-400 mt-0.5">Tonnes CO₂ équivalent / an</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="font-bold text-base" style={{ color: "#1e3a5f" }}>
                        {ghgE != null ? ghgE.toFixed(5) : "—"}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">T/A</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="font-semibold text-slate-700">
                        {ghgR != null ? ghgR.toFixed(5) : "—"}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">T/A</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {ghgSavings != null ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: "#16a34a15", color: "#16a34a" }}>
                          {ghgSavings.toFixed(1)} %
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Signature block */}
        <div className="w-64 flex-shrink-0">
          <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="px-5 py-3 border-b" style={{ backgroundColor: "#f8fafc" }}>
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "#1e3a5f" }} />
                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#1e3a5f" }}>
                  Signature de l'évaluateur
                </h3>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-center">
                <img src={mabLogoPath} alt="MAB" style={{ height: "44px", width: "auto", objectFit: "contain", borderRadius: "6px" }} />
              </div>
              <div className="border-b border-dashed border-slate-300 pb-4">
                <div className="h-10" />
                <p className="text-xs text-slate-400 text-center mt-1">Signature</p>
              </div>
              <div className="space-y-1 text-center">
                <p className="font-semibold text-sm" style={{ color: "#1e3a5f" }}>Marc-André Boucher</p>
                <p className="text-xs text-slate-500">Évaluateur en efficacité énergétique</p>
                <p className="text-xs text-slate-400">438 521-9645</p>
              </div>
              <div className="text-center pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  {new Date().toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCell
          label="Réduction énergétique"
          value={energySavings != null ? `${energySavings.toFixed(1)}` : "—"}
          unit="%"
          accent
        />
        <MetricCell
          label="Réduction des GES"
          value={ghgSavings != null ? `${ghgSavings.toFixed(1)}` : "—"}
          unit="%"
        />
      </div>

      {/* PDF Preview */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
          style={{ backgroundColor: "#f0f4f8" }}
          onClick={() => setShowPreview(!showPreview)}
        >
          <span className="text-sm font-medium" style={{ color: "#1e3a5f" }}>
            Aperçu du formulaire complet (4 pages)
          </span>
          {showPreview ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {showPreview && (
          <div className="bg-gray-100 p-4 space-y-4">
            {[1, 2, 3, 4].map((pageNum) => (
              <div key={pageNum}>
                <div className="text-xs text-muted-foreground mb-2 font-medium">Page {pageNum}</div>
                <PdfPageImage projectId={project.id} page={pageNum} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
