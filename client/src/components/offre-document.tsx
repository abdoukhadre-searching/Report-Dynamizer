import { Separator } from "@/components/ui/separator";
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

export default function OffreDocument({ data }: { data: OffreDocumentData }) {
  const servicesLines = data.services.split("\n").map(l => l.trim()).filter(Boolean);

  return (
    <div className="bg-white text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="px-8 pt-6 pb-4 border-b-2 border-[#1e3a5f]">
        <div className="flex items-start justify-between gap-4">
          <img src={mabLogoPath} alt="MAB Conseils" className="h-16 object-contain" />
          <div className="text-right">
            {data.numero && <p className="text-xs font-bold tracking-widest" style={{ color: "#0f766e" }}>{data.numero}</p>}
            <h1 className="text-xl font-bold tracking-wide" style={{ color: "#1e3a5f", fontFamily: "'Playfair Display', serif" }}>
              OFFRE DE SERVICE
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Consultation en efficacité énergétique</p>
          </div>
        </div>
      </div>

      {/* Info block */}
      <div className="px-8 py-4 bg-slate-50 border-b">
        <div className="space-y-1 text-xs">
          <div><span className="font-semibold text-[#1e3a5f]">À l'attention de : </span><span>{data.clientName || "—"}</span></div>
          <div><span className="font-semibold text-[#1e3a5f]">Adresse du projet : </span><span>{data.address || "—"}</span></div>
          <div><span className="font-semibold text-[#1e3a5f]">Date : </span><span>{formatDateFr(data.date) || "—"}</span></div>
          <div><span className="font-semibold text-[#1e3a5f]">De : </span><span>{data.de}</span></div>
          <div><span className="font-semibold text-[#1e3a5f]">Consultant : </span><span>{data.consultant}</span></div>
          <div><span className="font-semibold text-[#1e3a5f]">Adresse : </span><span>{data.adresseConsultant}</span></div>
        </div>
      </div>

      <div className="px-8 py-5 space-y-5">
        {/* Mandat et service */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-2 pb-1 border-b border-[#1e3a5f]/20">Mandat et service</h2>
          <p className="text-sm whitespace-pre-line leading-relaxed">{data.mandatIntro}</p>
          {servicesLines.length > 0 && (
            <>
              <p className="text-sm mt-3 mb-1.5">Le consultant vous offre les services suivants dans votre offre :</p>
              <ul className="space-y-1">
                {servicesLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1e3a5f] shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <Separator />

        {/* Rémunération */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-2 pb-1 border-b border-[#1e3a5f]/20">Rémunération</h2>
          {data.montant && (
            <p className="text-sm mb-2">
              En contrepartie du service, le client versera au consultant une somme de{" "}
              <span className="font-bold text-[#1e3a5f]">{data.montant}</span> selon les termes suivants :
            </p>
          )}
          <p className="text-sm whitespace-pre-line leading-relaxed">{data.remunerationDetails}</p>
          {data.prendreNote && (
            <div className="mt-3 rounded-md border px-4 py-3" style={{ backgroundColor: "#f0fdfa", borderColor: "#99f6e4" }}>
              <p className="text-sm whitespace-pre-line leading-relaxed">
                <span className="font-bold" style={{ color: "#0f766e" }}>Prendre note : </span>
                {data.prendreNote}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Début du contrat */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-2 pb-1 border-b border-[#1e3a5f]/20">Début du contrat</h2>
          <p className="text-sm whitespace-pre-line leading-relaxed">{data.debutContrat}</p>
          <p className="text-sm mt-2">
            <span className="font-semibold">Courriel :</span> {data.courriel} / <span className="font-semibold">Téléphone :</span> {data.telephone}
          </p>
        </div>

        <Separator />

        {/* Signature */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-4 pb-1 border-b border-[#1e3a5f]/20">Signature</h2>
          <div className="max-w-sm">
            {data.titreSignataireClient && <p className="text-xs text-muted-foreground mb-0.5">{data.titreSignataireClient}</p>}
            <p className="text-xs font-semibold text-[#1e3a5f] mb-1">{data.signataireClient || data.clientName || "Client"}</p>
            <div className="h-14 border-b border-gray-400 mb-1" />
            <p className="text-xs text-muted-foreground">Signature &amp; date</p>
          </div>
        </div>

        <div className="text-center pt-3">
          <p className="text-sm font-semibold" style={{ color: "#1e3a5f" }}>Nous vous remercions pour votre confiance !</p>
          <p className="text-xs text-muted-foreground mt-1">L'équipe de MAB Conseils</p>
        </div>

        <p className="text-[10px] text-muted-foreground text-center pt-2 border-t border-gray-100">
          Offre de service MAB Conseils © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
