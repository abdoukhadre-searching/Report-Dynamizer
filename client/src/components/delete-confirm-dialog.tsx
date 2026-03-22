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
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface DeleteConfirmDialogProps {
  open: boolean;
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function DeleteConfirmDialog({
  open,
  projectName,
  onConfirm,
  onCancel,
  isPending = false,
}: DeleteConfirmDialogProps) {
  const [deleted, setDeleted] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setDeleted(true);
  };

  const handleClose = () => {
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
            Êtes-vous sûr de vouloir supprimer le projet{" "}
            <span className="font-semibold text-foreground">«&nbsp;{projectName}&nbsp;»</span> ?
            Cette action est <span className="font-semibold text-foreground">irréversible</span> et toutes les données seront définitivement perdues.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2 mt-2">
          <Button variant="outline" onClick={handleClose} disabled={isPending} data-testid="button-cancel-delete">
            Non
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
            data-testid="button-confirm-delete"
          >
            {isPending ? "Suppression…" : "Oui, supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
