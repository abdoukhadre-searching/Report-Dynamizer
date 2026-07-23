import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";

export interface OffreDocumentData {
  name: string;
  numero: string;
  clientName: string;
  address: string;
  date: string;
  de: string;
  consultant: string;
  consultantGenre?: string;
  consultantTitre: string;
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

function formatMontantAffiche(value: string): string {
  const cleaned = value.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
  const n = parseFloat(cleaned);
  if (isNaN(n) || n <= 0) return value;
  const formatted = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formatted}$ + taxes`;
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
      <h2 className="text-[14px] font-bold uppercase tracking-[0.12em]" style={{ color: NAVY }}>{children}</h2>
      <span className="flex-1 h-px" style={{ backgroundColor: "#e2e8f0" }} />
    </div>
  );
}

export default function OffreDocument({ data }: { data: OffreDocumentData }) {
  const servicesLines = data.services.split("\n").map(l => l.trim()).filter(Boolean);
  const feminin = data.consultantGenre === "feminin";
  const genre = (text: string) =>
    feminin
      ? text
          .replace(/Le consultant/g, "La consultante")
          .replace(/le consultant/g, "la consultante")
          .replace(/du consultant/g, "de la consultante")
          .replace(/au consultant/g, "à la consultante")
      : text;
  const fullConsultant = [data.consultant, data.consultantTitre].filter(Boolean).join(", ");
  const mandatIntro = genre(data.mandatIntro).split("{CONSULTANT}").join(fullConsultant || (feminin ? "la consultante" : "le consultant"));

  return (
    <div className="bg-white text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "#1f2937" }}>
      {/* En-tête centré, comme le modèle */}
      <div className="px-8 pt-10 pb-2 text-center">
        <img src={mabLogoPath} alt="MAB Conseils" className="h-24 object-contain mx-auto" />
        <div className="mt-6">
          {data.numero && (
            <p className="text-lg font-bold tracking-wide" style={{ color: TEAL }}>{data.numero}</p>
          )}
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: NAVY }}>Offre de service</h1>
          <p className="text-[13px] font-semibold mt-1" style={{ color: "#374151" }}>Consultation en efficacité énergétique</p>
        </div>
      </div>

      {/* Bloc d'informations */}
      <div className="px-8 pt-8">
        <div className="rounded-lg px-5 py-4 text-[14px] leading-relaxed space-y-0.5" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <p><span className="font-bold" style={{ color: NAVY }}>À l'attention de :</span> <span className="font-semibold">{data.clientName || "—"}</span></p>
          <p><span className="font-bold" style={{ color: NAVY }}>Adresse du projet :</span> {data.address || "—"}</p>
          <p><span className="font-bold" style={{ color: NAVY }}>Date :</span> {formatDateFr(data.date) || "—"}</p>
          <p><span className="font-bold" style={{ color: NAVY }}>De :</span> {data.de}</p>
          <p><span className="font-bold" style={{ color: NAVY }}>{feminin ? "Consultante" : "Consultant"} :</span> {fullConsultant}</p>
          <p><span className="font-bold" style={{ color: NAVY }}>Adresse :</span> {data.adresseConsultant}</p>
        </div>
      </div>

      <div className="px-8 py-6 space-y-7">
        {/* Mandat et service — seule section de la page 1 */}
        <div style={{ breakAfter: "page", paddingTop: "16px" }}>
          <SectionTitle>Mandat et service</SectionTitle>
          <p className="text-[14px] whitespace-pre-line leading-relaxed text-justify">{mandatIntro}</p>
          {servicesLines.length > 0 && (
            <>
              <p className="text-[14px] font-semibold mt-7" style={{ color: NAVY }}>
                {feminin ? "La consultante" : "Le consultant"} vous offre les services suivants dans votre offre :
              </p>
              <ul className="space-y-1.5 mt-6">
                {servicesLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[14px]">
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
            <div className="rounded-lg px-4 py-3 mb-6" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <p className="text-[14px] leading-relaxed">
                En contrepartie du service, le client versera {feminin ? "à la consultante" : "au consultant"} une somme de {formatMontantAffiche(data.montant)} selon le terme suivant :
              </p>
            </div>
          )}
          <p className="text-[14px] whitespace-pre-line leading-loose">{data.remunerationDetails}</p>
          {data.prendreNote && (
            <div className="mt-8 rounded-lg overflow-hidden" style={{ border: "1px solid #99f6e4" }}>
              <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: TEAL }}>
                Prendre note
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: "#f0fdfa" }}>
                <p className="text-[14px] whitespace-pre-line leading-relaxed">{data.prendreNote}</p>
              </div>
            </div>
          )}
        </div>

        {/* Début du contrat */}
        <div>
          <SectionTitle>Début du contrat</SectionTitle>
          <p className="text-[14px] whitespace-pre-line leading-relaxed">{genre(data.debutContrat)}</p>
          <p className="text-[14px] mt-12">
            <span className="font-semibold" style={{ color: NAVY }}>Courriel :</span> {data.courriel}
            <span className="mx-2" style={{ color: "#cbd5e1" }}>|</span>
            <span className="font-semibold" style={{ color: NAVY }}>Téléphone :</span> {data.telephone}
          </p>
        </div>

        {/* Signature */}
        <div className="pt-8">
          <SectionTitle>Signature</SectionTitle>
          <div className="max-w-sm mt-2">
            <div className="h-14 border-b mb-1.5" style={{ borderColor: "#94a3b8" }} />
            <p className="text-[14px] font-semibold" style={{ color: NAVY }}>{data.signataireClient || data.clientName || "Client"}</p>
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
