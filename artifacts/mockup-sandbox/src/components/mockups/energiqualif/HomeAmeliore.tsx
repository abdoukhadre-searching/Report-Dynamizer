import React from "react";
import { 
  Building2, 
  Home, 
  FileText, 
  Plus, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  MapPin,
  ChevronRight,
  Zap
} from "lucide-react";

const NAVY = "#1e3a5f";
const GREEN = "#16a34a";

const recentProjects = [
  {
    id: 1,
    address: "123 Rue des Érables, Montréal",
    type: "Bâtiment existant",
    status: "En cours",
    statusColor: "text-amber-600",
    statusBg: "bg-amber-50",
    statusBorder: "border-amber-200"
  },
  {
    id: 2,
    address: "45 Avenue Laval, Québec",
    type: "Bâtiment existant",
    status: "Complété",
    statusColor: "text-green-600",
    statusBg: "bg-green-50",
    statusBorder: "border-green-200"
  },
  {
    id: 3,
    address: "789 Blvd René-Lévesque, Sherbrooke",
    type: "Construction neuve",
    status: "En cours",
    statusColor: "text-amber-600",
    statusBg: "bg-amber-50",
    statusBorder: "border-amber-200"
  }
];

export function HomeAmeliore() {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#1e3a5f] p-2 rounded-lg text-white">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <h1 className="text-xl font-bold text-[#1e3a5f] tracking-tight">Energi<span className="text-[#16a34a]">Qualif</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium border border-slate-200">
              JD
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        
        {/* Welcome & Stats Bar */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Bonjour, Jean</h2>
              <p className="text-slate-500 mt-1">Voici un aperçu de vos projets de qualification énergétique.</p>
            </div>
            <button className="inline-flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#152943] text-white px-4 py-2.5 rounded-md font-medium transition-colors shadow-sm text-sm">
              <Plus className="w-4 h-4" />
              Nouveau projet
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Projets totaux</p>
                <p className="text-2xl font-bold text-slate-900">4</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
              <div className="bg-amber-50 text-amber-600 p-3 rounded-lg">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">En cours</p>
                <p className="text-2xl font-bold text-slate-900">2</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
              <div className="bg-green-50 text-green-600 p-3 rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Complétés</p>
                <p className="text-2xl font-bold text-slate-900">2</p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Démarrer une évaluation</h3>
          <div className="grid md:grid-cols-2 gap-6">
            
            <button className="group relative bg-white text-left p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1e3a5f]" />
              <div className="flex items-start gap-5">
                <div className="bg-[#1e3a5f]/10 text-[#1e3a5f] p-4 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-[#1e3a5f] transition-colors">Bâtiment Existant</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Évaluation APH SELECT pour un bâtiment déjà construit. Calcul de l'amélioration de l'efficacité énergétique.
                  </p>
                </div>
              </div>
            </button>

            <button className="group relative bg-white text-left p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#16a34a]" />
              <div className="flex items-start gap-5">
                <div className="bg-[#16a34a]/10 text-[#16a34a] p-4 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Home className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-[#16a34a] transition-colors">Construction Neuve</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Évaluation APH SELECT pour un nouveau projet. Analyse des performances par rapport au code de construction.
                  </p>
                </div>
              </div>
            </button>
            
          </div>
        </section>

        {/* Recent Projects */}
        <section className="space-y-4 pb-12">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Projets récents</h3>
            <button className="text-sm font-medium text-[#1e3a5f] hover:underline flex items-center gap-1">
              Voir tout <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden divide-y divide-slate-100">
            {recentProjects.length > 0 ? (
              recentProjects.map((project) => (
                <div key={project.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-slate-100 p-2 rounded-lg text-slate-500">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">{project.address}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-slate-500">{project.type}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-sm text-slate-400">Mis à jour il y a 2 jours</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${project.statusBg} ${project.statusColor} ${project.statusBorder}`}>
                      {project.status}
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center text-slate-400 mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-medium text-slate-900">Aucun projet récent</h4>
                <p className="text-slate-500 mt-1 max-w-sm mb-6">Vous n'avez pas encore créé de projet. Commencez par ajouter un nouveau projet d'évaluation.</p>
                <button className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md font-medium transition-colors shadow-sm text-sm">
                  <Plus className="w-4 h-4" />
                  Créer un projet
                </button>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
