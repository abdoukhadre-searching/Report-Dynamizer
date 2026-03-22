import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/register", { name, email, password });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erreur lors de l'inscription");
      }
      toast({
        title: "Compte créé avec succès !",
        description: "Vous pouvez maintenant vous connecter avec vos identifiants.",
      });
      navigate("/login");
    } catch (err: any) {
      toast({
        title: "Échec de l'inscription",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative"
      style={{ background: "linear-gradient(135deg, #0f2340 0%, #1e3a5f 60%, #2a4f7c 100%)" }}
    >
      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm"
        data-testid="link-back-landing"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </button>

      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-xl p-2.5 shadow-lg">
            <img src={mabLogoPath} alt="MAB" className="h-10 w-auto object-contain" />
          </div>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl" style={{ color: "#1e3a5f" }}>Créer un compte</CardTitle>
            <CardDescription>Rejoignez la plateforme EnergiQualif</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nom complet</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Marc-André Boucher"
                  required
                  autoFocus
                  data-testid="input-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Adresse courriel</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    required
                    minLength={6}
                    data-testid="input-password"
                    className="pr-9"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-register"
                style={{ backgroundColor: "#1e3a5f" }}
              >
                {isLoading ? "Inscription…" : "Créer mon compte"}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm text-muted-foreground">
                Déjà un compte ?{" "}
                <button
                  className="font-medium hover:underline"
                  style={{ color: "#1e3a5f" }}
                  onClick={() => navigate("/login")}
                  data-testid="link-login"
                >
                  Se connecter
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
