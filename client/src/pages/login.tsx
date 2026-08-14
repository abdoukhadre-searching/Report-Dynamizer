import { useState } from "react";
import { useLocation } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import mabLogoPath from "@assets/Logo-3_1772954007262.jpg";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setIsLoading(true);
    try {
      await login(username, password, rememberMe);
      toast({
        title: "Connexion réussie !",
        description: "Bienvenue sur MAB Projets.",
      });
      navigate("/");
    } catch (err: any) {
      toast({
        title: "Échec de la connexion",
        description: err.message || "Vérifiez vos identifiants.",
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
            <CardTitle className="text-xl" style={{ color: "#1e3a5f" }}>Connexion</CardTitle>
            <CardDescription>Accédez à votre espace MAB Projets</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Nom d'utilisateur</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder=""
                  required
                  autoFocus
                  autoComplete="off"
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
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
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
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(!!v)}
                />
                <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer select-none">
                  Rester connecté
                </label>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
                style={{ backgroundColor: "#1e3a5f" }}
              >
                {isLoading ? "Connexion…" : "Se connecter"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
