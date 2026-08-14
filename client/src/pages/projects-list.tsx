import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Project } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
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
  Search,
  HardHat,
  User,
  LogOut,
  Shield,
  ChevronDown,
  X,
  ArrowLeft,
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

type SortKey = "date_desc" | "date_asc" | "city";
const sortLabels: Record<SortKey, string> = {
  date_desc: "Plus récent",
  date_asc: "Plus ancien",
  city: "Ville (A→Z)",
};

function getProjectStatus(p: Project): { label: string; color: string; bg: string; border: string } {
  if (p.preReportData && p.postReportData) {
    return { label: "Qualifié", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
  }
  if (p.preReportData) {
    return { label: "En cours", color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
  }
  return { label: "Non démarré", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" };
}

function ProjectRow({
  project,
  onDelete,
  onClick,
  accentColor,
}: {
  project: Project;
  onDelete: (project: Project) => void;
  onClick: (id: string) => void;
  accentColor: string;
}) {
  const status = getProjectStatus(project);
  return (
    <div
      className="group relative flex items-center gap-4 pl-5 pr-5 py-4 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-px bg-white overflow-hidden"
      style={{ borderColor: "#e8edf4" }}
      onClick={() => onClick(project.id)}
      data-testid={`card-project-${project.id}`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all" style={{ backgroundColor: accentColor, opacity: 0.7 }} />
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
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
          style={{ color: status.color, backgroundColor: status.bg, borderColor: status.border }}
        >
          {status.label}
        </span>
        <button
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
          onClick={(e) => { e.stopPropagation(); onDelete(project); }}
          data-testid={`button-delete-${project.id}`}
          title="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
    </div>
  );
}

interface ProjectsListPageProps {
  buildingType: "existing" | "new";
}

export default function ProjectsListPage({ buildingType }: ProjectsListPageProps) {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { data: projects, isLoading } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/projects", {
        name: "Nouveau projet",
        status: "draft",
        buildingType,
      });
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (projects || [])
      .filter((p) => {
        const matchType = buildingType === "new" ? p.buildingType === "new" : p.buildingType !== "new";
        const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.city?.toLowerCase() || "").includes(q) || (p.address?.toLowerCase() || "").includes(q);
        return matchType && matchSearch;
      })
      .sort(sortFn);
  }, [projects, search, sortKey, buildingType]);

  const isNew = buildingType === "new";
  const sectionTitle = isNew ? "Constructions neuves" : "Bâtiments existants";
  const sectionIcon = isNew
    ? <HardHat className="w-5 h-5 text-white" />
    : <Building2 className="w-5 h-5 text-white" />;
  const sectionColor = isNew ? "#16a34a" : "#1e3a5f";
  const emptyMessage = isNew ? "Aucun projet de construction neuve." : "Aucun projet de bâtiment existant.";

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
              <h1 className="text-sm font-bold text-slate-900 leading-none">QualifPRO</h1>
              <p className="text-[10px] text-slate-400 mt-0.5">Qualification APH SELECT</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              size="sm"
              className="gap-1.5 font-semibold"
              style={{ backgroundColor: sectionColor }}
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
        {/* Back + Section title */}
        <div className="flex items-center gap-4 mb-8">
          <button
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            onClick={() => navigate("/")}
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Accueil
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: sectionColor }}>
              {sectionIcon}
            </div>
            <h2 className="text-lg font-bold text-slate-900">{sectionTitle}</h2>
          </div>
        </div>

        {/* Admin banner */}
        {user?.role === "admin" && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe" }}>
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span><strong>Vue administrateur</strong> — Tous les projets sont visibles.</span>
          </div>
        )}

        {/* Search + sort */}
        <div className="flex items-center gap-3 mb-5">
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
                  <DropdownMenuRadioItem key={key} value={key} data-testid={`sort-option-${key}`}>{sortLabels[key]}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* List */}
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: "#f1f5f9" }}>
              <FileText className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 mb-1">{search.trim() ? `Aucun résultat pour « ${search} »` : emptyMessage}</p>
            {!search.trim() && (
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="mt-4 gap-2 font-semibold"
                style={{ backgroundColor: sectionColor }}
                data-testid="button-new-project-empty"
              >
                <Plus className="w-4 h-4" />
                Créer un projet
              </Button>
            )}
            {search.trim() && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearch("")}>Effacer la recherche</Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 mb-3">{filtered.length} projet{filtered.length !== 1 ? "s" : ""}</p>
            {filtered.map((p) => (
              <ProjectRow key={p.id} project={p} onDelete={setDeleteTarget} onClick={(id) => navigate(`/project/${id}`)} accentColor={sectionColor} />
            ))}
          </div>
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
