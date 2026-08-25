import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useRef } from "react";
import {
  ArrowLeft, Shield, Clock, Users, FolderOpen, Search,
  Plus, Upload, Trash2, Edit2, Eye, UserPlus, Key, X,
  Zap, Droplets, Star, StarOff, ImagePlus, ChevronDown, ChevronUp,
  Loader2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatEquipmentCapacity } from "@/lib/capacity";
import type { AuditLog, User, HeatPump } from "@shared/schema";

// ── helpers ─────────────────────────────────────────────────────────────────

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

type SafeUser = Omit<User, "passwordHash">;

// ── HeatPumpCard ─────────────────────────────────────────────────────────────

function HeatPumpCard({ hp, onEdit, onDelete }: { hp: HeatPump; onEdit: (hp: HeatPump) => void; onDelete: (id: string) => void }) {
  const images = (hp.images as string[]) ?? [];
  const specPages = (hp.specPages as string[]) ?? [];

  return (
    <div className="border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow">
      {/* Preview image */}
      {images[0] ? (
        <img src={images[0]} alt={hp.name} className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-36 flex items-center justify-center bg-slate-50 border-b">
          {hp.type === "waterheater" ? <Droplets className="w-8 h-8 text-slate-300" /> : <Zap className="w-8 h-8 text-slate-300" />}
        </div>
      )}

      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{hp.name}</p>
            {hp.model && <p className="text-xs text-muted-foreground truncate">{hp.brand ? `${hp.brand} — ` : ""}{hp.model}</p>}
          </div>
          {hp.isDefault && (
            <span className="flex-shrink-0 flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <Star className="w-3 h-3" /> Défaut
            </span>
          )}
        </div>

        {/* Specs */}
        <div className="flex gap-2 flex-wrap mb-2">
          {hp.capacity && <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{formatEquipmentCapacity(hp.capacity, hp.type === "waterheater" ? "waterheater" : "heatpump")}</span>}
          {hp.hspf2 && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">HSPF2 {hp.hspf2}</span>}
          {hp.seer2 && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">SEER2 {hp.seer2}</span>}
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          {images.length} photo{images.length !== 1 ? "s" : ""} · {specPages.length} page{specPages.length !== 1 ? "s" : ""} de fiche
        </p>

        <div className="flex gap-2">
          <Button size="sm" className="flex-1 gap-1 h-7 text-xs" style={{ backgroundColor: "#1e3a5f" }} onClick={() => onEdit(hp)}>
            <Edit2 className="w-3 h-3" /> Modifier
          </Button>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-500 border-red-200 hover:bg-red-50"
            onClick={() => { if (confirm(`Supprimer « ${hp.name} » ?`)) onDelete(hp.id); }}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── HeatPumpEditModal ────────────────────────────────────────────────────────

function HeatPumpEditModal({ hp, onClose }: { hp: HeatPump | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isNew = !hp?.id || hp.id === "__new__";

  const [name, setName] = useState(hp?.name ?? "");
  const [brand, setBrand] = useState(hp?.brand ?? "");
  const [model, setModel] = useState(hp?.model ?? "");
  const [capacity, setCapacity] = useState(hp?.capacity ?? "");
  const [hspf2, setHspf2] = useState(hp?.hspf2 ?? "");
  const [seer2, setSeer2] = useState(hp?.seer2 ?? "");
  const [type, setType] = useState<string>(hp?.type ?? "heatpump");
  const [isDefault, setIsDefault] = useState(hp?.isDefault ?? false);
  const [images, setImages] = useState<string[]>((hp?.images as string[]) ?? []);
  const [specPages, setSpecPages] = useState<string[]>((hp?.specPages as string[]) ?? []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSpec, setUploadingSpec] = useState(false);
  const [saving, setSaving] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const specInputRef = useRef<HTMLInputElement>(null);

  const hpId = hp?.id && hp.id !== "__new__" ? hp.id : null;

  async function uploadFile(file: File, field: "images" | "spec") {
    if (!hpId) { toast({ title: "Enregistrez d'abord les informations de base", variant: "destructive" }); return; }
    if (field === "images") setUploadingImage(true); else setUploadingSpec(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/heat-pumps/${hpId}/upload-image?field=${field}`, { method: "POST", body: form, credentials: "include" });
      if (!res.ok) throw new Error("Upload échoué");
      const updated: HeatPump = await res.json();
      setImages((updated.images as string[]) ?? []);
      setSpecPages((updated.specPages as string[]) ?? []);
      qc.invalidateQueries({ queryKey: ["/api/heat-pumps"] });
      toast({ title: "Image ajoutée" });
    } catch { toast({ title: "Erreur upload", variant: "destructive" }); }
    finally { if (field === "images") setUploadingImage(false); else setUploadingSpec(false); }
  }

  async function deleteFile(url: string, field: "images" | "specPages") {
    if (!hpId) return;
    try {
      await apiRequest("DELETE", `/api/heat-pumps/${hpId}/image`, { url, field });
      if (field === "images") setImages(prev => prev.filter(u => u !== url));
      else setSpecPages(prev => prev.filter(u => u !== url));
      qc.invalidateQueries({ queryKey: ["/api/heat-pumps"] });
    } catch { toast({ title: "Erreur suppression", variant: "destructive" }); }
  }

  async function save() {
    if (!name.trim()) { toast({ title: "Nom requis", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const body = { name: name.trim(), brand: brand.trim(), model: model.trim(), capacity: capacity.trim(), hspf2: hspf2.trim(), seer2: seer2.trim(), type, isDefault };
      if (isNew) {
        await apiRequest("POST", "/api/heat-pumps", body);
      } else {
        await apiRequest("PATCH", `/api/heat-pumps/${hpId}`, body);
      }
      qc.invalidateQueries({ queryKey: ["/api/heat-pumps"] });
      toast({ title: isNew ? "Thermopompe créée" : "Modifications enregistrées" });
      onClose();
    } catch (e: any) {
      toast({ title: e?.message || "Erreur", variant: "destructive" });
    } finally { setSaving(false); }
  }

  const typeLabel = type === "waterheater" ? "Chauffe-eau thermopompe" : "Thermopompe";

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "waterheater" ? <Droplets className="w-4 h-4 text-blue-600" /> : <Zap className="w-4 h-4" style={{ color: "#1e3a5f" }} />}
            {isNew ? `Nouvelle ${typeLabel.toLowerCase()}` : `Modifier — ${hp?.name}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type */}
          {isNew && (
            <div>
              <Label className="text-xs mb-1 block">Type d'équipement</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="heatpump">Thermopompe (chauffage)</SelectItem>
                  <SelectItem value="waterheater">Chauffe-eau thermopompe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Infos de base */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Nom *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="ex : TCL T-Pro-25ES" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Marque</Label>
              <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="ex : TCL" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Modèle</Label>
              <Input value={model} onChange={e => setModel(e.target.value)} placeholder="ex : T-Pro-25ES" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">{type === "waterheater" ? "Capacité (gallons)" : "Capacité (BTU/h)"}</Label>
              <Input value={capacity} onChange={e => setCapacity(e.target.value)} placeholder={type === "waterheater" ? "ex : 65 gallons" : "ex : 12 000 BTU/h"} />
            </div>
            {type !== "waterheater" && (
              <>
                <div>
                  <Label className="text-xs mb-1 block">HSPF2</Label>
                  <Input value={hspf2} onChange={e => setHspf2(e.target.value)} placeholder="ex : 10.5" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">SEER2</Label>
                  <Input value={seer2} onChange={e => setSeer2(e.target.value)} placeholder="ex : 25" />
                </div>
              </>
            )}
          </div>

          {/* Par défaut */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm font-medium">Utiliser comme modèle par défaut pour ce type</span>
          </label>

          {/* Save button before image section */}
          <div className="flex justify-end">
            <Button style={{ backgroundColor: "#1e3a5f" }} disabled={!name.trim() || saving} onClick={save} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isNew ? "Créer et continuer" : "Enregistrer"}
            </Button>
          </div>

          {/* Photos */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Photos de l'équipement</Label>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                disabled={uploadingImage || !hpId}
                onClick={() => imageInputRef.current?.click()}>
                {uploadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
                Ajouter
              </Button>
              <input ref={imageInputRef} type="file" accept="image/*,.heic,.heif" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "images"); e.target.value = ""; }} />
            </div>
            {!hpId && <p className="text-xs text-muted-foreground italic">Enregistrez d'abord pour pouvoir ajouter des images.</p>}
            {images.length === 0 && hpId ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground text-xs cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                onClick={() => imageInputRef.current?.click()}>
                <ImagePlus className="w-6 h-6 mx-auto mb-1 opacity-40" />
                Cliquez pour ajouter une photo
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {images.map((url, i) => (
                  <div key={url} className="relative group rounded overflow-hidden border">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover" />
                    <button
                      onClick={() => deleteFile(url, "images")}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    >×</button>
                  </div>
                ))}
                <div className="border-2 border-dashed rounded flex items-center justify-center h-24 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                  onClick={() => imageInputRef.current?.click()}>
                  <Plus className="w-5 h-5 text-muted-foreground opacity-50" />
                </div>
              </div>
            )}
          </div>

          {/* Fiche technique */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label className="text-sm font-semibold">Fiche technique</Label>
                <p className="text-xs text-muted-foreground">Chaque image = une page dans les rapports</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                disabled={uploadingSpec || !hpId}
                onClick={() => specInputRef.current?.click()}>
                {uploadingSpec ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Ajouter
              </Button>
              <input ref={specInputRef} type="file" accept="image/*,.heic,.heif,application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "spec"); e.target.value = ""; }} />
            </div>
            {!hpId && <p className="text-xs text-muted-foreground italic">Enregistrez d'abord pour pouvoir ajouter des pages.</p>}
            {specPages.length === 0 && hpId ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground text-xs cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                onClick={() => specInputRef.current?.click()}>
                <Plus className="w-6 h-6 mx-auto mb-1 opacity-40" />
                Cliquez pour ajouter une page de fiche technique
              </div>
            ) : (
              <div className="space-y-2">
                {specPages.map((url, i) => (
                  <div key={url} className="relative group flex items-center gap-3 border rounded p-2">
                    <img src={url} alt={`Page ${i + 1}`} className="w-12 h-16 object-cover rounded border flex-shrink-0" />
                    <span className="text-xs text-muted-foreground flex-1">Page {i + 1}</span>
                    <button
                      onClick={() => deleteFile(url, "specPages")}
                      className="w-6 h-6 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors text-sm"
                    >×</button>
                  </div>
                ))}
                <div className="border-2 border-dashed rounded-lg p-3 text-center text-xs text-muted-foreground cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                  onClick={() => specInputRef.current?.click()}>
                  <Plus className="w-4 h-4 mx-auto mb-0.5 opacity-40" /> Ajouter une page
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main AdminPage ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: "", username: "", email: "", password: "", role: "user" });
  const [newPassword, setNewPassword] = useState("");

  // Catalogue state
  const [editingHp, setEditingHp] = useState<HeatPump | null>(null);

  const { data: logs, isLoading } = useQuery<AuditLog[]>({ queryKey: ["/api/audit-logs/all"] });
  const { data: userList, isLoading: usersLoading } = useQuery<SafeUser[]>({ queryKey: ["/api/admin/users"] });
  const { data: heatPumpsAll } = useQuery<HeatPump[]>({ queryKey: ["/api/heat-pumps"] });

  const heatPumpsList = heatPumpsAll?.filter(hp => hp.type === "heatpump") ?? [];
  const waterHeatersList = heatPumpsAll?.filter(hp => hp.type === "waterheater") ?? [];

  const createUserMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/users", newUser),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowCreateUser(false);
      setNewUser({ name: "", username: "", email: "", password: "", role: "user" });
      toast({ title: "Utilisateur créé avec succès" });
    },
    onError: async (e: any) => {
      const msg = await e?.response?.json?.().catch(() => null);
      toast({ title: msg?.message || "Erreur lors de la création", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`, undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Utilisateur supprimé" }); },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/admin/users/${id}`, { password: newPassword }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setResetUserId(null);
      setNewPassword("");
      toast({ title: "Mot de passe mis à jour" });
    },
    onError: () => toast({ title: "Erreur lors de la mise à jour", variant: "destructive" }),
  });

  const deleteHpMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/heat-pumps/${id}`, undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/heat-pumps"] }); toast({ title: "Supprimé" }); },
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

  const uniqueUsers = new Set((logs || []).map((l) => l.userId).filter(Boolean)).size;
  const uniqueProjects = new Set((logs || []).map((l) => l.projectId).filter(Boolean)).size;

  const roleLabel = (r: string) => r === "admin" ? "Admin" : "Utilisateur";
  const roleColor = (r: string) => r === "admin" ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200";

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
          <p className="text-sm text-muted-foreground mt-1">Gestion des utilisateurs, du catalogue et des activités</p>
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
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50">
                <Users className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{userList?.length ?? uniqueUsers}</p>
                <p className="text-xs text-muted-foreground">Utilisateurs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{(heatPumpsAll ?? []).length}</p>
                <p className="text-xs text-muted-foreground">Équipements catalogue</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="utilisateurs">
          <TabsList className="mb-4">
            <TabsTrigger value="utilisateurs" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Utilisateurs</TabsTrigger>
            <TabsTrigger value="catalogue" className="gap-1.5"><Zap className="w-3.5 h-3.5" /> Catalogue</TabsTrigger>
            <TabsTrigger value="journal" className="gap-1.5"><Clock className="w-3.5 h-3.5" /> Journal</TabsTrigger>
          </TabsList>

          {/* ── Onglet Utilisateurs ─────────────────────────────────────────── */}
          <TabsContent value="utilisateurs">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-base">Gestion des utilisateurs</CardTitle>
                  </div>
                  <Button size="sm" className="gap-2" style={{ backgroundColor: "#1e3a5f" }} onClick={() => setShowCreateUser(true)}>
                    <UserPlus className="w-4 h-4" /> Nouvel accès
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="p-6 space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : !userList?.length ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Aucun utilisateur</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Nom</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Identifiant</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Courriel</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Rôle</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {userList.map(u => (
                          <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-xs">{u.name}</td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{(u as any).username || "—"}</td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{u.email}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleColor(u.role)}`}>
                                {roleLabel(u.role)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <button
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[#1e3a5f] transition-colors"
                                  onClick={() => { setResetUserId(u.id); setNewPassword(""); }}
                                >
                                  <Key className="w-3.5 h-3.5" /> MDP
                                </button>
                                {u.id !== user.id && (
                                  <button
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600 transition-colors"
                                    onClick={() => { if (confirm(`Supprimer l'accès de ${u.name} ?`)) deleteUserMutation.mutate(u.id); }}
                                  >
                                    <X className="w-3.5 h-3.5" /> Supprimer
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Onglet Catalogue ────────────────────────────────────────────── */}
          <TabsContent value="catalogue" className="space-y-6">
            {/* Thermopompes */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" style={{ color: "#1e3a5f" }} />
                    <CardTitle className="text-base">Thermopompes (chauffage)</CardTitle>
                    <span className="text-xs text-muted-foreground">({heatPumpsList.length})</span>
                  </div>
                  <Button size="sm" className="gap-1.5" style={{ backgroundColor: "#1e3a5f" }}
                    onClick={() => setEditingHp({ id: "__new__", name: "", brand: null, model: null, capacity: null, hspf2: null, seer2: null, type: "heatpump", isDefault: false, images: [], specPages: [], logisvertPdf: null, subventionAmount: null, createdAt: new Date() })}>
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {heatPumpsList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    <Zap className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    Aucune thermopompe dans le catalogue
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {heatPumpsList.map(hp => (
                      <HeatPumpCard key={hp.id} hp={hp} onEdit={setEditingHp} onDelete={id => deleteHpMutation.mutate(id)} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chauffe-eaux thermopompe */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-base">Chauffe-eaux thermopompe</CardTitle>
                    <span className="text-xs text-muted-foreground">({waterHeatersList.length})</span>
                  </div>
                  <Button size="sm" className="gap-1.5" style={{ backgroundColor: "#1e3a5f" }}
                    onClick={() => setEditingHp({ id: "__new__", name: "", brand: null, model: null, capacity: null, hspf2: null, seer2: null, type: "waterheater", isDefault: false, images: [], specPages: [], logisvertPdf: null, subventionAmount: null, createdAt: new Date() })}>
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {waterHeatersList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    <Droplets className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    Aucun chauffe-eau thermopompe dans le catalogue
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {waterHeatersList.map(hp => (
                      <HeatPumpCard key={hp.id} hp={hp} onEdit={setEditingHp} onDelete={id => deleteHpMutation.mutate(id)} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Onglet Journal ──────────────────────────────────────────────── */}
          <TabsContent value="journal">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-base">Journal d'activité global</CardTitle>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrer…" className="pl-8 h-8 text-sm" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
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
                            <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                                  {cfg.icon}{cfg.label}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="font-medium text-xs">{log.userName || "—"}</div>
                                <div className="text-xs text-muted-foreground">{log.userEmail || ""}</div>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[150px] truncate">{log.projectName || "—"}</td>
                              <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[180px] truncate">{log.details || "—"}</td>
                              <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.createdAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Modal créer utilisateur ─────────────────────────────────────────── */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" style={{ color: "#1e3a5f" }} />
              Créer un accès
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs mb-1 block">Nom complet *</Label><Input value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="Jean Tremblay" /></div>
            <div><Label className="text-xs mb-1 block">Nom d'utilisateur</Label><Input value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} placeholder="jtremblay01" autoComplete="off" /></div>
            <div><Label className="text-xs mb-1 block">Courriel *</Label><Input type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="jean@exemple.com" /></div>
            <div><Label className="text-xs mb-1 block">Mot de passe *</Label><Input type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="Minimum 6 caractères" autoComplete="new-password" /></div>
            <div><Label className="text-xs mb-1 block">Rôle</Label>
              <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utilisateur</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUser(false)}>Annuler</Button>
            <Button style={{ backgroundColor: "#1e3a5f" }} disabled={!newUser.name || !newUser.email || !newUser.password || createUserMutation.isPending} onClick={() => createUserMutation.mutate()}>
              {createUserMutation.isPending ? "Création…" : "Créer l'accès"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal réinitialiser MDP ─────────────────────────────────────────── */}
      <Dialog open={!!resetUserId} onOpenChange={open => { if (!open) setResetUserId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-4 h-4" style={{ color: "#1e3a5f" }} />
              Nouveau mot de passe
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs mb-1 block">Nouveau mot de passe</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 caractères" autoComplete="new-password" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUserId(null)}>Annuler</Button>
            <Button style={{ backgroundColor: "#1e3a5f" }} disabled={newPassword.length < 6 || resetPasswordMutation.isPending} onClick={() => resetUserId && resetPasswordMutation.mutate(resetUserId)}>
              {resetPasswordMutation.isPending ? "Mise à jour…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal édition thermopompe ───────────────────────────────────────── */}
      {editingHp && <HeatPumpEditModal hp={editingHp} onClose={() => setEditingHp(null)} />}
    </div>
  );
}
