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
  File,
} from "lucide-react";

interface UploadTabProps {
  project: Project;
}

export default function UploadTab({ project }: UploadTabProps) {
  const { toast } = useToast();
  const [preText, setPreText] = useState("");
  const [postText, setPostText] = useState("");
  const [projectName, setProjectName] = useState(project.name);
  const [projectAddress, setProjectAddress] = useState(project.address || "");
  const [prePdfFile, setPrePdfFile] = useState<File | null>(null);
  const [postPdfFile, setPostPdfFile] = useState<File | null>(null);

  const hasPreReport = !!project.preReportData;
  const hasPostReport = !!project.postReportData;

  const updateInfoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/projects/${project.id}`, {
        name: projectName,
        address: projectAddress,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
      toast({ title: "Informations mises a jour" });
    },
  });

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
      toast({ title: "Rapport PRE analyse avec succes" });
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
      toast({ title: "Rapport POST analyse avec succes" });
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
      toast({ title: "Rapport PRE (PDF) analyse avec succes" });
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
      toast({ title: "Rapport POST (PDF) analyse avec succes" });
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

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="font-medium mb-4">Informations du projet</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Nom du projet</Label>
              <Input
                id="name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex: 2327-2337 Rue Cartier"
                data-testid="input-project-name"
              />
            </div>
            <div>
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
                placeholder="Adresse du batiment"
                data-testid="input-project-address"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => updateInfoMutation.mutate()}
              disabled={updateInfoMutation.isPending}
              data-testid="button-save-info"
            >
              {updateInfoMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Sauvegarder
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  Charge
                </Badge>
              ) : (
                <Badge variant="secondary">
                  En attente
                </Badge>
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
                  Rapport PRE analyse. Les donnees ont ete extraites avec succes.
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
                  Charge
                </Badge>
              ) : (
                <Badge variant="secondary">
                  En attente
                </Badge>
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
                  Rapport POST analyse. Les donnees ont ete extraites avec succes.
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
                <h3 className="font-medium text-sm">Les deux rapports sont charges</h3>
                <p className="text-xs text-muted-foreground">
                  Consultez le tableau de bord ou generez le cahier de qualification.
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
                  <li>Cliquez sur "Analyser" pour extraire les donnees</li>
                  <li>Une fois les deux rapports analyses, consultez le tableau de bord</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
