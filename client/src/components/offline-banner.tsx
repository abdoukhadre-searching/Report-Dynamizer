import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";

const OFFLINE_ACTION_EVENT = "mab:offline-action-blocked";

export function announceOfflineActionBlocked() {
  window.dispatchEvent(new Event(OFFLINE_ACTION_EVENT));
}

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [showActionNotice, setShowActionNotice] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleActionBlocked = () => {
      setShowActionNotice(true);
      window.setTimeout(() => setShowActionNotice(false), 5000);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(OFFLINE_ACTION_EVENT, handleActionBlocked);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(OFFLINE_ACTION_EVENT, handleActionBlocked);
    };
  }, []);

  if (isOnline && !showActionNotice) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-3" role="status">
      <div className="flex max-w-xl items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950 shadow-lg">
        <CloudOff className="h-4 w-4 shrink-0 text-amber-700" />
        <span>
          {isOnline
            ? "Cette action nécessite une connexion Internet."
            : "Hors connexion — les données enregistrées restent disponibles en lecture seule."}
        </span>
      </div>
    </div>
  );
}