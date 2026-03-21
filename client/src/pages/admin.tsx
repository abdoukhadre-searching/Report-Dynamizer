import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ArrowLeft, Shield, Clock, Users, FolderOpen, Search, Plus, Upload, Trash2, Edit2, Eye } from "lucide-react";
import type { AuditLog } from "@shared/schema";

const actionConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  create_project: { label: "Création", icon: <Plus className="w-3 h-3" />, color: "bg-blue-50 text-blue-700 border-blue-200" },
  upload_pre: { label: "Upload PRÉ", icon: <Upload className="w-3 h-3" />, color: "bg-orange-50 text-orange-700 border-orange-200" },
  upload_post: { label: "Upload POST", icon: <Upload className="w-3 h-3" />, color: "bg-green-50 text-green-700 border-green-200" },
  update_project: { label: "Modification", icon: <Edit2 className="w-3 h-3" />, color: "bg-purple-50 text-purple-700 border-purple-200" },
  delete_project: { label: "Suppression", icon: <Trash2 className="w-3 h-3" />, color: "bg-red-50 text-red-700 border-red-200" },
  view_project: { label: "Consultation", icon: <Eye className="w-3 h-3" />, color: "bg-slate-50 text-slate-600 border-slate-200" },
};

function formatDate(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs/all"],
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Accès refusé</h2>
          <p className="text-sm text-muted-foreground mb-4">Vous n'avez pas les droits administrateur.</p>
          <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  const filtered = (logs || []).filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.userName || "").toLowerCase().includes(q) ||
      (l.userEmail || "").toLowerCase().includes(q) ||
      (l.projectName || "").toLowerCase().includes(q) ||
      (l.action || "").toLowerCase().includes(q)
    );
  });

  const uniqueUsers = [...new Set((logs || []).map((l) => l.userId).filter(Boolean))].length;
  const uniqueProjects = [...new Set((logs || []).map((l) => l.projectId).filter(Boolean))].length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => navigate("/")}
              data-testid="link-back-home"
            >
              <ArrowLeft className="w-4 h-4" />
              Accueil
            </button>
            <span className="text-muted-foreground">/</span>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: "#1e3a5f" }} />
              <span className="font-semibold text-sm" style={{ color: "#1e3a5f" }}>Administration</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1e3a5f" }}>Tableau de bord administrateur</h1>
          <p className="text-sm text-muted-foreground mt-1">Vue globale de toutes les activités sur la plateforme</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#e8eef6" }}>
                <Clock className="w-5 h-5" style={{ color: "#1e3a5f" }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "#1e3a5f" }}>{logs?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Actions totales</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#edf7ed" }}>
                <Users className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{uniqueUsers}</p>
                <p className="text-xs text-muted-foreground">Utilisateurs actifs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50">
                <FolderOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{uniqueProjects}</p>
                <p className="text-xs text-muted-foreground">Projets manipulés</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Log table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Journal d'activité global</CardTitle>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrer…"
                  className="pl-8 h-8 text-sm"
                  data-testid="input-admin-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucune activité enregistrée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Action</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Utilisateur</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Projet</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Détails</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((log) => {
                      const cfg = actionConfig[log.action] || { label: log.action, icon: null, color: "bg-slate-50 text-slate-600 border-slate-200" };
                      return (
                        <tr key={log.id} className="hover:bg-muted/20 transition-colors" data-testid={`admin-log-${log.id}`}>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                              {cfg.icon}
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-xs">{log.userName || "—"}</div>
                            <div className="text-xs text-muted-foreground">{log.userEmail || ""}</div>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[150px] truncate">
                            {log.projectName || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[180px] truncate">
                            {log.details || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(log.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
