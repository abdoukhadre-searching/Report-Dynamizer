import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Zap, BarChart2, FileText, Shield, ChevronRight } from "lucide-react";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Hero */}
      <div
        className="flex-1 relative flex flex-col items-center justify-center px-6 py-20 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f2340 0%, #1e3a5f 50%, #2a4f7c 100%)",
          minHeight: "100vh",
        }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Decorative circle */}
        <div
          className="absolute top-[-120px] right-[-120px] w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #c0392b 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-80px] left-[-80px] w-[350px] h-[350px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #c0392b 0%, transparent 70%)" }}
        />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-2xl p-3 shadow-xl">
              <img src={mabLogoPath} alt="MAB" className="h-14 w-auto object-contain" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <Shield className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-blue-200 text-xs font-medium tracking-wide">Programme APH SELECT — Québec</span>
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-5 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            EnergiQualif
          </h1>
          <p className="text-blue-200 text-lg sm:text-xl mb-3 max-w-xl mx-auto leading-relaxed">
            Plateforme de qualification énergétique APH SELECT
          </p>
          <p className="text-blue-300 text-sm mb-10 max-w-lg mx-auto">
            Analysez les rapports HOT2000, comparez les performances PRÉ/POST et générez vos cahiers de qualification professionnels.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="gap-2 px-8 text-sm font-semibold shadow-lg"
              style={{ backgroundColor: "#c0392b", borderColor: "#c0392b" }}
              onClick={() => navigate("/register")}
              data-testid="button-hero-register"
            >
              Créer un compte
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 px-8 text-sm font-semibold border-white/30 text-white hover:bg-white/10 hover:text-white"
              onClick={() => navigate("/login")}
              data-testid="button-hero-login"
            >
              Se connecter
            </Button>
          </div>
        </div>

        {/* Feature cards */}
        <div className="relative z-10 mt-16 max-w-4xl mx-auto grid sm:grid-cols-3 gap-4 w-full px-4">
          {[
            {
              icon: <FileText className="w-5 h-5" />,
              title: "Analyse HOT2000",
              desc: "Extraction automatique des données depuis les rapports PDF français.",
            },
            {
              icon: <BarChart2 className="w-5 h-5" />,
              title: "Comparaison PRÉ/POST",
              desc: "Visualisation des gains énergétiques et réduction des GES par catégorie.",
            },
            {
              icon: <Zap className="w-5 h-5" />,
              title: "Cahiers automatiques",
              desc: "Génération de rapports de qualification et d'attestations APH SELECT.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl p-5 text-left"
              style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: "rgba(192,57,43,0.25)" }}
              >
                <span className="text-red-300">{f.icon}</span>
              </div>
              <h3 className="text-white font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-blue-300 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
