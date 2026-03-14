import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import type { Project } from "@shared/schema";
import ReportTab from "@/components/report-tab";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectPrintPage() {
  const params = useParams<{ id: string }>();

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
        <ReportTab project={project} exportMode />
      </div>
    </main>
  );
}
