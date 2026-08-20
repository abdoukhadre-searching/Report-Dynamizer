import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import type { Mandat } from "@shared/schema";
import MandatDocument, { type MandatDocumentData } from "@/components/mandat-document";

interface MandatData {
  mandatType?: string;
  mandatTypeAutre?: string;
  signatureImage?: string;
  schlObjectif?: string;
  programmes?: string[];
  mesuresTexte?: string;
  commentaires?: string;
  dateLivraison?: string;
}

export default function MandatPrintPage() {
  const params = useParams<{ id: string }>();
  const { data: mandat, isLoading } = useQuery<Mandat>({
    queryKey: ["/api/mandats", params.id],
  });

  if (isLoading) return <div className="p-8">Chargement…</div>;
  if (!mandat) return <div className="p-8">Feuille de mandat introuvable</div>;

  const md = (mandat.mandatData ?? {}) as MandatData;
  const mandatType = md.mandatType ?? "";
  const mandatTypeLabel =
    {
      schl: "Simulation énergétique pour la SCHL",
      analyse: "Analyse énergétique pour programme(s)",
      combined: "Simulation énergétique pour la SCHL combinée à une analyse énergétique",
      autre: md.mandatTypeAutre || "Autre",
    }[mandatType] ?? "";

  const data: MandatDocumentData = {
    name: mandat.name ?? "",
    mandataire: mandat.mandataire ?? "",
    codePostal: mandat.postalCode ?? "",
    cityLine: [mandat.address, mandat.city, mandat.province].filter(Boolean).join(", "),
    mandatType,
    mandatTypeLabel,
    schlObjectif: md.schlObjectif ?? "",
    showSchlObjectif: mandatType === "schl" || mandatType === "combined",
    showProgrammes: mandatType === "analyse" || mandatType === "combined",
    programmes: md.programmes ?? [],
    mesuresLines: (md.mesuresTexte ?? "").split("\n").map(l => l.trim()).filter(Boolean),
    commentaires: md.commentaires ?? "",
    dateLivraison: md.dateLivraison ?? "",
    signatureImage: md.signatureImage ?? "",
  };

  return (
    <main className="pdf-export-root bg-white">
      <div id="mandat-print-content" className="pdf-export-content max-w-[210mm] mx-auto p-0">
        <MandatDocument data={data} />
      </div>
    </main>
  );
}
