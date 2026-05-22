import React from "react";
import { Zap, Plus, Building2, HardHat, ChevronRight } from "lucide-react";

export function HomeActuel() {
  return (
    <div className="min-h-screen font-sans text-slate-800" style={{ backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center justify-center rounded-lg w-10 h-10 text-white" 
            style={{ backgroundColor: "#1e3a5f" }}
          >
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight" style={{ color: "#1e3a5f" }}>EnergiQualif</span>
            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Qualification APH SELECT</span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <button 
            className="flex items-center gap-2 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors hover:opacity-90 shadow-sm"
            style={{ backgroundColor: "#1e3a5f" }}
          >
            <Plus className="w-4 h-4" />
            Nouveau projet
          </button>
          
          <div className="h-8 w-px bg-slate-200 mx-1"></div>
          
          <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-medium text-slate-700 leading-tight">Marc-André B.</span>
              <span className="text-xs text-slate-500">Évaluateur</span>
            </div>
            <div 
              className="flex items-center justify-center w-9 h-9 rounded-full text-white font-semibold text-sm shadow-sm"
              style={{ backgroundColor: "#16a34a" }}
            >
              M
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold mb-3" style={{ color: "#1e3a5f" }}>Bienvenue sur EnergiQualif</h1>
          <p className="text-slate-500 max-w-xl mx-auto">Sélectionnez le type de projet pour commencer une nouvelle qualification ou accéder à vos projets existants.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Card 1: Bâtiments existants */}
          <div className="group bg-white rounded-2xl p-6 shadow-sm border-2 border-transparent transition-all cursor-pointer hover:shadow-md flex flex-col h-full relative overflow-hidden"
               style={{ borderColor: "transparent", transition: "border-color 0.2s" }}
               onMouseEnter={(e) => e.currentTarget.style.borderColor = "#1e3a5f"}
               onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}>
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#eef2f8", color: "#1e3a5f" }}>
                <Building2 className="w-7 h-7" />
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: "#eef2f8", color: "#1e3a5f" }}>
                3 projets
              </div>
            </div>
            
            <h2 className="text-xl font-bold mb-2" style={{ color: "#1e3a5f" }}>Bâtiments existants</h2>
            <p className="text-slate-500 text-sm mb-8 flex-grow">
              Analyse avant / après travaux pour immeubles déjà construits.
            </p>
            
            <div className="flex items-center text-sm font-medium transition-transform group-hover:translate-x-1" style={{ color: "#1e3a5f" }}>
              Ouvrir le module
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          {/* Card 2: Constructions neuves */}
          <div className="group bg-white rounded-2xl p-6 shadow-sm border-2 border-transparent transition-all cursor-pointer hover:shadow-md flex flex-col h-full relative overflow-hidden"
               style={{ borderColor: "transparent", transition: "border-color 0.2s" }}
               onMouseEnter={(e) => e.currentTarget.style.borderColor = "#16a34a"}
               onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}>
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#f0fdf4", color: "#16a34a" }}>
                <HardHat className="w-7 h-7" />
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: "#f0fdf4", color: "#16a34a" }}>
                1 projet
              </div>
            </div>
            
            <h2 className="text-xl font-bold mb-2" style={{ color: "#1e3a5f" }}>Constructions neuves</h2>
            <p className="text-slate-500 text-sm mb-8 flex-grow">
              Qualification selon le bâtiment de référence CNEB 2017.
            </p>
            
            <div className="flex items-center text-sm font-medium transition-transform group-hover:translate-x-1" style={{ color: "#16a34a" }}>
              Ouvrir le module
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
