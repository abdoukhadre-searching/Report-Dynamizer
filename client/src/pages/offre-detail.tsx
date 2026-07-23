import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import type { Offre } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft, Save, FileDown, FileSignature, CheckCircle2, Building2, DollarSign, FileText, ChevronDown, Pencil,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OffreDocument, { type OffreDocumentData } from "@/components/offre-document";

interface OffreFormData {
  date: string;
  de: string;
  consultant: string;
  consultantTitre: string;
  adresseConsultant: string;
  mandatIntro: string;
  services: string;
  montant: string;
  remunerationDetails: string;
  prendreNote: string;
  debutContrat: string;
  courriel: string;
  telephone: string;
  signataireClient: string;
  titreSignataireClient: string;
}

const defaultForm: OffreFormData = {
  date: "",
  de: "9433-6450 Québec Inc.",
  consultant: "Marc-André Boucher",
  consultantTitre: "évaluateur en efficacité énergétique accrédité",
  adresseConsultant: "133 rue Messier, bureau 200, Mont St-Hilaire (Québec) J3H 2W8",
  mandatIntro:
    "Le consultant, {CONSULTANT}, s'engage à élaborer des stratégies visant à accroître l'efficacité énergétique et de comparer différentes stratégies. Ceci permettra de comparer l'impact en coût d'opération, en coût d'implantation et d'établir les possibilités de subventions qui auront un impact directement sur les coûts d'implantations.\n\nLa présentation sera faite avec différents scénarios, les coûts individuels, les subventions individuelles et vous serez en mesure de choisir l'option qui vous conviendra le mieux en fonction de votre réalité. Le rôle du consultant n'est pas de prendre une décision à votre place mais bien de vous montrer l'impact des différents scénarios et de vous aviser des répercussions de ceux-ci. Nous serons aussi en mesure de démontrer l'impact des différents scénarios sur une valeur économique d'un bâtiment et par le fait même, sur un futur financement.",
  services:
    "Rapport APH Sélect\nDimensionner les équipements nécessaires\nUn schéma d'implantation\nUne soumission pour les équipements implantés\nUne projection pour les dépenses futures\nUn rapport de comparaison entre les différentes améliorations et les impacts de ceux-ci sur la consommation énergétique de votre bâtiment.",
  montant: "",
  remunerationDetails:
    "1- Dépôt de 50% du montant total de l'offre de service à verser à la réception de la facture\n2- Paiement du 2e versement 30 jours après la signature de l'offre de service. Une 2e facture vous sera envoyée à cette date.\n3- Vous recevrez ensuite votre rapport final dans les 24/72h suivant le paiement final.",
  prendreNote:
    "Du montant total, vous pourriez obtenir une subvention d'Énergir de 50%. Sur le montant restant, vous pourriez obtenir une subvention de 40% d'Hydro-Québec au début des travaux et une autre de 60% à la fin des travaux. Donc le coût pour vos évaluations énergétiques pourrait vous revenir à 0$.",
  debutContrat:
    "Le consultant en évaluation d'efficacité énergétique s'engage à débuter le travail dès la réception du paiement. Aucuns travaux ne seront entamés avant.\n\nNotez que toutes les stratégies doivent être validées avec tous les professionnels et nous n'assumons aucune responsabilité de ceux-ci.\n\nPour toute communication, veuillez svp écrire l'adresse du projet en objet.",
  courriel: "admin@conseilsmab.com",
  telephone: "438-521-9645",
  signataireClient: "",
  titreSignataireClient: "",
};

function parseMontant(value: string): number | null {
  const digits = value.replace(/[^\d.,]/g, "").replace(/\s/g, "");
  if (!digits) return null;
  const n = parseFloat(digits.replace(/\u00a0/g, "").replace(",", "."));
  return isNaN(n) || n <= 0 ? null : n;
}

function formatMontant(n: number): string {
  return n.toLocaleString("fr-CA", { maximumFractionDigits: 0 }).replace(/,/g, " ") + "$";
}

function buildPrendreNote(montant: string): string {
  const total = parseMontant(montant);
  if (!total) return defaultForm.prendreNote;
  const energir = total * 0.5;
  const restant = total - energir;
  return `Du montant de ${formatMontant(total)}, vous pourriez obtenir une subvention d'Énergir de 50% soit un montant de ${formatMontant(energir)}. Sur le montant de ${formatMontant(restant)} restant, vous pourriez obtenir une subvention de 40% d'Hydro-Québec (${formatMontant(restant * 0.4)}) au début des travaux et une autre de 60% (${formatMontant(restant * 0.6)}) à la fin des travaux. Donc le coût pour vos évaluations énergétiques pourrait vous revenir à 0$.`;
}

function toIsoDate(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString().substring(0, 10);
}

export default function OffreDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: offre, isLoading } = useQuery<Offre>({
    queryKey: ["/api/offres", params.id],
  });

  const [name, setName] = useState("");
  const [numero, setNumero] = useState("");
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [form, setForm] = useState<OffreFormData>(defaultForm);
  const [initializedId, setInitializedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [numeroError, setNumeroError] = useState(false);
  const [exporting, setExporting] = useState(false);

  if (offre && initializedId !== offre.id) {
    setName(offre.name ?? "");
    setNumero(offre.numero ?? "");
    setClientName(offre.clientName ?? "");
    setAddress(offre.address ?? "");
    if (offre.offreData && typeof offre.offreData === "object") {
      const loaded = { ...defaultForm, ...(offre.offreData as OffreFormData) };
      // Migration : anciens textes avec le nom du consultant écrit en dur → gabarit {CONSULTANT}
      loaded.mandatIntro = loaded.mandatIntro.replace(
        "Le consultant, Marc-André Boucher, expert en évaluation d'efficacité énergétique s'engage",
        "Le consultant, {CONSULTANT}, s'engage",
      );
      // Migration : ancien champ consultant "Nom, titre" → nom + titre séparés
      if (!loaded.consultantTitre && loaded.consultant.includes(",")) {
        const idx = loaded.consultant.indexOf(",");
        loaded.consultantTitre = loaded.consultant.slice(idx + 1).trim();
        loaded.consultant = loaded.consultant.slice(0, idx).trim();
      }
      setForm(loaded);
    } else {
      setForm(defaultForm);
    }
    setInitializedId(offre.id);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const autoName = clientName.trim() || address.trim() || numero.trim() || "Offre de service";
      return apiRequest("PATCH", `/api/offres/${params.id}`, {
        name: autoName, numero, clientName, address, offreData: form,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offres"] });
      queryClient.invalidateQueries({ queryKey: ["/api/offres", params.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast({ title: "Offre de service sauvegardée" });
    },
    onError: () => toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" }),
  });

  function validateNumero(): boolean {
    if (!numero.trim()) {
      setNumeroError(true);
      toast({ title: "Numéro requis", description: "Veuillez entrer le numéro de l'offre (ex. P00363).", variant: "destructive" });
      return false;
    }
    setNumeroError(false);
    return true;
  }

  function handleSave() {
    if (!validateNumero()) return;
    saveMutation.mutate();
  }

  function validateAllFields(): boolean {
    if (!validateNumero()) return false;
    const requis: [string, string][] = [
      [clientName, "À l'attention de (client)"],
      [address, "Adresse du projet"],
      [form.date, "Date"],
      [form.de, "De"],
      [form.consultant, "Consultant"],
      [form.consultantTitre, "Titre du consultant"],
      [form.adresseConsultant, "Adresse du consultant"],
      [form.mandatIntro, "Mandat et service"],
      [form.services, "Services"],
      [form.montant, "Montant"],
      [form.remunerationDetails, "Modalités de paiement"],
      [form.prendreNote, "Prendre note"],
      [form.debutContrat, "Début du contrat"],
      [form.signataireClient, "Nom du signataire client"],
      [form.titreSignataireClient, "Titre du signataire client"],
    ];
    const manquants = requis.filter(([v]) => !v.trim()).map(([, label]) => label);
    if (manquants.length > 0) {
      toast({
        title: "Champs à remplir avant de télécharger",
        description: manquants.join(", "),
        variant: "destructive",
      });
      return false;
    }
    return true;
  }

  async function handleExportPdf() {
    if (!validateAllFields()) return;
    setExporting(true);
    try {
      await saveMutation.mutateAsync();
      const res = await fetch(`/api/offres/${params.id}/export-pdf`, { credentials: "include" });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Offre de service ${numero || ""}.pdf`.trim() + "";
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

  const documentData: OffreDocumentData = { name, numero, clientName, address, ...form };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!offre) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium mb-2">Offre introuvable</h2>
          <Button variant="secondary" onClick={() => navigate("/offres")}>Retour</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/offres")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#0f766e] flex items-center justify-center">
              <FileSignature className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold leading-tight">{clientName || name || "Offre de service"}</h1>
              <p className="text-xs text-muted-foreground">MAB Conseils</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ── Left: form ─────────────────────── */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0f766e]" />
                  Informations
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Numéro de l'offre <span className="text-red-500">*</span></Label>
                  <Input
                    value={numero}
                    onChange={e => { setNumero(e.target.value); if (e.target.value.trim()) setNumeroError(false); }}
                    placeholder="P00363"
                    className={numeroError ? "border-red-500 focus-visible:ring-red-500" : ""}
                    data-testid="input-numero"
                  />
                  {numeroError && <p className="text-[11px] text-red-500 mt-1">Le numéro est obligatoire.</p>}
                </div>
                <div>
                  <Label className="text-xs mb-1 block">À l'attention de (client)</Label>
                  <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nom du client" data-testid="input-client-name" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Date</Label>
                  <Input
                    type="date"
                    value={toIsoDate(form.date)}
                    onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                    data-testid="input-date"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs mb-1 block">Adresse du projet</Label>
                  <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 rue Exemple, Ville, QC" data-testid="input-address" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs mb-1 block">De (entreprise)</Label>
                  <Input value={form.de} onChange={e => setForm(prev => ({ ...prev, de: e.target.value }))} data-testid="input-de" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs mb-1 block">Consultant</Label>
                  <Input value={form.consultant} onChange={e => setForm(prev => ({ ...prev, consultant: e.target.value }))} placeholder="Ex. Safa Mghribi" data-testid="input-consultant" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Titre du consultant</Label>
                  <Input value={form.consultantTitre} onChange={e => setForm(prev => ({ ...prev, consultantTitre: e.target.value }))} placeholder="Ex. Ingénieure en efficacité énergétique" data-testid="input-consultant-titre" />
                  <p className="text-[11px] text-muted-foreground mt-1">Le texte « Mandat et service » s'adapte automatiquement au consultant et à son titre.</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs mb-1 block">Adresse du consultant</Label>
                  <Input value={form.adresseConsultant} onChange={e => setForm(prev => ({ ...prev, adresseConsultant: e.target.value }))} data-testid="input-adresse-consultant" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0f766e]" />
                  Mandat et service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">
                  Le texte standard est utilisé automatiquement. Ouvrez ci-dessous seulement si vous voulez le modifier.
                </p>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 w-full justify-between" data-testid="button-toggle-mandat-text">
                      <span className="flex items-center gap-2"><Pencil className="w-3.5 h-3.5" /> Modifier le texte et les services</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <div>
                      <Label className="text-xs mb-1 block">Texte d'introduction</Label>
                      <Textarea
                        className="min-h-[140px] text-sm"
                        value={form.mandatIntro}
                        onChange={e => setForm(prev => ({ ...prev, mandatIntro: e.target.value }))}
                        data-testid="textarea-mandat-intro"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Services offerts (un par ligne)</Label>
                      <Textarea
                        className="min-h-[120px] text-sm"
                        value={form.services}
                        onChange={e => setForm(prev => ({ ...prev, services: e.target.value }))}
                        data-testid="textarea-services"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#0f766e]" />
                  Rémunération
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs mb-1 block">Montant (ex. 39 000$ + taxes)</Label>
                  <Input
                    value={form.montant}
                    onChange={e => {
                      const montant = e.target.value;
                      setForm(prev => ({ ...prev, montant, prendreNote: buildPrendreNote(montant) }));
                    }}
                    placeholder="0$ + taxes"
                    data-testid="input-montant"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Les montants des subventions dans « Prendre note » sont calculés automatiquement.
                  </p>
                </div>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 w-full justify-between" data-testid="button-toggle-remuneration-text">
                      <span className="flex items-center gap-2"><Pencil className="w-3.5 h-3.5" /> Modifier les modalités et « Prendre note »</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <div>
                      <Label className="text-xs mb-1 block">Modalités de paiement</Label>
                      <Textarea
                        className="min-h-[100px] text-sm"
                        value={form.remunerationDetails}
                        onChange={e => setForm(prev => ({ ...prev, remunerationDetails: e.target.value }))}
                        data-testid="textarea-remuneration"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">« Prendre note » (subventions possibles)</Label>
                      <Textarea
                        className="min-h-[100px] text-sm"
                        value={form.prendreNote}
                        onChange={e => setForm(prev => ({ ...prev, prendreNote: e.target.value }))}
                        data-testid="textarea-prendre-note"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Début du contrat &amp; signature</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 w-full justify-between" data-testid="button-toggle-debut-text">
                      <span className="flex items-center gap-2"><Pencil className="w-3.5 h-3.5" /> Modifier le texte « Début du contrat »</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <Textarea
                      className="min-h-[100px] text-sm"
                      value={form.debutContrat}
                      onChange={e => setForm(prev => ({ ...prev, debutContrat: e.target.value }))}
                      data-testid="textarea-debut-contrat"
                    />
                  </CollapsibleContent>
                </Collapsible>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Courriel</Label>
                    <Input value={form.courriel} onChange={e => setForm(prev => ({ ...prev, courriel: e.target.value }))} data-testid="input-courriel" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Téléphone</Label>
                    <Input value={form.telephone} onChange={e => setForm(prev => ({ ...prev, telephone: e.target.value }))} data-testid="input-telephone" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Signataire (client)</Label>
                    <Input value={form.signataireClient} onChange={e => setForm(prev => ({ ...prev, signataireClient: e.target.value }))} placeholder="Nom du signataire" data-testid="input-signataire" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Titre du signataire</Label>
                    <Input value={form.titreSignataireClient} onChange={e => setForm(prev => ({ ...prev, titreSignataireClient: e.target.value }))} placeholder="Ex. : Chief Investment Officer" data-testid="input-titre-signataire" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-offre" className="gap-2" style={{ backgroundColor: "#0f766e" }}>
                {saveMutation.isPending ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? "Sauvegardé" : "Sauvegarder"}
              </Button>
              <Button variant="outline" onClick={handleExportPdf} disabled={exporting} className="gap-2" data-testid="button-export-pdf">
                {exporting ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FileDown className="w-4 h-4" />}
                {exporting ? "Génération…" : "Télécharger le PDF"}
              </Button>
            </div>
          </div>

          {/* ── Right: document preview ─────────── */}
          <div>
            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
              <OffreDocument data={documentData} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
