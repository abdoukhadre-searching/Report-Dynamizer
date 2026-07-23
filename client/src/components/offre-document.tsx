import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";

export interface OffreDocumentData {
  name: string;
  numero: string;
  clientName: string;
  address: string;
  date: string;
  de: string;
  consultant: string;
  adresseConsultant: string;
  mandatIntro: string;
  services: string;
  montant: string;
  remunerationDetails: string;
  prendreNote: string;
  debutContrat: string;
  courriel: string;
  telephone: string;
  signataireClient: string;
  titreSignataireClient: string;
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

const NAVY = "#1e3a5f";
const TEAL = "#0f766e";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="w-1 h-4 rounded-full" style={{ backgroundColor: TEAL }} />
      <h2 className="text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>{children}</h2>
      <span className="flex-1 h-px" style={{ backgroundColor: "#e2e8f0" }} />
    </div>
  );
}

export default function OffreDocument({ data }: { data: OffreDocumentData }) {
  const servicesLines = data.services.split("\n").map(l => l.trim()).filter(Boolean);
  const mandatIntro = data.mandatIntro.split("{CONSULTANT}").join(data.consultant || "le consultant");

  return (
    <div className="bg-white text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "#1f2937" }}>
      {/* Header band */}
      <div style={{ backgroundColor: NAVY }} className="px-8 py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="bg-white rounded-lg px-3 py-2">
            <img src={mabLogoPath} alt="MAB Conseils" className="h-12 object-contain" />
          </div>
          <div className="text-right">
            {data.numero && (
              <span className="inline-block text-[11px] font-bold tracking-widest text-white px-2.5 py-0.5 rounded-full mb-1.5" style={{ backgroundColor: TEAL }}>
                {data.numero}
              </span>
            )}
            <h1 className="text-2xl font-bold tracking-wide text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              Offre de service
            </h1>
            <p className="text-xs mt-1" style={{ color: "#b8c8dd" }}>Consultation en efficacité énergétique</p>
          </div>
        </div>
      </div>

      {/* Info block */}
      <div className="px-8 py-5 border-b" style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "#94a3b8" }}>À l'attention de</p>
            <p className="font-semibold" style={{ color: NAVY }}>{data.clientName || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "#94a3b8" }}>Date</p>
            <p className="font-medium">{formatDateFr(data.date) || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "#94a3b8" }}>Adresse du projet</p>
            <p className="font-medium">{data.address || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "#94a3b8" }}>De</p>
            <p className="font-medium">{data.de}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "#94a3b8" }}>Consultant</p>
            <p className="font-medium">{data.consultant}</p>
            <p className="text-[11px]" style={{ color: "#64748b" }}>{data.adresseConsultant}</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-7">
        {/* Mandat et service — seule section de la page 1 */}
        <div style={{ breakAfter: "page" }}>
          <SectionTitle>Mandat et service</SectionTitle>
          <p className="text-[13px] whitespace-pre-line leading-relaxed text-justify">{mandatIntro}</p>
          {servicesLines.length > 0 && (
            <>
              <p className="text-[13px] font-semibold mt-4" style={{ color: NAVY }}>
                Le consultant vous offre les services suivants dans votre offre :
              </p>
              <ul className="space-y-1.5 mt-3">
                {servicesLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px]">
                    <span className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TEAL }} />
                    <span className="leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Rémunération */}
        <div>
          <SectionTitle>Rémunération</SectionTitle>
          {data.montant && (
            <div className="rounded-lg px-4 py-3 mb-3" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <p className="text-[13px] leading-relaxed">
                En contrepartie du service, le client versera au consultant une somme de{" "}
                <span className="text-base font-bold whitespace-nowrap" style={{ color: NAVY }}>{data.montant}</span>{" "}
                selon le terme suivant :
              </p>
            </div>
          )}
          <p className="text-[13px] whitespace-pre-line leading-relaxed">{data.remunerationDetails}</p>
          {data.prendreNote && (
            <div className="mt-4 rounded-lg overflow-hidden" style={{ border: "1px solid #99f6e4" }}>
              <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: TEAL }}>
                Prendre note
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: "#f0fdfa" }}>
                <p className="text-[13px] whitespace-pre-line leading-relaxed">{data.prendreNote}</p>
              </div>
            </div>
          )}
        </div>

        {/* Début du contrat */}
        <div>
          <SectionTitle>Début du contrat</SectionTitle>
          <p className="text-[13px] whitespace-pre-line leading-relaxed">{data.debutContrat}</p>
          <p className="text-[13px] mt-3">
            <span className="font-semibold" style={{ color: NAVY }}>Courriel :</span> {data.courriel}
            <span className="mx-2" style={{ color: "#cbd5e1" }}>|</span>
            <span className="font-semibold" style={{ color: NAVY }}>Téléphone :</span> {data.telephone}
          </p>
        </div>

        {/* Signature */}
        <div>
          <SectionTitle>Signature</SectionTitle>
          <div className="max-w-sm mt-2">
            <div className="h-14 border-b mb-1.5" style={{ borderColor: "#94a3b8" }} />
            <p className="text-[13px] font-semibold" style={{ color: NAVY }}>{data.signataireClient || data.clientName || "Client"}</p>
            {data.titreSignataireClient && <p className="text-xs" style={{ color: "#64748b" }}>{data.titreSignataireClient}</p>}
            <p className="text-[11px] mt-1" style={{ color: "#94a3b8" }}>Signature &amp; date</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 pb-2 border-t" style={{ borderColor: "#e2e8f0" }}>
          <p className="text-sm font-bold" style={{ color: NAVY, fontFamily: "'Playfair Display', serif" }}>
            Nous vous remercions pour votre confiance !
          </p>
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>L'équipe de MAB Conseils</p>
          <p className="text-[10px] mt-3" style={{ color: "#94a3b8" }}>
            Offre de service MAB Conseils © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
