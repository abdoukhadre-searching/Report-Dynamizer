import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import {
  LogOut, ArrowLeft, Clock, Plus, Upload, Trash2, Edit2, Eye, RefreshCw,
  User, KeyRound, Save, Thermometer, Droplets, Star, X, Pencil,
} from "lucide-react";
import type { AuditLog, HeatPump } from "@shared/schema";
import { apiRequest, queryClient as qc2 } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Modal ajout / édition équipement ────────────────────────────────────────

function HeatPumpModal({
  hp: hpProp,
  defaultType,
  onClose,
}: {
  hp: HeatPump | null;       // null = création
  defaultType: "heatpump" | "waterheater";
  onClose: () => void;
}) {
  // currentHp suit l'état du serveur après création/modification
  const [currentHp, setCurrentHp] = useState<HeatPump | null>(hpProp);
  const isEdit = !!currentHp;
  const type = currentHp?.type ?? defaultType; // fixé, pas modifiable
  const isHP = type === "heatpump";

  const [name, setName] = useState(currentHp?.name ?? "");
  const [brand, setBrand] = useState(currentHp?.brand ?? "");
  const [model, setModel] = useState(currentHp?.model ?? "");
  const [capacity, setCapacity] = useState(currentHp?.capacity ?? "");
  const [hspf2, setHspf2] = useState(currentHp?.hspf2 ?? "");
  const [seer2, setSeer2] = useState(currentHp?.seer2 ?? "");
  const [isDefault, setIsDefault] = useState(currentHp?.isDefault ?? false);
  const [images, setImages] = useState<string[]>((currentHp?.images as string[]) ?? []);
  const [specPages, setSpecPages] = useState<string[]>((currentHp?.specPages as string[]) ?? []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSpec, setUploadingSpec] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function uploadFile(file: File, field: "image" | "spec", hpId: string) {
    const fd = new FormData();
    fd.append("file", file);
    const url = `/api/heat-pumps/${hpId}/upload-image${field === "spec" ? "?field=spec" : ""}`;
    const res = await fetch(url, { method: "POST", body: fd, credentials: "include" });
    if (!res.ok) throw new Error("Upload échoué");
    return (await res.json()) as HeatPump;
  }

  async function handleUpload(files: FileList | null, field: "image" | "spec") {
    if (!files || files.length === 0 || !currentHp) return;
    field === "image" ? setUploadingImage(true) : setUploadingSpec(true);
    try {
      let updated: HeatPump = currentHp;
      for (const f of Array.from(files)) updated = await uploadFile(f, field, currentHp.id);
      setImages((updated.images as string[]) ?? []);
      setSpecPages((updated.specPages as string[]) ?? []);
      qc2.invalidateQueries({ queryKey: ["/api/heat-pumps"] });
    } catch { setError("Échec de l'upload"); }
    finally { field === "image" ? setUploadingImage(false) : setUploadingSpec(false); }
  }

  async function handleDeleteImage(url: string, field: "images" | "specPages") {
    if (!currentHp) return;
    try {
      const res = await apiRequest("DELETE", `/api/heat-pumps/${currentHp.id}/image`, { url, field });
      const updated = await res.json() as HeatPump;
      setImages((updated.images as string[]) ?? []);
      setSpecPages((updated.specPages as string[]) ?? []);
      qc2.invalidateQueries({ queryKey: ["/api/heat-pumps"] });
    } catch { setError("Échec suppression image"); }
  }

  async function handleSave() {
    if (!name.trim()) { setError("Le nom est requis."); return; }
    setSaving(true); setError("");
    try {
      if (isEdit) {
        await apiRequest("PATCH", `/api/heat-pumps/${currentHp!.id}`, { name, brand, model, capacity, hspf2, seer2, isDefault });
        qc2.invalidateQueries({ queryKey: ["/api/heat-pumps"] });
        onClose();
      } else {
        // Création : rester ouvert pour permettre l'upload de photos
        const res = await apiRequest("POST", "/api/heat-pumps", { name, brand, model, capacity, hspf2, seer2, type, isDefault });
        const created = await res.json() as HeatPump;
        setCurrentHp(created);
        setImages((created.images as string[]) ?? []);
        setSpecPages((created.specPages as string[]) ?? []);
        qc2.invalidateQueries({ queryKey: ["/api/heat-pumps"] });
        // Ne pas fermer — l'utilisateur peut maintenant ajouter photos/fiches
      }
    } catch (e: any) { setError(e.message ?? "Erreur"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier l'équipement" : isHP ? "Nouvelle thermopompe" : "Nouveau chauffe-eau"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Badge type — info seulement */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: isHP ? "#fee2e2" : "#dbeafe", color: isHP ? "#dc2626" : "#2563eb" }}
            >
              {isHP ? <Thermometer className="w-3.5 h-3.5" /> : <Droplets className="w-3.5 h-3.5" />}
              {isHP ? "Thermopompe" : "Chauffe-eau thermopompe"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nom *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={isHP ? "ex: TCL T-Pro-25ES" : "ex: Rheem ProTerra"} className="mt-1" />
            </div>
            <div>
              <Label>Marque</Label>
              <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder={isHP ? "ex: TCL" : "ex: Rheem"} className="mt-1" />
            </div>
            <div>
              <Label>Modèle</Label>
              <Input value={model} onChange={e => setModel(e.target.value)} placeholder="ex: T-Pro-25ES" className="mt-1" />
            </div>
            <div className={isHP ? "" : "col-span-2"}>
              <Label>Capacité</Label>
              <Input value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="ex: 12 000 BTU" className="mt-1" />
            </div>
            {isHP && (
              <>
                <div>
                  <Label>HSPF2</Label>
                  <Input value={hspf2} onChange={e => setHspf2(e.target.value)} placeholder="ex: 10.5" className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>SEER2</Label>
                  <Input value={seer2} onChange={e => setSeer2(e.target.value)} placeholder="ex: 25" className="mt-1" />
                </div>
              </>
            )}
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="w-4 h-4 accent-yellow-500" />
            <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-yellow-500" />
              Équipement par défaut pour ce type
            </span>
          </label>

          {/* Upload — toujours visible, activé après enregistrement */}
          <div className="border-t pt-3 space-y-4">
            {!currentHp && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                💡 Enregistrez d'abord l'équipement pour pouvoir ajouter des photos et des fiches techniques.
              </p>
            )}
            {currentHp && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                ✓ Équipement enregistré — ajoutez vos photos et fiches ci-dessous, puis fermez quand vous avez terminé.
              </p>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Photos</Label>
                {currentHp ? (
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*,.pdf,application/pdf" multiple className="hidden" onChange={e => handleUpload(e.target.files, "image")} />
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                      {uploadingImage ? "Envoi…" : <><Plus className="w-3.5 h-3.5" /> Ajouter</>}
                    </span>
                  </label>
                ) : (
                  <span className="text-xs text-slate-300 border border-slate-100 px-2.5 py-1.5 rounded-lg">Ajouter</span>
                )}
              </div>
              {images.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucune photo.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((url, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-50">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button onClick={() => handleDeleteImage(url, "images")} className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Pages de fiche technique</Label>
                {currentHp ? (
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*,.pdf,application/pdf" multiple className="hidden" onChange={e => handleUpload(e.target.files, "spec")} />
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                      {uploadingSpec ? "Envoi…" : <><Plus className="w-3.5 h-3.5" /> Ajouter</>}
                    </span>
                  </label>
                ) : (
                  <span className="text-xs text-slate-300 border border-slate-100 px-2.5 py-1.5 rounded-lg">Ajouter</span>
                )}
              </div>
              {specPages.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucune page.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {specPages.map((url, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-50">
                      <img src={url} alt={`Fiche ${i + 1}`} className="w-full h-full object-cover" />
                      <button onClick={() => handleDeleteImage(url, "specPages")} className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{currentHp && !hpProp ? "Fermer" : "Annuler"}</Button>
          {(!currentHp || hpProp) && (
            <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: "#1e3a5f" }}>
              {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer l'équipement"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte équipement ─────────────────────────────────────────────────────────

function HeatPumpCard({
  hp,
  onEdit,
  onDelete,
}: {
  hp: HeatPump;
  onEdit: (hp: HeatPump) => void;
  onDelete: (hp: HeatPump) => void;
}) {
  const isHP = hp.type === "heatpump";
  const photos = (hp.images as string[]) ?? [];
  const specs = (hp.specPages as string[]) ?? [];

  return (
    <div className="group relative bg-white rounded-xl border overflow-hidden transition-all hover:shadow-md" style={{ borderColor: "#e8edf4" }}>
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: isHP ? "#dc2626" : "#2563eb" }} />
      {photos.length > 0 ? (
        <div className="h-28 ml-1 overflow-hidden bg-slate-50">
          <img src={photos[0]} alt={hp.name} className="w-full h-full object-contain p-2" />
        </div>
      ) : (
        <div className="h-28 ml-1 flex items-center justify-center bg-slate-50">
          {isHP ? <Thermometer className="w-8 h-8 text-slate-200" /> : <Droplets className="w-8 h-8 text-slate-200" />}
        </div>
      )}
      <div className="pl-4 pr-3 pb-3 pt-2">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          {hp.isDefault && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ backgroundColor: "#fefce8", color: "#a16207" }}>
              <Star className="w-2.5 h-2.5" /> Défaut
            </span>
          )}
        </div>
        <p className="font-semibold text-slate-900 text-sm leading-tight">{hp.name}</p>
        {hp.brand && <p className="text-xs text-slate-400 mt-0.5">{hp.brand}{hp.model ? ` · ${hp.model}` : ""}</p>}
        <div className="flex flex-wrap gap-x-2 mt-1 text-xs text-slate-400">
          {hp.capacity && <span>{hp.capacity}</span>}
          {hp.hspf2 && <span>HSPF2 {hp.hspf2}</span>}
          {hp.seer2 && <span>SEER2 {hp.seer2}</span>}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <span className="text-[10px] text-slate-400">{photos.length} photo{photos.length !== 1 ? "s" : ""} · {specs.length} fiche{specs.length !== 1 ? "s" : ""}</span>
          <div className="flex items-center gap-0.5">
            <button onClick={() => onEdit(hp)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Modifier">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={() => onDelete(hp)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Supprimer">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section catalogue (réutilisable par type) ────────────────────────────────

function CatalogueSection({
  type,
  items,
  onAdd,
  onEdit,
  onDelete,
}: {
  type: "heatpump" | "waterheater";
  items: HeatPump[];
  onAdd: () => void;
  onEdit: (hp: HeatPump) => void;
  onDelete: (hp: HeatPump) => void;
}) {
  const isHP = type === "heatpump";
  const color = isHP ? "#dc2626" : "#2563eb";
  const bgColor = isHP ? "#fee2e2" : "#dbeafe";
  const Icon = isHP ? Thermometer : Droplets;
  const label = isHP ? "Thermopompes" : "Chauffe-eaux thermopompe";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: bgColor }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-sm font-semibold text-slate-800">{label}</span>
          <span className="text-xs text-slate-400">({items.length})</span>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={onAdd}>
          <Plus className="w-3 h-3" /> Ajouter
        </Button>
      </div>

      {items.length === 0 ? (
        <div
          className="flex items-center gap-3 py-5 px-4 rounded-xl border-2 border-dashed cursor-pointer hover:bg-slate-50 transition-colors"
          style={{ borderColor: "#e2e8f0" }}
          onClick={onAdd}
        >
          <Icon className="w-5 h-5 text-slate-300" />
          <p className="text-sm text-slate-400">Aucun équipement — cliquez pour en ajouter un.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map(hp => (
            <HeatPumpCard key={hp.id} hp={hp} onEdit={onEdit} onDelete={onDelete} />
          ))}
          <button
            onClick={onAdd}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-8 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
            style={{ borderColor: "#e2e8f0" }}
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-semibold">Ajouter</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page Profil ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Username / password
  const [newUsername, setNewUsername] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [editingPassword, setEditingPassword] = useState(false);

  // ── Catalogue modal state: { hp, type } | null
  const [modal, setModal] = useState<{ hp: HeatPump | null; type: "heatpump" | "waterheater" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HeatPump | null>(null);

  const { data: logs, isLoading, isFetching, refetch } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs/mine"],
  });

  const { data: heatPumps = [] } = useQuery<HeatPump[]>({
    queryKey: ["/api/heat-pumps"],
  });

  const hps = heatPumps.filter(h => h.type === "heatpump");
  const whs = heatPumps.filter(h => h.type === "waterheater");

  const profileMutation = useMutation({
    mutationFn: (body: Record<string, any>) => apiRequest("PATCH", "/api/auth/profile", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/auth/me"] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/heat-pumps/${id}`); },
    onSuccess: () => { qc2.invalidateQueries({ queryKey: ["/api/heat-pumps"] }); setDeleteTarget(null); },
  });

  const handleLogout = async () => { await logout(); navigate("/login"); };

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
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
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
            Retour
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
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0" style={{ backgroundColor: "#1e3a5f" }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold truncate">{user.name}</h1>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                {currentUsername && <p className="text-xs text-muted-foreground font-mono mt-0.5">@{currentUsername}</p>}
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

        {/* Identifiants de connexion */}
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
                  <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => { setEditingUsername(true); setNewUsername(currentUsername ?? ""); }}>
                    Modifier
                  </button>
                )}
              </div>
              {editingUsername ? (
                <div className="flex gap-2">
                  <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Nouveau nom d'utilisateur" autoComplete="off" className="flex-1" onKeyDown={e => { if (e.key === "Enter") saveUsername(); if (e.key === "Escape") setEditingUsername(false); }} />
                  <Button size="sm" style={{ backgroundColor: "#1e3a5f" }} disabled={!newUsername.trim() || profileMutation.isPending} onClick={saveUsername} className="gap-1.5">
                    <Save className="w-3.5 h-3.5" /> Enregistrer
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingUsername(false); setNewUsername(""); }}>Annuler</Button>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-md bg-muted/50 text-sm font-mono">{currentUsername || <span className="text-muted-foreground italic">Non défini</span>}</div>
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
                  <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setEditingPassword(true)}>Modifier</button>
                )}
              </div>
              {editingPassword ? (
                <div className="space-y-2">
                  <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Mot de passe actuel" autoComplete="current-password" />
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe (min. 6 caractères)" autoComplete="new-password" />
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmer le nouveau mot de passe" autoComplete="new-password" onKeyDown={e => { if (e.key === "Enter") savePassword(); if (e.key === "Escape") setEditingPassword(false); }} />
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" style={{ backgroundColor: "#1e3a5f" }} disabled={!currentPassword || !newPassword || newPassword.length < 6 || profileMutation.isPending} onClick={savePassword} className="gap-1.5">
                      <Save className="w-3.5 h-3.5" /> Enregistrer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingPassword(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>Annuler</Button>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-md bg-muted/50 text-sm text-muted-foreground">••••••••••••</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Catalogue d'équipements ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Partie technique — Catalogue d'équipements</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Thermopompes et chauffe-eaux disponibles pour vos projets.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <CatalogueSection
              type="heatpump"
              items={hps}
              onAdd={() => setModal({ hp: null, type: "heatpump" })}
              onEdit={hp => setModal({ hp, type: hp.type as "heatpump" | "waterheater" })}
              onDelete={setDeleteTarget}
            />
            <div className="border-t" />
            <CatalogueSection
              type="waterheater"
              items={whs}
              onAdd={() => setModal({ hp: null, type: "waterheater" })}
              onEdit={hp => setModal({ hp, type: hp.type as "heatpump" | "waterheater" })}
              onDelete={setDeleteTarget}
            />
          </CardContent>
        </Card>

        {/* Historique d'activité */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Historique d'activité</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5 h-8 text-xs" data-testid="button-refresh-logs">
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
                          {log.projectName && <span className="text-xs text-muted-foreground truncate max-w-[200px]">— {log.projectName}</span>}
                        </div>
                        {log.details && <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>}
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

      {/* Modal création / édition */}
      {modal && (
        <HeatPumpModal
          hp={modal.hp}
          defaultType={modal.type}
          onClose={() => setModal(null)}
        />
      )}

      {/* Confirmation suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'équipement ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {deleteTarget?.name} » sera supprimé définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} style={{ backgroundColor: "#dc2626" }}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
