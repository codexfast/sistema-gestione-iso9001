import React, { useEffect } from "react";
import { StorageProvider, useStorage } from "./contexts/StorageContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/SharedComponents";
import Dashboard from "./components/Dashboard";
import CompaniesPage from "./components/CompaniesPage";
import ChecklistAdminPage from "./components/ChecklistAdminPage";
import UsersAdminPage from "./components/UsersAdminPage";
import ReportTemplatesAdminPage from "./components/ReportTemplatesAdminPage";
import CustomChecklistsPage from "./components/CustomChecklistsPage";
import Login from "./components/Login";
import WorkspaceManager from "./components/WorkspaceManager";
import ConnectionStatus from "./components/ConnectionStatus";
import { useCheckpointSaver } from "./hooks/useCheckpointSaver";
import { checkAndMigrateStorage } from "./utils/storageVersion";
import "./App.css";

/**
 * AppContent - Componente interno con accesso a StorageContext e Auth
 */
function AppContent() {
  const { currentAudit, fsProvider, audits } = useStorage();
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const [settingsExpanded, setSettingsExpanded] = React.useState(false);
  const [viewMode, setViewMode] = React.useState("audit"); // 'audit' | 'companies' | 'checklist-admin' | 'users-admin'
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const canManageTemplates = ["admin", "auditor", "superadmin"].includes(user?.role);

  // Auto-save checkpoint ogni 30 secondi quando workspace collegato
  const checkpoint = useCheckpointSaver(currentAudit, fsProvider, {
    intervalMs: 30000,
    enabled: true,
  });

  // Mostra login se non autenticato
  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Caricamento...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Vista Admin — Gestione utenti e standard
  if (viewMode === "users-admin") {
    return (
      <div className="app">
        <header className="app-header">
          <div className="container header-flex">
            <h1>SGQ — Sistema di Gestione</h1>
            <div className="user-info">
              <span className="user-name">👤 {user.full_name || user.name}</span>
              <span className={`user-role role-${user.role}`}>{user.role}</span>
              <button onClick={logout} className="btn-logout" title="Logout">🚪 Esci</button>
            </div>
          </div>
        </header>
        <main className="container">
          <UsersAdminPage onBack={() => setViewMode("audit")} />
        </main>
        <footer className="app-footer">
          <div className="container">
            <p>© {new Date().getFullYear()} - Sistema Gestione ISO 9001/14001/45001</p>
          </div>
        </footer>
      </div>
    );
  }

  // Vista Checklist personalizzate (admin/auditor)
  if (viewMode === "custom-checklists") {
    return (
      <div className="app">
        <header className="app-header">
          <div className="container header-flex">
            <h1>SGQ — Sistema di Gestione</h1>
            <div className="user-info">
              <span className="user-name">👤 {user.full_name || user.name}</span>
              <span className={`user-role role-${user.role}`}>{user.role}</span>
              <button onClick={logout} className="btn-logout" title="Logout">🚪 Esci</button>
            </div>
          </div>
        </header>
        <main className="container">
          <CustomChecklistsPage onBack={() => setViewMode("audit")} />
        </main>
        <footer className="app-footer">
          <div className="container">
            <p>© {new Date().getFullYear()} - Sistema Gestione ISO 9001/14001/45001</p>
          </div>
        </footer>
      </div>
    );
  }

  // Vista Template report (admin/auditor)
  if (viewMode === "report-templates") {
    return (
      <div className="app">
        <header className="app-header">
          <div className="container header-flex">
            <h1>SGQ — Sistema di Gestione</h1>
            <div className="user-info">
              <span className="user-name">👤 {user.full_name || user.name}</span>
              <span className={`user-role role-${user.role}`}>{user.role}</span>
              <button onClick={logout} className="btn-logout" title="Logout">🚪 Esci</button>
            </div>
          </div>
        </header>
        <main className="container">
          <ReportTemplatesAdminPage onBack={() => setViewMode("audit")} />
        </main>
        <footer className="app-footer">
          <div className="container">
            <p>© {new Date().getFullYear()} - Sistema Gestione ISO 9001/14001/45001</p>
          </div>
        </footer>
      </div>
    );
  }

  // Vista Admin — Gestione Stralci Normativi Checklist
  if (viewMode === "checklist-admin") {
    return (
      <div className="app">
        <header className="app-header">
          <div className="container header-flex">
            <h1>SGQ ? Sistema di Gestione</h1>
            <div className="user-info">
              <span className="user-name">👤 {user.full_name || user.name}</span>
              <span className={`user-role role-${user.role}`}>{user.role}</span>
              <button onClick={logout} className="btn-logout" title="Logout">🚪 Esci</button>
            </div>
          </div>
        </header>
        <main className="container">
          <ChecklistAdminPage onBack={() => setViewMode("audit")} />
        </main>
        <footer className="app-footer">
          <div className="container">
            <p>© {new Date().getFullYear()} - Sistema Gestione ISO 9001/14001/45001</p>
          </div>
        </footer>
      </div>
    );
  }

  // Vista Anagrafica Aziende (Fase 1)
  if (viewMode === "companies") {
    return (
      <div className="app">
        <header className="app-header">
          <div className="container header-flex">
            <h1>SGQ ? Sistema di Gestione</h1>
            <div className="user-info">
              <span className="user-name">👤 {user.full_name || user.name}</span>
              <span className={`user-role role-${user.role}`}>{user.role}</span>
              <button onClick={logout} className="btn-logout" title="Logout">🚪 Esci</button>
            </div>
          </div>
        </header>
        <main className="container">
          <CompaniesPage onBack={() => setViewMode("audit")} />
        </main>
        <footer className="app-footer">
          <div className="container">
            <p>© {new Date().getFullYear()} - Sistema Gestione ISO 9001/14001/45001</p>
          </div>
        </footer>
      </div>
    );
  }

  // Se nessun audit selezionato E ci sono audit disponibili → mostra selector full-screen
  if (!currentAudit && audits.length > 0) {
    return (
      <div className="app app-selector-mode">
        <header className="app-header">
          <div className="container header-flex">
            <h1>SGQ ? Sistema di Gestione</h1>
            <div className="header-right">
              <nav className="app-nav">
                <button type="button" className="nav-link" onClick={() => setViewMode("companies")}>
                  🏢 Anagrafica Aziende
                </button>
                {isAdmin && (
                  <>
                    <button type="button" className="nav-link nav-link-admin" onClick={() => setViewMode("users-admin")}>
                      👥 Utenti e standard
                    </button>
                    <button type="button" className="nav-link nav-link-admin" onClick={() => setViewMode("checklist-admin")}>
                      📋 Gestione Checklist
                    </button>
                  </>
                )}
                {canManageTemplates && (
                  <>
                    <button type="button" className="nav-link" onClick={() => setViewMode("custom-checklists")}>
                      📋 Checklist personalizzate
                    </button>
                    <button type="button" className="nav-link" onClick={() => setViewMode("report-templates")}>
                      📄 Template report
                    </button>
                  </>
                )}
              </nav>
              <div className="user-info">
              <span className="user-name">
                👤 {user.full_name || user.name}
              </span>
              <span className={`user-role role-${user.role}`}>{user.role}</span>
              <button onClick={logout} className="btn-logout" title="Logout">
                🚪 Esci
              </button>
            </div>
            </div>
          </div>
        </header>
        <main className="container">
          <Dashboard />
        </main>
        <footer className="app-footer">
          <div className="container">
            <p>
              © {new Date().getFullYear()} - Sistema Gestione ISO
              9001/14001/45001 - Tutti i diritti riservati
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Connection Status Indicator */}
      <ConnectionStatus />

      <header className="app-header">
        <div className="container header-flex">
          <h1>SGQ ? Sistema di Gestione</h1>

          <div className="header-right">
            <nav className="app-nav">
              <button type="button" className="nav-link" onClick={() => setViewMode("companies")}>
                🏢 Aziende
              </button>
              {isAdmin && (
                <>
                  <button type="button" className="nav-link nav-link-admin" onClick={() => setViewMode("users-admin")}>
                    👥 Utenti e standard
                  </button>
                  <button type="button" className="nav-link nav-link-admin" onClick={() => setViewMode("checklist-admin")}>
                    📋 Checklist
                  </button>
                </>
              )}
              {canManageTemplates && (
                <>
                  <button type="button" className="nav-link" onClick={() => setViewMode("custom-checklists")}>
                    📋 Checklist personalizzate
                  </button>
                  <button type="button" className="nav-link" onClick={() => setViewMode("report-templates")}>
                    📄 Template report
                  </button>
                </>
              )}
            </nav>
            {/* Workspace Manager - Compact mode (status banner) solo quando audit selezionato */}
            {currentAudit && (
              <WorkspaceManager compact={true} audit={currentAudit} />
            )}

            {/* Checkpoint indicator */}
            {checkpoint.lastCheckpointTime && (
              <div className="checkpoint-indicator">
                ✅ Auto-salvato alle{" "}
                {checkpoint.lastCheckpointTime.toLocaleTimeString("it-IT")}
              </div>
            )}

            {/* User info */}
            <div className="user-info">
              <span className="user-name">
                👤 {user.full_name || user.name}
              </span>
              <span className={`user-role role-${user.role}`}>{user.role}</span>
              <button onClick={logout} className="btn-logout" title="Logout">
                🚪
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        <Dashboard />
      </main>

      <footer className="app-footer">
        <div className="container">
          <p>
            © {new Date().getFullYear()} - Sistema Gestione ISO 9001/14001/45001
            - Tutti i diritti riservati
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  // Controlla versione storage all'avvio
  useEffect(() => {
    checkAndMigrateStorage();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <StorageProvider>
          <AppContent />
        </StorageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
