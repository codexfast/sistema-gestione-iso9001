/**
 * Auth Context - Gestione autenticazione utente
 * Sistema Gestione ISO 9001 - QS Studio
 *
 * Funzionalità:
 * - Login/Logout con API backend reale
 * - Gestione token JWT
 * - Ruoli utente (admin, auditor, viewer)
 * - Protezione route
 * - Refresh automatico sessione
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import apiService, { ApiError } from "../services/apiService";

// Ruoli disponibili
export const USER_ROLES = {
  ADMIN: "admin",
  AUDITOR: "auditor",
  VIEWER: "viewer",
};

// Context
const AuthContext = createContext(null);

/**
 * Hook per accesso al contesto auth
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve essere usato dentro AuthProvider");
  }
  return context;
}

/**
 * Provider Autenticazione
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor connessione
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Ripristina sessione da token salvato
  useEffect(() => {
    const initSession = async () => {
      try {
        // Controlla se c'è un token salvato
        const token = apiService.getToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Prova a recuperare user salvato localmente (per offline)
        const storedUser = apiService.getStoredUser();

        if (isOnline) {
          // Verifica sessione con il server
          const serverUser = await apiService.checkSession();
          if (serverUser) {
            setUser(serverUser);
            apiService.setStoredUser(serverUser);
            console.log(`✅ Sessione verificata: ${serverUser.full_name}`);
          } else {
            // Token non valido
            apiService.clearToken();
            console.log("⏰ Token non valido, sessione rimossa");
          }
        } else if (storedUser) {
          // Offline ma abbiamo user salvato
          setUser(storedUser);
          console.log(
            `📴 Offline - usando sessione cache: ${storedUser.full_name}`
          );
        }
      } catch (err) {
        console.error("Errore ripristino sessione:", err);
        // In caso di errore, usa cache se disponibile
        const storedUser = apiService.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, [isOnline]);

  // Listener per logout forzato (token scaduto)
  useEffect(() => {
    const handleForceLogout = () => {
      setUser(null);
      setError("Sessione scaduta. Effettua nuovamente il login.");
    };

    window.addEventListener("auth:logout", handleForceLogout);
    return () => window.removeEventListener("auth:logout", handleForceLogout);
  }, []);

  /**
   * Login con email e password
   */
  const login = useCallback(async (email, password) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiService.login(email, password);

      if (response.success && response.user) {
        setUser(response.user);
        console.log(
          `✅ Login effettuato: ${response.user.full_name} (${response.user.role})`
        );
        setIsLoading(false);
        return true;
      }

      setError("Credenziali non valide");
      setIsLoading(false);
      return false;
    } catch (err) {
      console.error("Errore login:", err);

      if (err instanceof ApiError) {
        if (err.code === "OFFLINE") {
          setError("Connessione assente. Verifica la rete.");
        } else if (err.code === "TIMEOUT") {
          setError("Server non raggiungibile. Riprova.");
        } else {
          setError(err.message || "Credenziali non valide");
        }
      } else {
        setError("Errore durante il login");
      }

      setIsLoading(false);
      return false;
    }
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      await apiService.logout();
    } catch (err) {
      console.warn("Errore logout API:", err);
    }
    setUser(null);
    setError(null);
    console.log("👋 Logout effettuato");
  }, []);

  /**
   * Verifica permessi per ruolo
   */
  const hasRole = useCallback(
    (requiredRole) => {
      if (!user) return false;

      // Admin ha tutti i permessi
      if (user.role === USER_ROLES.ADMIN) return true;

      // Auditor può fare tutto tranne admin
      if (user.role === USER_ROLES.AUDITOR && requiredRole !== USER_ROLES.ADMIN)
        return true;

      // Viewer può solo visualizzare
      return user.role === requiredRole;
    },
    [user]
  );

  /**
   * Verifica se può modificare dati
   */
  const canEdit = useCallback(() => {
    return (
      user &&
      (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.AUDITOR)
    );
  }, [user]);

  /**
   * Verifica se è admin
   */
  const isAdmin = useCallback(() => {
    return user?.role === USER_ROLES.ADMIN;
  }, [user]);

  // Valore context
  const value = {
    // Stato
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    isOnline,

    // Azioni
    login,
    logout,

    // Permessi
    hasRole,
    canEdit,
    isAdmin,

    // Costanti
    USER_ROLES,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
