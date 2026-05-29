import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import type { Project } from "@shared/schema";
import EmpreinteTab from "@/components/empreinte-tab";
import { Skeleton } from "@/components/ui/skeleton";

function parseInitialValues() {
  const p = new URLSearchParams(window.location.search);
  const num = (key: string) => p.has(key) ? Number(p.get(key)) : undefined;
  const cm = p.has("customMeasures") ? (() => { try { return JSON.parse(p.get("customMeasures")!); } catch { return undefined; } })() : undefined;
  return {
    nbThermo: num("nbThermo"),
    nbUnits: num("nbUnits"),
    nbChauffeEauThermo: num("nbChauffeEauThermo"),
    nbPlinthes: num("nbPlinthes"),
    nbVrc: num("nbVrc"),
    coutEtancheite: num("coutEtancheite"),
    coutThermo: num("coutThermo"),
    coutChauffeEau: num("coutChauffeEau"),
    coutVrc: num("coutVrc"),
    coutFaibleDebit: num("coutFaibleDebit"),
    coutLed: num("coutLed"),
    coutPlinthes: num("coutPlinthes"),
    coutChauffeEauElecInd: num("coutChauffeEauElecInd"),
    coutElecThermo: num("coutElecThermo"),
    coutBasementInsul: num("coutBasementInsul"),
    subventionBasementInsul: num("subventionBasementInsul"),
    customMeasures: cm,
  };
}

export default function ProjectPrintEmpreintePage() {
  const params = useParams<{ id: string }>();
  const initialValues = parseInitialValues();

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", params.id],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
  }

  if (!project) {
    return <div className="min-h-screen bg-white p-8">Projet introuvable</div>;
  }

  return (
    <main className="pdf-export-root bg-white">
      <div className="pdf-export-content max-w-[210mm] mx-auto p-0">
        <EmpreinteTab project={project} exportMode initialValues={initialValues} />
      </div>
    </main>
  );
}
