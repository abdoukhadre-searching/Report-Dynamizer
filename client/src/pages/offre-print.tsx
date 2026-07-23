import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import type { Offre } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import OffreDocument, { type OffreDocumentData } from "@/components/offre-document";

export default function OffrePrintPage() {
  const params = useParams<{ id: string }>();

  const { data: offre, isLoading } = useQuery<Offre>({
    queryKey: ["/api/offres", params.id],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
  }

  if (!offre) {
    return <div className="min-h-screen bg-white p-8">Offre introuvable</div>;
  }

  const od = (offre.offreData ?? {}) as Partial<OffreDocumentData>;
  const data: OffreDocumentData = {
    name: offre.name ?? "",
    numero: offre.numero ?? "",
    clientName: offre.clientName ?? "",
    address: offre.address ?? "",
    date: od.date ?? "",
    de: od.de ?? "",
    consultant: od.consultant ?? "",
    consultantTitre: od.consultantTitre ?? "",
    adresseConsultant: od.adresseConsultant ?? "",
    mandatIntro: od.mandatIntro ?? "",
    services: od.services ?? "",
    montant: od.montant ?? "",
    remunerationDetails: od.remunerationDetails ?? "",
    prendreNote: od.prendreNote ?? "",
    debutContrat: od.debutContrat ?? "",
    courriel: od.courriel ?? "",
    telephone: od.telephone ?? "",
    signataireClient: od.signataireClient ?? "",
    titreSignataireClient: od.titreSignataireClient ?? "",
  };

  return (
    <main className="pdf-export-root bg-white">
      <div id="offre-print-content" className="pdf-export-content max-w-[210mm] mx-auto p-0">
        <OffreDocument data={data} />
      </div>
    </main>
  );
}
