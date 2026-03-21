import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Project } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
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
  ArrowUpDown,
  ChevronRight,
  LayoutList,
  X,
  User,
  LogOut,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type SortKey = "date_desc" | "date_asc" | "city" | "status";
type ViewMode = "grouped" | "all";

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
};

function ProjectCard({
  project,
  onDelete,
  onClick,
}: {
  project: Project;
  onDelete: (project: Project) => void;
  onClick: (id: string) => void;
}) {
  const status = statusConfig[project.status] || statusConfig.draft;
  return (
    <Card
      className="group cursor-pointer hover-elevate transition-all"
      onClick={() => onClick(project.id)}
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
        {project.createdAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{new Date(project.createdAt).toLocaleDateString("fr-CA")}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project);
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
}

function ProjectGrid({
  projects,
  onDelete,
  onNavigate,
  emptyMessage = "Aucun projet dans cette catégorie.",
}: {
  projects: Project[];
  onDelete: (project: Project) => void;
  onNavigate: (id: string) => void;
  emptyMessage?: string;
}) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 px-1">{emptyMessage}</p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} onDelete={onDelete} onClick={onNavigate} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

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

  const sortFn = (a: Project, b: Project) => {
    switch (sortKey) {
      case "date_desc":
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      case "date_asc":
        return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
      case "city":
        return (a.city || "").localeCompare(b.city || "", "fr");
      case "status":
        return (a.status || "").localeCompare(b.status || "", "fr");
      default:
        return 0;
    }
  };

  const searchFilter = (p: Project) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.city?.toLowerCase() || "").includes(q) ||
      (p.address?.toLowerCase() || "").includes(q)
    );
  };

  const existingProjects = useMemo(
    () => (projects || []).filter((p) => p.buildingType !== "new" && searchFilter(p)).sort(sortFn),
    [projects, search, sortKey]
  );

  const newProjects = useMemo(
    () => (projects || []).filter((p) => p.buildingType === "new" && searchFilter(p)).sort(sortFn),
    [projects, search, sortKey]
  );

  const allFiltered = useMemo(
    () => (projects || []).filter(searchFilter).sort(sortFn),
    [projects, search, sortKey]
  );

  const totalCount = projects?.length ?? 0;

  const handleDeleteRequest = (project: Project) => setDeleteTarget(project);
  const handleDeleteConfirm = () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  };
  const handleNavigate = (id: string) => navigate(`/project/${id}`);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight" data-testid="text-app-title">
                EnergiQualif
              </h1>
              <p className="text-xs text-muted-foreground">Qualification APH SELECT</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              data-testid="button-new-project"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nouveau projet
            </Button>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    data-testid="button-user-menu"
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: "#1e3a5f" }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline text-xs max-w-[120px] truncate">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2">
                    <p className="text-xs font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => navigate("/profile")}
                    data-testid="menu-profile"
                  >
                    <User className="w-3.5 h-3.5" />
                    Mon profil
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer"
                      onClick={() => navigate("/admin")}
                      data-testid="menu-admin"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Administration
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                    onClick={handleLogout}
                    data-testid="menu-logout"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
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
        ) : totalCount === 0 ? (
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
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par adresse, ville..."
                  className="pl-9"
                  data-testid="input-search-projects"
                />
                {search && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearch("")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="default" className="gap-2 shrink-0" data-testid="button-sort">
                    <ArrowUpDown className="w-4 h-4" />
                    {sortLabels[sortKey]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuRadioGroup value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                    {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                      <DropdownMenuRadioItem key={key} value={key} data-testid={`sort-option-${key}`}>
                        {sortLabels[key]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant={viewMode === "all" ? "default" : "outline"}
                size="default"
                className="gap-2 shrink-0"
                onClick={() => setViewMode(viewMode === "all" ? "grouped" : "all")}
                data-testid="button-toggle-view"
              >
                <LayoutList className="w-4 h-4" />
                {viewMode === "all" ? "Par type" : "Tous les projets"}
              </Button>
            </div>

            {viewMode === "grouped" ? (
              <div className="space-y-8">
                <section>
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#e8eef6" }}>
                      <Building2 className="w-5 h-5" style={{ color: "#1e3a5f" }} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-base">Bâtiments existants</h2>
                      <p className="text-xs text-muted-foreground">
                        {existingProjects.length} projet{existingProjects.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </div>
                  <ProjectGrid
                    projects={existingProjects}
                    onDelete={handleDeleteRequest}
                    onNavigate={handleNavigate}
                    emptyMessage="Aucun projet de bâtiment existant."
                  />
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#edf7ed" }}>
                      <HardHat className="w-5 h-5" style={{ color: "#2e7d32" }} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-base">Constructions neuves</h2>
                      <p className="text-xs text-muted-foreground">
                        {newProjects.length} projet{newProjects.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </div>
                  <ProjectGrid
                    projects={newProjects}
                    onDelete={handleDeleteRequest}
                    onNavigate={handleNavigate}
                    emptyMessage="Aucun projet de construction neuve."
                  />
                </section>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {allFiltered.length} projet{allFiltered.length !== 1 ? "s" : ""} au total
                  </p>
                </div>
                {allFiltered.length === 0 ? (
                  <Card>
                    <CardContent className="p-10 flex flex-col items-center text-center">
                      <Search className="w-8 h-8 text-muted-foreground mb-3" />
                      <h3 className="font-medium mb-1">Aucun résultat</h3>
                      <p className="text-sm text-muted-foreground">
                        Aucun projet ne correspond à votre recherche.
                      </p>
                      <Button variant="ghost" size="sm" className="mt-3" onClick={() => setSearch("")}>
                        Effacer la recherche
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <ProjectGrid
                    projects={allFiltered}
                    onDelete={handleDeleteRequest}
                    onNavigate={handleNavigate}
                  />
                )}
              </div>
            )}
          </>
        )}
      </main>

      {deleteTarget && (
        <DeleteConfirmDialog
          key={deleteTarget.id}
          open={!!deleteTarget}
          projectName={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
