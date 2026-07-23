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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Save, Printer, ClipboardList, CheckCircle2,
  Building2, ClipboardCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";
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

/** Affiche une date (ISO ou texte) en format long français. */
function formatDateFr(value: string): string {
  if (!value) return "";
  const iso = toIsoDate(value);
  if (!iso) return value;
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
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

  function handleSignatureUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, signatureImage: String(reader.result) }));
    reader.readAsDataURL(file);
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
                      accept="image/*"
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
              <Button variant="outline" onClick={() => window.print()} className="gap-2" data-testid="button-print-mandat">
                <Printer className="w-4 h-4" />
                Imprimer / PDF
              </Button>
            </div>
          </div>

          {/* ── Right: document preview ─────────── */}
          <div>
            <div
              id="mandat-printable"
              className="bg-white border rounded-lg shadow-sm overflow-hidden text-sm"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {/* Header */}
              <div className="px-8 pt-6 pb-4 border-b border-[#1e3a5f]/30">
                <div className="flex items-start justify-between gap-4">
                  <img src={mabLogoPath} alt="MAB Conseil Immobilier" className="h-16 object-contain" />
                  <div className="text-right">
                    <h1 className="text-lg font-bold tracking-wide" style={{ color: "#1e3a5f", fontFamily: "'Playfair Display', serif" }}>
                      FEUILLE DE MANDAT
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">MAB Conseil Immobilier</p>
                  </div>
                </div>
              </div>

              {/* Project info */}
              <div className="px-8 py-4 bg-slate-50 border-b">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <div>
                    <span className="font-semibold text-[#1e3a5f]">Projet : </span>
                    <span>{name || "—"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#1e3a5f]">Donné par : </span>
                    <span>{MANDANT_NAME}</span>
                  </div>
                  {cityLine && (
                    <div className="col-span-2">
                      <span className="font-semibold text-[#1e3a5f]">Adresse : </span>
                      <span>{cityLine}</span>
                    </div>
                  )}
                  {numUnits && (
                    <div>
                      <span className="font-semibold text-[#1e3a5f]">Unités : </span>
                      <span>{numUnits}</span>
                    </div>
                  )}
                  {evaluator && (
                    <div>
                      <span className="font-semibold text-[#1e3a5f]">Évaluateur : </span>
                      <span>{evaluator}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-[#1e3a5f]">Confié à : </span>
                    <span>{mandataire || "—"}</span>
                  </div>
                  {form.dateLivraison && (
                    <div>
                      <span className="font-semibold text-[#1e3a5f]">Livraison attendue : </span>
                      <span>{formatDateFr(form.dateLivraison)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-8 py-5 space-y-5">
                {/* Type de mandat */}
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-2 pb-1 border-b border-[#1e3a5f]/20">Type de mandat</h2>
                  {form.mandatType ? (
                    <div className="space-y-1.5">
                      <p className="text-sm">{mandatTypeLabel}</p>
                      {showSchlObjectif && form.schlObjectif && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Objectif SCHL :</span>
                          <Badge variant="outline" className="text-xs font-bold border-[#1e3a5f] text-[#1e3a5f]">{form.schlObjectif} %</Badge>
                        </div>
                      )}
                      {showProgrammes && form.programmes.length > 0 && (
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">Programme(s) :</span>
                          {form.programmes.map(pid => (
                            <Badge key={pid} variant="secondary" className="text-xs">{PROGRAMMES_OPTIONS.find(p => p.id === pid)?.label ?? pid}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Aucun type de mandat sélectionné.</p>
                  )}
                </div>

                <Separator />

                {/* Mesures */}
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-2 pb-1 border-b border-[#1e3a5f]/20">Mesures d'efficacité énergétique</h2>
                  {mesuresLines.length > 0 ? (
                    <ul className="space-y-1">
                      {mesuresLines.map((line, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1e3a5f] shrink-0" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Aucune mesure sélectionnée.</p>
                  )}
                </div>

                {/* Commentaires */}
                {form.commentaires && (
                  <>
                    <Separator />
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-2 pb-1 border-b border-[#1e3a5f]/20">Commentaires</h2>
                      <p className="text-sm whitespace-pre-line">{form.commentaires}</p>
                    </div>
                  </>
                )}

                <Separator />

                {/* Signatures */}
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-4 pb-1 border-b border-[#1e3a5f]/20">Signatures</h2>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-xs font-semibold text-[#1e3a5f] mb-1">{MANDANT_NAME}</p>
                      <p className="text-[10px] text-muted-foreground mb-1">(Donneur du mandat)</p>
                      <div className="h-14 border-b border-gray-400 mb-1 flex items-end justify-center">
                        <img src={form.signatureImage || mabSignaturePath} alt="Signature" className="h-14 object-contain" data-testid="img-signature-mandant" />
                      </div>
                      <p className="text-xs text-muted-foreground">Signature &amp; date</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-right text-muted-foreground" data-testid="text-date-production">
                  Fait le {new Date().toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}
                </p>

                <p className="text-[10px] text-muted-foreground text-center pt-2 border-t border-gray-100">
                  Document confidentiel — MAB Conseil Immobilier © {new Date().getFullYear()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
