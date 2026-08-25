import { useEffect, useState } from "react";
import { deleteDraft, loadDraft, saveDraft } from "@/lib/pwa-storage";

export function useOfflineDraft<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    setIsHydrated(false);

    void loadDraft<T>(key).then((draft) => {
      if (!active) return;
      if (draft !== null) setValue(draft);
      setIsHydrated(true);
    });

    return () => {
      active = false;
    };
  }, [key]);

  useEffect(() => {
    if (!isHydrated) return;
    void saveDraft(key, value);
  }, [isHydrated, key, value]);

  const clear = () => {
    void deleteDraft(key);
  };

  return [value, setValue, clear] as const;
}