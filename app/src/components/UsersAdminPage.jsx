/**
 * Pagina Admin: Gestione utenti e assegnazione standard
 * Solo per ruolo admin. Assegna quali standard ogni auditor può usare (user_standards).
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiService from "../services/apiService";
import "./UsersAdminPage.css";

const STANDARDS_LIST = [
  { standard_id: 1, label: "ISO 9001:2015 — Qualità" },
  { standard_id: 2, label: "ISO 14001:2015 — Ambiente" },
  { standard_id: 3, label: "ISO 45001:2018 — Salute e Sicurezza" },
  { standard_id: 6, label: "ISO 3834-2 — Audit Fornitori in Campo" },
  { standard_id: 7, label: "RDP Mason — Audit di Sistema Saldatura" },
];

export default function UsersAdminPage({ onBack }) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [dirty, setDirty] = useState({}); // { [userId]: Set(standard_id) } modifiche non salvate

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiService
      .getAdminUsers()
      .then((res) => {
        if (cancelled) return;
        const list = res?.data && Array.isArray(res.data) ? res.data : [];
        setUsers(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Errore caricamento utenti");
          setUsers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isAdmin]);

  const getEffectiveStandards = (u) => {
    if (dirty[u.user_id]) return Array.from(dirty[u.user_id]);
    return u.allowed_standard_ids ?? [];
  };

  const toggleStandard = (userId, standardId) => {
    const u = users.find((x) => x.user_id === userId);
    const current = getEffectiveStandards(u);
    const next = current.includes(standardId)
      ? current.filter((id) => id !== standardId)
      : [...current, standardId];
    setDirty((prev) => ({ ...prev, [userId]: next }));
  };

  const saveUserStandards = async (u) => {
    const effective = getEffectiveStandards(u);
    setSavingId(u.user_id);
    try {
      await apiService.updateUserStandards(u.user_id, effective);
      setUsers((prev) =>
        prev.map((x) =>
          x.user_id === u.user_id ? { ...x, allowed_standard_ids: effective } : x
        )
      );
      setDirty((prev) => {
        const next = { ...prev };
        delete next[u.user_id];
        return next;
      });
    } catch (err) {
      console.error("Salvataggio standard utente:", err);
      alert(err.message || "Errore durante il salvataggio");
    } finally {
      setSavingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="users-admin-page">
        <div className="admin-access-denied">
          <p>Accesso riservato agli amministratori.</p>
          {onBack && <button type="button" className="btn btn-secondary" onClick={onBack}>Indietro</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="users-admin-page">
      <div className="users-admin-header">
        <h1>👥 Gestione utenti e standard</h1>
        <p className="users-admin-desc">
          Assegna a ogni utente gli standard ISO che può auditare. Nessuna assegnazione = tutti gli standard.
        </p>
        {onBack && (
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            ← Indietro
          </button>
        )}
      </div>

      {loading && <p className="loading-message">Caricamento utenti...</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && users.length === 0 && (
        <p className="no-data">Nessun utente trovato.</p>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="users-admin-list">
          {users.map((u) => (
            <div key={u.user_id} className="user-card">
              <div className="user-card-header">
                <strong>{u.full_name || u.email}</strong>
                <span className="user-email">{u.email}</span>
                <span className={`user-role-badge role-${u.role}`}>{u.role}</span>
              </div>
              <div className="user-standards-section">
                <span className="standards-label">Standard consentiti:</span>
                <div className="standards-checkboxes">
                  {STANDARDS_LIST.map((std) => {
                    const effective = getEffectiveStandards(u);
                    const checked = effective.includes(std.standard_id);
                    return (
                      <label key={std.standard_id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStandard(u.user_id, std.standard_id)}
                        />
                        <span>{std.label}</span>
                      </label>
                    );
                  })}
                </div>
                {dirty[u.user_id] && (
                  <button
                    type="button"
                    className="btn btn-primary btn-save-standards"
                    disabled={savingId === u.user_id}
                    onClick={() => saveUserStandards(u)}
                  >
                    {savingId === u.user_id ? "Salvataggio..." : "Salva"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
