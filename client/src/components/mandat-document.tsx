import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";
import mabSignaturePath from "@assets/Capture_d’écran_2026-07-23_111628_1784820061660.png";

export const MANDANT_NAME = "Conseils Immobilier MAB";

export const PROGRAMMES_OPTIONS = [
  { id: "hydro-quebec", label: "Hydro-Québec" },
  { id: "energir", label: "Énergir" },
  { id: "ecoperformance", label: "ÉcoPerformance" },
];

export interface MandatDocumentData {
  name: string;
  mandataire: string;
  mandataireAdresse: string;
  codePostal: string;
  cityLine: string;
  mandatType: string;
  mandatTypeLabel: string;
  schlObjectif: string;
  showSchlObjectif: boolean;
  showProgrammes: boolean;
  programmes: string[];
  mesuresLines: string[];
  commentaires: string;
  dateLivraison: string;
  signatureImage: string;
}

function toIsoDate(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString().substring(0, 10);
}

export function formatDateFr(value: string): string {
  if (!value) return "";
  const iso = toIsoDate(value);
  if (!iso) return value;
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
}

function SectionTitle({ children, mb = "mb-3" }: { children: React.ReactNode; mb?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${mb}`}>
      <span className="w-1 h-4 rounded-full" style={{ backgroundColor: "#0f766e" }} />
      <h2 className="text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: "#1e3a5f" }}>{children}</h2>
      <span className="flex-1 h-px" style={{ backgroundColor: "#e2e8f0" }} />
    </div>
  );
}

export default function MandatDocument({ data }: { data: MandatDocumentData }) {
  return (
    <div className="bg-white text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header band */}
      <div style={{ backgroundColor: "#1e3a5f" }} className="px-8 py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="bg-white rounded-lg px-3 py-2">
            <img src={mabLogoPath} alt="MAB Conseil Immobilier" className="h-12 object-contain" />
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-wide text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              Feuille de mandat
            </h1>
            <p className="text-xs mt-1" style={{ color: "#b8c8dd" }}>MAB Conseil Immobilier</p>
          </div>
        </div>
      </div>

      {/* Project info */}
      <div className="px-8 py-5 border-b" style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "#94a3b8" }}>Projet</p>
            <p className="font-semibold" style={{ color: "#1e3a5f" }}>{data.name || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "#94a3b8" }}>Donné par</p>
            <p className="font-medium">{MANDANT_NAME}</p>
          </div>
          {data.cityLine && (
            <div className="col-span-2">
              <p className="text-[11px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "#94a3b8" }}>Adresse</p>
              <p className="font-medium">{data.cityLine}</p>
            </div>
          )}
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "#94a3b8" }}>Confié à (sous-traitant)</p>
            <p className="font-medium">{data.mandataire || "—"}</p>
            {data.mandataireAdresse && (
              <p className="text-xs text-slate-500">{data.mandataireAdresse}</p>
            )}
            {data.codePostal && (
              <p className="text-xs text-slate-500">{data.codePostal}</p>
            )}
          </div>
          {data.dateLivraison && (
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "#94a3b8" }}>Livraison attendue</p>
              <p className="font-medium">{formatDateFr(data.dateLivraison)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-8 py-5 space-y-5">
        {/* Type de mandat */}
        <div>
          <SectionTitle>Type de mandat</SectionTitle>
          {data.mandatType ? (
            <div className="space-y-1.5">
              <p className="text-sm">{data.mandatTypeLabel}</p>
              {data.showSchlObjectif && data.schlObjectif && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">Objectif SCHL :</span>
                  <Badge variant="outline" className="text-xs font-bold border-[#1e3a5f] text-[#1e3a5f]">{data.schlObjectif} %</Badge>
                </div>
              )}
              {data.showProgrammes && data.programmes.length > 0 && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">Programme(s) :</span>
                  {data.programmes.map(pid => (
                    <Badge key={pid} variant="secondary" className="text-xs">{PROGRAMMES_OPTIONS.find(p => p.id === pid)?.label ?? pid}</Badge>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Aucun type de mandat sélectionné.</p>
          )}
        </div>

        <Separator />

        {/* Mesures */}
        <div>
          <SectionTitle>Mesures d'efficacité énergétique</SectionTitle>
          {data.mesuresLines.length > 0 ? (
            <ul className="space-y-1">
              {data.mesuresLines.map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#0f766e" }} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground italic">Aucune mesure sélectionnée.</p>
          )}
        </div>

        {/* Commentaires */}
        {data.commentaires && (
          <>
            <Separator />
            <div>
              <SectionTitle>Commentaires</SectionTitle>
              <p className="text-sm whitespace-pre-line">{data.commentaires}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Signatures */}
        <div>
          <SectionTitle mb="mb-4">Signatures</SectionTitle>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-semibold text-[#1e3a5f] mb-1">{MANDANT_NAME}</p>
              <p className="text-[10px] text-muted-foreground mb-1">(Donneur du mandat)</p>
              <div className="h-14 border-b border-gray-400 mb-1 flex items-end justify-center">
                <img src={data.signatureImage || mabSignaturePath} alt="Signature" className="h-14 object-contain" data-testid="img-signature-mandant" />
              </div>
              <p className="text-xs text-muted-foreground">Signature &amp; date</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-right text-muted-foreground" data-testid="text-date-production">
          Fait le {new Date().toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="text-center pt-4 pb-2 border-t" style={{ borderColor: "#e2e8f0" }}>
          <p className="text-sm font-bold" style={{ color: "#1e3a5f", fontFamily: "'Playfair Display', serif" }}>
            Nous vous remercions pour votre confiance !
          </p>
          <p className="text-[10px] mt-2" style={{ color: "#94a3b8" }}>
            Document confidentiel — MAB Conseil Immobilier © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
