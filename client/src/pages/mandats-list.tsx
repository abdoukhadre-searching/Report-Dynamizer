import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Mandat } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, Plus, ArrowLeft, Zap, ChevronDown, User, LogOut,
  Shield, ArrowRight, MapPin, Building2, Trash2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MANDAT_TYPE_LABEL: Record<string, string> = {
  schl: "Simulation SCHL",
  analyse: "Analyse énergétique",
  combined: "SCHL + Analyse",
};

export default function MandatsListPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { data: mandats, isError, refetch } = useQuery<Mandat[]>({
    queryKey: ["/api/mandats"],
    retry: 2,
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mandats", { name: "Nouveau mandat" });
      return res.json();
    },
    onSuccess: (data: Mandat) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mandats"] });
      navigate(`/mandats/${data.id}`);
    },
    onError: (err: Error) => {
      if (err.message.startsWith("401")) {
        refetch();
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/mandats/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mandats"] });
      setDeleteId(null);
    },
  });

  const handleLogout = async () => { await logout(); navigate("/login"); };
  const all = mandats ?? [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", borderColor: "#e8edf4" }}>
        <div className="max-w-3xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/")} data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1e3a5f" }}>
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-none">Feuillesde mandat</h1>
              <p className="text-[10px] text-slate-400 mt-0.5">MAB Conseil Immobilier</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 font-semibold"
              style={{ backgroundColor: "#1e3a5f" }}
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              data-testid="button-new-mandat"
            >
              <Plus className="w-4 h-4" />
              Nouvelle feuille
            </Button>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-slate-600">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#1e3a5f" }}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-semibold truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 cursor-pointer text-sm" onClick={() => navigate("/profile")}>
                    <User className="w-3.5 h-3.5" /> Mon profil
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem className="gap-2 cursor-pointer text-sm" onClick={() => navigate("/admin")}>
                      <Shield className="w-3.5 h-3.5" /> Administration
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 cursor-pointer text-sm text-destructive focus:text-destructive" onClick={() => setShowLogoutConfirm(true)}>
                    <LogOut className="w-3.5 h-3.5" /> Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {all.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#eef2f8" }}>
              <ClipboardList className="w-8 h-8" style={{ color: "#1e3a5f" }} />
            </div>
            <h2 className="text-base font-semibold text-slate-700 mb-2">Aucune feuille de mandat</h2>
            <p className="text-sm text-slate-400 mb-6">Créez votre première feuille de mandat pour définir la portée des travaux.</p>
            <Button
              className="gap-2 font-semibold"
              style={{ backgroundColor: "#1e3a5f" }}
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              data-testid="button-create-first-mandat"
            >
              <Plus className="w-4 h-4" />
              Créer une feuille de mandat
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {all.map(m => {
              const md = m.mandatData as any;
              const typeLabel = md?.mandatType ? MANDAT_TYPE_LABEL[md.mandatType] : null;
              return (
                <div
                  key={m.id}
                  className="group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border bg-white transition-all hover:shadow-sm hover:border-slate-300"
                  style={{ borderColor: "#e8edf4" }}
                  data-testid={`mandat-row-${m.id}`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#eef2f8" }}>
                    <ClipboardList className="w-4 h-4" style={{ color: "#1e3a5f" }} />
                  </div>
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => navigate(`/mandats/${m.id}`)}
                    data-testid={`button-open-mandat-${m.id}`}
                  >
                    <p className="text-sm font-medium text-slate-800 truncate">{m.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {m.clientName && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{m.clientName}
                        </span>
                      )}
                      {m.city && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{m.city}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {typeLabel && (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border" style={{ color: "#1e3a5f", backgroundColor: "#eef2f8", borderColor: "#c7d9f0" }}>
                        {typeLabel}
                      </span>
                    )}
                    {m.mandataire && (
                      <span className="text-[11px] text-slate-400 hidden sm:block">→ {m.mandataire}</span>
                    )}
                    <button
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      onClick={() => setDeleteId(m.id)}
                      data-testid={`button-delete-mandat-${m.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la feuille de mandat ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
            <AlertDialogDescription>Êtes-vous sûr de vouloir vous déconnecter ?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} style={{ backgroundColor: "#1e3a5f" }}>
              Se déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
