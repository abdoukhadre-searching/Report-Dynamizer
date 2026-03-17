import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Project } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Building2,
  HardHat,
  ArrowLeft,
  ArrowRight,
  MapPin,
} from "lucide-react";

interface UploadTabProps {
  project: Project;
}

export default function UploadTab({ project }: UploadTabProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [preText, setPreText] = useState("");
  const [postText, setPostText] = useState("");
  const [buildingType, setBuildingType] = useState<"existing" | "new">(
    (project.buildingType as "existing" | "new") || "existing"
  );
  const [address, setAddress] = useState(project.address || "");
  const [city, setCity] = useState(project.city || "");
  const [province, setProvince] = useState(project.province || "Québec");
  const [postalCode, setPostalCode] = useState(project.postalCode || "");
  const [prePdfFile, setPrePdfFile] = useState<File | null>(null);
  const [postPdfFile, setPostPdfFile] = useState<File | null>(null);

  const hasPreReport = !!project.preReportData;
  const hasPostReport = !!project.postReportData;

  const updateBuildingTypeMutation = useMutation({
    mutationFn: async (type: "existing" | "new") => {
      const res = await apiRequest("PATCH", `/api/projects/${project.id}`, {
        buildingType: type,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
    },
  });

  const updateInfoMutation = useMutation({
    mutationFn: async () => {
      const generatedName = [address.trim(), city.trim()].filter(Boolean).join(", ") || "Nouveau projet";
      const res = await apiRequest("PATCH", `/api/projects/${project.id}`, {
        name: generatedName,
        address: address.trim(),
        city: city.trim(),
        province: province.trim(),
        postalCode: postalCode.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setStep(3);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de sauvegarder les informations.", variant: "destructive" });
    },
  });

  const handleBuildingTypeSelect = (type: "existing" | "new") => {
    setBuildingType(type);
    updateBuildingTypeMutation.mutate(type);
  };

  const uploadPreMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", `/api/projects/${project.id}/upload-pre`, {
        content: text,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      setPreText("");
      toast({ title: "Rapport PRE analysé avec succès" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const uploadPostMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", `/api/projects/${project.id}/upload-post`, {
        content: text,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      setPostText("");
      toast({ title: "Rapport POST analysé avec succès" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const uploadPrePdfMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/projects/${project.id}/upload-pre-pdf`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erreur");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      setPrePdfFile(null);
      toast({ title: "Rapport PRE (PDF) analysé avec succès" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const uploadPostPdfMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/projects/${project.id}/upload-post-pdf`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erreur");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      setPostPdfFile(null);
      toast({ title: "Rapport POST (PDF) analysé avec succès" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const handleFileRead = (
    file: File,
    setter: (text: string) => void,
    pdfSetter: (file: File | null) => void
  ) => {
    if (file.name.endsWith(".pdf")) {
      pdfSetter(file);
      setter("");
    } else {
      pdfSetter(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setter(text);
      };
      reader.readAsText(file);
    }
  };

  const isPreUploading = uploadPreMutation.isPending || uploadPrePdfMutation.isPending;
  const isPostUploading = uploadPostMutation.isPending || uploadPostPdfMutation.isPending;

  const handlePreSubmit = () => {
    if (prePdfFile) {
      uploadPrePdfMutation.mutate(prePdfFile);
    } else if (preText.trim()) {
      uploadPreMutation.mutate(preText);
    }
  };

  const handlePostSubmit = () => {
    if (postPdfFile) {
      uploadPostPdfMutation.mutate(postPdfFile);
    } else if (postText.trim()) {
      uploadPostMutation.mutate(postText);
    }
  };

  const StepDots = ({ current }: { current: 1 | 2 | 3 }) => (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`rounded-full transition-all ${
            s === current
              ? "w-6 h-1.5 bg-[#1e3a5f]"
              : s < current
              ? "w-4 h-1.5 bg-[#1e3a5f]/40"
              : "w-4 h-1.5 bg-muted"
          }`}
        />
      ))}
    </div>
  );

  if (step === 1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 py-8">
        <div className="text-center space-y-2">
          <h2
            className="text-2xl font-bold"
            style={{ color: "#1e3a5f", fontFamily: "'Playfair Display', serif" }}
          >
            Type de bâtiment
          </h2>
          <p className="text-muted-foreground text-sm max-w-md">
            Sélectionnez le type de bâtiment pour ce projet de qualification APH SELECT.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          <button
            type="button"
            data-testid="button-building-type-existing"
            onClick={() => handleBuildingTypeSelect("existing")}
            className={`flex flex-col items-center gap-5 rounded-2xl border-2 p-8 transition-all cursor-pointer group ${
              buildingType === "existing"
                ? "border-[#1e3a5f] bg-[#1e3a5f]/5 shadow-md"
                : "border-border hover:border-[#1e3a5f]/50 hover:shadow-sm"
            }`}
          >
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                buildingType === "existing"
                  ? "bg-[#1e3a5f] text-white"
                  : "bg-muted text-muted-foreground group-hover:bg-[#1e3a5f]/10 group-hover:text-[#1e3a5f]"
              }`}
            >
              <Building2 className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className={`font-semibold text-base mb-1 ${buildingType === "existing" ? "text-[#1e3a5f]" : ""}`}>
                Bâtiment existant
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Immeuble déjà construit
                <br />
                Analyse avant / après travaux
              </p>
            </div>
            {buildingType === "existing" && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#1e3a5f]">
                <CheckCircle2 className="w-4 h-4" />
                Sélectionné
              </div>
            )}
          </button>

          <button
            type="button"
            data-testid="button-building-type-new"
            onClick={() => handleBuildingTypeSelect("new")}
            className={`flex flex-col items-center gap-5 rounded-2xl border-2 p-8 transition-all cursor-pointer group ${
              buildingType === "new"
                ? "border-[#1e3a5f] bg-[#1e3a5f]/5 shadow-md"
                : "border-border hover:border-[#1e3a5f]/50 hover:shadow-sm"
            }`}
          >
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                buildingType === "new"
                  ? "bg-[#1e3a5f] text-white"
                  : "bg-muted text-muted-foreground group-hover:bg-[#1e3a5f]/10 group-hover:text-[#1e3a5f]"
              }`}
            >
              <HardHat className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className={`font-semibold text-base mb-1 ${buildingType === "new" ? "text-[#1e3a5f]" : ""}`}>
                Construction neuve
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Projet à construire
                <br />
                Bâtiment de référence CNEB 2017
              </p>
            </div>
            {buildingType === "new" && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#1e3a5f]">
                <CheckCircle2 className="w-4 h-4" />
                Sélectionné
              </div>
            )}
          </button>
        </div>

        <Button
          onClick={() => setStep(2)}
          size="lg"
          className="px-10"
          data-testid="button-continue-to-address"
          style={{ backgroundColor: "#1e3a5f" }}
        >
          Continuer
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <StepDots current={1} />
      </div>
    );
  }

  if (step === 2) {
    const previewName = [address.trim(), city.trim()].filter(Boolean).join(", ") || "—";

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-8">
        <div className="w-full max-w-lg space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(1)}
              data-testid="button-back-to-type"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
            <StepDots current={2} />
          </div>

          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-[#1e3a5f]" />
              </div>
            </div>
            <h2
              className="text-2xl font-bold"
              style={{ color: "#1e3a5f", fontFamily: "'Playfair Display', serif" }}
            >
              Adresse du bâtiment
            </h2>
            <p className="text-muted-foreground text-sm">
              Ces informations identifient le projet dans vos rapports.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: 7546-7556 Avenue Casgrain"
                  data-testid="input-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Montréal"
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">Code postal</Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="Ex: H2T 1S3"
                    data-testid="input-postal-code"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="province">Province</Label>
                <Input
                  id="province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="Québec"
                  data-testid="input-province"
                />
              </div>

              {address.trim() || city.trim() ? (
                <div className="pt-2 px-3 py-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Nom du projet : </span>
                  {previewName}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Button
            onClick={() => updateInfoMutation.mutate()}
            disabled={updateInfoMutation.isPending || (!address.trim() && !city.trim())}
            size="lg"
            className="w-full"
            data-testid="button-save-address"
            style={{ backgroundColor: "#1e3a5f" }}
          >
            {updateInfoMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Continuer
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <div className="flex justify-center">
            <StepDots current={2} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep(2)}
          data-testid="button-back-to-address"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
        <StepDots current={3} />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {buildingType === "existing" ? (
            <>
              <Building2 className="w-3.5 h-3.5" />
              Bâtiment existant
            </>
          ) : (
            <>
              <HardHat className="w-3.5 h-3.5" />
              Construction neuve
            </>
          )}
          {(address || city) && (
            <>
              <span className="mx-1">·</span>
              <MapPin className="w-3.5 h-3.5" />
              {[address, city].filter(Boolean).join(", ")}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium">Rapport PRE-travaux</h3>
              </div>
              {hasPreReport ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Chargé
                </Badge>
              ) : (
                <Badge variant="secondary">En attente</Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Importez le rapport HOT2000 PRE-travaux en format PDF ou collez le contenu texte.
            </p>

            <div className="mb-3">
              <label
                className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed rounded-md cursor-pointer text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30"
                data-testid="input-file-pre"
              >
                <Upload className="w-4 h-4" />
                {prePdfFile ? (
                  <span className="text-foreground font-medium">{prePdfFile.name}</span>
                ) : (
                  "Importer un fichier (.pdf, .txt)"
                )}
                <input
                  type="file"
                  accept=".pdf,.txt,.text"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileRead(file, setPreText, setPrePdfFile);
                  }}
                />
              </label>
            </div>

            {!prePdfFile && (
              <Textarea
                value={preText}
                onChange={(e) => setPreText(e.target.value)}
                placeholder="Ou collez le contenu du rapport PRE HOT2000 ici..."
                className="min-h-[200px] text-xs font-mono"
                data-testid="textarea-pre-report"
              />
            )}

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handlePreSubmit}
                disabled={(!preText.trim() && !prePdfFile) || isPreUploading}
                data-testid="button-upload-pre"
              >
                {isPreUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Analyser le rapport PRE
              </Button>
            </div>

            {hasPreReport && (
              <div className="mt-4 p-3 rounded-md bg-muted/50 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-chart-4 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  Rapport PRE analysé. Les données ont été extraites avec succès.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium">Rapport POST-travaux</h3>
              </div>
              {hasPostReport ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Chargé
                </Badge>
              ) : (
                <Badge variant="secondary">En attente</Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Importez le rapport HOT2000 POST-travaux en format PDF ou collez le contenu texte.
            </p>

            <div className="mb-3">
              <label
                className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed rounded-md cursor-pointer text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30"
                data-testid="input-file-post"
              >
                <Upload className="w-4 h-4" />
                {postPdfFile ? (
                  <span className="text-foreground font-medium">{postPdfFile.name}</span>
                ) : (
                  "Importer un fichier (.pdf, .txt)"
                )}
                <input
                  type="file"
                  accept=".pdf,.txt,.text"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileRead(file, setPostText, setPostPdfFile);
                  }}
                />
              </label>
            </div>

            {!postPdfFile && (
              <Textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Ou collez le contenu du rapport POST HOT2000 ici..."
                className="min-h-[200px] text-xs font-mono"
                data-testid="textarea-post-report"
              />
            )}

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handlePostSubmit}
                disabled={(!postText.trim() && !postPdfFile) || isPostUploading}
                data-testid="button-upload-post"
              >
                {isPostUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Analyser le rapport POST
              </Button>
            </div>

            {hasPostReport && (
              <div className="mt-4 p-3 rounded-md bg-muted/50 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-chart-4 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  Rapport POST analysé. Les données ont été extraites avec succès.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {hasPreReport && hasPostReport && (
        <Card>
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-chart-4/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Les deux rapports sont chargés</h3>
                <p className="text-xs text-muted-foreground">
                  Consultez le tableau de bord ou générez le cahier de qualification.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">PRE</Badge>
              <Badge variant="default">POST</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasPreReport && !hasPostReport && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <h3 className="font-medium text-sm mb-1">Comment utiliser cet outil</h3>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Importez vos rapports HOT2000 (PRE et POST travaux) en format PDF</li>
                  <li>Ou copiez le contenu texte du rapport et collez-le dans la zone de texte</li>
                  <li>Cliquez sur "Analyser" pour extraire les données</li>
                  <li>Une fois les deux rapports analysés, consultez le tableau de bord</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
