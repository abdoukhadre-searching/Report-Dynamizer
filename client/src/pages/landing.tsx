import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0f2340 0%, #1e3a5f 55%, #1a4d78 100%)" }}>
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      {/* Glow blobs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.08]"
        style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 60%)", transform: "translate(30%, -30%)" }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(circle, #60a5fa 0%, transparent 60%)", transform: "translate(-30%, 30%)" }} />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl mx-auto">
        {/* Logo */}
        <div className="bg-white rounded-xl p-3 shadow-lg mb-10">
          <img src={mabLogoPath} alt="MAB Conseil Immobilier" className="h-12 w-auto object-contain" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold tracking-wider uppercase"
          style={{ backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#93c5fd" }}>
          <Shield className="w-3.5 h-3.5" />
          Programme APH SELECT — Québec
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-white mb-5 leading-[1.08]"
          style={{ fontFamily: "'Playfair Display', serif" }}>
          Qualifiez vos projets<br />
          <span style={{ color: "#60a5fa" }}>en quelques clics</span>
        </h1>

        <p className="text-blue-200 text-lg mb-12 max-w-xl leading-relaxed">
          La plateforme professionnelle pour l'analyse HOT2000 et la génération de cahiers de qualification APH SELECT.
        </p>

        <Button
          size="lg"
          className="px-12 text-base font-semibold shadow-xl"
          style={{ backgroundColor: "#2563eb" }}
          onClick={() => navigate("/login")}
          data-testid="button-hero-login"
        >
          Se connecter
        </Button>

        <p className="mt-10 text-xs text-blue-400/70">
          Marc-André Boucher — Conseils Immobiliers · Québec, Canada
        </p>
      </div>
    </div>
  );
}
