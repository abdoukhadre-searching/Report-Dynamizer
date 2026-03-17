import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Plus,
  FileText,
  Building2,
  MapPin,
  Calendar,
  ArrowRight,
  Trash2,
  Zap,
  Search,
  HardHat,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortKey = "date_desc" | "date_asc" | "city" | "status" | "type";
type StatusFilter = "all" | "draft" | "pre_uploaded" | "post_uploaded" | "ready" | "completed";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  draft: { label: "Brouillon", variant: "secondary" },
  pre_uploaded: { label: "PRE chargé", variant: "secondary" },
  post_uploaded: { label: "POST chargé", variant: "secondary" },
  ready: { label: "Prêt", variant: "default" },
  completed: { label: "Complété", variant: "default" },
};

const sortLabels: Record<SortKey, string> = {
  date_desc: "Plus récent",
  date_asc: "Plus ancien",
  city: "Ville (A→Z)",
  status: "Statut",
  type: "Type de bâtiment",
};

const filterLabels: Record<StatusFilter, string> = {
  all: "Tous",
  draft: "Brouillon",
  pre_uploaded: "PRE chargé",
  post_uploaded: "POST chargé",
  ready: "Prêt",
  completed: "Complété",
};

export default function HomePage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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

  const filteredAndSorted = useMemo(() => {
    if (!projects) return [];
    let list = [...projects];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.city?.toLowerCase() || "").includes(q) ||
          (p.address?.toLowerCase() || "").includes(q)
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }

    list.sort((a, b) => {
      switch (sortKey) {
        case "date_desc":
          return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
        case "date_asc":
          return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
        case "city":
          return (a.city || "").localeCompare(b.city || "", "fr");
        case "status":
          return (a.status || "").localeCompare(b.status || "", "fr");
        case "type":
          return (a.buildingType || "").localeCompare(b.buildingType || "", "fr");
        default:
          return 0;
      }
    });

    return list;
  }, [projects, search, sortKey, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!projects) return {} as Record<string, number>;
    return projects.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [projects]);

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
              <p className="text-sm text-muted-foreground">Qualification APH SELECT</p>
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
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-medium mb-1">Vos projets</h2>
            <p className="text-sm text-muted-foreground">
              {projects ? `${projects.length} projet${projects.length !== 1 ? "s" : ""}` : "Chargement..."}
            </p>
          </div>
        </div>

        {projects && projects.length > 0 && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par adresse, ville..."
                  className="pl-9"
                  data-testid="input-search-projects"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="default" className="gap-2 shrink-0" data-testid="button-sort">
                    <ArrowUpDown className="w-4 h-4" />
                    {sortLabels[sortKey]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuRadioGroup value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                    {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                      <DropdownMenuRadioItem key={key} value={key} data-testid={`sort-option-${key}`}>
                        {sortLabels[key]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex gap-2 flex-wrap mb-6">
              {(["all", "draft", "pre_uploaded", "post_uploaded", "ready", "completed"] as StatusFilter[]).map(
                (f) => {
                  const count = f === "all" ? projects.length : statusCounts[f] || 0;
                  if (f !== "all" && count === 0) return null;
                  return (
                    <button
                      key={f}
                      type="button"
                      data-testid={`filter-status-${f}`}
                      onClick={() => setStatusFilter(f)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        statusFilter === f
                          ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                          : "border-border text-muted-foreground hover:border-[#1e3a5f]/40 hover:text-foreground"
                      }`}
                    >
                      {filterLabels[f]}
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          statusFilter === f ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </>
        )}

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
                Commencez par créer un nouveau projet pour évaluer l'efficacité énergétique d'un bâtiment.
              </p>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                data-testid="button-new-project-empty"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer un projet
              </Button>
            </CardContent>
          </Card>
        ) : filteredAndSorted.length === 0 ? (
          <Card>
            <CardContent className="p-10 flex flex-col items-center text-center">
              <Search className="w-8 h-8 text-muted-foreground mb-3" />
              <h3 className="font-medium mb-1">Aucun résultat</h3>
              <p className="text-sm text-muted-foreground">
                Aucun projet ne correspond à vos critères de recherche ou de filtre.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Réinitialiser les filtres
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndSorted.map((project) => {
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
                      <h3 className="font-medium text-sm leading-tight line-clamp-2">{project.name}</h3>
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
                        <span className="truncate">
                          {project.city}
                          {project.province ? `, ${project.province}` : ""}
                          {project.postalCode ? `  ${project.postalCode}` : ""}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1.5">
                        {project.buildingType === "new" ? (
                          <HardHat className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{project.buildingType === "new" ? "Construction neuve" : "Bâtiment existant"}</span>
                      </div>
                      {project.createdAt && (
                        <>
                          <span>·</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>{new Date(project.createdAt).toLocaleDateString("fr-CA")}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(project.id);
                        }}
                        data-testid={`button-delete-${project.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Supprimer
                      </Button>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
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
