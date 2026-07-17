import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Project } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Building2,
  HardHat,
  Zap,
  Plus,
  ChevronRight,
  User,
  LogOut,
  Shield,
  ChevronDown,
  CheckCircle2,
  X,
  FileText,
  Clock,
  MapPin,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function getProjectStatus(p: Project): { label: string; color: string; bg: string; border: string } {
  if (p.preReportData && p.postReportData) {
    return { label: "Qualifié", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
  }
  if (p.preReportData) {
    return { label: "En cours", color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
  }
  return { label: "Non démarré", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" };
}

function NewProjectDialog({
  open,
  onClose,
  onCreate,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (type: "existing" | "new") => void;
  isPending: boolean;
}) {
  const [selected, setSelected] = useState<"existing" | "new" | null>(null);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setSelected(null); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            Nouveau projet — Type de bâtiment
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <button
            type="button"
            onClick={() => setSelected("existing")}
            className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all cursor-pointer ${
              selected === "existing"
                ? "border-[#1e3a5f] bg-[#1e3a5f]/5"
                : "border-border hover:border-[#1e3a5f]/40 hover:bg-slate-50"
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selected === "existing" ? "bg-[#1e3a5f] text-white" : "bg-slate-100 text-slate-500"}`}>
              <Building2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className={`text-sm font-semibold mb-0.5 ${selected === "existing" ? "text-[#1e3a5f]" : "text-slate-800"}`}>Bâtiment existant</p>
              <p className="text-[11px] text-slate-400 leading-snug">Avant / après travaux</p>
            </div>
            {selected === "existing" && <CheckCircle2 className="w-4 h-4 text-[#1e3a5f]" />}
          </button>

          <button
            type="button"
            onClick={() => setSelected("new")}
            className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all cursor-pointer ${
              selected === "new"
                ? "border-[#16a34a] bg-[#16a34a]/5"
                : "border-border hover:border-[#16a34a]/40 hover:bg-slate-50"
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selected === "new" ? "bg-[#16a34a] text-white" : "bg-slate-100 text-slate-500"}`}>
              <HardHat className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className={`text-sm font-semibold mb-0.5 ${selected === "new" ? "text-[#16a34a]" : "text-slate-800"}`}>Construction neuve</p>
              <p className="text-[11px] text-slate-400 leading-snug">Référence CNEB 2017</p>
            </div>
            {selected === "new" && <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />}
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => { onClose(); setSelected(null); }}>
            Annuler
          </Button>
          <Button
            size="sm"
            disabled={!selected || isPending}
            onClick={() => { if (selected) onCreate(selected); }}
            style={{ backgroundColor: selected === "new" ? "#16a34a" : "#1e3a5f" }}
            data-testid="button-confirm-create"
          >
            {isPending ? "Création..." : "Créer le projet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function HomePage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const createMutation = useMutation({
    mutationFn: async (buildingType: "existing" | "new") => {
      const res = await apiRequest("POST", "/api/projects", {
        name: "Nouveau projet",
        status: "draft",
        buildingType,
      });
      return res.json();
    },
    onSuccess: (data: Project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowNewDialog(false);
      navigate(`/project/${data.id}`);
    },
  });

  const allProjects = projects || [];
  const existingCount = allProjects.filter((p) => p.buildingType !== "new").length;
  const newCount = allProjects.filter((p) => p.buildingType === "new").length;

  const enCoursCount = allProjects.filter((p) => p.preReportData && !p.postReportData).length;
  const qualifiesCount = allProjects.filter((p) => p.preReportData && p.postReportData).length;

  const recentProjects = [...allProjects]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 3);

  const handleLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", borderColor: "#e8edf4" }}>
        <div className="max-w-3xl mx-auto px-6 py-3.5 flex items-center justify-between">
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
              size="sm"
              className="gap-1.5 font-semibold"
              style={{ backgroundColor: "#1e3a5f" }}
              onClick={() => setShowNewDialog(true)}
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

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Admin banner */}
        {user?.role === "admin" && (
          <div className="mb-7 flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe" }}>
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span><strong>Vue administrateur</strong> — Tous les projets de tous les utilisateurs sont visibles.</span>
          </div>
        )}

        {/* Stats bar — only shown when there are projects */}
        {allProjects.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-white rounded-xl border px-4 py-3 flex items-center gap-3" style={{ borderColor: "#e8edf4" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#eef2f8" }}>
                <FileText className="w-4 h-4" style={{ color: "#1e3a5f" }} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 leading-none mb-0.5">Total</p>
                <p className="text-lg font-bold text-slate-900 leading-none" data-testid="stat-total">{allProjects.length}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border px-4 py-3 flex items-center gap-3" style={{ borderColor: "#e8edf4" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#fffbeb" }}>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 leading-none mb-0.5">En cours</p>
                <p className="text-lg font-bold text-slate-900 leading-none" data-testid="stat-en-cours">{enCoursCount}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border px-4 py-3 flex items-center gap-3" style={{ borderColor: "#e8edf4" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#f0fdf4" }}>
                <CheckCircle2 className="w-4 h-4" style={{ color: "#16a34a" }} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 leading-none mb-0.5">Qualifiés</p>
                <p className="text-lg font-bold text-slate-900 leading-none" data-testid="stat-qualifies">{qualifiesCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Three category cards */}
        <div className="grid sm:grid-cols-3 gap-5 mb-10">
          {/* Feuillesde mandat */}
          <button
            className="group relative flex flex-col text-left rounded-2xl border bg-white overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
            style={{ borderColor: "#e8edf4" }}
            onClick={() => navigate("/mandats")}
            data-testid="button-section-mandats"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "#7c3aed" }} />
            <div className="pl-7 pr-6 pt-6 pb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform" style={{ backgroundColor: "#f5f3ff" }}>
                <ClipboardList className="w-6 h-6" style={{ color: "#7c3aed" }} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Feuillesde mandat</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-5">
                Définir la portée et les mesures d'efficacité sans rapport H2K.
              </p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "#f5f3ff", color: "#7c3aed" }}>
                  Indépendant
                </span>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </div>
            </div>
          </button>

          {/* Rapports HOT2000 — bâtiments existants */}
          <button
            className="group relative flex flex-col text-left rounded-2xl border bg-white overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
            style={{ borderColor: "#e8edf4" }}
            onClick={() => navigate("/projects/existing")}
            data-testid="button-section-existing"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "#1e3a5f" }} />
            <div className="pl-7 pr-6 pt-6 pb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform" style={{ backgroundColor: "#eef2f8" }}>
                <Building2 className="w-6 h-6" style={{ color: "#1e3a5f" }} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Rapports HOT2000</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-5">
                Analyse avant / après pour immeubles existants.
              </p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "#eef2f8", color: "#1e3a5f" }}>
                  {existingCount} projet{existingCount !== 1 ? "s" : ""}
                </span>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </div>
            </div>
          </button>

          {/* Construction neuve */}
          <button
            className="group relative flex flex-col text-left rounded-2xl border bg-white overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
            style={{ borderColor: "#e8edf4" }}
            onClick={() => navigate("/projects/new")}
            data-testid="button-section-new"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "#16a34a" }} />
            <div className="pl-7 pr-6 pt-6 pb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform" style={{ backgroundColor: "#f0fdf4" }}>
                <HardHat className="w-6 h-6" style={{ color: "#16a34a" }} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Construction neuve</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-5">
                Qualification selon le bâtiment de référence CNEB 2017.
              </p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "#f0fdf4", color: "#16a34a" }}>
                  {newCount} projet{newCount !== 1 ? "s" : ""}
                </span>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </div>
            </div>
          </button>
        </div>

        {/* Recent projects */}
        {recentProjects.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">Projets récents</h2>
            <div className="space-y-2">
              {recentProjects.map((p) => {
                const status = getProjectStatus(p);
                const isNew = p.buildingType === "new";
                return (
                  <button
                    key={p.id}
                    className="group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border bg-white text-left transition-all hover:shadow-sm hover:border-slate-300"
                    style={{ borderColor: "#e8edf4" }}
                    onClick={() => navigate(`/project/${p.id}`)}
                    data-testid={`recent-project-${p.id}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isNew ? "#f0fdf4" : "#eef2f8" }}>
                      {isNew
                        ? <HardHat className="w-4 h-4" style={{ color: "#16a34a" }} />
                        : <Building2 className="w-4 h-4" style={{ color: "#1e3a5f" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                      {p.city && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />{p.city}{p.province ? `, ${p.province}` : ""}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 border"
                      style={{ color: status.color, backgroundColor: status.bg, borderColor: status.border }}
                    >
                      {status.label}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* New project dialog */}
      <NewProjectDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onCreate={(type) => createMutation.mutate(type)}
        isPending={createMutation.isPending}
      />

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
