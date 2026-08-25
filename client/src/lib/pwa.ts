export function registerPwaServiceWorker() {
  if (
    !import.meta.env.PROD ||
    typeof window === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Impossible d'enregistrer le service worker PWA.", error);
    });
  });
}