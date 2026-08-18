import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import type { HeatPump } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Zap, ArrowLeft, Plus, Pencil, Trash2, Star, Upload, X,
  Thermometer, Droplets, ChevronDown, User, LogOut, Shield,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// ─── Modal d'édition ────────────────────────────────────────────────────────

function HeatPumpModal({
  hp,
  onClose,
}: {
  hp: HeatPump | null; // null = création
  onClose: () => void;
}) {
  const isEdit = !!hp;
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
    if (!files || files.length === 0) return;
    if (!hp) return; // doit exister pour uploader
    field === "image" ? setUploadingImage(true) : setUploadingSpec(true);
    try {
      let updated: HeatPump = hp;
      for (const f of Array.from(files)) {
        updated = await uploadFile(f, field, hp.id);
      }
      setImages((updated.images as string[]) ?? []);
      setSpecPages((updated.specPages as string[]) ?? []);
      queryClient.invalidateQueries({ queryKey: ["/api/heat-pumps"] });
    } catch { setError("Échec de l'upload"); }
    finally { field === "image" ? setUploadingImage(false) : setUploadingSpec(false); }
  }

  async function handleDeleteImage(url: string, field: "images" | "specPages") {
    if (!hp) return;
    try {
      const res = await apiRequest("DELETE", `/api/heat-pumps/${hp.id}/image`, { url, field });
      const updated = await res.json() as HeatPump;
      setImages((updated.images as string[]) ?? []);
      setSpecPages((updated.specPages as string[]) ?? []);
      queryClient.invalidateQueries({ queryKey: ["/api/heat-pumps"] });
    } catch { setError("Échec suppression image"); }
  }

  async function handleSave() {
    if (!name.trim()) { setError("Le nom est requis."); return; }
    setSaving(true); setError("");
    try {
      if (isEdit) {
        await apiRequest("PATCH", `/api/heat-pumps/${hp!.id}`, { name, brand, model, capacity, hspf2, seer2, isDefault });
      } else {
        await apiRequest("POST", "/api/heat-pumps", { name, brand, model, capacity, hspf2, seer2, type, isDefault });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/heat-pumps"] });
      onClose();
    } catch (e: any) { setError(e.message ?? "Erreur"); }
    finally { setSaving(false); }
  }

  const isHP = type === "heatpump";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'équipement" : "Nouvel équipement"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type — seulement à la création */}
          {!isEdit && (
            <div>
              <Label>Type d'équipement</Label>
              <div className="flex gap-3 mt-2">
                {[
                  { v: "heatpump", label: "Thermopompe", icon: <Thermometer className="w-4 h-4" /> },
                  { v: "waterheater", label: "Chauffe-eau", icon: <Droplets className="w-4 h-4" /> },
                ].map(({ v, label, icon }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setType(v)}
                    className="flex-1 flex items-center gap-2 justify-center py-2.5 rounded-lg border-2 text-sm font-semibold transition-all"
                    style={{
                      borderColor: type === v ? "#1e3a5f" : "#e2e8f0",
                      backgroundColor: type === v ? "#eef2f8" : "white",
                      color: type === v ? "#1e3a5f" : "#64748b",
                    }}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nom *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="ex: TCL T-Pro-25ES" className="mt-1" />
            </div>
            <div>
              <Label>Marque</Label>
              <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="ex: TCL" className="mt-1" />
            </div>
            <div>
              <Label>Modèle</Label>
              <Input value={model} onChange={e => setModel(e.target.value)} placeholder="ex: T-Pro-25ES" className="mt-1" />
            </div>
            <div>
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

          {/* Par défaut */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="w-4 h-4 accent-yellow-500" />
            <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-yellow-500" />
              Équipement par défaut pour ce type
            </span>
          </label>

          {/* Images — seulement si édition (HP existe) */}
          {isEdit && (
            <>
              {/* Photos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Photos</Label>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleUpload(e.target.files, "image")} />
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                      {uploadingImage ? "Envoi…" : <><Plus className="w-3.5 h-3.5" /> Ajouter</>}
                    </span>
                  </label>
                </div>
                {images.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucune photo.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((url, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-50">
                        <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleDeleteImage(url, "images")}
                          className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pages de fiche technique */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Pages de fiche technique</Label>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleUpload(e.target.files, "spec")} />
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                      {uploadingSpec ? "Envoi…" : <><Plus className="w-3.5 h-3.5" /> Ajouter</>}
                    </span>
                  </label>
                </div>
                {specPages.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucune page.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {specPages.map((url, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-50">
                        <img src={url} alt={`Fiche ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleDeleteImage(url, "specPages")}
                          className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!isEdit && (
            <p className="text-xs text-slate-400 italic">💡 Vous pourrez ajouter des photos et fiches techniques après la création.</p>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: "#1e3a5f" }}>
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte équipement ────────────────────────────────────────────────────────

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
    <div className="group relative bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-md" style={{ borderColor: "#e8edf4" }}>
      {/* Bande couleur */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: isHP ? "#dc2626" : "#2563eb" }} />

      {/* Photo de couverture */}
      {photos.length > 0 ? (
        <div className="h-36 ml-1 overflow-hidden bg-slate-100">
          <img src={photos[0]} alt={hp.name} className="w-full h-full object-contain p-2" />
        </div>
      ) : (
        <div className="h-36 ml-1 flex items-center justify-center bg-slate-50">
          {isHP ? <Thermometer className="w-10 h-10 text-slate-300" /> : <Droplets className="w-10 h-10 text-slate-300" />}
        </div>
      )}

      <div className="pl-5 pr-4 pb-4 pt-3">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: isHP ? "#fee2e2" : "#dbeafe", color: isHP ? "#dc2626" : "#2563eb" }}>
            {isHP ? "Thermopompe" : "Chauffe-eau"}
          </span>
          {hp.isDefault && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: "#fefce8", color: "#a16207" }}>
              <Star className="w-2.5 h-2.5" /> Par défaut
            </span>
          )}
        </div>

        <p className="font-bold text-slate-900 text-sm leading-snug">{hp.name}</p>
        {hp.brand && <p className="text-xs text-slate-400 mt-0.5">{hp.brand}{hp.model ? ` · ${hp.model}` : ""}</p>}

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs text-slate-500">
          {hp.capacity && <span>{hp.capacity}</span>}
          {hp.hspf2 && <span>HSPF2 {hp.hspf2}</span>}
          {hp.seer2 && <span>SEER2 {hp.seer2}</span>}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            {photos.length} photo{photos.length !== 1 ? "s" : ""} · {specs.length} page{specs.length !== 1 ? "s" : ""} fiche
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(hp)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Modifier"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(hp)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function TechniquePage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [modalHp, setModalHp] = useState<HeatPump | null | "new">(undefined as any);
  const [deleteTarget, setDeleteTarget] = useState<HeatPump | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { data: heatPumps = [], isLoading } = useQuery<HeatPump[]>({ queryKey: ["/api/heat-pumps"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/heat-pumps/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/heat-pumps"] }); setDeleteTarget(null); },
  });

  const hps = heatPumps.filter(h => h.type === "heatpump");
  const whs = heatPumps.filter(h => h.type === "waterheater");

  const handleLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", borderColor: "#e8edf4" }}>
        <div className="max-w-4xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1e3a5f" }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-none">MAB Projets</h1>
              <p className="text-[10px] text-slate-400 mt-0.5">Partie technique</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 font-semibold"
              style={{ backgroundColor: "#1e3a5f" }}
              onClick={() => setModalHp("new")}
            >
              <Plus className="w-4 h-4" />
              Nouvel équipement
            </Button>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-slate-600">
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

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Retour */}
        <div className="flex items-center gap-3 mb-8">
          <button
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4" />
            Accueil
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1e3a5f" }}>
              <Upload className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Catalogue d'équipements</h2>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Chargement…</div>
        ) : (
          <>
            {/* Section Thermopompes */}
            <section className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fee2e2" }}>
                  <Thermometer className="w-4 h-4" style={{ color: "#dc2626" }} />
                </div>
                <h3 className="text-base font-bold text-slate-800">Thermopompes</h3>
                <span className="text-xs text-slate-400 font-medium">({hps.length})</span>
              </div>
              {hps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed" style={{ borderColor: "#e2e8f0" }}>
                  <Thermometer className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400 mb-3">Aucune thermopompe dans le catalogue.</p>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setModalHp("new")}>
                    <Plus className="w-3.5 h-3.5" /> Ajouter une thermopompe
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hps.map(hp => (
                    <HeatPumpCard key={hp.id} hp={hp} onEdit={h => setModalHp(h)} onDelete={setDeleteTarget} />
                  ))}
                  <button
                    onClick={() => setModalHp("new")}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-10 text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors"
                    style={{ borderColor: "#e2e8f0" }}
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-xs font-semibold">Ajouter</span>
                  </button>
                </div>
              )}
            </section>

            {/* Section Chauffe-eaux */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#dbeafe" }}>
                  <Droplets className="w-4 h-4" style={{ color: "#2563eb" }} />
                </div>
                <h3 className="text-base font-bold text-slate-800">Chauffe-eaux thermopompe</h3>
                <span className="text-xs text-slate-400 font-medium">({whs.length})</span>
              </div>
              {whs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed" style={{ borderColor: "#e2e8f0" }}>
                  <Droplets className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400 mb-3">Aucun chauffe-eau dans le catalogue.</p>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setModalHp("new")}>
                    <Plus className="w-3.5 h-3.5" /> Ajouter un chauffe-eau
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {whs.map(hp => (
                    <HeatPumpCard key={hp.id} hp={hp} onEdit={h => setModalHp(h)} onDelete={setDeleteTarget} />
                  ))}
                  <button
                    onClick={() => setModalHp("new")}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-10 text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors"
                    style={{ borderColor: "#e2e8f0" }}
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-xs font-semibold">Ajouter</span>
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Modal création / édition */}
      {modalHp !== undefined && (
        <HeatPumpModal
          hp={modalHp === "new" ? null : modalHp}
          onClose={() => setModalHp(undefined as any)}
        />
      )}

      {/* Confirmation suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'équipement ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {deleteTarget?.name} » sera supprimé définitivement. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              style={{ backgroundColor: "#dc2626" }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation déconnexion */}
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
