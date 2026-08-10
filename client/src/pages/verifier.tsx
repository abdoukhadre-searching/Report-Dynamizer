import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";

interface VerifyResult {
  valid: boolean;
  projectName?: string | null;
  date?: string;
  code?: string;
  signer?: string;
}

export default function VerifierPage() {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("p");
    const d = params.get("d");
    const t = params.get("t");
    if (!p || !d || !t) {
      setResult({ valid: false });
      setLoading(false);
      return;
    }
    fetch(`/api/verify-document?p=${encodeURIComponent(p)}&d=${encodeURIComponent(d)}&t=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then(setResult)
      .catch(() => setResult({ valid: false }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 flex items-center gap-3" style={{ backgroundColor: "#1e3a5f" }}>
          <img src={mabLogoPath} alt="MAB Conseil Immobilier" className="h-10 w-auto rounded bg-white p-1" />
          <div>
            <p className="text-white font-semibold text-sm">MAB Conseil Immobilier</p>
            <p className="text-slate-300 text-xs">Vérification d'authenticité de document</p>
          </div>
        </div>

        <div className="p-8 text-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p className="text-sm">Vérification en cours…</p>
            </div>
          ) : result?.valid ? (
            <div className="flex flex-col items-center gap-3" data-testid="result-valid">
              <CheckCircle2 className="h-16 w-16" style={{ color: "#0f766e" }} />
              <h1 className="text-xl font-bold" style={{ color: "#0f766e" }}>
                Document authentique
              </h1>
              <div className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm space-y-2">
                {result.projectName && (
                  <p>
                    <span className="text-slate-500">Projet : </span>
                    <span className="font-medium text-slate-800">{result.projectName}</span>
                  </p>
                )}
                <p>
                  <span className="text-slate-500">Signé par : </span>
                  <span className="font-medium text-slate-800">{result.signer}</span>
                </p>
                <p>
                  <span className="text-slate-500">Date de signature : </span>
                  <span className="font-medium text-slate-800">{result.date}</span>
                </p>
                <p>
                  <span className="text-slate-500">Code de vérification : </span>
                  <span className="font-mono font-medium text-slate-800">{result.code}</span>
                </p>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4" style={{ color: "#0f766e" }} />
                Ce document a été émis et signé numériquement par MAB Conseil Immobilier.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3" data-testid="result-invalid">
              <XCircle className="h-16 w-16 text-red-500" />
              <h1 className="text-xl font-bold text-red-600">Vérification impossible</h1>
              <p className="text-sm text-slate-600">
                Ce lien de vérification est invalide ou le document a été modifié. Si vous avez reçu ce
                document d'un tiers, veuillez contacter MAB Conseil Immobilier pour confirmer son
                authenticité.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
