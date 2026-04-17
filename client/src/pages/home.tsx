import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Project } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
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
  User,
  LogOut,
  Shield,
  ChevronDown,
  ChevronRight,
  X,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

type SortKey = "date_desc" | "date_asc" | "city";

const sortLabels: Record<SortKey, string> = {
  date_desc: "Plus récent",
  date_asc: "Plus ancien",
  city: "Ville (A→Z)",
};

function ProjectRow({
  project,
  onDelete,
  onClick,
}: {
  project: Project;
  onDelete: (project: Project) => void;
  onClick: (id: string) => void;
}) {
  return (
    <div
      className="group flex items-center gap-4 px-5 py-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-sm hover:border-slate-300"
      style={{ backgroundColor: "#ffffff", borderColor: "#e8edf4" }}
      onClick={() => onClick(project.id)}
      data-testid={`card-project-${project.id}`}
    >
      {/* Main info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm truncate">{project.name}</p>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
          {project.city && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {[project.city, project.province].filter(Boolean).join(", ")}
            </span>
          )}
          {project.createdAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(project.createdAt).toLocaleDateString("fr-CA")}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
          onClick={(e) => { e.stopPropagation(); onDelete(project); }}
          data-testid={`button-delete-${project.id}`}
          title="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <span className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-slate-700 transition-colors">
          Ouvrir <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  iconBg,
  iconColor,
  count,
  projects,
  onDelete,
  onNavigate,
  emptyMessage,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  count: number;
  projects: Project[];
  onDelete: (p: Project) => void;
  onNavigate: (id: string) => void;
  emptyMessage: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        className="w-full flex items-center gap-3 py-3 px-1 rounded-lg hover:bg-slate-50 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
        data-testid={`section-toggle-${title}`}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
        <div className="flex-1">
          <span className="font-bold text-slate-900 text-sm">{title}</span>
          <span className="ml-2 text-xs text-slate-400 font-normal">
            {count} projet{count !== 1 ? "s" : ""}
          </span>
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-slate-400" />
          : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {projects.length === 0 ? (
            <p className="text-sm text-slate-400 py-3 px-1">{emptyMessage}</p>
          ) : (
            projects.map((p) => (
              <ProjectRow key={p.id} project={p} onDelete={onDelete} onClick={onNavigate} />
            ))
          )}
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { data: projects, isLoading } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/projects", { name: "Nouveau projet", status: "draft" });
      return res.json();
    },
    onSuccess: (data: Project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      navigate(`/project/${data.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/projects/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); },
  });

  const sortFn = (a: Project, b: Project) => {
    switch (sortKey) {
      case "date_desc": return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      case "date_asc": return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
      case "city": return (a.city || "").localeCompare(b.city || "", "fr");
      default: return 0;
    }
  };

  const searchFilter = (p: Project) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.city?.toLowerCase() || "").includes(q) || (p.address?.toLowerCase() || "").includes(q);
  };

  const existingProjects = useMemo(() => (projects || []).filter((p) => p.buildingType !== "new" && searchFilter(p)).sort(sortFn), [projects, search, sortKey]);
  const newProjects = useMemo(() => (projects || []).filter((p) => p.buildingType === "new" && searchFilter(p)).sort(sortFn), [projects, search, sortKey]);
  const totalCount = projects?.length ?? 0;

  const handleLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", borderColor: "#e8edf4" }}>
        <div className="max-w-3xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1e3a5f" }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-none" data-testid="text-app-title">EnergiQualif</h1>
              <p className="text-[10px] text-slate-400 mt-0.5">Qualification APH SELECT</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              size="sm"
              className="gap-1.5 font-semibold"
              style={{ backgroundColor: "#1e3a5f" }}
              data-testid="button-new-project"
            >
              <Plus className="w-4 h-4" />
              Nouveau projet
            </Button>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-slate-600" data-testid="button-user-menu">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#1e3a5f" }}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline text-xs max-w-[100px] truncate">{user.name}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-semibold truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 cursor-pointer text-sm" onClick={() => navigate("/profile")} data-testid="menu-profile">
                    <User className="w-3.5 h-3.5" /> Mon profil
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem className="gap-2 cursor-pointer text-sm" onClick={() => navigate("/admin")} data-testid="menu-admin">
                      <Shield className="w-3.5 h-3.5" /> Administration
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 cursor-pointer text-sm text-destructive focus:text-destructive" onClick={() => setShowLogoutConfirm(true)} data-testid="menu-logout">
                    <LogOut className="w-3.5 h-3.5" /> Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Admin banner */}
        {user?.role === "admin" && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe" }}>
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span><strong>Vue administrateur</strong> — Tous les projets de tous les utilisateurs sont visibles.</span>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-xl border bg-white" style={{ borderColor: "#e8edf4" }}>
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: "#eef2f8" }}>
              <FileText className="w-9 h-9" style={{ color: "#1e3a5f" }} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Aucun projet</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-sm leading-relaxed">
              Créez votre premier projet pour analyser des rapports HOT2000 et générer vos cahiers de qualification.
            </p>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="gap-2 font-semibold"
              style={{ backgroundColor: "#1e3a5f" }}
              data-testid="button-new-project-empty"
            >
              <Plus className="w-4 h-4" />
              Créer un premier projet
            </Button>
          </div>
        ) : (
          <>
            {/* Search + sort */}
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un projet..."
                  className="pl-9 bg-white border-slate-200"
                  data-testid="input-search-projects"
                />
                {search && (
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" onClick={() => setSearch("")}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="default" className="gap-2 bg-white border-slate-200 text-slate-600 text-sm shrink-0" data-testid="button-sort">
                    {sortLabels[sortKey]}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
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

            {/* Collapsible sections */}
            <div className="space-y-4">
              <CollapsibleSection
                title="Bâtiments existants"
                icon={<Building2 className="w-4 h-4" />}
                iconBg="#eef2f8"
                iconColor="#1e3a5f"
                count={existingProjects.length}
                projects={existingProjects}
                onDelete={setDeleteTarget}
                onNavigate={(id) => navigate(`/project/${id}`)}
                emptyMessage="Aucun bâtiment existant."
                defaultOpen={true}
              />
              <CollapsibleSection
                title="Constructions neuves"
                icon={<HardHat className="w-4 h-4" />}
                iconBg="#f0fdf4"
                iconColor="#16a34a"
                count={newProjects.length}
                projects={newProjects}
                onDelete={setDeleteTarget}
                onNavigate={(id) => navigate(`/project/${id}`)}
                emptyMessage="Aucune construction neuve."
                defaultOpen={true}
              />
            </div>

            {/* No results */}
            {search.trim() && existingProjects.length === 0 && newProjects.length === 0 && (
              <div className="text-center py-16">
                <p className="text-sm text-slate-500 mb-2">Aucun résultat pour « {search} »</p>
                <Button variant="ghost" size="sm" onClick={() => setSearch("")}>Effacer</Button>
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
          onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
            <AlertDialogDescription>Êtes-vous sûr de vouloir vous déconnecter ?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} style={{ backgroundColor: "#1e3a5f" }} data-testid="confirm-logout">
              Se déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
