import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, Printer, ClipboardList, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";

interface MandatData {
  mandatType: "schl" | "analyse" | "combined" | "";
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
  commentaires: string;
  dateMandat: string;
  mandataire: string;
}

const defaultMandatData: MandatData = {
  mandatType: "",
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
  commentaires: "",
  dateMandat: new Date().toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" }),
  mandataire: "",
};

const MESURES_LABELS: Record<keyof Omit<MandatData["mesures"], "autreTexte">, string> = {
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

interface MandatTabProps {
  project: Project;
}

export default function MandatTab({ project }: MandatTabProps) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [mandat, setMandat] = useState<MandatData>(() => {
    if (project.mandatData && typeof project.mandatData === "object") {
      return { ...defaultMandatData, ...(project.mandatData as MandatData) };
    }
    return defaultMandatData;
  });

  const [saved, setSaved] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (data: MandatData) => {
      return apiRequest("PATCH", `/api/projects/${project.id}`, { mandatData: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast({ title: "Feuille de mandat sauvegardée" });
    },
    onError: () => {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" });
    },
  });

  function updateMesure(key: keyof MandatData["mesures"], value: boolean | string) {
    setMandat(prev => ({ ...prev, mesures: { ...prev.mesures, [key]: value } }));
  }

  function toggleProgramme(id: string) {
    setMandat(prev => {
      const has = prev.programmes.includes(id);
      return {
        ...prev,
        programmes: has ? prev.programmes.filter(p => p !== id) : [...prev.programmes, id],
      };
    });
  }

  const showSchlObjectif = mandat.mandatType === "schl" || mandat.mandatType === "combined";
  const showProgrammes = mandat.mandatType === "analyse" || mandat.mandatType === "combined";

  const selectedMesures = (Object.keys(MESURES_LABELS) as Array<keyof typeof MESURES_LABELS>).filter(
    k => mandat.mesures[k]
  );

  const mandatTypeLabel = {
    schl: "Simulation énergétique pour la SCHL",
    analyse: "Analyse énergétique pour programme(s)",
    combined: "Simulation énergétique pour la SCHL combinée à une analyse énergétique",
    "": "",
  }[mandat.mandatType];

  const cityLine = [project.address, project.city, project.province].filter(Boolean).join(", ");

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      {/* ── Print stylesheet ────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #mandat-printable, #mandat-printable * { visibility: visible !important; }
          #mandat-printable { position: fixed; inset: 0; padding: 24mm 20mm; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Left: form ────────────────────────────────────── */}
        <div className="space-y-5 no-print">
          {/* Mandataire */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mandataire</CardTitle>
            </CardHeader>
            <CardContent>
              <Label className="text-xs mb-1 block">Entreprise mandataire (qui reçoit le mandat)</Label>
              <Input
                placeholder="Ex. : BN Énergie"
                value={mandat.mandataire}
                onChange={e => setMandat(prev => ({ ...prev, mandataire: e.target.value }))}
                list="mandat-tab-mandataire-suggestions"
                data-testid="input-mandataire"
              />
              <datalist id="mandat-tab-mandataire-suggestions">
                <option value="BN Énergie" />
                <option value="Autre ingénieur" />
              </datalist>
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
                value={mandat.mandatType}
                onValueChange={v => setMandat(prev => ({ ...prev, mandatType: v as MandatData["mandatType"] }))}
                className="space-y-3"
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="schl" id="type-schl" data-testid="radio-type-schl" className="mt-0.5" />
                  <Label htmlFor="type-schl" className="font-normal cursor-pointer leading-snug">
                    Simulation énergétique pour la SCHL
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="analyse" id="type-analyse" data-testid="radio-type-analyse" className="mt-0.5" />
                  <Label htmlFor="type-analyse" className="font-normal cursor-pointer leading-snug">
                    Analyse énergétique pour programme(s)
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="combined" id="type-combined" data-testid="radio-type-combined" className="mt-0.5" />
                  <Label htmlFor="type-combined" className="font-normal cursor-pointer leading-snug">
                    Simulation énergétique pour la SCHL combinée à une analyse énergétique
                  </Label>
                </div>
              </RadioGroup>

              {/* Objectif SCHL */}
              {showSchlObjectif && (
                <div className="mt-4 pl-4 border-l-2 border-[#1e3a5f]/20">
                  <p className="text-sm font-medium text-[#1e3a5f] mb-2">Objectif d'amélioration énergétique</p>
                  <RadioGroup
                    value={mandat.schlObjectif}
                    onValueChange={v => setMandat(prev => ({ ...prev, schlObjectif: v as MandatData["schlObjectif"] }))}
                    className="flex gap-4"
                  >
                    {(["15", "25", "40"] as const).map(pct => (
                      <div key={pct} className="flex items-center gap-2">
                        <RadioGroupItem value={pct} id={`obj-${pct}`} data-testid={`radio-obj-${pct}`} />
                        <Label htmlFor={`obj-${pct}`} className="font-normal cursor-pointer">
                          {pct} %
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Programmes */}
              {showProgrammes && (
                <div className="mt-4 pl-4 border-l-2 border-[#1e3a5f]/20">
                  <p className="text-sm font-medium text-[#1e3a5f] mb-2">Programme(s) visé(s)</p>
                  <div className="space-y-2">
                    {PROGRAMMES_OPTIONS.map(prog => (
                      <div key={prog.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`prog-${prog.id}`}
                          checked={mandat.programmes.includes(prog.id)}
                          onCheckedChange={() => toggleProgramme(prog.id)}
                          data-testid={`checkbox-prog-${prog.id}`}
                        />
                        <Label htmlFor={`prog-${prog.id}`} className="font-normal cursor-pointer">
                          {prog.label}
                        </Label>
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
            <CardContent className="space-y-2.5">
              {(Object.keys(MESURES_LABELS) as Array<keyof typeof MESURES_LABELS>).map(key => (
                <div key={key} className="flex items-start gap-3">
                  <Checkbox
                    id={`mesure-${key}`}
                    checked={mandat.mesures[key]}
                    onCheckedChange={v => updateMesure(key, !!v)}
                    data-testid={`checkbox-mesure-${key}`}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor={`mesure-${key}`} className="font-normal cursor-pointer leading-snug">
                      {MESURES_LABELS[key]}
                    </Label>
                    {key === "autre" && mandat.mesures.autre && (
                      <Input
                        className="mt-1.5 h-8 text-sm"
                        placeholder="Préciser la mesure…"
                        value={mandat.mesures.autreTexte}
                        onChange={e => updateMesure("autreTexte", e.target.value)}
                        data-testid="input-autre-mesure"
                      />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Commentaires */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Commentaires</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Notes ou précisions additionnelles…"
                className="min-h-[90px] text-sm"
                value={mandat.commentaires}
                onChange={e => setMandat(prev => ({ ...prev, commentaires: e.target.value }))}
                data-testid="textarea-commentaires"
              />
            </CardContent>
          </Card>

          {/* Date */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Date du mandat</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="date"
                className="w-48 text-sm"
                value={(() => {
                  try {
                    const d = new Date(mandat.dateMandat);
                    if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
                  } catch {}
                  return "";
                })()}
                onChange={e => {
                  const d = new Date(e.target.value);
                  if (!isNaN(d.getTime())) {
                    setMandat(prev => ({
                      ...prev,
                      dateMandat: d.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" }),
                    }));
                  }
                }}
                data-testid="input-date-mandat"
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => saveMutation.mutate(mandat)}
              disabled={saveMutation.isPending}
              data-testid="button-save-mandat"
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saved ? "Sauvegardé" : "Sauvegarder"}
            </Button>
            <Button variant="outline" onClick={handlePrint} className="gap-2" data-testid="button-print-mandat">
              <Printer className="w-4 h-4" />
              Imprimer / PDF
            </Button>
          </div>
        </div>

        {/* ── Right: document preview ───────────────────────── */}
        <div>
          <div
            id="mandat-printable"
            ref={printRef}
            className="bg-white border rounded-lg shadow-sm overflow-hidden text-sm"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Header */}
            <div className="px-8 pt-6 pb-4 border-b border-[#1e3a5f]/30">
              <div className="flex items-start justify-between gap-4">
                <img src={mabLogoPath} alt="BN Énergie" className="h-16 object-contain" />
                <div className="text-right">
                  <h1
                    className="text-lg font-bold tracking-wide"
                    style={{ color: "#1e3a5f", fontFamily: "'Playfair Display', serif" }}
                  >
                    FEUILLE DE MANDAT
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">BN Énergie — Ingénierie énergétique</p>
                </div>
              </div>
            </div>

            {/* Project info */}
            <div className="px-8 py-4 bg-slate-50 border-b">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <div>
                  <span className="font-semibold text-[#1e3a5f]">Projet : </span>
                  <span>{project.name || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#1e3a5f]">Client : </span>
                  <span>{project.clientName || "—"}</span>
                </div>
                {cityLine && (
                  <div className="col-span-2">
                    <span className="font-semibold text-[#1e3a5f]">Adresse : </span>
                    <span>{cityLine}</span>
                  </div>
                )}
                {project.numUnits && (
                  <div>
                    <span className="font-semibold text-[#1e3a5f]">Unités : </span>
                    <span>{project.numUnits}</span>
                  </div>
                )}
                {project.evaluator && (
                  <div>
                    <span className="font-semibold text-[#1e3a5f]">Évaluateur : </span>
                    <span>{project.evaluator}</span>
                  </div>
                )}
                <div>
                  <span className="font-semibold text-[#1e3a5f]">Date du mandat : </span>
                  <span>{mandat.dateMandat || "—"}</span>
                </div>
              </div>
            </div>

            <div className="px-8 py-5 space-y-5">
              {/* Type de mandat */}
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-2 pb-1 border-b border-[#1e3a5f]/20">
                  Type de mandat
                </h2>
                {mandat.mandatType ? (
                  <div className="space-y-1.5">
                    <p className="text-sm">{mandatTypeLabel}</p>
                    {showSchlObjectif && mandat.schlObjectif && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">Objectif SCHL :</span>
                        <Badge
                          variant="outline"
                          className="text-xs font-bold border-[#1e3a5f] text-[#1e3a5f]"
                        >
                          {mandat.schlObjectif} %
                        </Badge>
                      </div>
                    )}
                    {showProgrammes && mandat.programmes.length > 0 && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">Programme(s) :</span>
                        {mandat.programmes.map(pid => (
                          <Badge key={pid} variant="secondary" className="text-xs">
                            {PROGRAMMES_OPTIONS.find(p => p.id === pid)?.label ?? pid}
                          </Badge>
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
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-2 pb-1 border-b border-[#1e3a5f]/20">
                  Mesures d'efficacité énergétique
                </h2>
                {selectedMesures.length > 0 ? (
                  <ul className="space-y-1">
                    {selectedMesures.map(key => (
                      <li key={key} className="flex items-start gap-2 text-sm">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#1e3a5f] shrink-0" />
                        <span>
                          {MESURES_LABELS[key]}
                          {key === "autre" && mandat.mesures.autreTexte
                            ? ` : ${mandat.mesures.autreTexte}`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Aucune mesure sélectionnée.</p>
                )}
              </div>

              {/* Commentaires */}
              {mandat.commentaires && (
                <>
                  <Separator />
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-2 pb-1 border-b border-[#1e3a5f]/20">
                      Commentaires
                    </h2>
                    <p className="text-sm whitespace-pre-line">{mandat.commentaires}</p>
                  </div>
                </>
              )}

              {/* Signatures */}
              <Separator />
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-4 pb-1 border-b border-[#1e3a5f]/20">
                  Signatures
                </h2>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-xs font-semibold text-[#1e3a5f] mb-1">{project.clientName || "MAB Conseil Immobilier"}</p>
                    <p className="text-[10px] text-muted-foreground mb-1">(Mandant)</p>
                    <div className="h-14 border-b border-gray-400 mb-1" />
                    <p className="text-xs text-muted-foreground">Signature &amp; date</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1e3a5f] mb-1">{mandat.mandataire || "Mandataire"}</p>
                    <p className="text-[10px] text-muted-foreground mb-1">(Mandataire)</p>
                    <div className="h-14 border-b border-gray-400 mb-1" />
                    <p className="text-xs text-muted-foreground">Signature &amp; date</p>
                  </div>
                </div>
              </div>

              {/* Footer note */}
              <p className="text-[10px] text-muted-foreground text-center pt-2 border-t border-gray-100">
                Document confidentiel — MAB Conseil Immobilier © {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
