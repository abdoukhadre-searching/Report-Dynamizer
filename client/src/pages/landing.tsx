import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(155deg, #f8f6f1 0%, #eef4fb 45%, #ddeef9 100%)" }}>
      {/* Soft decorative blobs */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, #bfdbfe 0%, transparent 65%)", transform: "translate(35%, -40%)" }} />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #c7d2fe 0%, transparent 65%)", transform: "translate(-30%, 35%)" }} />
      <div className="absolute top-1/2 left-1/2 w-[900px] h-[400px] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse, #93c5fd 0%, transparent 60%)", transform: "translate(-50%, -50%)" }} />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl mx-auto">
        {/* Logo */}
        <div className="bg-white rounded-2xl p-3.5 shadow-md mb-10 border border-slate-100">
          <img src={mabLogoPath} alt="MAB Conseil Immobilier" className="h-12 w-auto object-contain" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold tracking-wider uppercase"
          style={{ backgroundColor: "rgba(30,58,95,0.08)", border: "1px solid rgba(30,58,95,0.18)", color: "#1e3a5f" }}>
          <Shield className="w-3.5 h-3.5" />
          Programme APH SELECT — Québec
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold mb-5 leading-[1.08]"
          style={{ fontFamily: "'Playfair Display', serif", color: "#0f2340" }}>
          Qualifiez vos projets<br />
          <span style={{ color: "#2563eb" }}>en quelques clics</span>
        </h1>

        <p className="text-lg mb-12 max-w-xl leading-relaxed" style={{ color: "#4a6080" }}>
          La plateforme professionnelle pour vos offres de service, feuilles de mandat et cahiers de qualification APH SELECT.
        </p>

        <Button
          size="lg"
          className="px-12 text-base font-semibold shadow-lg"
          style={{ backgroundColor: "#1e3a5f", color: "#fff" }}
          onClick={() => navigate("/login")}
          data-testid="button-hero-login"
        >
          Se connecter
        </Button>

        <p className="mt-10 text-xs" style={{ color: "#7a95b0" }}>
          Marc-André Boucher — Conseils Immobiliers · Québec, Canada
        </p>
      </div>
    </div>
  );
}
