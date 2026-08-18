import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { LogOut, ArrowLeft, Clock, Plus, Upload, Trash2, Edit2, Eye, RefreshCw, User, KeyRound, Save } from "lucide-react";
import type { AuditLog } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Username form
  const [newUsername, setNewUsername] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);

  // ── Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [editingPassword, setEditingPassword] = useState(false);

  const { data: logs, isLoading, isFetching, refetch } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs/mine"],
  });

  const profileMutation = useMutation({
    mutationFn: (body: Record<string, any>) => apiRequest("PATCH", "/api/auth/profile", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  async function saveUsername() {
    if (!newUsername.trim()) return;
    try {
      await profileMutation.mutateAsync({ username: newUsername.trim() });
      toast({ title: "Nom d'utilisateur mis à jour" });
      setEditingUsername(false);
      setNewUsername("");
    } catch (e: any) {
      const msg = await e?.response?.json?.().catch(() => null);
      toast({ title: msg?.message || "Erreur", variant: "destructive" });
    }
  }

  async function savePassword() {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    try {
      await profileMutation.mutateAsync({ currentPassword, newPassword });
      toast({ title: "Mot de passe mis à jour" });
      setEditingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      const msg = await e?.response?.json?.().catch(() => null);
      toast({ title: msg?.message || "Erreur", variant: "destructive" });
    }
  }

  if (!user) return null;

  const currentUsername = (user as any).username;

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
                {currentUsername && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">@{currentUsername}</p>
                )}
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

        {/* ── Modifier les identifiants ─────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Identifiants de connexion</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Nom d'utilisateur */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Nom d'utilisateur</Label>
                {!editingUsername && (
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => { setEditingUsername(true); setNewUsername(currentUsername ?? ""); }}
                  >
                    Modifier
                  </button>
                )}
              </div>
              {editingUsername ? (
                <div className="flex gap-2">
                  <Input
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="Nouveau nom d'utilisateur"
                    autoComplete="off"
                    className="flex-1"
                    onKeyDown={e => { if (e.key === "Enter") saveUsername(); if (e.key === "Escape") setEditingUsername(false); }}
                  />
                  <Button
                    size="sm"
                    style={{ backgroundColor: "#1e3a5f" }}
                    disabled={!newUsername.trim() || profileMutation.isPending}
                    onClick={saveUsername}
                    className="gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Enregistrer
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingUsername(false); setNewUsername(""); }}>
                    Annuler
                  </Button>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-md bg-muted/50 text-sm font-mono">
                  {currentUsername || <span className="text-muted-foreground italic">Non défini</span>}
                </div>
              )}
            </div>

            <div className="border-t" />

            {/* Mot de passe */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                  <Label className="text-sm font-medium">Mot de passe</Label>
                </div>
                {!editingPassword && (
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => setEditingPassword(true)}
                  >
                    Modifier
                  </button>
                )}
              </div>

              {editingPassword ? (
                <div className="space-y-2">
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Mot de passe actuel"
                    autoComplete="current-password"
                  />
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nouveau mot de passe (min. 6 caractères)"
                    autoComplete="new-password"
                  />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirmer le nouveau mot de passe"
                    autoComplete="new-password"
                    onKeyDown={e => { if (e.key === "Enter") savePassword(); if (e.key === "Escape") setEditingPassword(false); }}
                  />
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      style={{ backgroundColor: "#1e3a5f" }}
                      disabled={!currentPassword || !newPassword || newPassword.length < 6 || profileMutation.isPending}
                      onClick={savePassword}
                      className="gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Enregistrer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingPassword(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-md bg-muted/50 text-sm text-muted-foreground">
                  ••••••••••••
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audit logs */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Historique d'activité</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-1.5 h-8 text-xs"
                data-testid="button-refresh-logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
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
