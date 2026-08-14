import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Zap, ClipboardList, FileBarChart2, FileSignature, ChevronRight,
  ChevronDown, User, LogOut, Shield,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";

export default function HomePage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: "rgba(255,255,255,0.97)", borderColor: "#e8edf4" }}>
        <div className="max-w-4xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={mabLogoPath} alt="MAB" className="h-9 object-contain" />
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: "#1e3a5f" }}>
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 leading-none" data-testid="text-app-title">MAB Projets</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Gestion de projets · Québec</p>
              </div>
            </div>
          </div>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-slate-600" data-testid="button-user-menu">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#1e3a5f" }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-xs max-w-[110px] truncate">{user.name}</span>
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

      {/* Main — centered two-card hub */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Que souhaitez-vous faire ?
            </h1>
            <p className="text-sm text-slate-400">Sélectionnez une section pour commencer.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feuille de mandats */}
            <button
              className="group relative flex flex-col text-left rounded-2xl border-2 bg-white overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
              style={{ borderColor: "#e8edf4" }}
              onClick={() => navigate("/mandats")}
              data-testid="button-section-mandats"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl" style={{ backgroundColor: "#7c3aed" }} />
              <div className="pl-8 pr-6 pt-8 pb-7">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: "#f5f3ff" }}
                >
                  <ClipboardList className="w-7 h-7" style={{ color: "#7c3aed" }} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Feuilles de mandats</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Créer et gérer les feuilles de mandat pour définir la portée des travaux, sans rapport HOT2000.
                </p>
                <div className="flex items-center gap-1.5 mt-5" style={{ color: "#7c3aed" }}>
                  <span className="text-xs font-semibold">Accéder</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </button>

            {/* Offre de service */}
            <button
              className="group relative flex flex-col text-left rounded-2xl border-2 bg-white overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
              style={{ borderColor: "#e8edf4" }}
              onClick={() => navigate("/offres")}
              data-testid="button-section-offres"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl" style={{ backgroundColor: "#0f766e" }} />
              <div className="pl-8 pr-6 pt-8 pb-7">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: "#f0fdfa" }}
                >
                  <FileSignature className="w-7 h-7" style={{ color: "#0f766e" }} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Offres de service</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Préparer les offres de service pour vos clients : mandat, services, rémunération et signature.
                </p>
                <div className="flex items-center gap-1.5 mt-5" style={{ color: "#0f766e" }}>
                  <span className="text-xs font-semibold">Accéder</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </button>

            {/* Rapports H2K */}
            <button
              className="group relative flex flex-col text-left rounded-2xl border-2 bg-white overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
              style={{ borderColor: "#e8edf4" }}
              onClick={() => navigate("/rapports")}
              data-testid="button-section-rapports"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl" style={{ backgroundColor: "#1e3a5f" }} />
              <div className="pl-8 pr-6 pt-8 pb-7">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: "#eef2f8" }}
                >
                  <FileBarChart2 className="w-7 h-7" style={{ color: "#1e3a5f" }} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Rapports H2K</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Analyser les rapports HOT2000 avant / après travaux et générer les cahiers de qualification APH SELECT.
                </p>
                <div className="flex items-center gap-1.5 mt-5" style={{ color: "#1e3a5f" }}>
                  <span className="text-xs font-semibold">Accéder</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </button>
          </div>
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
