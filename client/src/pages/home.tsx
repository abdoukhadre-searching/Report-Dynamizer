import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
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
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function HomePage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
      navigate(`/project/${data.id}`);
    },
  });

  const existingCount = (projects || []).filter((p) => p.buildingType !== "new").length;
  const newCount = (projects || []).filter((p) => p.buildingType === "new").length;

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
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Admin banner */}
        {user?.role === "admin" && (
          <div className="mb-8 flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe" }}>
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span><strong>Vue administrateur</strong> — Tous les projets de tous les utilisateurs sont visibles.</span>
          </div>
        )}

        {/* Welcome */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            Bonjour{user ? `, ${user.name.split(" ")[0]}` : ""} 👋
          </h2>
          <p className="text-slate-500 text-sm">Sélectionnez une catégorie de projet pour commencer.</p>
        </div>

        {/* Two big category cards */}
        <div className="grid sm:grid-cols-2 gap-5">
          {/* Bâtiments existants */}
          <button
            className="group relative flex flex-col text-left rounded-2xl border-2 p-8 transition-all hover:shadow-lg hover:-translate-y-0.5"
            style={{ backgroundColor: "#ffffff", borderColor: "#e8edf4" }}
            onClick={() => navigate("/projects/existing")}
            data-testid="button-section-existing"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-colors group-hover:scale-105" style={{ backgroundColor: "#eef2f8" }}>
              <Building2 className="w-7 h-7" style={{ color: "#1e3a5f" }} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Bâtiments existants</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              Analyse avant / après travaux pour immeubles déjà construits.
            </p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "#eef2f8", color: "#1e3a5f" }}>
                {existingCount} projet{existingCount !== 1 ? "s" : ""}
              </span>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 transition-colors" />
            </div>
          </button>

          {/* Constructions neuves */}
          <button
            className="group relative flex flex-col text-left rounded-2xl border-2 p-8 transition-all hover:shadow-lg hover:-translate-y-0.5"
            style={{ backgroundColor: "#ffffff", borderColor: "#e8edf4" }}
            onClick={() => navigate("/projects/new")}
            data-testid="button-section-new"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-colors group-hover:scale-105" style={{ backgroundColor: "#f0fdf4" }}>
              <HardHat className="w-7 h-7" style={{ color: "#16a34a" }} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Constructions neuves</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              Qualification selon le bâtiment de référence CNEB 2017.
            </p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "#f0fdf4", color: "#16a34a" }}>
                {newCount} projet{newCount !== 1 ? "s" : ""}
              </span>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 transition-colors" />
            </div>
          </button>
        </div>

        {/* Quick new project */}
        <div className="mt-8 flex items-center justify-center gap-3 text-sm text-slate-400">
          <span>Créer rapidement :</span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-slate-200"
            onClick={() => createMutation.mutate("existing")}
            disabled={createMutation.isPending}
            data-testid="button-new-existing"
          >
            <Plus className="w-3.5 h-3.5" /> Bâtiment existant
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-slate-200"
            onClick={() => createMutation.mutate("new")}
            disabled={createMutation.isPending}
            data-testid="button-new-construction"
          >
            <Plus className="w-3.5 h-3.5" /> Construction neuve
          </Button>
        </div>
      </main>

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
