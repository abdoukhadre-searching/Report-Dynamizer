import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  FileText,
  Building2,
  MapPin,
  Calendar,
  ArrowRight,
  Trash2,
  Zap,
} from "lucide-react";

export default function HomePage() {
  const [, navigate] = useLocation();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/projects", {
        name: "Nouveau projet",
        status: "draft",
      });
      return res.json();
    },
    onSuccess: (data: Project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      navigate(`/project/${data.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    draft: { label: "Brouillon", variant: "secondary" },
    pre_uploaded: { label: "PRE charge", variant: "secondary" },
    post_uploaded: { label: "POST charge", variant: "secondary" },
    ready: { label: "Pret", variant: "default" },
    completed: { label: "Complete", variant: "default" },
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight" data-testid="text-app-title">
                EnergiQualif
              </h1>
              <p className="text-sm text-muted-foreground">
                Qualification APH SELECT
              </p>
            </div>
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            data-testid="button-new-project"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau projet
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-1">Vos projets</h2>
          <p className="text-sm text-muted-foreground">
            Gerez vos evaluations energetiques et generez vos cahiers de qualification.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-5 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !projects?.length ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">Aucun projet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Commencez par creer un nouveau projet pour evaluer l'efficacite energetique d'un batiment.
              </p>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                data-testid="button-new-project-empty"
              >
                <Plus className="w-4 h-4 mr-2" />
                Creer un projet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const status = statusConfig[project.status] || statusConfig.draft;
              return (
                <Card
                  key={project.id}
                  className="group cursor-pointer hover-elevate transition-all"
                  onClick={() => navigate(`/project/${project.id}`)}
                  data-testid={`card-project-${project.id}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-medium text-sm leading-tight line-clamp-2">
                        {project.name}
                      </h3>
                      <Badge variant={status.variant} className="shrink-0 text-xs">
                        {status.label}
                      </Badge>
                    </div>

                    {project.address && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{project.address}</span>
                      </div>
                    )}
                    {project.city && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{project.city}, {project.province}</span>
                      </div>
                    )}
                    {project.createdAt && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{new Date(project.createdAt).toLocaleDateString("fr-CA")}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(project.id);
                        }}
                        data-testid={`button-delete-${project.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Supprimer
                      </Button>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Ouvrir</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
