import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, LogOut, ArrowLeft, Clock, FolderOpen, Plus, Upload, Trash2, Edit2, Eye } from "lucide-react";
import type { AuditLog } from "@shared/schema";

const actionConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  create_project: { label: "Création de projet", icon: <Plus className="w-3.5 h-3.5" />, color: "bg-blue-50 text-blue-700 border-blue-200" },
  upload_pre: { label: "Upload rapport PRÉ", icon: <Upload className="w-3.5 h-3.5" />, color: "bg-orange-50 text-orange-700 border-orange-200" },
  upload_post: { label: "Upload rapport POST", icon: <Upload className="w-3.5 h-3.5" />, color: "bg-green-50 text-green-700 border-green-200" },
  update_project: { label: "Modification", icon: <Edit2 className="w-3.5 h-3.5" />, color: "bg-purple-50 text-purple-700 border-purple-200" },
  delete_project: { label: "Suppression", icon: <Trash2 className="w-3.5 h-3.5" />, color: "bg-red-50 text-red-700 border-red-200" },
  view_project: { label: "Consultation", icon: <Eye className="w-3.5 h-3.5" />, color: "bg-slate-50 text-slate-600 border-slate-200" },
};

function formatDate(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" });
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs/mine"],
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => navigate("/")}
            data-testid="link-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux projets
          </button>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2" data-testid="button-logout">
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Profile card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                style={{ backgroundColor: "#1e3a5f" }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold truncate">{user.name}</h1>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs capitalize">
                    {user.role === "admin" ? "Administrateur" : "Utilisateur"}
                  </Badge>
                  {user.createdAt && (
                    <span className="text-xs text-muted-foreground">
                      Membre depuis {new Date(user.createdAt).toLocaleDateString("fr-CA", { year: "numeric", month: "long" })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit logs */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Historique d'activité</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Toutes vos actions sur la plateforme</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucune activité enregistrée</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y">
                {logs.map((log) => {
                  const cfg = actionConfig[log.action] || { label: log.action, icon: <Eye className="w-3.5 h-3.5" />, color: "bg-slate-50 text-slate-600 border-slate-200" };
                  return (
                    <div key={log.id} className="flex items-start gap-3 py-3" data-testid={`audit-log-${log.id}`}>
                      <div className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.color}`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{cfg.label}</span>
                          {log.projectName && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              — {log.projectName}
                            </span>
                          )}
                        </div>
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(log.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
