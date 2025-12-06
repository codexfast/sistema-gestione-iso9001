/**
 * Auth Context - Gestione autenticazione utente
 * Sistema Gestione ISO 9001 - QS Studio
 *
 * Funzionalità:
 * - Login/Logout con credenziali
 * - Persistenza sessione in localStorage
 * - Ruoli utente (admin, auditor, viewer)
 * - Protezione route
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

// Chiavi localStorage
const AUTH_STORAGE_KEY = "sgq_auth_session";
const USERS_STORAGE_KEY = "sgq_users";

// Ruoli disponibili
export const USER_ROLES = {
  ADMIN: "admin",
  AUDITOR: "auditor",
  VIEWER: "viewer",
};

// Utenti demo predefiniti (in produzione verrebbero dal backend)
const DEFAULT_USERS = [
  {
    id: "user-001",
    username: "admin",
    password: "admin123", // In produzione: hash bcrypt
    name: "Amministratore Sistema",
    email: "admin@sgq.local",
    role: USER_ROLES.ADMIN,
    organization: "QS Studio",
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "user-002",
    username: "auditor",
    password: "auditor123",
    name: "Marco Camellini",
    email: "marco.camellini@sgq.local",
    role: USER_ROLES.AUDITOR,
    organization: "QS Studio",
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "user-003",
    username: "viewer",
    password: "viewer123",
    name: "Utente Consultazione",
    email: "viewer@sgq.local",
    role: USER_ROLES.VIEWER,
    organization: "QS Studio",
    createdAt: "2025-01-01T00:00:00Z",
  },
];

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

  // Inizializza utenti demo se non esistono
  useEffect(() => {
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (!storedUsers) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      console.log("✅ Utenti demo inizializzati");
    }
  }, []);

  // Ripristina sessione da localStorage
  useEffect(() => {
    try {
      const storedSession = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedSession) {
        const session = JSON.parse(storedSession);

        // Verifica scadenza sessione (24 ore)
        const sessionAge = Date.now() - new Date(session.loginTime).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 ore

        if (sessionAge < maxAge) {
          setUser(session.user);
          console.log(`✅ Sessione ripristinata: ${session.user.name}`);
        } else {
          // Sessione scaduta
          localStorage.removeItem(AUTH_STORAGE_KEY);
          console.log("⏰ Sessione scaduta, rimossa");
        }
      }
    } catch (err) {
      console.error("Errore ripristino sessione:", err);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Login con username e password
   */
  const login = useCallback(async (username, password) => {
    setError(null);
    setIsLoading(true);

    try {
      // Simula delay network (rimuovere in produzione)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Carica utenti
      const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
      const users = storedUsers ? JSON.parse(storedUsers) : DEFAULT_USERS;

      // Cerca utente
      const foundUser = users.find(
        (u) =>
          u.username.toLowerCase() === username.toLowerCase() &&
          u.password === password
      );

      if (!foundUser) {
        setError("Credenziali non valide");
        setIsLoading(false);
        return false;
      }

      // Crea sessione (senza password!)
      const { password: _, ...userWithoutPassword } = foundUser;
      const session = {
        user: userWithoutPassword,
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      // Salva sessione
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      setUser(userWithoutPassword);

      console.log(`✅ Login effettuato: ${foundUser.name} (${foundUser.role})`);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("Errore login:", err);
      setError("Errore durante il login");
      setIsLoading(false);
      return false;
    }
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
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
