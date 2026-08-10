import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import type { Mandat } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Save, Printer, Download, ClipboardList, CheckCircle2,
  Building2, ClipboardCheck,
} from "lucide-react";
import MandatDocument from "@/components/mandat-document";
import { useToast } from "@/hooks/use-toast";
import mabSignaturePath from "@assets/Capture_d’écran_2026-07-23_111628_1784820061660.png";

interface MandatFormData {
  mandatType: "schl" | "analyse" | "combined" | "autre" | "";
  mandatTypeAutre: string;
  signatureImage: string;
  schlObjectif: "15" | "25" | "40" | "";
  programmes: string[];
  mesures: {
    thermopompes: boolean;
    chauffage: boolean;
    del: boolean;
    sanitaires: boolean;
    ventilation: boolean;
    eauChaude: boolean;
    fenetres: boolean;
    etancheite: boolean;
    isolation: boolean;
    autre: boolean;
    autreTexte: string;
  };
  mesuresTexte: string;
  commentaires: string;
  dateMandat: string;
  dateLivraison: string;
}

const defaultForm: MandatFormData = {
  mandatType: "",
  mandatTypeAutre: "",
  signatureImage: "",
  schlObjectif: "",
  programmes: [],
  mesures: {
    thermopompes: false,
    chauffage: false,
    del: false,
    sanitaires: false,
    ventilation: false,
    eauChaude: false,
    fenetres: false,
    etancheite: false,
    isolation: false,
    autre: false,
    autreTexte: "",
  },
  mesuresTexte: "",
  commentaires: "",
  dateMandat: new Date().toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" }),
  dateLivraison: "",
};

const MESURES_LABELS: Record<keyof Omit<MandatFormData["mesures"], "autreTexte">, string> = {
  thermopompes: "Installation de thermopompes air-air de type split dans les logements",
  chauffage: "Remplacement ou modification du système de chauffage existant",
  del: "Éclairage DEL",
  sanitaires: "Appareils sanitaires à faible débit",
  ventilation: "Ventilation avec récupération de chaleur",
  eauChaude: "Production d'eau chaude domestique à haute efficacité",
  fenetres: "Remplacement des fenêtres",
  etancheite: "Amélioration de l'étanchéité à l'air",
  isolation: "Travaux d'isolation, lorsque requis",
  autre: "Autre mesure",
};

const PROGRAMMES_OPTIONS = [
  { id: "hydro-quebec", label: "Hydro-Québec" },
  { id: "energir", label: "Énergir" },
  { id: "ecoperformance", label: "ÉcoPerformance" },
];

const MANDANT_NAME = "Conseils Immobilier MAB";

const MANDATAIRE_SUGGESTIONS = ["BN Énergie", "Autre ingénieur"];

/** Convertit une valeur de date (ISO ou texte français) en format ISO yyyy-mm-dd pour l'input. */
function toIsoDate(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString().substring(0, 10);
}

export default function MandatDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: mandat, isLoading } = useQuery<Mandat>({
    queryKey: ["/api/mandats", params.id],
  });

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [numUnits, setNumUnits] = useState("");
  const [evaluator, setEvaluator] = useState("");
  const [mandataire, setMandataire] = useState("");
  const [form, setForm] = useState<MandatFormData>(defaultForm);
  const [initializedId, setInitializedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExportPdf() {
    setExporting(true);
    try {
      await saveMutation.mutateAsync();
      const res = await fetch(`/api/mandats/${params.id}/export-pdf`, { credentials: "include" });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Feuille de mandat ${name || ""}.pdf`.trim();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erreur lors de l'export PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  if (mandat && initializedId !== mandat.id) {
    setName(mandat.name ?? "");
    setAddress(mandat.address ?? "");
    setCity(mandat.city ?? "");
    setProvince(mandat.province ?? "");
    setNumUnits(mandat.numUnits ?? "");
    setEvaluator(mandat.evaluator ?? "");
    setMandataire(mandat.mandataire ?? "");
    if (mandat.mandatData && typeof mandat.mandatData === "object") {
      const loaded = { ...defaultForm, ...(mandat.mandatData as MandatFormData) };
      // Migration : anciennes feuilles avec cases à cocher → texte libre
      if (!loaded.mesuresTexte && loaded.mesures) {
        const lines = (Object.keys(MESURES_LABELS) as Array<keyof typeof MESURES_LABELS>)
          .filter(k => loaded.mesures[k])
          .map(k => (k === "autre" && loaded.mesures.autreTexte ? loaded.mesures.autreTexte : MESURES_LABELS[k]));
        if (lines.length > 0) loaded.mesuresTexte = lines.join("\n");
      }
      setForm(loaded);
    } else {
      setForm(defaultForm);
    }
    setInitializedId(mandat.id);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/mandats/${params.id}`, {
        name,
        clientName: MANDANT_NAME,
        address,
        city,
        province,
        numUnits,
        evaluator,
        mandataire,
        mandatData: form,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mandats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mandats", params.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast({ title: "Feuille de mandat sauvegardée" });
    },
    onError: () => toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" }),
  });

  function toggleProgramme(id: string) {
    setForm(prev => {
      const has = prev.programmes.includes(id);
      return { ...prev, programmes: has ? prev.programmes.filter(p => p !== id) : [...prev.programmes, id] };
    });
  }

  const showSchlObjectif = form.mandatType === "schl" || form.mandatType === "combined";
  const showProgrammes = form.mandatType === "analyse" || form.mandatType === "combined";
  const mesuresLines = form.mesuresTexte.split("\n").map(l => l.trim()).filter(Boolean);
  const mandatTypeLabel = {
    schl: "Simulation énergétique pour la SCHL",
    analyse: "Analyse énergétique pour programme(s)",
    combined: "Simulation énergétique pour la SCHL combinée à une analyse énergétique",
    autre: form.mandatTypeAutre || "Autre",
    "": "",
  }[form.mandatType];

  async function handleSignatureUpload(file: File) {
    const browserReadable = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
    if (browserReadable.includes(file.type)) {
      const reader = new FileReader();
      reader.onload = () => setForm(prev => ({ ...prev, signatureImage: String(reader.result) }));
      reader.readAsDataURL(file);
      return;
    }
    // Format non lisible par le navigateur (ex. HEIC) : conversion côté serveur
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/convert-image", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error();
      const { dataUrl } = await res.json();
      setForm(prev => ({ ...prev, signatureImage: dataUrl }));
    } catch {
      toast({ title: "Format d'image non pris en charge", variant: "destructive" });
    }
  }

  const cityLine = [address, city, province].filter(Boolean).join(", ");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!mandat) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium mb-2">Feuille introuvable</h2>
          <Button variant="secondary" onClick={() => navigate("/mandats")}>Retour</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        @media print {
          #mandat-printable, #mandat-printable * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          #mandat-printable, #mandat-printable * { visibility: visible !important; }
          #mandat-printable { position: fixed; inset: 0; padding: 20mm 18mm; background: white; overflow: visible; }
          .no-print { display: none !important; }
        }
      `}</style>

      <header className="border-b bg-card no-print">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/mandats")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#1e3a5f] flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold leading-tight">{name || "Feuille de mandat"}</h1>
              <p className="text-xs text-muted-foreground">{MANDANT_NAME}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ── Left: form ─────────────────────── */}
          <div className="space-y-4 no-print">
            {/* Informations du projet */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#1e3a5f]" />
                  Informations du projet
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs mb-1 block">Nom / titre du mandat</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex. : 123 rue des Érables" data-testid="input-mandat-name" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Donné par</Label>
                  <Input value={MANDANT_NAME} readOnly disabled className="bg-muted" data-testid="input-client-name" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Confié à (sous-traitant)</Label>
                  <Input value={mandataire} onChange={e => setMandataire(e.target.value)} placeholder="BN Énergie" list="mandataire-suggestions" data-testid="input-mandataire" />
                  <datalist id="mandataire-suggestions">
                    {MANDATAIRE_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs mb-1 block">Adresse</Label>
                  <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 rue Exemple" data-testid="input-address" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Ville</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Montréal" data-testid="input-city" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Province</Label>
                  <Input value={province} onChange={e => setProvince(e.target.value)} placeholder="QC" data-testid="input-province" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Nombre d'unités</Label>
                  <Input value={numUnits} onChange={e => setNumUnits(e.target.value)} placeholder="12" data-testid="input-num-units" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Évaluateur</Label>
                  <Input value={evaluator} onChange={e => setEvaluator(e.target.value)} placeholder="Nom" data-testid="input-evaluator" />
                </div>
              </CardContent>
            </Card>

            {/* Type de mandat */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#1e3a5f]" />
                  Type de mandat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={form.mandatType}
                  onValueChange={v => setForm(prev => ({ ...prev, mandatType: v as MandatFormData["mandatType"] }))}
                  className="space-y-3"
                >
                  {[
                    { value: "schl", label: "Simulation énergétique pour la SCHL" },
                    { value: "analyse", label: "Analyse énergétique pour programme(s)" },
                    { value: "combined", label: "Simulation SCHL combinée à une analyse énergétique" },
                    { value: "autre", label: "Autre (préciser)" },
                  ].map(opt => (
                    <div key={opt.value} className="flex items-start gap-3">
                      <RadioGroupItem value={opt.value} id={`type-${opt.value}`} data-testid={`radio-type-${opt.value}`} className="mt-0.5" />
                      <Label htmlFor={`type-${opt.value}`} className="font-normal cursor-pointer leading-snug">{opt.label}</Label>
                    </div>
                  ))}
                </RadioGroup>

                {form.mandatType === "autre" && (
                  <div className="mt-3 pl-4 border-l-2 border-[#1e3a5f]/20">
                    <Input
                      placeholder="Décrivez le type de mandat…"
                      value={form.mandatTypeAutre}
                      onChange={e => setForm(prev => ({ ...prev, mandatTypeAutre: e.target.value }))}
                      data-testid="input-mandat-type-autre"
                    />
                  </div>
                )}

                {showSchlObjectif && (
                  <div className="mt-4 pl-4 border-l-2 border-[#1e3a5f]/20">
                    <p className="text-sm font-medium text-[#1e3a5f] mb-2">Objectif d'amélioration énergétique</p>
                    <RadioGroup
                      value={form.schlObjectif}
                      onValueChange={v => setForm(prev => ({ ...prev, schlObjectif: v as MandatFormData["schlObjectif"] }))}
                      className="flex gap-4"
                    >
                      {(["15", "25", "40"] as const).map(pct => (
                        <div key={pct} className="flex items-center gap-2">
                          <RadioGroupItem value={pct} id={`obj-${pct}`} data-testid={`radio-obj-${pct}`} />
                          <Label htmlFor={`obj-${pct}`} className="font-normal cursor-pointer">{pct} %</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {showProgrammes && (
                  <div className="mt-4 pl-4 border-l-2 border-[#1e3a5f]/20">
                    <p className="text-sm font-medium text-[#1e3a5f] mb-2">Programme(s) visé(s)</p>
                    <div className="space-y-2">
                      {PROGRAMMES_OPTIONS.map(prog => (
                        <div key={prog.id} className="flex items-center gap-2">
                          <Checkbox id={`prog-${prog.id}`} checked={form.programmes.includes(prog.id)} onCheckedChange={() => toggleProgramme(prog.id)} data-testid={`checkbox-prog-${prog.id}`} />
                          <Label htmlFor={`prog-${prog.id}`} className="font-normal cursor-pointer">{prog.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mesures */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1e3a5f]" />
                  Mesures d'efficacité énergétique
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label className="text-xs mb-1 block">Une mesure par ligne</Label>
                <Textarea
                  placeholder={"Ex. :\nInstallation de thermopompes\nÉclairage DEL\nRemplacement des fenêtres"}
                  className="min-h-[140px] text-sm"
                  value={form.mesuresTexte}
                  onChange={e => setForm(prev => ({ ...prev, mesuresTexte: e.target.value }))}
                  data-testid="textarea-mesures"
                />
              </CardContent>
            </Card>

            {/* Commentaires + Date */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Commentaires &amp; date</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Notes ou précisions additionnelles…"
                  className="min-h-[80px] text-sm"
                  value={form.commentaires}
                  onChange={e => setForm(prev => ({ ...prev, commentaires: e.target.value }))}
                  data-testid="textarea-commentaires"
                />
                <div>
                  <Label className="text-xs mb-1 block">Signature (remplacer au besoin)</Label>
                  <div className="flex items-center gap-3">
                    <img src={form.signatureImage || mabSignaturePath} alt="Signature actuelle" className="h-10 border rounded bg-white object-contain" />
                    <Input
                      type="file"
                      accept="image/*,.heic,.heif"
                      className="text-sm max-w-56"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleSignatureUpload(f); }}
                      data-testid="input-signature-upload"
                    />
                    {form.signatureImage && (
                      <Button variant="ghost" size="sm" onClick={() => setForm(prev => ({ ...prev, signatureImage: "" }))} data-testid="button-reset-signature">
                        Rétablir
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Date de livraison attendue</Label>
                  <Input
                    type="date"
                    className="w-44 text-sm"
                    value={toIsoDate(form.dateLivraison)}
                    onChange={e => setForm(prev => ({ ...prev, dateLivraison: e.target.value }))}
                    data-testid="input-date-livraison"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-mandat" className="gap-2" style={{ backgroundColor: "#1e3a5f" }}>
                {saveMutation.isPending ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? "Sauvegardé" : "Sauvegarder"}
              </Button>
              <Button variant="outline" onClick={handleExportPdf} disabled={exporting} className="gap-2" data-testid="button-export-mandat-pdf">
                {exporting ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                Télécharger le PDF
              </Button>
              <Button variant="outline" onClick={() => window.print()} className="gap-2" data-testid="button-print-mandat">
                <Printer className="w-4 h-4" />
                Imprimer
              </Button>
            </div>
          </div>

          {/* ── Right: document preview ─────────── */}
          <div>
            <div
              id="mandat-printable"
              className="bg-white border rounded-lg shadow-sm overflow-hidden text-sm"
            >
              <MandatDocument
                data={{
                  name,
                  mandataire,
                  cityLine,
                  numUnits,
                  evaluator,
                  mandatType: form.mandatType,
                  mandatTypeLabel,
                  schlObjectif: form.schlObjectif,
                  showSchlObjectif,
                  showProgrammes,
                  programmes: form.programmes,
                  mesuresLines,
                  commentaires: form.commentaires,
                  dateLivraison: form.dateLivraison,
                  signatureImage: form.signatureImage,
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
