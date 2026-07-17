import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import type { Project } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Zap, FileText, LayoutDashboard, BookOpen, Building2, ClipboardCheck, BarChart2, DollarSign, ClipboardList } from "lucide-react";
import UploadTab from "@/components/upload-tab";
import DashboardTab from "@/components/dashboard-tab";
import ReportTab from "@/components/report-tab";
import CollectiveBuildingTab from "@/components/collective-building-tab";
import AttestationTab from "@/components/attestation-tab";
import StrategyTab from "@/components/strategy-tab";
import EmpreinteTab from "@/components/empreinte-tab";
import RecommandationsTab from "@/components/recommandations-tab";
import MandatTab from "@/components/mandat-tab";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [reportSubTab, setReportSubTab] = useState<"qualification" | "collective" | "attestation" | "recommandations">("qualification");
  const [strategieSubTab, setStrategieSubTab] = useState<"cahier" | "empreinte">("cahier");

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
  const hasAnsweredCommercialUnits = project.hasCommercialUnits !== null && project.hasCommercialUnits !== undefined;
  const tabsUnlocked = hasBothReports && hasAnsweredCommercialUnits;

  const cityLine = [project.city, project.province].filter(Boolean).join(", ");

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
              {cityLine && (
                <p className="text-xs text-muted-foreground">{cityLine}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <Tabs defaultValue="upload">
          <TabsList className="mb-6" data-testid="tabs-project">
            <TabsTrigger value="upload" data-testid="tab-upload" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Infos Projet
            </TabsTrigger>
            <TabsTrigger value="mandat" data-testid="tab-mandat" className="gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />
              Feuille de mandat
            </TabsTrigger>
            <TabsTrigger value="dashboard" disabled={!tabsUnlocked} data-testid="tab-dashboard" className="gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5" />
              Tableau de bord
            </TabsTrigger>
            <TabsTrigger value="strategie" disabled={!tabsUnlocked} data-testid="tab-strategie" className="gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" />
              Stratégie et Empreinte
            </TabsTrigger>
            <TabsTrigger value="report" disabled={!tabsUnlocked} data-testid="tab-report" className="gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Rapports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <UploadTab project={project} />
          </TabsContent>

          <TabsContent value="mandat">
            <MandatTab project={project} />
          </TabsContent>

          <TabsContent value="dashboard">
            {hasBothReports && <DashboardTab project={project} />}
          </TabsContent>

          <TabsContent value="strategie">
            {hasBothReports && (
              <div>
                <div className="flex gap-1 mb-6 border-b" data-testid="strategie-sub-tabs">
                  <button
                    type="button"
                    data-testid="subtab-cahier-strategie"
                    onClick={() => setStrategieSubTab("cahier")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                      strategieSubTab === "cahier"
                        ? "border-[#1e3a5f] text-[#1e3a5f]"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <BarChart2 className="w-4 h-4" />
                    Cahier de stratégie
                  </button>
                  <button
                    type="button"
                    data-testid="subtab-empreinte-economique"
                    onClick={() => setStrategieSubTab("empreinte")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                      strategieSubTab === "empreinte"
                        ? "border-[#1e3a5f] text-[#1e3a5f]"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    Empreinte économique
                  </button>
                </div>

                {strategieSubTab === "cahier" && (
                  <StrategyTab project={project} />
                )}
                {strategieSubTab === "empreinte" && (
                  <EmpreinteTab project={project} />
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="report">
            {hasBothReports && (
              <div>
                <div className="flex gap-1 mb-6 border-b" data-testid="report-sub-tabs">
                  <button
                    type="button"
                    data-testid="subtab-qualification"
                    onClick={() => setReportSubTab("qualification")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                      reportSubTab === "qualification"
                        ? "border-[#1e3a5f] text-[#1e3a5f]"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Cahier de qualification
                  </button>
                  <button
                    type="button"
                    data-testid="subtab-recommandations"
                    onClick={() => setReportSubTab("recommandations")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                      reportSubTab === "recommandations"
                        ? "border-[#1e3a5f] text-[#1e3a5f]"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Cahier de recommandations
                  </button>
                  <button
                    type="button"
                    data-testid="subtab-collective"
                    onClick={() => setReportSubTab("collective")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                      reportSubTab === "collective"
                        ? "border-[#1e3a5f] text-[#1e3a5f]"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Immeuble collectif
                  </button>
                  <button
                    type="button"
                    data-testid="subtab-attestation"
                    onClick={() => setReportSubTab("attestation")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                      reportSubTab === "attestation"
                        ? "border-[#1e3a5f] text-[#1e3a5f]"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    Attestation APH
                  </button>
                </div>

                {reportSubTab === "qualification" && (
                  <div className="-mx-6 -mb-6 px-6 pb-6 bg-white">
                    <ReportTab project={project} />
                  </div>
                )}
                {reportSubTab === "collective" && (
                  <CollectiveBuildingTab project={project} />
                )}
                {reportSubTab === "attestation" && (
                  <AttestationTab project={project} />
                )}
                {reportSubTab === "recommandations" && (
                  <div className="-mx-6 -mb-6 px-6 pb-6 bg-white">
                    <RecommandationsTab project={project} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
