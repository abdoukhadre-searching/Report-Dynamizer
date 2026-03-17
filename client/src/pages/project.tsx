import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import type { Project } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Zap } from "lucide-react";
import UploadTab from "@/components/upload-tab";
import DashboardTab from "@/components/dashboard-tab";
import ReportTab from "@/components/report-tab";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", params.id],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium mb-2">Projet introuvable</h2>
          <Button variant="secondary" onClick={() => navigate("/")}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  const hasPreReport = !!project.preReportData;
  const hasPostReport = !!project.postReportData;
  const hasBothReports = hasPreReport && hasPostReport;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold leading-tight" data-testid="text-project-name">
                {project.name}
              </h1>
              {project.address && (
                <p className="text-xs text-muted-foreground">{project.address}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <Tabs defaultValue="upload">
          <TabsList className="mb-6" data-testid="tabs-project">
            <TabsTrigger value="upload" data-testid="tab-upload">
              Rapports
            </TabsTrigger>
            <TabsTrigger value="dashboard" disabled={!hasBothReports} data-testid="tab-dashboard">
              Tableau de bord
            </TabsTrigger>
            <TabsTrigger value="report" disabled={!hasBothReports} data-testid="tab-report">
              Cahier de qualification
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <UploadTab project={project} />
          </TabsContent>
          <TabsContent value="dashboard">
            {hasBothReports && <DashboardTab project={project} />}
          </TabsContent>
          <TabsContent value="report" className="-mx-6 -mb-6 px-6 pb-6 bg-white">
            {hasBothReports && <ReportTab project={project} />}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
