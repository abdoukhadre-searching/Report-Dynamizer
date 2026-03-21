import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface DeleteConfirmDialogProps {
  open: boolean;
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

function getAcronym(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}

export function DeleteConfirmDialog({
  open,
  projectName,
  onConfirm,
  onCancel,
  isPending = false,
}: DeleteConfirmDialogProps) {
  const [input, setInput] = useState("");
  const [deleted, setDeleted] = useState(false);

  const acronym = getAcronym(projectName);
  const isValid =
    input.trim().toLowerCase() === "supprimer" ||
    input.trim().toLowerCase() === projectName.trim().toLowerCase() ||
    (acronym.length >= 2 && input.trim().toUpperCase() === acronym);

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm();
    setDeleted(true);
  };

  const handleClose = () => {
    setInput("");
    setDeleted(false);
    onCancel();
  };

  if (deleted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-6 text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Projet supprimé</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Le projet <span className="font-medium">«&nbsp;{projectName}&nbsp;»</span> a été supprimé avec succès.
              </p>
            </div>
            <Button onClick={handleClose} className="mt-2">Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <DialogTitle>Supprimer le projet</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            Cette action est <span className="font-semibold text-foreground">irréversible</span>. Le projet{" "}
            <span className="font-semibold text-foreground">«&nbsp;{projectName}&nbsp;»</span> et toutes ses données
            seront définitivement supprimés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label className="text-xs text-muted-foreground">
            Pour confirmer, tapez{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">Supprimer</code>
            {", le nom du projet, ou l'acronyme "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">{acronym}</code>
          </Label>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tapez pour confirmer…"
            className={isValid ? "border-red-400 focus-visible:ring-red-400" : ""}
            data-testid="input-delete-confirm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && isValid) handleConfirm();
            }}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isPending} data-testid="button-cancel-delete">
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid || isPending}
            data-testid="button-confirm-delete"
          >
            {isPending ? "Suppression…" : "Supprimer définitivement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
