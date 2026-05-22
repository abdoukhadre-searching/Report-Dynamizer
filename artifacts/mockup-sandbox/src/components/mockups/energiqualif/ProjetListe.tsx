import React from "react";
import { 
  Building2, 
  Search, 
  Filter, 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  User, 
  Home, 
  ChevronRight,
  Leaf
} from "lucide-react";

const projects = [
  { 
    id: 1, 
    name: "123 Rue des Érables, Montréal", 
    type: "Bâtiment existant", 
    status: "En cours", 
    date: "Créé le 14 mai 2026" 
  },
  { 
    id: 2, 
    name: "45 Avenue Laval, Québec", 
    type: "Bâtiment existant", 
    status: "Qualifié", 
    date: "Créé le 3 mai 2026" 
  },
  { 
    id: 3, 
    name: "789 Blvd René-Lévesque, Sherbrooke", 
    type: "Bâtiment existant", 
    status: "Rapports manquants", 
    date: "Créé le 28 avr. 2026" 
  }
];

export function ProjetListe() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Rapports manquants":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "En cours":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Qualifié":
        return "bg-[#16a34a]/10 text-[#16a34a] border-[#16a34a]/20";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-20">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#1e3a5f]">
            <div className="w-8 h-8 rounded-lg bg-[#1e3a5f] flex items-center justify-center text-white">
              <Leaf size={18} />
            </div>
            <span className="font-bold text-xl tracking-tight">EnergiQualif</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm">
              <Plus size={18} />
              Nouveau projet
            </button>
            <button className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors border border-slate-200">
              <User size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 pt-8">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <button className="hover:text-slate-900 transition-colors flex items-center gap-1">
            <ArrowLeft size={16} className="mr-1" />
            Accueil
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-900">Bâtiments existants</span>
        </div>

        {/* Page Header & Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1e3a5f] tracking-tight">Bâtiments existants</h1>
            <p className="text-slate-500 mt-1">Gérez vos dossiers de qualification énergétique.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher un projet..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a] transition-all shadow-sm"
              />
            </div>
            <div className="relative">
              <select className="appearance-none pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-all shadow-sm cursor-pointer">
                <option>Tous les statuts</option>
                <option>En cours</option>
                <option>Qualifié</option>
                <option>Rapports manquants</option>
              </select>
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* List Header/Metadata */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-sm font-medium text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-md">3 projets</span>
        </div>

        {/* Project Cards */}
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="group flex flex-col sm:flex-row sm:items-center p-4 sm:p-5 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
            >
              {/* Left: Icon */}
              <div className="w-12 h-12 rounded-xl bg-[#1e3a5f]/5 flex items-center justify-center text-[#1e3a5f] shrink-0 mb-4 sm:mb-0">
                <Building2 size={24} strokeWidth={1.5} />
              </div>
              
              {/* Center: Details */}
              <div className="flex-1 sm:ml-5 flex flex-col gap-1">
                <div className="flex items-center flex-wrap gap-2">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#1e3a5f] transition-colors">{project.name}</h3>
                  <span className="text-[11px] uppercase tracking-wider font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200/60">
                    {project.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>{project.date}</span>
                </div>
              </div>
              
              {/* Right: Status & Action */}
              <div className="flex items-center justify-between sm:justify-end gap-6 mt-4 sm:mt-0 sm:ml-4 border-t border-slate-100 sm:border-0 pt-4 sm:pt-0">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                
                <button className="flex items-center gap-1.5 text-sm font-medium text-[#1e3a5f] hover:text-[#16a34a] transition-colors bg-slate-50 hover:bg-[#16a34a]/10 px-3 py-2 rounded-lg">
                  Voir
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
