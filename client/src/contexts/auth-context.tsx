import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { clearPwaData, loadOfflineUser, saveOfflineUser, type OfflineUser } from "@/lib/pwa-storage";

type AuthenticatedUser = Pick<User, "id" | "name" | "role">;

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as AuthenticatedUser;
        setUser(data);
        await saveOfflineUser(data as OfflineUser);
      } else {
        setUser(null);
        await clearPwaData();
      }
    } catch {
      setUser(await loadOfflineUser());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string, rememberMe = false) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password, rememberMe });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Échec de la connexion");
    }
    const data = await res.json();
    setUser(data.user);
    await saveOfflineUser(data.user as OfflineUser);
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
    } finally {
      queryClient.clear();
      await clearPwaData();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
