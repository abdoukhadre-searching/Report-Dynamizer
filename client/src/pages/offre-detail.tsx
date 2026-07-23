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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Save, Printer, FileSignature, CheckCircle2, Building2, DollarSign, FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";

interface OffreFormData {
  date: string;
  de: string;
  consultant: string;
  adresseConsultant: string;
  mandatIntro: string;
  services: string;
  montant: string;
  remunerationDetails: string;
  debutContrat: string;
  courriel: string;
  telephone: string;
  signataireClient: string;
  titreSignataireClient: string;
}

const defaultForm: OffreFormData = {
  date: "",
  de: "9433-6450 Québec Inc.",
  consultant: "Marc-André Boucher, évaluateur en efficacité énergétique accrédité",
  adresseConsultant: "133 rue Messier, bureau 200, Mont St-Hilaire (Québec) J3H 2W8",
  mandatIntro:
    "Le consultant, Marc-André Boucher, expert en évaluation d'efficacité énergétique s'engage à élaborer des stratégies visant à accroître l'efficacité énergétique et de comparer différentes stratégies. Ceci permettra de comparer l'impact en coût d'opération, en coût d'implantation et d'établir les possibilités de subventions qui auront un impact directement sur les coûts d'implantations.\n\nLa présentation sera faite avec différents scénarios, les coûts individuels, les subventions individuelles et vous serez en mesure de choisir l'option qui vous conviendra le mieux en fonction de votre réalité. Le rôle du consultant n'est pas de prendre une décision à votre place mais bien de vous montrer l'impact des différents scénarios et de vous aviser des répercussions de ceux-ci. Nous serons aussi en mesure de démontrer l'impact des différents scénarios sur une valeur économique d'un bâtiment et par le fait même, sur un futur financement.",
  services:
    "Rapport APH Sélect\nDimensionner les équipements nécessaires\nUn schéma d'implantation\nUne soumission pour les équipements implantés\nUne projection pour les dépenses futures\nUn rapport de comparaison entre les différentes améliorations et les impacts de ceux-ci sur la consommation énergétique de votre bâtiment.",
  montant: "",
  remunerationDetails:
    "1- Dépôt de 50% du montant total de l'offre de service à verser à la réception de la facture\n2- Paiement du 2e versement 30 jours après la signature de l'offre de service. Une 2e facture vous sera envoyée à cette date.\n3- Vous recevrez ensuite votre rapport final dans les 24/72h suivant le paiement final.",
  debutContrat:
    "Le consultant en évaluation d'efficacité énergétique s'engage à débuter le travail dès la réception du paiement. Aucuns travaux ne seront entamés avant.\n\nNotez que toutes les stratégies doivent être validées avec tous les professionnels et nous n'assumons aucune responsabilité de ceux-ci.\n\nPour toute communication, veuillez svp écrire l'adresse du projet en objet.",
  courriel: "admin@conseilsmab.com",
  telephone: "438-521-9645",
  signataireClient: "",
  titreSignataireClient: "",
};

function toIsoDate(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString().substring(0, 10);
}

function formatDateFr(value: string): string {
  if (!value) return "";
  const iso = toIsoDate(value);
  if (!iso) return value;
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
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

  if (offre && initializedId !== offre.id) {
    setName(offre.name ?? "");
    setNumero(offre.numero ?? "");
    setClientName(offre.clientName ?? "");
    setAddress(offre.address ?? "");
    if (offre.offreData && typeof offre.offreData === "object") {
      setForm({ ...defaultForm, ...(offre.offreData as OffreFormData) });
    } else {
      setForm(defaultForm);
    }
    setInitializedId(offre.id);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/offres/${params.id}`, {
        name, numero, clientName, address, offreData: form,
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

  const servicesLines = form.services.split("\n").map(l => l.trim()).filter(Boolean);

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
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #offre-printable, #offre-printable * { visibility: visible !important; }
          #offre-printable { position: absolute; left: 0; top: 0; width: 100%; padding: 15mm 18mm; background: white; overflow: visible; border: none !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <header className="border-b bg-card no-print">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/offres")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#0f766e] flex items-center justify-center">
              <FileSignature className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold leading-tight">{name || "Offre de service"}</h1>
              <p className="text-xs text-muted-foreground">MAB Conseils</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ── Left: form ─────────────────────── */}
          <div className="space-y-4 no-print">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0f766e]" />
                  Informations
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Nom / titre de l'offre</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex. : 2900 Côte-de-Liesse" data-testid="input-offre-name" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Numéro (ex. P00363)</Label>
                  <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="P00000" data-testid="input-numero" />
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
                  <Input value={form.consultant} onChange={e => setForm(prev => ({ ...prev, consultant: e.target.value }))} data-testid="input-consultant" />
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
              <CardContent className="space-y-3">
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
                  <Input value={form.montant} onChange={e => setForm(prev => ({ ...prev, montant: e.target.value }))} placeholder="0$ + taxes" data-testid="input-montant" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Modalités de paiement / subventions</Label>
                  <Textarea
                    className="min-h-[120px] text-sm"
                    value={form.remunerationDetails}
                    onChange={e => setForm(prev => ({ ...prev, remunerationDetails: e.target.value }))}
                    data-testid="textarea-remuneration"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Début du contrat &amp; signature</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs mb-1 block">Texte « Début du contrat »</Label>
                  <Textarea
                    className="min-h-[100px] text-sm"
                    value={form.debutContrat}
                    onChange={e => setForm(prev => ({ ...prev, debutContrat: e.target.value }))}
                    data-testid="textarea-debut-contrat"
                  />
                </div>
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
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-offre" className="gap-2" style={{ backgroundColor: "#0f766e" }}>
                {saveMutation.isPending ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? "Sauvegardé" : "Sauvegarder"}
              </Button>
              <Button variant="outline" onClick={() => window.print()} className="gap-2" data-testid="button-print-offre">
                <Printer className="w-4 h-4" />
                Imprimer / PDF
              </Button>
            </div>
          </div>

          {/* ── Right: document preview ─────────── */}
          <div>
            <div
              id="offre-printable"
              className="bg-white border rounded-lg shadow-sm overflow-hidden text-sm"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {/* Header */}
              <div className="px-8 pt-6 pb-4 border-b border-[#1e3a5f]/30">
                <div className="flex items-start justify-between gap-4">
                  <img src={mabLogoPath} alt="MAB Conseils" className="h-16 object-contain" />
                  <div className="text-right">
                    {numero && <p className="text-xs font-semibold text-muted-foreground">{numero}</p>}
                    <h1 className="text-lg font-bold tracking-wide" style={{ color: "#1e3a5f", fontFamily: "'Playfair Display', serif" }}>
                      OFFRE DE SERVICE
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Consultation en efficacité énergétique</p>
                  </div>
                </div>
              </div>

              {/* Info block */}
              <div className="px-8 py-4 bg-slate-50 border-b">
                <div className="space-y-1 text-xs">
                  <div><span className="font-semibold text-[#1e3a5f]">À l'attention de : </span><span>{clientName || "—"}</span></div>
                  <div><span className="font-semibold text-[#1e3a5f]">Adresse du projet : </span><span>{address || "—"}</span></div>
                  <div><span className="font-semibold text-[#1e3a5f]">Date : </span><span>{formatDateFr(form.date) || "—"}</span></div>
                  <div><span className="font-semibold text-[#1e3a5f]">De : </span><span>{form.de}</span></div>
                  <div><span className="font-semibold text-[#1e3a5f]">Consultant : </span><span>{form.consultant}</span></div>
                  <div><span className="font-semibold text-[#1e3a5f]">Adresse : </span><span>{form.adresseConsultant}</span></div>
                </div>
              </div>

              <div className="px-8 py-5 space-y-5">
                {/* Mandat et service */}
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-2 pb-1 border-b border-[#1e3a5f]/20">Mandat et service</h2>
                  <p className="text-sm whitespace-pre-line">{form.mandatIntro}</p>
                  {servicesLines.length > 0 && (
                    <>
                      <p className="text-sm mt-3 mb-1.5">Le consultant vous offre les services suivants dans votre offre :</p>
                      <ul className="space-y-1">
                        {servicesLines.map((line, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1e3a5f] shrink-0" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                <Separator />

                {/* Rémunération */}
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-2 pb-1 border-b border-[#1e3a5f]/20">Rémunération</h2>
                  {form.montant && (
                    <p className="text-sm mb-2">
                      En contrepartie du service, le client versera au consultant une somme de{" "}
                      <span className="font-bold text-[#1e3a5f]">{form.montant}</span> selon les termes suivants :
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-line">{form.remunerationDetails}</p>
                </div>

                <Separator />

                {/* Début du contrat */}
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-2 pb-1 border-b border-[#1e3a5f]/20">Début du contrat</h2>
                  <p className="text-sm whitespace-pre-line">{form.debutContrat}</p>
                  <p className="text-sm mt-2">
                    <span className="font-semibold">Courriel :</span> {form.courriel} / <span className="font-semibold">Téléphone :</span> {form.telephone}
                  </p>
                </div>

                <Separator />

                {/* Signature */}
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-4 pb-1 border-b border-[#1e3a5f]/20">Signature</h2>
                  <div className="max-w-sm">
                    {form.titreSignataireClient && <p className="text-xs text-muted-foreground mb-0.5">{form.titreSignataireClient}</p>}
                    <p className="text-xs font-semibold text-[#1e3a5f] mb-1">{form.signataireClient || clientName || "Client"}</p>
                    <div className="h-14 border-b border-gray-400 mb-1" />
                    <p className="text-xs text-muted-foreground">Signature &amp; date</p>
                  </div>
                </div>

                <div className="text-center pt-3">
                  <p className="text-sm font-semibold" style={{ color: "#1e3a5f" }}>Nous vous remercions pour votre confiance !</p>
                  <p className="text-xs text-muted-foreground mt-1">L'équipe de MAB Conseils</p>
                </div>

                <p className="text-[10px] text-muted-foreground text-center pt-2 border-t border-gray-100">
                  Offre de service MAB Conseils © {new Date().getFullYear()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
