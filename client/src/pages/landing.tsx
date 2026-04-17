import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Zap,
  BarChart2,
  FileText,
  Shield,
  ChevronRight,
  Upload,
  CheckCircle2,
  ArrowRight,
  Building2,
} from "lucide-react";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f8fafc" }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{ backgroundColor: "rgba(255,255,255,0.92)", borderColor: "#e2e8f0" }}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={mabLogoPath} alt="MAB" className="h-9 w-auto object-contain" />
            <div className="h-5 w-px bg-slate-200" />
            <span className="text-sm font-semibold text-slate-700 tracking-tight">EnergiQualif</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/login")}
              className="text-slate-600 text-sm"
              data-testid="button-nav-login"
            >
              Se connecter
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/register")}
              className="text-sm font-semibold"
              style={{ backgroundColor: "#1e3a5f" }}
              data-testid="button-nav-register"
            >
              Créer un compte
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden flex flex-col items-center justify-center text-center px-6 py-24"
        style={{
          background: "linear-gradient(160deg, #0f2340 0%, #1e3a5f 55%, #1a4d78 100%)",
          minHeight: "85vh",
        }}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 60%)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #60a5fa 0%, transparent 60%)", transform: "translate(-30%, 30%)" }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold tracking-wider uppercase"
            style={{ backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#93c5fd" }}>
            <Shield className="w-3.5 h-3.5" />
            Programme APH SELECT — Québec
          </div>

          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.05]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Qualifiez vos projets<br />
            <span style={{ color: "#60a5fa" }}>en quelques clics</span>
          </h1>

          <p className="text-blue-200 text-lg sm:text-xl mb-4 max-w-2xl mx-auto leading-relaxed">
            La plateforme professionnelle pour l'analyse HOT2000 et la génération de cahiers de qualification APH SELECT.
          </p>
          <p className="text-blue-400 text-sm mb-12 max-w-xl mx-auto">
            Chargez vos rapports PDF, comparez les performances énergétiques PRÉ/POST et exportez vos documents SCHL en quelques minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gap-2 px-9 text-base font-semibold shadow-xl"
              style={{ backgroundColor: "#2563eb", borderColor: "#2563eb" }}
              onClick={() => navigate("/register")}
              data-testid="button-hero-register"
            >
              Commencer gratuitement
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 px-9 text-base font-semibold"
              style={{ borderColor: "rgba(255,255,255,0.3)", color: "white", backgroundColor: "rgba(255,255,255,0.06)" }}
              onClick={() => navigate("/login")}
              data-testid="button-hero-login"
            >
              Se connecter
            </Button>
          </div>

          {/* Trust bar */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-blue-400">
            {["Rapports HOT2000 français", "PDF côté serveur", "Attestations SCHL automatiques"].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6" style={{ backgroundColor: "#ffffff" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#2563eb" }}>Processus simple</span>
            <h2 className="mt-2 text-3xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
              De l'analyse au rapport en 3 étapes
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden sm:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px" style={{ backgroundColor: "#e2e8f0", zIndex: 0 }} />
            {[
              {
                n: "1",
                icon: <Upload className="w-5 h-5" />,
                title: "Chargez vos rapports",
                desc: "Importez les fichiers HOT2000 PRÉ et POST-travaux en PDF. L'extraction du texte est automatique.",
                color: "#1e3a5f",
              },
              {
                n: "2",
                icon: <BarChart2 className="w-5 h-5" />,
                title: "Analysez les résultats",
                desc: "Comparez la consommation énergétique, les GES et identifiez automatiquement les stratégies d'optimisation.",
                color: "#2563eb",
              },
              {
                n: "3",
                icon: <FileText className="w-5 h-5" />,
                title: "Exportez les documents",
                desc: "Générez le cahier de qualification APH SELECT et l'attestation SCHL en un clic.",
                color: "#16a34a",
              },
            ].map((step) => (
              <div key={step.n} className="relative z-10 flex flex-col items-center text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-md text-white"
                  style={{ backgroundColor: step.color }}
                >
                  {step.icon}
                </div>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mb-4"
                  style={{ backgroundColor: step.color, opacity: 0.7 }}>
                  {step.n}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6" style={{ backgroundColor: "#f8fafc" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#2563eb" }}>Fonctionnalités</span>
            <h2 className="mt-2 text-3xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
              Tout ce qu'il vous faut
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <FileText className="w-5 h-5" />,
                title: "Analyse HOT2000",
                desc: "Extraction automatique de toutes les données depuis les rapports PDF en français : chauffage, ventilation, eau chaude, éclairage.",
                color: "#1e3a5f",
                bg: "#eef2f8",
              },
              {
                icon: <BarChart2 className="w-5 h-5" />,
                title: "Tableau de bord",
                desc: "Graphiques comparatifs PRÉ/POST par catégorie, évolution mensuelle et réduction des GES en tonnes CO₂/an.",
                color: "#2563eb",
                bg: "#eff6ff",
              },
              {
                icon: <Building2 className="w-5 h-5" />,
                title: "Bâtiments & constructions",
                desc: "Gestion des projets de rénovation (bâtiments existants) et de construction neuve avec leur propre flux de qualification.",
                color: "#16a34a",
                bg: "#f0fdf4",
              },
              {
                icon: <Zap className="w-5 h-5" />,
                title: "Cahier de qualification",
                desc: "Document professionnel en 8 sections avec graphiques, tableaux comparatifs, annexes et stratégies d'optimisation.",
                color: "#d97706",
                bg: "#fffbeb",
              },
              {
                icon: <Shield className="w-5 h-5" />,
                title: "Attestation SCHL",
                desc: "Formulaire APH SELECT pré-rempli automatiquement avec les niveaux N1/N2/N3 calculés selon les seuils officiels.",
                color: "#7c3aed",
                bg: "#faf5ff",
              },
              {
                icon: <CheckCircle2 className="w-5 h-5" />,
                title: "Empreinte économique",
                desc: "Calcul des coûts d'installation, subventions Logisvert et retour sur investissement par unité ou par immeuble.",
                color: "#0891b2",
                bg: "#ecfeff",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-6 border"
                style={{ backgroundColor: "#ffffff", borderColor: "#e8edf4" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: f.bg }}>
                  <span style={{ color: f.color }}>{f.icon}</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2 text-sm">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-20 px-6 text-center"
        style={{ background: "linear-gradient(135deg, #0f2340 0%, #1e3a5f 100%)" }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Prêt à générer votre premier cahier ?
          </h2>
          <p className="text-blue-300 text-sm mb-8">
            Accédez à la plateforme et qualifiez vos projets APH SELECT dès aujourd'hui.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="gap-2 px-10 font-semibold"
              style={{ backgroundColor: "#2563eb" }}
              onClick={() => navigate("/register")}
              data-testid="button-cta-register"
            >
              Créer un compte
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 px-10 font-semibold"
              style={{ borderColor: "rgba(255,255,255,0.3)", color: "white", backgroundColor: "transparent" }}
              onClick={() => navigate("/login")}
              data-testid="button-cta-login"
            >
              Se connecter
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t" style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={mabLogoPath} alt="MAB" className="h-7 w-auto object-contain opacity-70" />
            <span className="text-xs text-slate-400">Marc-André Boucher — Conseils Immobiliers</span>
          </div>
          <p className="text-xs text-slate-400">
            Qualification énergétique APH SELECT · Québec, Canada
          </p>
        </div>
      </footer>
    </div>
  );
}
