import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import MandatsListPage from "@/pages/mandats-list";
import MandatDetailPage from "@/pages/mandat-detail";
import MandatPrintPage from "@/pages/mandat-print";
import OffresListPage from "@/pages/offres-list";
import OffreDetailPage from "@/pages/offre-detail";
import OffrePrintPage from "@/pages/offre-print";
import RapportsPage from "@/pages/rapports";
import ProjectsListPage from "@/pages/projects-list";
import ProjectPage from "@/pages/project";
import ProjectPrintPage from "@/pages/project-print";
import ProjectPrintRecommandationsPage from "@/pages/project-print-recommandations";
import ProjectPrintStrategiePage from "@/pages/project-print-strategie";
import ProjectPrintEmpreintePage from "@/pages/project-print-empreinte";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ProfilePage from "@/pages/profile";
import AdminPage from "@/pages/admin";
import VerifierPage from "@/pages/verifier";
import { useEffect, useState } from "react";
import { hydratePwaQueryCache, startPwaQueryPersistence } from "./lib/pwa-query-cache";
import OfflineBanner from "./components/offline-banner";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return <Component />;
}

function RootRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <LandingPage />;
  return <HomePage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/landing" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/verifier" component={VerifierPage} />
      <Route path="/project/:id/print" component={ProjectPrintPage} />
      <Route path="/project/:id/print-recommandations" component={ProjectPrintRecommandationsPage} />
      <Route path="/project/:id/print-strategie" component={ProjectPrintStrategiePage} />
      <Route path="/project/:id/print-empreinte" component={ProjectPrintEmpreintePage} />
      <Route path="/rapports">
        {() => <ProtectedRoute component={RapportsPage} />}
      </Route>
      <Route path="/mandats/:id/print" component={MandatPrintPage} />
      <Route path="/mandats">
        {() => <ProtectedRoute component={MandatsListPage} />}
      </Route>
      <Route path="/offres/:id/print" component={OffrePrintPage} />
      <Route path="/offres">
        {() => <ProtectedRoute component={OffresListPage} />}
      </Route>
      <Route path="/offres/:id">
        {() => <ProtectedRoute component={OffreDetailPage} />}
      </Route>
      <Route path="/mandats/:id">
        {() => <ProtectedRoute component={MandatDetailPage} />}
      </Route>
      <Route path="/projects/existing">
        {() => <ProtectedRoute component={() => <ProjectsListPage buildingType="existing" />} />}
      </Route>
      <Route path="/projects/new">
        {() => <ProtectedRoute component={() => <ProjectsListPage buildingType="new" />} />}
      </Route>
      <Route path="/project/:id">
        {() => <ProtectedRoute component={ProjectPage} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminPage} />}
      </Route>
      <Route path="/" component={RootRoute} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  const { user, isLoading } = useAuth();
  const [readyForUser, setReadyForUser] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (isLoading) return;

    let active = true;
    let stopPersistence: (() => void) | undefined;
    const ownerId = user?.id ?? null;

    void (async () => {
      queryClient.clear();
      if (ownerId) {
        await hydratePwaQueryCache(queryClient, ownerId);
        stopPersistence = startPwaQueryPersistence(queryClient, ownerId);
      }
      if (active) setReadyForUser(ownerId);
    })();

    return () => {
      active = false;
      stopPersistence?.();
    };
  }, [isLoading, user?.id]);

  if (isLoading || readyForUser !== (user?.id ?? null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <OfflineBanner />
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
